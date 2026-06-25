// Code bằng tay
// v0.0.0.4 25jun26
import { fetchSubtitleText, fetchSubtitleFile } from './fetcher.js';
// 2 hàm fetchSubtitleText, fetchSubtitleFile
import { addSource, getSourceList, removeSource, addSubData, getSubDataList, useSubData, removeSubData } from './storage.js';
// 3 hàm với link folder: addSource, getSourceList, removeSource; 4 hàm với file sub: addSubData, getSubDataList, useSubData, removeSubData
import parser from './parser.js';
// 1 hàm parser
/**
 * Hàm gửi data cho render
 * @param {*} subObj subObj (xem mục 2.4.3.1 pipeline)
 */
async function renderSendData(subObj) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("coccoc://") || tab.url.startsWith("edge://")) {
    console.log("[ASS-CEE] background: Không render trên tab này.");
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'RENDER', payload: subObj });
    console.log("[ASS-CEE] background: Gửi tín hiệu render thành công.");
  } catch (error) {
    console.log("[ASS-CEE] background: Gửi tín hiệu render thất bại.", error.message);
  }
  return;
}
/**
 * Hàm phụ trợ để gửi tin nhắn đến tất cả các frames trong một Tab (thử nghiệm)
 * @param {*} tabId 
 * @param {*} message 
 */
async function sendMessageToAllFrames(tabId, message) {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    let atLeastOneSuccess = false; 
    const sendPromises = frames.map(async (frame) => {
      try {
        await chrome.tabs.sendMessage(tabId, message, { frameId: frame.frameId });
        atLeastOneSuccess = true; // Ghi nhận gửi thành công cho frame này
      } catch (err) {
        // Bỏ qua lỗi kết nối của các iframe không có bộ lắng nghe tin nhắn
      }
    });
    await Promise.all(sendPromises);
    return atLeastOneSuccess;
  } catch (e) {
    console.error("[ASS-CEE] background: Lỗi khi lấy danh sách frames để gửi tin nhắn:", e);
    return false;
  }
}
// Phần xử lí của background khi nhấn vào icon extension
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("coccoc://") || tab.url.startsWith("edge://")) {
    console.log("[ASS-CEE] background: Không thể nạp ui.js trên trang này do hạn chế của trình duyệt.");
    return;
  }
  const tabId = tab.id;
  try {
    // LẦN 1: Thử gửi tin nhắn trực tiếp
    console.log("[ASS-CEE] background: Đang thử gửi tín hiệu Toggle...");
    let isDelivered = await sendMessageToAllFrames(tabId, { action: "TOGGLE_OVERLAY_SIGNAL" });
    // Đồng thời với kiểm tra biến toàn cục
    let checkResult = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: () => window.isAssCeeLoaded === true
    });
    let isLoaded = checkResult?.[0]?.result;
    // LẦN 2 (TỰ PHỤC HỒI): Nếu gửi thất bại, tiến hành nạp lại file và gửi lại
    if (!isDelivered || !isLoaded) {
      console.log(`[ASS-CEE] background: Gửi thất bại hoặc chưa nạp script. (${isDelivered}, ${isLoaded}) Đang nạp/nạp lại file...`);
      await chrome.scripting.insertCSS({ // Nạp CSS
        target: { tabId, allFrames: true },
        files: ["content/ui.css"]
      });
      await chrome.scripting.executeScript({ // Nạp JS
        target: { tabId, allFrames: true },
        files: ["content/ui.js", "content/renderer.js"]
      });
      // Chờ 100ms để trình duyệt khởi tạo xong bộ lắng nghe tin nhắn mới
      await new Promise(resolve => setTimeout(resolve, 100));
      // Thử gửi lại tin nhắn lần thứ hai
      console.log("[ASS-CEE] background: Đang thử gửi lại tín hiệu sau khi nạp...");
      isDelivered = await sendMessageToAllFrames(tabId, { action: "TOGGLE_OVERLAY_SIGNAL" });
      checkResult = await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        func: () => window.isAssCeeLoaded === true
      });
      isLoaded = checkResult?.[0]?.result;
    }
    if (isDelivered && isLoaded) {
      console.log(`[ASS-CEE] background: Kích hoạt thành công. (${isDelivered}, ${isLoaded})`);
    } else {
      console.error("[ASS-CEE] background: Không thể kết nối tới content script sau khi đã nạp lại.");
    }
  } catch (err) {
    console.error("[ASS-CEE] background: Lỗi nghiêm trọng trong quá trình xử lý kích hoạt:", err);
  }
});
// Hàm giao tiếp với content.js và ui.js
let lastLogLocation = { tabId: "", url: "" };
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Chỉ xử lí theo chuẩn đã định nghĩa trong handler
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
  return true; // Kích hoạt cơ chế giữ kênh kết nối mở phục vụ cho các tiến trình xử lý bất đồng bộ
});
const handlers = {
  // Mặc định cấu trúc chuẩn là msg = { type, payload }. Ở đây lấy msg.type làm key của obj.
  'LOG': async (payload, sender) => { // Log
    const { type, text, url, timestamp, extra } = payload;
    const tabId = sender.tab?.id;
    // 1. Kiểm tra vị trí log trước đó để xác định xem có đổi URL không
    const isSameLocation = (tabId === lastLogLocation.tabId && url === lastLogLocation.url);
    lastLogLocation = { tabId, url };
    // 2. Xử lý lấy tiêu đề tab thực tế (tránh lag tiêu đề trên các trang SPA như YouTube)
    let tabTitle = sender.tab?.title || 'Unknown Title';
    if (tabId) {
      try {
        if (!isSameLocation) {
          // Trì hoãn 100ms nếu đổi URL để đợi trình duyệt cập nhật xong tiêu đề mới
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        const freshTab = await chrome.tabs.get(tabId);
        if (freshTab && freshTab.title) {
          tabTitle = freshTab.title;
        }
      } catch (err) {
        // Bỏ qua lỗi nếu tab bị đóng trong lúc đang xử lý
      }
    }
    // 3. Định nghĩa thông tin tab bằng tiêu đề mới nhất vừa lấy được
    const tabInfo = tabId ? `${tabId}: ${tabTitle}` : 'Unknown Tab';
    const logPrefix = isSameLocation 
      ? `[${timestamp}]\n`
      : `[${timestamp}][${tabInfo}]\n[${url}]\n`;
    const consoleMethod = type || "log";
    const formattedText = type !== 'table' ? `${logPrefix}[ASS-CEE] ${text}` : text;
    // Nếu có dữ liệu extra, truyền nó làm tham số thứ hai để console hiển thị chi tiết (interactive object)
    if (extra !== undefined) {
      console[consoleMethod](formattedText, extra);
    } else {
      console[consoleMethod](formattedText);
    }
    return { type: 'LOGGED' }; // Làm cảnh. Vì ở content-side ko đọc nội dung response khi gửi log.
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
      await renderSendData(subObj);
      return { type: 'SUB.READY', payload: subObj };
    } catch (error) {
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
 * Hàm xử lý và điều phối tìm kiếm phụ đề dựa trên videoId (ko tìm cache)
 * @param {*} videoId Id của video cần tìm kiếm phụ đề
 * @param {*} folderMode Nếu true thì sẽ tìm tất cả file sub có trong các nguồn (dùng khi refetch), nếu false thì sẽ tìm file sub tương ứng với videoId (dùng khi tìm kiếm bình thường)
 * @returns .EMPTY: trống, .WAIT: có ít nhất 1 file tương ứng, cần content-side xử lí
 */
async function resolveSubtitles(videoId, folderMode) {
  // Đầu ra luôn là dạng { type: "", payload: "" }
  const sources = await getSourceList();
  if (sources.length === 0) {
    console.log(`[ASS-CEE] background: Không có thư mục nào để quét.`);
    return { type: 'SUB.EMPTY', payload: [] };
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
    fetchUrl,
    viewUrl,
    sourceType: 'gdrive' hoặc 'github',
    groupName
  } 
 * @param {*} rawText 
 * @returns subObj quy định ở hàm này. Xem pipeline.txt
 */
async function processSubtitles(videoId, candidate, rawText) {
  const subObj = { videoId, fileObj: candidate };
  subObj.parsedData = parser(rawText);
  try {
    await addSubData(videoId, subObj);
    await renderSendData(subObj);
    return { type: 'SUB.READY', payload: subObj };
  } catch (err) {
    return { type: 'ERROR', payload: err.message };
  }
}
console.log(`[ASS-CEE] background: Đã sẵn sàng.`);
