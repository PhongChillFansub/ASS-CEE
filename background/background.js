// Code bằng tay
// v0.0.0.2 02jun26
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
  
  // Chạy đọc log trước khi sang handler
  if (msg && msg.type === 'LOG_FROM_CONTENTS') {
    const { type, text, url, timestamp } = msg.payload;
    const tabId = sender.tab ? `Tab ${sender.tab.id}` : 'Unknown Tab';
    const isSameLocation = (tabId === lastLogLocation.tabId && url === lastLogLocation.url);
    lastLogLocation = { tabId, url };
    const logPrefix = isSameLocation 
        ? `[${timestamp}]\n`
        : `[${timestamp}][${tabId}]\n[${url}]\n`;
    switch (type) {
      case 'error':
        console.error(`${logPrefix} %c[ASS-CEE]%c ${text}`, 
          "color: red, font-weight: bold;",
          ""
        );
        break;
      case 'warn':
        console.warn(`${logPrefix} %c[ASS-CEE]%c ${text}`, 
          "color: orange, font-weight: bold;",
          ""
        );
        break;
      default:
        console.log(`${logPrefix} %c[ASS-CEE]%c ${text}`, 
          "font-weight: bold;",
          ""
        );
    }
    sendResponse({ status: 'DEBUG' });
    return true; 
  }
  // Phần đọc handler
  const handler = handlers[msg.type];
  if (handler) {
    handler(msg.payload)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error(`[ASS-CEE] background: [RPC Error] ${msg.type}:`, err);
        sendResponse({ id: msg.id, status: 'ERROR', message: err.message });
      });
  } else {
    console.warn(`[ASS-CEE] background: [Unknown Message] ${msg.type}`);
    sendResponse({ status: 'ERROR', message: 'Unknown action' });
  } // Kết thúc cấu trúc rẽ nhánh kiểm tra handler hoạt động
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
    return { type: SUB.RESULTS, payload: await resolveSubtitles(payload.videoId)}; // resolveSubtitles()?
  },
  'SUB.SELECT': async (payload) => { // Xác nhận nguồn được user chọn
    const { videoId, candidate } = payload;
    const rawText = await fetchSubtitleText(candidate);
    const subObj = await processAndCacheSubtitle(videoId, candidate, rawText);
    return { status: 'HIT', data: subObj };
  },
}


const handlers = {
  
 
  // Handler mới: Chuyên tiếp nhận dữ liệu chuỗi thô từ thiết bị của user và parse lập tức
  'SUBTITLE.PARSE_RAW': async (payload) => {
    const { rawText, fileName } = payload;
    if (!rawText) {
      throw new Error("Dữ liệu tệp gửi lên không hợp lệ");
    }
    // Parse tệp thô trực tiếp bằng công cụ phân tích đã viết sẵn
    const parsedData = parseAegisubRaw(rawText);
    return { 
      status: 'HIT', 
      data: {
        videoId: 'local', // Định danh tạm cho video cục bộ để tương thích luồng vẽ
        fileObj: {
          id: 'local',
          fileName,
          url: 'local',
          sourceType: 'local',
          groupName: 'local'
        },
        parsedData: parsedData
      } 
    };
  }
};
/**
 * Hàm xử lý và điều phối tìm kiếm phụ đề dựa trên videoId (từ content.js?)
 * @param {*} videoId 
 * @returns status: HIT, EMPTY, ERROR, MULTIPLE
 * với data tương ứng HIT -> getSubtitleCache() hoặc , MULTIPLE -> candidates (xem fetcher.js)
 */
async function resolveSubtitles(videoId) {
  // --- BƯỚC 1: Kiểm tra bộ nhớ đệm (Cache) ---
  const cached = await getSubtitleCache(videoId);
  if (cached) {
    console.log(
      `%c[ASS-CEE]%c background: Tìm thấy cache của vid ${videoId}.`, 
      "font-weight: bold;",
      ""
    );
    return { status: 'HIT', data: cached };
  } else {
    console.log(
      `%c[ASS-CEE]%c background: Không tìm thấy cache của vid ${videoId}. Chuyển sang tìm nguồn`, 
      "font-weight: bold;",
      ""
    );
  }
  // --- BƯỚC 2: Quét tất cả các nguồn (GitHub/GDrive) ---
  const sources = await getSources();
  if (sources.length === 0) {
    console.log(
      `%c[ASS-CEE]%c background: Nguồn ko có file tương ứng cho ${videoId}.`, 
      "font-weight: bold;",
      ""
    );
    return { status: 'EMPTY' };
  }
  const candidates = await fetchSubtitleFile(sources, videoId, {});
  // --- BƯỚC 3: Xử lý kết quả quét (Decision Layer) ---
  if (candidates.length === 0) {
    // Trường hợp 1: Không tìm thấy file phụ đề nào trên hệ thống
    console.log(
      `%c[ASS-CEE]%c background: Nguồn ko có file tương ứng cho ${videoId}.`, 
      "font-weight: bold;",
      ""
    );
    return { status: 'EMPTY' };
  } else if (candidates.length === 1) {
    // Trường hợp 2: Chỉ có DUY NHẤT một lựa chọn phụ đề phù hợp (Auto-resolve)
    const candidate = candidates[0];
    try {
      const rawText = await fetchSubtitleText(candidate);
      const subObj = await processAndCacheSubtitle(videoId, candidate, rawText);
      console.log(
        `%c[ASS-CEE]%c background: Nguồn có 1 file tương ứng cho ${videoId}: ${candidate.fileName}.`, 
        "font-weight: bold;",
        ""
      );
      return { status: 'HIT', data: subObj };
    } catch (err) {
      console.error(
        `%c[ASS-CEE]%c background: Tự động xử lí bị lỗi (${videoId}: ${candidate.fileName}).`, 
        "color: red, font-weight: bold;",
        "",
        err
      );
      return { status: 'ERROR', data: err.message };
    }
  }
  // Trường hợp 3: Có nhiều kết quả phụ đề trùng khớp (Ambiguity)
  return { status: 'MULTIPLE', data: candidates };
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
async function processAndCacheSubtitle(videoId, candidate, rawText) {
  let subObj = { videoId, fileObj: candidate };
  subObj.parsedData = parseAegisubRaw(rawText);
  await addSubData(videoId, subObj);
  return subObj;
}
console.log(
  `%c[ASS-CEE]%c background: Đã sẵn sàng.`, 
  "font-weight: bold;",
  ""
);
