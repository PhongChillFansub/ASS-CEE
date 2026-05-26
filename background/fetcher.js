// Code bằng tay
// v0.0.0.1 26may26
const FETCH_TIMEOUT = 60000; // Tối đa 60 giây kết nối và nhận dữ liệu. Dùng cho hàm fetchWithTimeout().
const VALID_FILE_SIGNATURE = ["[Script Info]", "[V4+ Styles]", "[Events]"];
// Danh sách các nội dung mà parser dùng để đánh dấu. Dùng cho hàm validateSubtitleContent().
/**
 * Hàm nhận URL GDrive của file sub qua cấu trúc obj URL file sub (candidate), tải về text của file sub
 * @param {*} candidate candidate (hoặc results.push) = {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
  } 
 * @returns trả về text (toàn bộ text của file sub, đuôi .ass)
 */
export async function fetchSubtitleText(candidate) {
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
/**
 * Hàm tiền kiểm tra dữ liệu file sub (trước khi đưa cho parser xử lí)
 * @param {*} text là toàn bộ text của file sub (đuôi .ass)
 */
function validateSubtitleContent(text) {
	if (!text) throw new Error("File sub trống");
    const isValid = VALID_FILE_SIGNATURE.some(sig => text.includes(sig));
    if (!isValid) throw new Error("Định dạng không thể sử dụng parser");
}
/**
 * Hàm quét DANH SÁCH thư mục GitHub/GDrive (thông qua 2 hàm scanGitHub và scanGoogleDrive)
 * @param {*} sources array các string URL thư mục GitHub/GDrive
 * @param {*} videoId id YT video cần tìm
 * @returns DANH SÁCH các file theo cấu trúc candidate {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
  } 
 */
export async function fetchSubtitleFile(sources, videoId) {

    const scanPromises = sources.map(source => {
        // Tạo một đối tượng source đơn giản để truyền vào hàm quét
        if (source.type === 'github') {
            return scanGitHub(source, videoId);
        } else if (source.type === 'gdrive') {
            return scanGoogleDrive(source, videoId);
        } 
        console.warn(
            `%c[ASS-CEE]%c fetcher: Link chuẩn chưa em? (GitHub: ${source})`, 
            "color: orange; font-weight: bold;",
            ""
        );
        return [];
		// Đã check, khớp đầu vào của scanGoogleDrive().
    });
    // 2. Chờ tất cả các luồng quét kết thúc đồng thời
    const results = await Promise.allSettled(scanPromises);
    // 3. Gom và làm phẳng danh sách file sub tìm được
    const candidates = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

    // 4. Sắp xếp file theo thứ tự bảng chữ cái ABC
	candidates.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.fileName.localeCompare(b.fileName));
	// So sánh theo groupName trước, sau đó là theo fileName. Cả 2 đều theo dạng numeric (vd: file10 đứng sau file2)
    return { candidates: candidates };
}
/**
 * Hàm quét 1 thư mục GitHub
 * @param {*} source string URL thư mục GitHub
 * @param {*} videoId id YT video cần tìm
 * @param {*} folderName {groupName: '',id:''} lưu tên folder lấy được trong quá trình fetch
 * @returns DANH SÁCH các file theo cấu trúc candidate {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
    }
 */
async function scanGitHub(source, videoId, folderName = { groupName: '',id:'' }) {
    // folderName
    // 1. Kiểm tra cấu trúc URL
    const regex = /github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/?(.*)/;
    // Cấu trúc link GitHub folder chuẩn 
    const match = source.url.match(regex);
    if (!match) {
        console.warn(
            `%c[ASS-CEE]%c fetcher: Link chuẩn chưa em? (GitHub: ${source})`, 
            "color: orange; font-weight: bold;",
            ""
        );
        return []
        // Nếu URL không đúng chuẩn, báo lại
    }
    const [_, owner, repo, branch, path] = match;
    folderName.groupName = `${owner}/${repo}/${branch}/${path}`;
    // Trích xuất các thông tin trong URL, lưu vào groupName để xử lí và hiển thị sau này
    const results = [];
    try {
        // 2. Tạo URL API và quét thư mục
        const url =`https://api.github.com/repos/${owner}/${repo}/contents/${path || ""}?ref=${branch}`;
        const resp = await fetchWithTimeout(url, folderName.groupName, "folder");
        // fetchWithTimeout()?
        if (!resp.ok) return [];
        const items = await resp.json();
        if (!Array.isArray(items)) {
            console.warn(
                `%c[ASS-CEE]%c fetcher: Lag? (GitHub API ko trả về array, folder: ${groupName})`, 
                "color: orange; font-weight: bold;",
                ""
            );
            return [];
            // Kiểm tra nếu trả về ko phải array các file
        }
        folderName.id = item.sha;
        for (const item of items) { // 3. Quét các file tìm được
            if (item.type !== "file") continue; 
            // Vì chỉ quét các file nên bỏ qua các folder và file ko phải file sub
            if (item.name.endsWith('.ass') && isMatchingSubtitle(item.name, videoId)) {
                // isMatchingSubtitle()?
                results.push({
                    id: item.sha,
                    fileName: item.name,
                    // URL cấu hình tải trực tiếp file thô từ Drive mà không cần API Key
                    url: item.download_url,
                    sourceType: 'github',
                    groupName: folderName.groupName
                }); 
            }
        }

    } catch (e) {
        console.error(
			"%c[ASS-CEE]%c fetcher: Lỗi quét GitHub:", e, 
			"color: red; font-weight: bold;",
			""
		);
    }
    return results;
    // phụ thuộc các hàm ngoài là fetchWithTimeout() và isMatchingSubtitle()
}
/**
 * Hàm quét 1 thư mục GDrive
 * @param {*} source string URL thư mục GDrive
 * @param {*} videoId id YT video cần tìm
 * @param {*} folderName {groupName: '' } lưu tên folder lấy được trong quá trình fetch
 * @returns DANH SÁCH các file theo cấu trúc candidate {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
  } 
 */
async function scanGoogleDrive(source, videoId, folderName = { groupName: ''}) {
	// Hàm quét thư mục GDrive (Gemini, đã check)
    // 1. Bóc tách lấy ID của thư mục từ URL
    const folderId = source.url.split('/folders/')[1]?.split('?')[0];
	// URL folder GDrive dạng https://drive.google.com/drive/folders/1A2b3C4d5E6f?usp=sharing
	// .split('/folder/')[1] để lấy 1A2b3C4d5E6f?usp=sharing; .split('?')[0] để lấy 1A2b3C4d5E6f
    if (!folderId) {
        console.warn(
            `%c[ASS-CEE]%c fetcher: Link chuẩn chưa em? (GDrive: ${source})`, 
            "color: orange; font-weight: bold;",
            ""
        );
        return []
    }
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
        folderName.groupName = titleMatch ? titleMatch[1].trim() : "undefined_GDrive";
        folderName.id = folderId;
        
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
                    groupName: folderName.groupName
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
/**
 * Hàm kiểm tra file sub có tương ứng với ID cần tìm ko
 * @param {*} fileName tên file sub
 * @param {*} videoId ID video cần tìm
 * @returns boolean?
 */
function isMatchingSubtitle(fileName, videoId) {
	// Hàm check tên file có chứa YT ID, và bao quanh nó trong ngoặc () hoặc [] ko.
    const regex = new RegExp(`\\(${videoId}\\)|\\[${videoId}\\]`); 
    return regex.test(fileName);
}
/**
 * Hàm kết nối mạng có timeout (Gemini). Yêu cầu biến FETCH_TIMEOUT. (Gemini)
 * @param {*} url thì nó là link, tất nhiên rồi
 * @param {*} id id của link
 * @param {*} type dạng link (folder, file)
 * @returns 
 */
async function fetchWithTimeout(url, id = "undefined", type = "undefined") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const logLabel = `[ASS-CEE] fetcher: ${id}`;
    console.log(
        `%c${logLabel}%c Đang tải ${type} ${id}.`, 
        "color: orange; font-weight: bold;",
        ""
    );
	console.time(logLabel);
    const progressInterval = setInterval(() => {console.timeLog(logLabel, `(Đang kết nối)`);}, 1000);
    try {
        return await fetch(url, { signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(
				`%c${logLabel}%c -> Quá thời gian chờ ${FETCH_TIMEOUT/1000}s (timeout)`, 
				"color: orange; font-weight: bold;",
                ""
			);
        }
        throw error;
    } finally {
        clearTimeout(timer);
		clearInterval(progressInterval);
        console.timeEnd(logLabel);
    }
}

