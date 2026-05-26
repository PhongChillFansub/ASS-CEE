// Code bằng tay
// v0.0.0.1 26may26
// Lưu 2 key khác nhau trên chrome.storage.local.
const SUBTITLE_SOURCES_KEY = "ASSCEE_sourceList";
const SUBTITLE_DATA_KEY = "ASSCEE_dataFile";
/**
 * Hàm thêm nguồn (URL của folder GitHub/GDrive) vào bộ nhớ extension.
 * (do bộ nhớ theo dạng array, nên ở đây cập nhật dưới dạng spread, thay vì pop/push)
 * @param {*} source thô: { url, name, id }
 * @returns {Promise<Object>} Object nguồn đã được thêm thuộc tính savedAt
 */
export async function addSource(source = {}) {
  if (!source?.url?.trim()) {
    throw new Error("Dữ liệu nguồn không hợp lệ");
    // Kiểm tra cấu trúc dữ liệu
  }
  const sources = (await getSources());
  // Lấy danh sách nguồn đã có để kiểm tra trùng lặp (hàm getSources đã fallback array trống)
  if (sources.some(item => item.url === source.url)) {
    // Kiểm tra nếu nguồn trùng lặp, báo lại và dừng
    throw new Error("Nguồn này đã tồn tại trong danh sách");
  }  
  const createdSource = {
    ...source,
    savedAt: Date.now()
  };
  const updated = [...sources, createdSource];
  await chrome.storage.local.set({ [SUBTITLE_SOURCES_KEY]: updated });
  console.log(
		`%c[ASS-CEE]%c storage: Đã thêm nguồn: ${source.name} (${createdSource.savedAt}).`, 
		"font-weight: bold;",
		""
	);
  return createdSource;
}
/**
 * Hàm lấy danh sách nguồn
 * @returns danh sách URL folder (dạng array).
 */
export async function getSources() {
  const data = await chrome.storage.local.get(SUBTITLE_SOURCES_KEY);
  const sources = data[SUBTITLE_SOURCES_KEY];
  // Nếu là mảng thì trả về mảng, nếu chưa có dữ liệu (undefined/null) thì trả về mảng rỗng []
  return Array.isArray(sources) ? sources : [];
}
/**
 * Hàm loại bỏ nguồn dựa trên thời gian. (cũng spread thay vì pop/push do bộ nhớ là array thay vì obj)
 * @param {*} time 
 * @returns true (boolean)
 */
export async function removeSource(time) {
  const sources = await getSources();
  const updated = sources.filter(s => s.savedAt !== time);
  const deleted = sources.filter(s => s.savedAt == time);
  await chrome.storage.local.set({ [SUBTITLE_SOURCES_KEY]: updated });
  return true;
  console.log(
		`%c[ASS-CEE]%c storage: Đã xóa ${deleted.length} nguồn:\n   ${deleted.map(item => item.url).join('\n   ')}`, 
		"font-weight: bold;",
		""
	);
}
/**
 * Hàm lấy dữ liệu file sub (obj) dựa trên videoId
 * @param {*} videoId đầu vào
 * @returns 
 */
export async function getSubtitleCache(videoId) {
  const data = await chrome.storage.local.get(SUBTITLE_DATA_KEY);
  const cache = data[STORAGE_KEY_SUBTITLES] || {};
  return cache[videoId] || null;
}
/**
 * Hàm lưu dữ liệu file sub (obj) dựa trên videoId
 * @param {*} videoId đầu vào
 * @param {*} subtitleObj đầu vào
 */
export async function saveSubtitleCache(videoId, subtitleObj = {}) {
    // Chỉ lưu dữ liệu subtitleObj dạng parsedData (xem pipeline.txt)
    if (!videoId || !subtitleObj || typeof subtitleObj !== "object" || Array.isArray(subtitleObj)) { 
        throw new Error("Dữ liệu file sub lưu cache không hợp lệ"); 
    }
    subtitleObj.cachedAt = Date.now()
    const storageData = await chrome.storage.local.get(SUBTITLE_DATA_KEY); 
    const data = storageData[SUBTITLE_DATA_KEY] || {};
    const updated = { ...data, [videoId]: subtitleObj };
    await chrome.storage.local.set({ [SUBTITLE_DATA_KEY]: updated }); 
    console.log(
      `%c[ASS-CEE]%c storage: Đã lưu cache sub obj cho vid: ${videoId}.`, 
      "font-weight: bold;",
      ""
    );
}
