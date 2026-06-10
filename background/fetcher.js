// Code bằng tay
// v0.0.0.2 10jun26
const FETCH_TIMEOUT = 60000; // Tối đa 60 giây kết nối và nhận dữ liệu. Dùng cho hàm fetchWithTimeout().
const VALID_FILE_SIGNATURE = ["[Script Info]", "[V4+ Styles]", "[Events]"];
// Danh sách các nội dung mà parser dùng để đánh dấu. Dùng cho hàm validateSubtitleContent().
// fetcher.js
// Chức năng: xử lí ban đầu, giai đoạn từ danh sách link thư mục nguồn đến giai đoạn có file sub thô (rawText)
// 2 hàm export là fetchSubtitleText (từ link file sub tới rawText)
// và fetchSubtitleFile (từ danh sách link thư mục nguồn đến danh sách link file sub)
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
		console.error(`[ASS-CEE] fetcher: Không thể tải file từ nguồn ${candidate.id}, ${candidate.fileName}`);
		throw new Error("Không thể tải file từ nguồn.")
	}
    const text = await resp.text();
	const contentLength = resp.headers.get("content-length");
	if (contentLength) {
		const byteSize = parseInt(contentLength, 10);
		if (byteSize > 10*1024*1024) {
            console.warn(`[ASS-CEE] fetcher: Chú ý file sub ${candidate.id}, ${candidate.fileName} có dung lượng trên 10MB (${(byteSize / (1024 * 1024)).toFixed(2)} MB)`);
        }
	} else {
		console.warn(`[ASS-CEE] fetcher: Không tìm thấy thông tin dung lượng file sub ${candidate.id}, ${candidate.fileName}`);
	}
	// Lấy text của file sub.
    validateSubtitleContent(text);
	// Kiểm tra tính hợp lệ của file sub (check tồn tại các dòng đánh dấu như [Script Info], [V4+ Styles], [Events])
    console.log(`[ASS-CEE] fetcher: Đã fetch text của file ${candidate.fileName} xong.`);
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
 * @param {*} sources array các obj folderData = { url, // bắt buộc
        type, folderName, folderId, // chạy lần đầu sẽ được cấp
        savedAt, // ko sử dụng, do storage.js cấp (addSource())
    }
 * @param {*} videoId id YT video cần tìm
 * @param {*} folderGet tham chiếu để lấy các thông tin { type, folderName, folderId }
 * @returns DANH SÁCH (array) các file theo cấu trúc candidate {
        id,
        fileName,
        url,
        sourceType: 'gdrive' hoặc 'github',
        groupName
    }
 */
export async function fetchSubtitleFile(sources, videoId) {
    const scanPromises = sources.map(async (source) => {
        // source = folderData
        // Ưu tiên dùng source.type có sẵn, nếu chạy lần đầu chưa có thì check qua URL
        const type = source.type || (
            source.url?.includes('github.com') 
                ? 'github' 
                : (source.url?.includes('drive.google.com') && source.url?.includes('folders')) 
                    ? 'gdrive' 
                    : null
        ); 
        source.type = type; // Chạy lần đầu được cấp .type ở đây
        let folderGet = {};
        let result = [];
        if (type === 'github') {
            result = await scanGitHub(source, videoId, folderGet); // Chạy lần đầu được cấp .folderName, .Id ở đây
        } else if (type === 'gdrive') {
            result = await scanGDrive(source, videoId, folderGet); // Chạy lần đầu được cấp .folderName, .Id ở đây
        } else {
            console.warn("[ASS-CEE] fetcher: Link chuẩn chưa em?\n", source);
            return []; // Trả về array các file đáp ứng videoId trong folder đang xét (trống)
        }
        source.folderName = source.groupName || folderGet.groupName;
        source.folderId = source.folderId || folderGet.id;
        return result;
    });
    const results = await Promise.allSettled(scanPromises); // Chờ tất cả các luồng quét kết thúc hết để check videoId
    if (!videoId || videoId.trim() === "") {
        console.log("[ASS-CEE] fetcher: Coi như link folder chạy lần đầu (đã nạp xong folderName và folderId)\n", sources);
        return []; 
    }
    // Gom và làm phẳng danh sách file sub tìm được
    const candidates = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    // Sắp xếp file theo thứ tự bảng chữ cái ABC
	candidates.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.fileName.localeCompare(b.fileName));
	// So sánh theo groupName trước, sau đó là theo fileName. 
    console.log(`[ASS-CEE] fetcher: Đã tìm xong các file tương ứng. (${videoId}, trả về ${candidates.length})`);
    return candidates;
}
/**
 * Hàm quét 1 thư mục GitHub
 * @param {*} source {url}, chứa string URL thư mục GitHub
 * @param {*} videoId id YT video cần tìm
 * @param {*} folderGet { type, folderName, folderId } tham chiếu để lấy dữ liệu folder.
 * @returns DANH SÁCH các file theo cấu trúc candidate {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
    }
 */
async function scanGitHub(source, videoId, folderGet) {
    // 1. Kiểm tra cấu trúc URL
    const regex = /github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/?(.*)/;
    // Cấu trúc link GitHub folder chuẩn 
    const match = source.url.match(regex);
    if (!match) {
        console.warn(`[ASS-CEE] fetcher: Link chuẩn chưa em?\n(GitHub: ${source.url})`);
        return []; // Nếu URL không đúng chuẩn, báo lại
    }
    const [_, owner, repo, branch, path] = match;
    folderGet.groupName = `${path}`;
    folderGet.id = `${owner}/${repo}/${branch}`;
    // Trích xuất các thông tin trong URL, lưu vào groupName để xử lí và hiển thị sau này
    const results = [];
    try {
        // 2. Tạo URL API và quét thư mục
        const url =`https://api.github.com/repos/${owner}/${repo}/contents/${path || ""}?ref=${branch}`;
        const resp = await fetchWithTimeout(url, folderGet.groupName, "folder");
        // fetchWithTimeout()?
        if (!resp.ok) return [];
        const items = await resp.json();
        if (!Array.isArray(items)) {
            console.warn(`[ASS-CEE] fetcher: Lag? (GitHub API ko trả về array, folder: ${folderGet.groupName})`);
            return [];
            // Kiểm tra nếu trả về ko phải array các file
        }
        if (!videoId) {
            // Nếu ko có videoId (có chủ ý: để lấy dữ liệu folderGet.groupName và .id)
            console.log(`[ASS-CEE] fetcher: Đã lấy xong dữ liệu thư mục GitHub lần đầu: ${folderGet.groupName})`)
            return [];
        }
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
                    groupName: folderGet.groupName
                }); 
            }
        }

    } catch (e) {
        console.error("[ASS-CEE] fetcher: Lỗi quét GitHub:", e);
    }
    console.log(
		`[ASS-CEE] fetcher: Đã quét xong folder ${folderGet.groupName}(${folderGet.id})`, 
		"font-weight: bold;",
		""
	);
    return results;
    // phụ thuộc các hàm ngoài là fetchWithTimeout() và isMatchingSubtitle()
}
/**
 * Hàm quét 1 thư mục GDrive
 * @param {*} source {url}, chứa string URL thư mục GDrive
 * @param {*} videoId id YT video cần tìm
 * @param {*} folderGet { type, folderName, folderId } tham chiếu để lấy dữ liệu folder.
 * @returns DANH SÁCH các file theo cấu trúc candidate {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
  } 
 */
async function scanGDrive(source, videoId, folderName = { groupName: '',id: '' }) {
	// Hàm quét thư mục GDrive (Gemini, đã check)
    // 1. Bóc tách lấy ID của thư mục từ URL
    const folderId = source.url.split('/folders/')[1]?.split('?')[0];
	// URL folder GDrive dạng https://drive.google.com/drive/folders/1A2b3C4d5E6f?usp=sharing
	// .split('/folder/')[1] để lấy 1A2b3C4d5E6f?usp=sharing; .split('?')[0] để lấy 1A2b3C4d5E6f
    if (!folderId) {
        console.warn(`[ASS-CEE] fetcher: Link chuẩn chưa em?\n(GDrive: ${source.url})`);
        return []
    }
	// Nếu ko tìm thấy Id (vd: split('/folder/') ko hoạt động) thì trả về trống.
	console.log(`[ASS-CEE] fetcher: Đang tìm thư mục GDrive ${folderId}`);
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
        if (!videoId) {
            // Nếu ko có videoId (có chủ ý: để lấy dữ liệu folderName.groupName và .id)
            console.log(`[ASS-CEE] fetcher: Đang dò lấy dữ liệu thư mục GDrive: ${folderName.groupName})`)
            return [];
        }
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
        console.error("[ASS-CEE] fetcher: Lỗi quét Google Drive:", e);
    }
    console.log(`[ASS-CEE] fetcher: Đã quét xong folder ${folderName.groupName}(${folderName.id})`);
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
    if (!videoId) return false;
    // Nếu không có videoId hoặc videoId trống ("" để chỉ scan lấy tên folder), trả về false luôn
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
    console.log(`${logLabel} Đang tải ${type} ${id}.`);
	console.time(logLabel);
    const progressInterval = setInterval(() => {console.timeLog(logLabel, `(Đang kết nối)`);}, 1000);
    try {
        return await fetch(url, { signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`${logLabel} -> Quá thời gian chờ ${FETCH_TIMEOUT/1000}s (timeout)`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
		clearInterval(progressInterval);
        console.timeEnd(logLabel);
    }
}

