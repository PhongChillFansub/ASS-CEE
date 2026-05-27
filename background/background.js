// Code bằng tay
// v0.0.0.1 27may26
import { fetchSubtitleText, fetchSubtitleFile } from './fetcher.js';
// fetchSubtitleText, fetchSubtitleFile
import { addSource, getSources, removeSource, getSubtitleCache, saveSubtitleCache } from './storage.js';
// addSource, getSources, removeSource, getSubtitleCache, saveSubtitleCache
import parseAegisubRaw from './parser.js';
// parseAegisubRaw
chrome.action.onClicked.addListener(async (tab) => {
  // Nếu là YouTube thì có thể đã chạy tự động, nhưng với các nền tảng khác:
  if (!tab.url.includes("youtube.com")) {
    try {
      // Bơm các file kịch bản dựng hình và điều khiển vào tab hiện tại
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "content/styles.js",
          "content/ui.js",
          "content/renderer.js",
          "content/content.js"
        ]
      }); // Gọi cả 4 file để không phải import phức tạp (và 3 file đầu chỉ để định nghĩa hàm)
      console.log("[ASS-CEE] background: Đã kích hoạt extension thành công trên trang này!");
    } catch (err) {
      console.error("[ASS-CEE] background: Inject thất bại:", err);
    }
  }
});
const handlers = {
  // Nhận yêu cầu quét tìm kiếm phụ đề từ phía Content Script gửi lên
  'SUBTITLE.SEARCH': async (payload) => {
    return await resolveSubtitles(payload.videoId);
  }, // Kết thúc xử lý hành động SUBTITLE.SEARCH
  //
  // Nhận yêu cầu tải và phân tích tệp phụ đề cụ thể do người dùng click chọn từ Chooser UI
  'SUBTITLE.SELECT': async (payload) => {
    const { videoId, candidate } = payload;
    const rawText = await fetchSubtitleText(candidate);
    const subObj = await processAndCacheSubtitle(videoId, candidate, rawText);
    return { status: 'HIT', data: subObj };
  }, // Kết thúc xử lý hành động SUBTITLE.SELECT
  //
  // Lấy toàn bộ danh sách liên kết nguồn lưu trữ trong cấu hình
  'SOURCE.GET_ALL': async () => {
    return await getSources();
  }, // Kết thúc xử lý hành động SOURCE.GET_ALL
  //
  // Xóa một nguồn cụ thể ra khỏi danh sách bộ nhớ cấu hình lưu trữ
  'SOURCE.REMOVE': async (payload) => {
    return await removeSource(payload.savedAt);
  } // Kết thúc xử lý hành động SOURCE.REMOVE (Chú ý: nhận dạng theo thời gian)
  // Handler mới: Chuyên tiếp nhận dữ liệu chuỗi thô từ thiết bị của user và parse lập tức
  'SUBTITLE.PARSE_RAW': async (payload) => {
    const { rawText } = payload;
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
          fileName: 'local', // to-do: lấy tên
          url: 'local', // to-do: lấy link để users có thể tự truy cập
          sourceType: 'local',
          groupName: 'local'
        }
        parsedData: parsedData
      } 
    };
  }
};
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = handlers[msg.type];
  if (handler) {
    handler(msg.payload)
      .then(result => sendResponse({ id: msg.id, ...result }))
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
  const candidates = await fetchSubtitleFile(sources, videoId);
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
        `%c[ASS-CEE]%c background: Tự động xử lí bị lỗi (${videoId}: ${candidate.fileName}).`, err, 
        "color: red, font-weight: bold;",
        ""
      );
      return { status: 'ERROR', message: err.message };
    }
  }
  // Trường hợp 3: Có nhiều kết quả phụ đề trùng khớp (Ambiguity)
  return { status: 'MULTIPLE', candidates: candidates };
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
  await saveSubtitleCache(videoId, subObj);
  return subObj;
}
console.log(
  `%c[ASS-CEE]%c background: Đã sẵn sàng.`, 
  "font-weight: bold;",
  ""
);
