// Code bằng tay
// v0.0.6 09juy26 (25jun26)
// storage.js
// Chức năng: chuyên xử lí lưu trữ trên chrome.storage.local.
// 7 hàm export là:
// 3 hàm với link folder: addSource, getSourceList, removeSource
const SUBTITLE_SOURCES_KEY = "ASSCEE_sourceList"; // Lưu tất cả link folder trong 1 key.
// 4 hàm với file sub: addSubData, getSubDataList, useSubData, removeSubData
const SUBTITLE_DATA_KEY_BASE = "ASSCEE_subData"; 
// Lưu các file sub trong key riêng biệt (do 1 file sub, thuần text đã có thể nặng đến 7MB)
/**
 * Hàm thêm nguồn (URL của folder GitHub/GDrive) vào bộ nhớ extension.
 * (do bộ nhớ theo dạng array, nên ở đây cập nhật dưới dạng spread, thay vì pop/push)
 * @param {*} source thô: { url, type, folderName, folderId }
 * @returns {Promise<Object>} Object nguồn đã được thêm thuộc tính savedAt
 */
export async function addSource(source = {}) {
  if (!source?.url?.trim()) {
    console.warn(`[ASS-CEE] storage: Nguồn ko hợp lệ: ${source?.url}`);
    return { success: false, error: "Dữ liệu nguồn không hợp lệ", url: source?.url };
  }
  const sources = await getSourceList(); // Lấy danh sách nguồn đã có để kiểm tra trùng lặp (hàm getSourceList đã fallback array trống)
  // Kiểm tra trùng lặp
  if (sources.some(item => item.url === source.url)) {
    console.warn(`[ASS-CEE] storage: Nguồn đã tồn tại: ${source?.url}`);
    return { success: false, error: "Nguồn này đã tồn tại trong danh sách", url: source.url };
  }  
  const createdSource = {
    ...source,
    savedAt: Date.now()
  };
  const updated = [...sources, createdSource];
  await chrome.storage.local.set({ [SUBTITLE_SOURCES_KEY]: updated });
  console.log(`[ASS-CEE] storage: Đã thêm nguồn: ${source.folderName}`);
  return { success: true, data: createdSource };
}
/**
 * Hàm lấy danh sách nguồn
 * @returns danh sách URL folder (dạng array).
 */
export async function getSourceList() {
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
  const sources = await getSourceList();
  const updated = sources.filter(s => s.savedAt !== time);
  const deleted = sources.filter(s => s.savedAt == time);
  await chrome.storage.local.set({ [SUBTITLE_SOURCES_KEY]: updated });
  console.log(`[ASS-CEE] storage: Đã xóa ${deleted.length} nguồn:\n   ${deleted.map(item => item.url).join('\n   ')}`);
  return updated;
}
/**
 * Hàm lưu dữ liệu file sub (obj) dựa trên videoId
 * @param {*} videoId đầu vào
 * @param {*} subtitleObj đầu vào dạng subObj (quy định trong file background.js, xem pipeline.txt)
 * @returns Ko có đầu ra trực tiếp. subObj là đầu ra gián tiếp (dạng tham chiếu)
 */
export async function addSubData(videoId, subtitleObj = {}) {
    // Chỉ lưu dữ liệu subtitleObj chứa parsedData (xem pipeline.txt)
    if (!videoId || typeof subtitleObj.parsedData !== "object") { 
        throw new Error("Dữ liệu file sub lưu cache không hợp lệ"); 
    }
    subtitleObj.cachedAt = Date.now()
    const subKey = `${SUBTITLE_DATA_KEY_BASE}_${videoId}`
    // cấu trúc key: ASSCEE_<videoId>
    await chrome.storage.local.set({ [subKey]: subtitleObj });
    // Luôn luôn ghi đè
    console.log(`[ASS-CEE] storage: Đã lưu cache sub obj cho vid: ${videoId}.`);
}
/**
 * Hàm lấy toàn bộ danh sách dữ liệu sub đang được lưu cache
 * @param {string} searchId Id của video cần lấy dữ liệu (nếu để trống thì trả về tất cả)
 * @returns {Promise<Object>} Object chứa tất cả videoId và subtitleObj đi kèm
 */
export async function getSubDataList(searchId = "") {
  // Lấy toàn bộ dữ liệu đang có trong storage
  const allData = await chrome.storage.local.get(null);
  const cacheList = []; // 1. Chuyển thành Mảng trống
  // Lọc và gom các key có tiền tố SUBTITLE_DATA_KEY_BASE+"_"
  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith(`${SUBTITLE_DATA_KEY_BASE}_`)) {
      const videoId = key.replace(`${SUBTITLE_DATA_KEY_BASE}_`, ""); // Lấy videoId gốc từ key
      // 2. Sử dụng .push() để thêm đối tượng trực tiếp vào mảng
      cacheList.push({
        ...value.fileObj,         // Đưa cái này lên ĐẦU để giải phóng các thuộc tính bên trong (để thuận tiện cho việc ghi cache này sang id khác)
        videoId,                  // Ghi đè videoId chuẩn xác lấy từ Key lưu trữ ở cuối (id mới)
        cachedId: value.videoId,
        cachedAt: value.cachedAt || null
      });
    }
  }
  // Nếu searchId được cung cấp, chỉ trả về các mục phù hợp
  if (searchId) {
    return cacheList.filter(item => item.videoId === searchId);
  }
  return cacheList; // Trả về mảng dạng: [ { videoId, cachedId, cachedAt, ...candidate }, ... ]
}
/**
 * Hàm lấy dữ liệu file sub (obj) dựa trên videoId
 * @param {*} videoId đầu vào
 * @returns parsedData
 */
export async function useSubData(videoId) {
  if (!videoId) return null;
  const subKey = `${SUBTITLE_DATA_KEY_BASE}_${videoId}`;
  const data = await chrome.storage.local.get(subKey);
  // Trả về dữ liệu bên trong key đó, nếu không có thì trả về null
  return data[subKey] || null;
}
/**
 * Hàm loại bỏ dữ liệu sub của một videoId cụ thể khỏi cache
 * @param {string} videoId 
 * @returns {Promise<boolean>} true nếu xóa thành công, false nếu ko có hành động xóa nào
 */
export async function removeSubData(videoId) {
  if (!videoId) {
    console.warn(`[ASS-CEE] storage: videoId trống, ko có obj để xóa.`);
    return false;
  }
  // Xác định đúng key dựa trên videoId tương tự như hàm useSubData
  const subKey = `${SUBTITLE_DATA_KEY_BASE}_${videoId}`;
  // Kiểm tra xem dữ liệu có tồn tại trước khi xóa (để hiển thị log chính xác)
  const data = await chrome.storage.local.get(subKey);
  if (!data[subKey]) {
    console.warn(`[ASS-CEE] storage: obj ${videoId} ko có dữ liệu để xóa.`);
    return false;
  }
  // Tiến hành xóa key cụ thể này khỏi chrome.storage.local
  await chrome.storage.local.remove(subKey);
  console.log(`[ASS-CEE] storage: Đã xóa cache sub obj của vid: ${videoId}.`);
  return true;
}