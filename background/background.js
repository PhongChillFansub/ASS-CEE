// Code bằng tay
// v0.0.0.2 05jun26
import { fetchSubtitleText, fetchSubtitleFile } from './fetcher.js';
// 2 hàm fetchSubtitleText, fetchSubtitleFile
import { addSource, getSourceList, removeSource, addSubData, getSubDataList, useSubData, removeSubData } from './storage.js';
// 3 hàm với link folder: addSource, getSourceList, removeSource
// 4 hàm với file sub: addSubData, getSubDataList, useSubData, removeSubData
import parser from './parser.js';
// 1 hàm parser
// Phần xử lí của background khi nhấn vào icon extension
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith("chrome://")) {
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "[ASS-CEE] Extension sẽ không kích hoạt ở trang này."
    });
    return;
  }
  // Bảo vệ extension tránh crash khi chạy các trang nội bộ trình duyệt (hoặc tab trống)
  const tabId = tab.id;
  // Định danh tab cần chạy, tránh xung đột với các tab khác
  try {
    // Kiểm tra xem extension đã từng nạp file core (ui.js) vào tab này chưa
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => typeof window.__ASS_CEE_UI_INJECTED__ !== 'undefined'
    });
    const isAlreadyInjected = result?.result;
    // Lấy kết quả kiểm tra
    if (!isAlreadyInjected) {
      // LẦN ĐẦU CLICK: Nạp tất cả các file để định nghĩa cấu trúc
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          "content/ui.js",
          "content/content.js"
        ]
      }); // Tạm thời chỉ sử dụng ui.js (thử nghiệm) và content.js
      // Đánh dấu đã nạp file thành công vào tab
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => { window.__ASS_CEE_UI_INJECTED__ = true; }
      });
      console.log("[ASS-CEE] background: Đã nạp toàn bộ file content lần đầu (ui.js) và ẩn (content.js).");
    } else {
      // CÁC LẦN CLICK SAU: CHỈ nạp đúng file điều khiển content.js để toggle
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/content.js"]
      });
      console.log("[ASS-CEE] background: Các lần sau: Chỉ chạy lệnh Toggle (trên content.js).");
    }
  } catch (err) {
    console.error("[ASS-CEE] background: Lỗi kích hoạt onClicked:", err);
  }
});
// Hàm giao tiếp với content.js và ui.js
let lastLogLocation = { tabId: "", url: "" };
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Chỉ xử lí theo chuẩn đã định nghĩa trong handler
  const handler = handlers[msg.type];
  if (handler) {
    handler(msg.payload)
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
      : `[${timestamp}][${tabId}]\n[${url}]\n`;
    console[type || "log"](`${logPrefix} [ASS-CEE] ${text}`);
    return { type: 'LOGGED' }; // return là thứ được try..catch tổng gửi trong sendResponse.
  },
  'SOURCE.ADD': async (payload) => { // Yêu cầu thêm nguồn
    const { url } = payload;
    if (!url) throw new Error("payload.url (SOURCE.ADD) trống");
    let folderGet = {} // Lấy dữ liệu bằng Tham chiếu (reference)
    await fetchSubtitleFile([{url}], "", folderGet); // Gọi fetchSubtitleFile* lần đầu
    if (!folderGet.type || !folderGet.groupName || !folderGet.id) {
      throw new Error("Ko thể trích xuất thông tin folder");
    }
    const source = {
      url,
      type: folderGet.type,
      folderName: folderGet.groupName,
      folderId: folderGet.id
    }; // Thiết lập cấu trúc dữ liệu cho obj nguồn folder
    return { type: 'SOURCE.ADDED', payload: await addSource(source) }; // Lưu nguồn vào cache
    // return là thứ được try..catch tổng gửi trong sendResponse.
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
  const sources = await getSources();
  if (sources.length === 0) {
    console.log(`[ASS-CEE] background: Không có thư mục nào để quét.`);
    return { type: 'SUB.EMPTY', payload: [] };
  }
  const candidates = await fetchSubtitleFile(sources, videoId, {}); // Quét danh sách nguồn
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
console.log([ASS-CEE] background: Đã sẵn sàng.`);
