// Code bằng tay
// v0.0.0.1 23may26
const FETCH_TIMEOUT = 60000; // Tối đa 60 giây kết nối và nhận dữ liệu. Dùng cho hàm fetchWithTimeout().
const VALID_FILE_SIGNATURE = ["[Script Info]", "[V4+ Styles]", "[Events]"];
// Danh sách các nội dung mà parser dùng để đánh dấu. Dùng cho hàm validateSubtitleContent().
export async function fetchSubtitleText(candidate) {
	// Hàm xử lí URL GDrive của file sub. 
	// Đầu vào candidate có cấu trúc của 1 entity trong array results (xem results.push trong hàm scanGoogleDrive().)
    const resp = await fetchWithTimeout(candidate.url, candidate.id, "file");
	// Tải file từ nguồn
    if (!resp.ok) {
		console.error(
			`%c[ASS-CEE]%c fetcher: Không thể tải file từ nguồn ${candidate.id}, ${candidate.fileName}`, 
			"color: red; font-weight: bold;",
			""
		);
		throw new Error("Không thể tải file từ nguồn.")
	}
    const text = await resp.text();
	const contentLength = resp.headers.get("content-length");
	if (contentLength) {
		const byteSize = parseInt(contentLength, 10);
		if (byteSize > 10*1024*1024) {
            console.warn(
                `%c[ASS-CEE]%c fetcher: Chú ý file sub ${candidate.id}, ${candidate.fileName} có dung lượng trên 10MB (${(byteSize / (1024 * 1024)).toFixed(2)} MB)`, 
                "color: orange; font-weight: bold;", 
                ""
            );
        }
	} else {
		console.warn(
		`%c[ASS-CEE]%c fetcher: Không tìm thấy thông tin dung lượng file sub ${candidate.id}, ${candidate.fileName}`, 
		"color: orange; font-weight: bold;",
		""
	);
	}
	// Lấy text của file sub.
    validateSubtitleContent(text);
	// Kiểm tra tính hợp lệ của file sub (check tồn tại các dòng đánh dấu như [Script Info], [V4+ Styles], [Events])
    return text;
}
function validateSubtitleContent(text) {
	// Hàm tiền kiểm tra dữ liệu file sub (trước khi đưa cho parser xử lí)
	if (!text) throw new Error("File sub trống");
    const isValid = VALID_FILE_SIGNATURE.some(sig => text.includes(sig));
    if (!isValid) throw new Error("Định dạng không thể sử dụng parser");
}
export async function fetchSubtitles(sources, videoId) {
	// Hàm quét DANH SÁCH thư mục GDrive (Gemini, đã check)
    // 1. Hàm nhận đầu vào sources là array các string URL thư mục GDrive.
    const scanPromises = sources.map(url => {
        // Tạo một đối tượng source đơn giản để truyền vào hàm quét
        return scanGoogleDrive({ url: url }, videoId);
		// Đã check, khớp đầu vào của scanGoogleDrive().
    });
    // 2. Chờ tất cả các luồng quét kết thúc đồng thời
    const results = await Promise.allSettled(scanPromises);
    // 3. Gom và làm phẳng danh sách file sub tìm được
    const candidates = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

    // 4. Sắp xếp file theo thứ tự bảng chữ cái ABC
	candidates.sort((a, b) => a.groupName.localeCompare(b.groupName, undefined, { numeric: true }) || a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
	// So sánh theo groupName trước, sau đó là theo fileName. Cả 2 đều theo dạng numeric (vd: file10 đứng sau file2)
    return { candidates: candidates };
}
async function scanGoogleDrive(source, videoId) {
	// Hàm quét thư mục GDrive (Gemini, đã check)
    // 1. Bóc tách lấy ID của thư mục từ URL
    const folderId = source.url.split('/folders/')[1]?.split('?')[0];
	// URL folder GDrive dạng https://drive.google.com/drive/folders/1A2b3C4d5E6f?usp=sharing
	// .split('/folder/')[1] để lấy 1A2b3C4d5E6f?usp=sharing; .split('?')[0] để lấy 1A2b3C4d5E6f
    if (!folderId) return [];
	// Nếu ko tìm thấy Id (vd: split('/folder/') ko hoạt động) thì trả về trống.
	console.log(
		`%c[ASS-CEE]%c fetcher: Đang tìm thư mục GDrive ${folderId}`, 
		"font-weight: bold;",
		""
	);
    const results = [];
    try {
        // 2. Tạo URL proxy giao diện nhúng và tải mã HTML về
        const proxyUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
        const resp = await fetchWithTimeout(proxyUrl, folderId, "folder");
		// fetchWithTimeout()?
        if (!resp.ok) return [];
        const html = await resp.text();
		// 3. Lấy tên thư mục
        const titleRegex = /<title>([^<]+) - Google Drive<\/title>/;
        const titleMatch = html.match(titleRegex);
        // Nếu tìm thấy thì lấy nhóm 1 và xóa khoảng trắng, nếu không thấy thì để tên mặc định
        const folderName = titleMatch ? titleMatch[1].trim() : "undefined_GDrive";
        
        // 4. Regex bóc tách cặp [File ID, Tên File] từ đống dữ liệu JSON ẩn trong HTML
        const entryRegex = /\["([a-zA-Z0-9_-]{19,})","([^"]+)"/g;
        let match;
        // 5. Vòng lặp phẳng tuần tự (Không đệ quy) quét qua các file tìm được
        while ((match = entryRegex.exec(html)) !== null) {
            const [_, id, name] = match;
            // 6. Kiểm tra điều kiện định dạng và mã video
            if (name.endsWith('.ass') && isMatchingSubtitle(name, videoId)) {
				// isMatchingSubtitle()?
                results.push({
                    id: id,
                    fileName: name,
                    // URL cấu hình tải trực tiếp file thô từ Drive mà không cần API Key
                    url: `https://docs.google.com/uc?export=download&id=${id}`,
                    sourceType: 'gdrive',
                    groupName: folderName
                });
            }
        }
    } catch (e) {
        console.error(
			"%c[ASS-CEE]%c fetcher: Lỗi quét Google Drive:", e, 
			"color: red; font-weight: bold;",
			""
		);
    }
    return results;
	// Như vậy cấu trúc của results là array với các phần tử là obj gồm {id, fileName, url, sourceType, groupName}
	// phụ thuộc các hàm ngoài là fetchWithTimeout() và isMatchingSubtitle()
}
function isMatchingSubtitle(fileName, videoId) {
	// Hàm check tên file có chứa YT ID, và bao quanh nó trong ngoặc () hoặc [] ko.
    const regex = new RegExp(`\\(${videoId}\\)|\\[${videoId}\\]`); 
    return regex.test(fileName);
}
async function fetchWithTimeout(url, id = "undefined", type = "undefined") {
	// Hàm kết nối mạng có timeout (Gemini). Yêu cầu biến FETCH_TIMEOUT.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const logLabel = `[ASS-CEE] fetcher: ${id}`;
	console.time(logLabel);
    const progressInterval = setInterval(() => {console.timeLog(logLabel, `(Đang kết nối)`);}, 1000);
    try {
        return await fetch(url, { signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(
				`%c${logLabel} -> Quá thời gian chờ ${FETCH_TIMEOUT/1000}s (timeout)`, 
				"color: red; font-weight: bold;"
			);
        }
        throw error;
    } finally {
        clearTimeout(timer);
		clearInterval(progressInterval);
        console.timeEnd(logLabel);
    }
}

