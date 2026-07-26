// Code bằng tay
// v0.0.8 26juy26
import { fetchSubtitleText, fetchSubtitleFile } from './fetcher.js';
// 2 hàm fetchSubtitleText, fetchSubtitleFile
import { addSource, getSourceList, removeSource, addSubData, getSubDataList, useSubData, removeSubData } from './storage.js';
// 3 hàm với link folder: addSource, getSourceList, removeSource; 4 hàm với file sub: addSubData, getSubDataList, useSubData, removeSubData
import parser from './parser.js';
// 1 hàm parser
function checkValidateURL(url) {
  const BlacklistUrlPrefixes = [
    "chrome://",
    "coccoc://",
    "edge://",
    "https://drive.google.com",
    "about:"
  ];
  const WhitelistUrlPrefixes = [
    "https://www.youtube.com",
    "https://www.bilibili.com"
  ]
  if (!url || BlacklistUrlPrefixes.some(prefix => url.startsWith(prefix))) {
      console.warn(`[ASS-CEE] background: (Blacklist-Prefix) Không chạy content-side trên tab này:\n${url}`);
      return true;
  }
  if (!WhitelistUrlPrefixes.some(prefix => url.startsWith(prefix))) {
      console.warn(`[ASS-CEE] background: (Whitelist-Prefix) Không chạy content-side trên tab này:\n${url}`);
      return true;
  }
  return false; 
}
/**
 * (6.1.)1. Hàm gửi dữ liệu cho renderer chạy (msg: {type: "RENDER", payload: subObj})
 * @param {*} subObj subObj (xem mục 2.4.3.1 pipeline)
 */
async function renderSendData(subObj) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); 
  // Lấy array các tab (thực ra có mỗi 1 cái, vì vừa active vừa là currentWindow)
  if (checkValidateURL(tab?.url)) return; 
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'RENDER', payload: subObj });
    console.log("[ASS-CEE] background: Gửi tín hiệu render thành công.");
  } catch (error) {
    console.error("[ASS-CEE] background: Gửi tín hiệu render thất bại.", error.message);
  } // Check cả chương trình chạy của renderer (có lẽ thế, vì tín hiệu này là chạy luôn hàm render() trong renderer.)
  return;
}
(/**
 * 2. Hàm lập trình xử lí của background khi nhấn vào icon extension (chạy luôn)
 */
function onClickedListener() {
  let isProcessing = false; // Chú ý: background ngủ thì biến bị reset về false (nhưng cooldown để ngủ là 30s, vẫn cần fallback là check loaded.)
  chrome.action.onClicked.addListener(async (tab) => {
    if (checkValidateURL(tab?.url)) return;
    if (isProcessing) {
      console.warn(`[ASS-CEE] background: Tự động dừng xử lí onClick khi có luồng khác đang chạy (người dùng spam).`);
      return;
    } // Tránh người dùng click nhiều lần 1 lúc
    isProcessing = true;
    const tabId = tab.id;
    try { // iframe để beta lo.
      let loaded = false;
      try {
        loaded = await chrome.tabs.sendMessage(tabId, { action: "TOGGLE_OVERLAY_SIGNAL" });
      } catch (err) {
        console.warn("[ASS-CEE] background: Lỗi khi check content-side. Coi như chưa tải.", err.message);
      }
      if (!loaded) {
        console.log(`[ASS-CEE] background: (${tab.id}) Tải content-side lần đầu.`);
        await chrome.scripting.insertCSS({
          target: { tabId, allFrames: false },
          files: ["content/ui.css"]
        });
        await chrome.scripting.executeScript({
          target: { tabId, allFrames: false },
          files: ["content/content.js"]
        });
      } else {
        console.log(`[ASS-CEE] background: (${tab.id}) Tải content-side có sẵn. (Toggle)`);
      }
    } catch (err) {
      console.error("[ASS-CEE] background: Lỗi tải content-side:", err.message);
    } finally {
      setTimeout(() => { isProcessing = false; }, 100); // Cooldown 100ms.
    }
  });
})();
(/**
 * 3. Hàm lập trình giao tiếp của background-side với content-side (chạy luôn)
 */
function onHandlersListener() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const handler = handlers[msg.type];
    if (handler) {
      Promise.resolve(handler(msg.payload, sender))
        .then(result => sendResponse(result))
        .catch(err => {
          console.error(`[ASS-CEE] background: handlers có vấn đề ở ${msg.type}:`, err);
          sendResponse({ type: 'ERROR', payload: err.message });
        });
    } else {
      console.error(`[ASS-CEE] background: msg ngoài chuẩn handler:`, msg);
      sendResponse({ type: 'ERROR', payload: 'Unknown action' });
    }
    return true; 
  });
})();
// Phần định nghĩa giao thức (xem pipeline mục 3.)
let lastLogLocation = { tabId: "", url: "", tabTitle: "" };
const handlers = {
  // Mặc định cấu trúc chuẩn là msg = { type, payload }. Ở đây lấy msg.type làm key của obj.
  'LOG': async (payload, sender) => { // Log
    // to-do: đoạn này ko có comment chú thích?
    const { type, text, url, title, timestamp, extra } = payload;
    const tabId = sender.tab?.id; // tab.id (background lấy)
    const tabTitle = sender.tab?.title || '<Ko thấy tiêu đề tab.>'; // tab.title (background lấy để kiểm tra với phía bên content)
    const isSameLocation = (tabId === lastLogLocation.tabId && url === lastLogLocation.url && tabTitle === lastLogLocation.tabTitle);
    // Kiểm tra tabId, url, tabTitle trùng khớp
    const isTabTitleConfusing = ((tabId !== lastLogLocation.tabId || url !== lastLogLocation.url) && tabTitle === lastLogLocation.tabTitle);
    // tabId hoặc url khác mà tabTitle ko đổi?
    if (url) lastLogLocation = { tabId, url, tabTitle }; // Chỉ cập nhật lastLogLocation nếu có url
    const tabInfo = (tabId ? `${tabId}: ${isTabTitleConfusing ? "<Tên tab bị lệch>" : tabTitle }` : 'Unknown Tab');
    const orgTabInfo = isTabTitleConfusing ? {tabTitle} : "";
    const logPrefix = isSameLocation 
      ? `[${timestamp.toLocaleTimeString()}]\n`
      : `[${timestamp.toLocaleTimeString()} (${timestamp.toISOString()})][${tabInfo}]\n[${url}]\n`;
    const consoleMethod = type || "log";
    const formattedText = type !== 'table' ? `${logPrefix}[ASS-CEE] content: ${text}` : text;
    if (extra) console[consoleMethod](formattedText, orgTabInfo, extra);
    else console[consoleMethod](formattedText);
    return { type: 'LOGGED' }; // Làm cảnh. Vì ở content-side ko đọc nội dung response khi gửi log.
  },
  'SOURCE.ADD': async (payload) => { // Yêu cầu thêm nguồn
    const { url } = payload;
    if (!url) {
      return { type: 'SOURCE.NOT_ADDED', payload: "payload.url (SOURCE.ADD) trống (undefined)" };
    }
    const urls = url.split('\n').map(u => u.trim()).filter(u => u !== "");
      // Tách danh sách URL bằng dấu xuống dòng, loại bỏ khoảng trắng và dòng trống
    if (urls.length === 0) {
      return { type: 'SOURCE.NOT_ADDED', payload: "payload.url (SOURCE.ADD) trống (string trống)" };
    }
    const sourcesToFetch = urls.map(singleUrl => ({ url: singleUrl }));
    await fetchSubtitleFile(sourcesToFetch, "", true);  // Gọi fetchSubtitleFile* lần đầu
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
          return { success: false, error: source.error, url: source.url }; // Chú ý: ở đây return trong payload (return addedResults)
        }
        return await addSource(source); // Chú ý: ở đây return trong payload (return addedResults)
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
    // const { videoId, folderMode } = payload
    return resolveSubtitles(payload.videoId, payload.folderMode); // resolveSubtitles()?
  },
  'SUB.SELECT': async (payload) => { // Xác nhận nguồn được user chọn
    const { videoId, candidate } = payload;
    const rawText = await fetchSubtitleText(candidate);
    return processSubtitles(videoId, candidate, rawText); // processSubtitles()?
  },
  'SUB.USE_CACHE': async (payload) => { // Yêu cầu sử dụng cache file sub
    // const { videoId } = payload;
    try {
      const subObj = await useSubData(payload.videoId);
      return { type: 'SUB.READY', payload: subObj };
    } catch (err) {
      return { type: 'ERROR', payload: err.message };
    }
  },
  'SUB.GET_ALL': async (payload) => { // Yêu cầu xem cache file sub
    // const { videoId } = payload
    return { type: 'SUB.LIST', payload: await getSubDataList(payload.videoId) };
  },
  'SUB.REMOVE': async (payload) => { // Yêu cầu xóa cache file sub (xóa theo videoId)
    // const { videoId } = payload
    return { type: 'SUB.REMOVED', payload: await removeSubData(payload.videoId) };
  },
  'SUB.LOCAL': async (payload) => { // Nhận nguồn từ thiết bị của user vào cache
    const { videoId, rawText, fileName } = payload;
    if (!rawText) throw new Error("Dữ liệu tệp gửi lên trống?");
    const localFileData = { // Tương tự candidate
      id: `local-${Date.now()}`,
      fileName,
      fetchUrl: 'local',
      viewUrl: 'local',
      sourceType: 'local',
      groupName: 'local'
    }
    return processSubtitles(videoId, localFileData, rawText); // local cũng lưu cache.
  },
}
/**
 * 4. Hàm xử lý và điều phối tìm kiếm phụ đề dựa trên videoId (ko tìm cache)
 * @param {*} videoId Id của video cần tìm kiếm phụ đề (trống nếu tìm kiếm toàn bộ sub trong folder, hoặc refetch folder)
 * @param {*} folderMode Nếu true thì sẽ tìm tất cả file sub có trong các nguồn (dùng khi refetch), nếu false thì sẽ tìm file sub tương ứng với videoId (dùng khi tìm kiếm bình thường)
 * @returns SOURCE.LIST, SUB.LIST tùy theo folderMode. Hoặc ERROR do lỗi.
 */
async function resolveSubtitles(videoId, folderMode) {
  // Đầu ra luôn là dạng { type: "", payload: "" }
  const sources = await getSourceList();
  if (sources.length === 0) {
    console.log(`[ASS-CEE] background: Không có thư mục nào để quét.`);
    return { type: 'SOURCE.LIST', payload: [] };
  }
  const candidates = await fetchSubtitleFile(sources, videoId, folderMode); // Quét danh sách nguồn
  // Nếu videoId === "" và folderMode === true thì tức là đang refetch. Trả về cấu trúc tương tự 'SOURCE.GET_ALL', 'SOURCE.REMOVE'
  if (videoId === "" && folderMode) {
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
      return { type: 'SOURCE.LIST', payload: await getSourceList() };
    } catch (err) {
      console.error("[ASS-CEE] background: Gặp lỗi trong quá trình refetch và ghi đè cache:", err);
      return { type: 'ERROR', payload: err.message };
    }
  }
  // Nếu videoId === "" và folderMode === false thì tức là đang tìm tất cả file sub có trong các nguồn
  console.log(`[ASS-CEE] background: Có ${candidates.length} file cho vid "${videoId}". Gửi thông tin cho content-side.`)
  return { type: 'SUB.LIST', payload: candidates }; // candidates (xem mục 2.3.2 pipeline)
}
/**
 * 5. Hàm xử lý và lưu cache.
 * @param {*} videoId videoId hiện tại của tab (để lưu cache)
 * @param {*} candidate xem mục 2.3.2.
 * @param {*} rawText 
 * @returns {object} gửi dữ liệu cho cả renderer ("RENDER") và phản hồi lại cho UI ("SUB.READY" hoặc "ERROR").
 * @returns subObj sẽ được hoàn thiện ở hàm này. Xem mục 2.4.3.1.
 */
async function processSubtitles(videoId, candidate, rawText) {
  const subObj = { videoId, fileObj: candidate };
  subObj.parsedData = parser(rawText);
  try {
    await addSubData(videoId, subObj); // Lưu dữ liệu ở storage
    await renderSendData(subObj); // Gửi dữ liệu cho renderer
    return { type: 'SUB.READY', payload: subObj }; // Trả dữ liệu cho UI
  } catch (err) {
    return { type: 'ERROR', payload: err.message };
  }
}
console.log(`[ASS-CEE] background: Đã sẵn sàng.`);
