// Code bằng tay
// v0.0.0.3 12jun26
import { fetchSubtitleText, fetchSubtitleFile } from './fetcher.js';
// 2 hàm fetchSubtitleText, fetchSubtitleFile
import { addSource, getSourceList, removeSource, addSubData, getSubDataList, useSubData, removeSubData } from './storage.js';
// 3 hàm với link folder: addSource, getSourceList, removeSource
// 4 hàm với file sub: addSubData, getSubDataList, useSubData, removeSubData
import parser from './parser.js';
// 1 hàm parser
// Phần xử lí của background khi nhấn vào icon extension
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) return;
  const tabId = tab.id;
  try {
    // Thử gửi tin nhắn trước
    await chrome.tabs.sendMessage(tabId, { action: "TOGGLE_OVERLAY_SIGNAL" });
    console.log("[ASS-CEE] background: Đã gửi tín hiệu Toggle.");
  } catch (err) {
    // Nếu lỗi (do chưa nạp script hoặc trang vừa reload), tiến hành nạp file thủ công
    console.log("[ASS-CEE] background: Phát hiện chưa nạp ui.js lần đầu, đang tiến hành nạp trực tiếp...");
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/ui.js"] // Nạp các file cần thiết
      });
      // Gửi lại tín hiệu sau khi đã nạp xong (nếu ui.js không tự kích hoạt khi chạy lần đầu)
      await chrome.tabs.sendMessage(tabId, { action: "TOGGLE_OVERLAY_SIGNAL" });
    } catch (injectErr) {
      console.error("[ASS-CEE] background: Lỗi khi nạp file trực tiếp:", injectErr);
    }
  }
});
// Hàm giao tiếp với content.js và ui.js
let lastLogLocation = { tabId: "", url: "" };
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Chỉ xử lí theo chuẩn đã định nghĩa trong handler
  const handler = handlers[msg.type];
  if (handler) {
    handler(msg.payload, sender, sendResponse)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error(`[ASS-CEE] background: handlers có vấn đề ở ${msg.type}:`, err);
        sendResponse({ type: 'ERROR', payload: err.message });
      });
  } else {
    console.error(`[ASS-CEE] background: msg ngoài chuẩn handler:`, msg);
    sendResponse({ type: 'ERROR', payload: 'Unknown action' });
  }
  return true; // Kích hoạt cơ chế giữ kênh kết nối mở phục vụ cho các tiến trình xử lý bất đồng bộ
});
const handlers = {
  // Mặc định cấu trúc chuẩn là msg = { type, payload }. Ở đây lấy msg.type làm key của obj.
  'LOG': async (payload, sender) => { // Log
    const { type, text, url, timestamp } = payload;
    // Mặc định cấu trúc chuẩn là payload = { type, text, url, timestamp }
    const tabInfo = sender.tab ? `${sender.tab.id}: ${sender.tab.title}` : 'Unknown Tab';
    const tabId = sender.tab?.id;
    // Lấy thông tin tab
    const isSameLocation = (tabId === lastLogLocation.tabId && url === lastLogLocation.url);
    lastLogLocation = { tabId, url };
    // Kiểm tra với log trước
    const logPrefix = isSameLocation 
      ? `[${timestamp}]\n`
      : `[${timestamp}][${tabInfo}]\n[${url}]\n`;
    console[type || "log"](`${logPrefix} [ASS-CEE] ${text}`);
    return { type: 'LOGGED' }; // return là thứ được try..catch tổng gửi trong sendResponse.
  },
  'SOURCE.ADD': async (payload) => { // Yêu cầu thêm nguồn
    const { url } = payload;
    if (!url) {
      return { type: 'SOURCE.NOT_ADDED', payload: "payload.url (SOURCE.ADD) trống (undefined)" };
    }
    const urls = url
      .split('\n')
      .map(u => u.trim())
      .filter(u => u !== "");
      // Tách danh sách URL bằng dấu xuống dòng, loại bỏ khoảng trắng và dòng trống
    if (urls.length === 0) {
      return { type: 'SOURCE.NOT_ADDED', payload: "payload.url (SOURCE.ADD) trống (string trống)" };
    }
    const sourcesToFetch = urls.map(singleUrl => ({ url: singleUrl }));
    await fetchSubtitleFile(sourcesToFetch, "");  // Gọi fetchSubtitleFile* lần đầu
    const finalizedSources = [];
    for (const sourceItem of sourcesToFetch) {
      // Nếu không trích xuất được thông tin, đánh dấu lỗi riêng cho URL đó thay vì chặn toàn bộ tiến trình
      if (!sourceItem.type || !sourceItem.folderName || !sourceItem.folderId) {
          finalizedSources.push({
            url: sourceItem.url,
            error: `Không thể trích xuất thông tin folder cho URL này`
          });
      } else {
          finalizedSources.push({
            url: sourceItem.url,
            type: sourceItem.type,
            folderName: sourceItem.folderName,
            folderId: sourceItem.folderId
          });
      }
    }
    // Thực hiện thêm từng nguồn vào storage và gom kết quả lại
    const addedResults = await Promise.all(
      finalizedSources.map(async (source) => {
        if (source.error) {
          return { success: false, error: source.error, url: source.url };
        }
        return await addSource(source);
      })
    );
    // Trả về danh sách kết quả chi tiết của từng URL để phía content-side hiển thị thông báo phù hợp
    return { type: 'SOURCE.ADDED', payload: addedResults };
  },
  'SOURCE.GET_ALL': async () => { // Yêu cầu xem nguồn
    // const undefined = payload
    return { type: 'SOURCE.LIST', payload: await getSourceList() };
  },
  'SOURCE.REMOVE': async (payload) => { // Yêu cầu xóa nguồn
    // const { savedAt } = payload
    return { type: 'SOURCE.REMOVED', payload: await removeSource(payload.savedAt)};
  },
  'SUB.SEARCH': async (payload) => { // Yêu cầu tìm kiếm nguồn
    // const { videoId } = payload
    return resolveSubtitles(payload.videoId); // resolveSubtitles()?
  },
  'SUB.SELECT': async (payload) => { // Xác nhận nguồn được user chọn
    const { videoId, candidate } = payload;
    const rawText = await fetchSubtitleText(candidate);
    return processSubtitles(videoId, candidate, rawText); // processSubtitles()?
  },
  'SUB.GET_ALL': async () => { // Yêu cầu xem cache file sub
    // const undefined = payload
    return { type: 'SUB.LIST', payload: await getSubDataList() };
  },
  'SUB.REMOVE': async () => { // Yêu cầu xóa cache file sub (xóa theo videoId)
    // const { videoId } = payload
    return { type: 'SUB.REMOVED', payload: await removeSubData(payload.videoId) };
  },
  'SUB.LOCAL': async (payload) => { // Nhận nguồn từ thiết bị của user vào cache
    const { videoId, rawText, fileName } = payload;
    if (!rawText) throw new Error("Dữ liệu tệp gửi lên trống?");
    const localFileData = { // Tương tự candidate
      id: `local-${Date.now()}`,
      fileName,
      url: 'local',
      sourceType: 'local',
      groupName: 'local'
    }
    return processSubtitles(videoId, localFileData, rawText); // local cũng lưu cache.
  }
}
/**
 * Hàm xử lý và điều phối tìm kiếm phụ đề dựa trên videoId
 * @param {*} videoId 
 * @returns SUB.READY: có thể dùng ngay, .EMPTY: trống, .WAIT: có ít nhất 1 file tương ứng, cần content-side xử lí
 */
async function resolveSubtitles(videoId) {
  // Đầu ra luôn là dạng { type: "", payload: "" }
  const cached = await useSubData(videoId);
  // Lấy cache
  if (cached) {
    console.log(`[ASS-CEE] background: Đã tìm thấy cache cho vid ${videoId}.`);
    return { type: 'SUB.READY', payload: cached }; // cached = value của key SUBTITLE_DATA_KEY (xem mục 2.4.3 pipeline)
  } 
  console.log(`[ASS-CEE] background: Ko có cache cho vid ${videoId}. Đang tìm nguồn...`)
  // Lấy danh sách nguồn để quét
  const sources = await getSourceList();
  if (sources.length === 0) {
    console.log(`[ASS-CEE] background: Không có thư mục nào để quét.`);
    return { type: 'SUB.EMPTY', payload: [] };
  }
  const candidates = await fetchSubtitleFile(sources, videoId); // Quét danh sách nguồn
  // Nếu videoId === "" thì tức là đang refetch. Trả về cấu trúc tương tự 'SOURCE.GET_ALL', 'SOURCE.REMOVE'
  if (videoId === "") {
    try {
      console.log(`[ASS-CEE] background: Đã refetch các nguồn sẵn có. Đang ghi đè lên cache.`);
      const oldSources = await getSourceList();
      for (const src of oldSources) {
        await removeSource(src.savedAt);
      } // Xóa hoàn toàn cache nguồn cũ dựa trên thời gian 
      console.log(`[ASS-CEE] background: Đã xóa cache nguồn cũ. Đang ghi đè dữ liệu mới.`);
      for (const src of sources) {
        if (src.type && src.folderName && src.folderId) {
          await addSource({
            url: src.url,
            type: src.type,
            folderName: src.folderName,
            folderId: src.folderId
          });
        }
      } // Ghi lại các nguồn đã refetch
      console.log(`[ASS-CEE] background: Đã ghi đè dữ liệu mới.`);
      const updatedSources = await getSourceList();
      return { type: 'SOURCE.LIST', payload: updatedSources };
    } catch (err) {
      console.error("[ASS-CEE] background: Gặp lỗi trong quá trình refetch và ghi đè cache:", err);
      return { type: 'ERROR', payload: err.message };
    }
  }
  // Kiểm tra kết quả quét
  if (candidates.length === 0) { // Trường hợp 1: Ko có file tương ứng
    console.log(`[ASS-CEE] background: Ko có file cho vid ${videoId}.`);
    return { type: 'SUB.EMPTY', payload: [] };
  } // Ở sau là trường hợp 2: Có ít nhất 1 file tương ứng. Đưa cho content-side xử lí
    console.log(`[ASS-CEE] background: Có ${candidates.length} file cho vid ${videoId}. Gửi thông tin cho content-side.`)
    return { type: 'SUB.WAIT', payload: candidates }; // candidates (xem mục 2.3.2 pipeline)
}
/**
 * Hàm xử lý bóc tách định dạng dữ liệu dựa trên parseMode và lưu Cache
 * @param {*} videoId 
 * @param {*} candidate {
    id,
    fileName,
    url,
    sourceType: 'gdrive' hoặc 'github',
    groupName
  } 
 * @param {*} rawText 
 * @returns subObj quy định ở hàm này. Xem pipeline.txt
 */
async function processSubtitles(videoId, candidate, rawText) {
  let subObj = { videoId, fileObj: candidate };
  subObj.parsedData = parser(rawText);
  await addSubData(videoId, subObj);
  return { type: 'SUB.READY', payload: subObj }
}
console.log(`[ASS-CEE] background: Đã sẵn sàng.`);
