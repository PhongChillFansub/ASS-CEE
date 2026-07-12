// Code bằng tay
// v0.0.7 12juy26
// Phần khai báo dữ liệu chung
var startingData = startingData ?? {
    debugLogSetting: ["new"], // Chế độ debug
    subObj: {}, // Reset subObj (dữ liệu phụ đề) mỗi lần chạy render.
    retryCount: 0, // Lưu số lần thử tìm video
    /**
     * Lưu dữ liệu bám bắt video (dùng trong hàm 2.3.2. refresh())
     */
    videoObserver: {
        resize: null,
        mutation: null,
        trackedParent: null,
        trackedAspectRatio: null,
        lastBounds: null,
    },
    /**
     * Lưu trạng thái render (dùng trong phần tính năng render)
     * @param {object} currentStyles: object lưu trữ các style ĐANG DÙNG để render (3.1 applyPendingStyles() và 3.3 renderSubtitleFrame())
     * @param {object} pendingStyles: object lưu trữ các style ĐANG CHỜ để render (2.4.1 processStylesPending() và 3.1 applyPendingStyles())
     * @param {object} currentEvents: object các events đang render: 
     * key: index của event trong array subObj.parsedData.events, value: tham chiếu obj event
     * @param {object} currentElements: object tham chiếu các element đang render: 
     * key: index của event trong array subObj.parsedData.events, value: tham chiếu element 
     * @param {number} frameId: ID của requestAnimationFrame hiện tại
     * @param {boolean} doEnable: lưu trạng thái tiếp tục/tạm dừng render loop
     * @param {number} lastActiveIndices: lưu mảng các index của events đã render ở lượt trước
     */
    renderState: {
        currentStyles: null,
        pendingStyles: null,
        currentEvents: {},
        currentElements: {},
        frameId: null,
        doEnable: true,
        lastActiveIndices: null,
    },
    FALLBACK_DEFAULT_STYLE: {
        name: "Default",                            // Tên style (style.name, line.styleref.name, syl.style.name)
        fontName: "Arial",                          // Tên font (\fn)
        fontSize: "20",                             // Font size (\fs, px, với PlayRes 640x480)
        primaryColour: "rgba(255,255,255,1.0)",     // Màu 1, main (\1c)
        secondaryColour: "rgba(255,0,0,1.0)",       // Màu 2, pre-kara (\2c)
        outlineColour: "rgba(0,0,0,1.0)",           // Màu 3, outline (\3c)
        backColour: "rgba(0,0,0,1.0)",              // Màu 4, shadow (\4c)
        bold: false,                                // In đậm (\b, boolean)
        italic: false,                              // In nghiêng (\i, boolean)
        underline: false,                           // Gạch dưới (\u, boolean)
        strikeOut: false,                           // Gạch ngang (\s, boolean)
        scaleX: "100",                              // ScaleX (\fscx, %)
        scaleY: "100",                              // ScaleY (\fscx, %)
        spacing: "0",                               // (\fsp, px)
        angle: "0",                                 // (\fr hoặc \frz, degree)
        borderStyle: "1",                           // Kiểu border (1: viền thường, 3: box)
        outline: "2",                               // (\bord, px. có \xbord và \ybord)
        shadow: "2",                                // (\shad, px. có \xshad và \yshad)
        alignment: "2",                             // (\an, 1-9 kiểu numpad)
        marginL: "20",                              // (px, left)
        marginR: "20",                              // (px, right)
        marginV: "20",                              // (px, vertical)
        encoding: "1",                              // (\fe, nên bị bỏ qua.)
    },
    // currentId, lastId (1.2: updateVideoIdInRenderer())
    // container, containerId, containerParent, video, videoAR (2.1. selectVideo())
}; 
var renderData = { ...startingData }; // Dữ liệu chung (tương tự uiData). Reset mỗi lần gọi renderer
/**
 * (6.3.)1.1. (6.2.1.1. sửa đổi) Hàm gửi log về background.js
 * @param {string} message nội dung
 * @param {string} type loại nội dung (default: "info" -> log, "warn" -> warn, "error" -> error)
 */
function sendLogToBackground(message, type = 'info', extra = undefined) {
  chrome.runtime.sendMessage({
    type: 'LOG',
    payload: {
      type: type,
      text: message,
      extra: extra, // Dữ liệu bổ sung (array, object, số, v.v.)
      url: window.location.href,
      timestamp: Date.now()
    }
  }).catch(err => {
    console.warn("[ASS-CEE] renderer: Không thể gửi log về background:", err);
  });
}
/**
 * 1.2. (6.2.1.4. sửa đổi) updateVideoIdInRenderer(): Hàm cập nhật video ID vào UI
 * @param renderData Yêu cầu có sẵn renderData
 * @returns Tạo mới, cập nhật trong renderData: 
 * @returns .currentId 
 * @returns .lastId
 */
function updateVideoIdInRenderer() {
    var doLog = checkDoLog(['updateVideoIdInRenderer','1.2','all']);
    if (typeof renderData !== 'object' || renderData === null) {
        return disableRenderLoop('renderer: (1.2) ko có renderData để ghi dữ liệu?');
    }
    const getYouTubeVideoId = () => new URLSearchParams(window.location.search).get('v');
    // Định dạng lưu id YT: "<11 char base64>"
    // const getBilibiliVideoId = () => `${window.location.pathname.match(/\/video\/(BV\w+)/)?.[1]}?${new URLSearchParams(window.location.search).get('p') || 1}`;
    // Định dạng lưu id BiliBili: "BV<10 char base58>?<p>"
    // const getLocalVideoId = (keepFileExtension) => decodeURIComponent(window.location.href).split('/').pop().replace(keepFileExtension ? /^/ : /\.[^/.]+$/, "");
    // Định dạng lưu id local: "<tên file><đuôi file (có thể tùy chỉnh)>"
    const url = window.location.href;
    renderData.currentId = (() => {
    switch (true) {
        case url.startsWith('https://www.youtube.com/watch?v='): // Tab YT
        // renderData.tabMode = "youtube";
        return getYouTubeVideoId();
        // case url.startsWith('https://www.bilibili.com/video/'): // Tab BiliBili
        //   return getBilibiliVideoId();
        // case url.startsWith('file:///'): // Tab local
        //   return getLocalVideoId(false);
        default:
        // sendLogToBackground(`renderer: (1.2) Ko thể tách ID từ url ${url}.`,"warn");
        return null; // Trả về giá trị mặc định nếu không khớp trang nào
    }
    })();
    if (renderData.currentId) {
        if (doLog) sendLogToBackground(`renderer: (1.2) Cập nhật ID video hiện tại: ${renderData.currentId}`);
        if (renderData.currentId !== renderData.lastId && renderData.lastId) {
            disableRenderLoop(`videoId thay đổi từ ${renderData.lastId} sang ${renderData.currentId}.`);
            renderData.lastId = renderData.currentId;
            return updateVideoIdInRenderer();
        }
    } else {
        return disableRenderLoop(`renderer: (1.2) Ko thể tách ID từ url ${url}`);
    }
    return;
}
/**
 * 1.3. Hàm kiểm tra và chuẩn hóa dữ liệu.
 * @param {obj} renderData Tham chiếu obj ghi dữ liệu chung. luôn có vì đã rào trước ở đầu hàm render()
 * @param {string} [checkMode="a"] sử dụng để lựa chọn chế độ và các dữ liệu được kiểm tra, chuẩn hóa
 * @returns {string} string tên của dữ liệu ko tồn tại. Chú ý: đầu ra chỉ là text chỉ báo lỗi, phải có xử lí bọc vào
 */
function renderDataCheck(renderData,checkMode = "z"){
    const isNotObject = (val) => !val || typeof val !== 'object' || Array.isArray(val);
    const isNotArray = (val) => !Array.isArray(val);
    const isNotFunction = (val) => typeof val !== 'function';
    if (checkMode.includes("a")) { // Chế độ kiểm tra: trước tiền xử lí dữ liệu 2.2, preProcessSubData()
        // Yêu cầu có .subObj.parsedData(.info(.PlayResX, .PlayResY, ), .styles, .events), .FALLBACK_DEFAULT_STYLE,
        switch (true) {
            case isNotObject(renderData):
                return "renderData";
            case isNotObject(renderData.subObj):
                return ".subObj";
            case isNotObject(renderData.subObj.parsedData):
                return ".subObj.parsedData";
            case isNotObject(renderData.FALLBACK_DEFAULT_STYLE):
                return ".FALLBACK_DEFAULT_STYLE";
        }
        const subData = renderData.subObj.parsedData;
        const text = ".subObj.parsedData";
        switch (true) {
            case isNotObject(subData.info):
                return `${text}.info`;
            case isNotArray(subData.styles):
                return `${text}.styles`;
            case isNotArray(subData.events):
                return `${text}.events`;
        }
        const checkPlayRes = (val) => {
            const p = Number.parseInt(val, 10);
            return p > 0 ? p : 0;
        };
        for (const key of ['PlayResX', 'PlayResY']) {
            const val = checkPlayRes(subData.info[key]);
            if (val <= 0) return `.subObj.parsedData.info.${key}`;
            subData.info[key] = val;
        }
    }
    if (checkMode.includes("b")) { // Chế độ kiểm tra: đầu hàm refresh() 2.3.2 trong observeParentLayout()
        // Yêu cầu phải có .containerParent.getBoundingClientRect(), .container 
        switch (true) {
            case isNotObject(renderData):
                return "renderData";
            case isNotObject(renderData.container):
                return ".container";
            case isNotObject(renderData.containerParent):
                return ".containerParent";
            case isNotFunction(renderData.containerParent.getBoundingClientRect):
                return ".containerParent.getBoundingClientRect";
        }
    }
    if (checkMode.includes("c")) {
        switch (true) {
            // case isNotObject(renderData):
            //     return "renderData";
            // case isNotObject(renderData.container):
            //     return ".container";
            case isNotObject(renderData.video):
                return ".video";
            case isNotObject(renderData.subObj):
                return ".subObj";
            case isNotObject(renderData.subObj.parsedData):
                return ".subObj.parsedData";
            case isNotArray(renderData.subObj.parsedData.events):
                return `.subObj.parsedData.events`;
            case !renderData.scaleHeight || !renderData.scaleWidth:
                return ".scaleHeight || .scaleWidth";
        }
    }
    return "";
}
/**
 * 1.4. Hàm kiểm tra có log với các tag của hàm hay ko
 */
function checkDoLog (tag) {
    return tag.some(item => renderData.debugLogSetting.includes(item));
}
/**
 * 1.5. Hàm dừng renderer (hủy render loop, clear màn, reset renderData, xóa observer), và gửi log về background
 * @param {*} reason 
 */
function disableRenderLoop(reason) {
    clearSubtitleFrame();
    const state = renderData.renderState;
    state.state = false;
    const WasRenderEnabled = state.frameId ?? null;
    if (state.frameId) {
        window.cancelAnimationFrame(state.frameId); 
    }
    state.frameId = null;
    sendLogToBackground(`renderer: (3.8) Đã hủy render ${
        WasRenderEnabled ? `(cùng với frameId ${WasRenderEnabled})` : "(ko có frameId)"
    }. Lí do:\n   ${reason}.`,"warn");
    disconnectVideoObserver();
    renderData = {... startingData}; // reset renderData
    sendLogToBackground("renderer: [DEBUG] kiểm tra renderData sau hủy render","warn",renderData);
    window.isAssCeeRendererLoaded = false;
}
/**
 * 1.6. Hàm dừng observer (đóng trình bám bắt video), và reset dữ liệu observer
 * @param {*} newParent 
 * @param {*} newAspectRatio 
 */
function disconnectVideoObserver(newParent = null, newAspectRatio = null) {
    if (renderData.videoObserver.resize) {
        renderData.videoObserver.resize.disconnect();
    }
    if (renderData.videoObserver.mutation) {
        renderData.videoObserver.mutation.disconnect();
    }
    renderData.videoObserver.trackedParent = newParent;
    renderData.videoObserver.trackedAspectRatio = newAspectRatio;
    renderData.videoObserver.resize = null;
    renderData.videoObserver.mutation = null;
    renderData.videoObserver.lastBounds = null;
}
/**
 * 2.1. Hàm lập trình nghe dữ liệu từ background (và tự động render) (cần sửa lại)
 */
function initRenderer() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { // Nhận thủ công (UI bắt background gửi)
        const state = renderData.renderState; 
        if (msg?.type === 'RENDER.PAUSE') {
            state.doEnable = false;
            sendResponse({ type: 'RENDER.CONTROL', action: 'PAUSED' });
            return;
        }
        if (msg?.type === 'RENDER.RESUME') {
            state.doEnable = true;
            sendResponse({ type: 'RENDER.CONTROL', action: 'RESUMED' });
            return;
        }
        if (msg?.type === 'RENDER.STOP') {
            disableRenderLoop("nhận lệnh RENDER.STOP từ background (người dùng yêu cầu từ UI chuyển tiếp sang)");
            sendResponse({ type: 'RENDER.CONTROL', action: 'STOPPED' });
            return;
        }
        if (msg?.type === 'RENDER' && (msg.payload !== null && typeof msg.payload === 'object' && !Array.isArray(msg.payload))) {
            const currentUrl = window.location.href;
            if (currentUrl.startsWith('about:')) {
                sendLogToBackground(`renderer: Bỏ qua trang about: vì render không chạy ở đây. ${currentUrl}`,"warn");
                return;
            }
            renderData.subObj = { ...msg.payload }; // Nhận dữ liệu để render
            sendLogToBackground(`renderer: Nhận tín hiệu thủ công thành công:`,"log",renderData.subObj);
            // window.isAssCeeRendererLoaded = true; // Đánh dấu renderer đã khởi tạo thành công khi script đã được khởi động
            render();
        } else if (msg?.action || (msg?.type === 'RENDER' && !msg.payload)) {
        } else {
            sendLogToBackground(`renderer: Tín hiệu từ Background (gửi cho renderer) ko phải RENDER chuẩn?`,"warn", msg)
        }
        sendResponse({ type: 'RENDERED' });
    });
}
/**
 * 2.2. Hàm lập trình tính năng tự động lấy cache và render (cần sửa lại)
 */
function autoRenderOnCache() {
    updateVideoIdInRenderer();
    chrome.runtime.sendMessage({ // Tự động chạy (1 lần, khi chạy file này theo manifest)
        type: 'SUB.USE_CACHE',
        payload: { videoId: renderData.currentId }
    }, (response) => {
        // response của 'SUB.USE_CACHE': { type: 'SUB.READY', payload: await subObj/useSubData(payload.videoId) }
        if (response && response.type === 'SUB.READY') {
            renderData.subObj = { ...response.payload }; // Nhận dữ liệu để render
            sendLogToBackground(`renderer: Tự động nhận tín hiệu (${renderData.currentId}) thành công:`,"log", response.payload || '(cache trống)');
            // window.isAssCeeRendererLoaded = true; // Đánh dấu renderer đã khởi tạo thành công khi script đã được khởi động
            render();
        } else {
            sendLogToBackground(`renderer: Tự động nhận tín hiệu (${renderData.currentId}) thất bại.`,"warn", response);
            console.warn(`renderer: Tự động nhận tín hiệu (${renderData.currentId}) thất bại.`,response);
        }
    });
}
/**
 * 3.1. Hàm chạy tự động tìm, chọn video, và tạo lập khung phụ đề ban đầu.
 * @param {obj} renderData
 * @returns Tất cả đầu ra là gián tiếp:
 * @returns {*} renderData.containerId: id khung sub, 
 * @returns {*} renderData.containerParent: tham chiếu node cha của khung sub và video (thực tế là node cha của cha của video),
 * @returns {*} renderData.videoAR: tỉ lệ khung hình (cố định) của node video,
 * @returns {*} renderData.container: tham chiếu node khung sub,
 * @returns {*} renderData.video: tham chiếu node video,
 */
function selectVideo() {
    var doLog = checkDoLog(['selectVideo','3.1','all']);
    const videos = Array.from(document.querySelectorAll('video')); // Lấy toàn bộ video trên trang web.
    if (videos.length === 0) {
        sendLogToBackground("renderer: (3.1) Không phát hiện thẻ <video> nào trên trang.","warn");
        return;
    }
    if (doLog) sendLogToBackground(`renderer: (3.1) Phát hiện ${videos.length} video(s) trên trang:`);
    let selectedVideo = null;
    let maxArea = 0;
    const videoTableData = videos.map((video, index) => {
        // 1. Gán ID định danh duy nhất nếu chưa có
        if (!video.dataset.detectedId) {
            video.dataset.detectedId = 'vid_' + Math.random().toString(36).substring(2, 9);
        }
        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);
        // 2. Kiểm tra hiển thị trực tiếp từ CSS và kích thước vật lý
        const isVisible = style.display !== 'none' && 
                          style.visibility !== 'hidden' &&  
                          style.opacity !== '0' && 
                          rect.width > 0 && 
                          rect.height > 0;
        const area = isVisible ? (rect.width * rect.height) : 0;
        // Nếu video này hiển thị và có diện tích lớn hơn video lớn nhất trước đó
        if (isVisible && area > maxArea) {
            maxArea = area;
            selectedVideo = video;
        }
        return {
            "Detected ID": video.dataset.detectedId,
            "Thời gian": video.currentTime.toFixed(2) + "s",
            "Kích thước": `${Math.round(rect.width)}x${Math.round(rect.height)}`,
            "Hiển thị?": isVisible ? "1" : "0",
            "Diện tích?": area,
            "Class Name": video.className ? `.${video.className.trim().split(/\s+/).join('.')}` : "Không có",
            "Source URL": video.currentSrc ? video.currentSrc.slice(0, 60) + "..." : "Không có nguồn"
        };
    });
    // In bảng tổng hợp
    if (doLog) sendLogToBackground(videoTableData, "table");
    // Hiển thị kết quả video chính đã được xác định ở trên
    renderData.containerId = 'asscee_overlayRenderRoot';
    // Đầu ra gián tiếp thứ nhất: ID của node khung phụ đề
    if (selectedVideo) {
        const videoRect = selectedVideo.getBoundingClientRect();
        if (doLog) sendLogToBackground(`renderer: (3.1) Video được chọn là [ID: ${selectedVideo.dataset.detectedId}] - Kích thước: ${Math.round(videoRect.width)}x${Math.round(videoRect.height)}`);
        renderData.containerParent = selectedVideo.closest('#movie_player') || selectedVideo.parentNode;
        renderData.video = selectedVideo;
        // Đầu ra gián tiếp thứ hai: tham chiếu đến node cha của khung phụ đề
        if (!renderData.containerParent) {
            sendLogToBackground("renderer: (3.1) Không tìm được parent hợp lệ cho video.","warn");
            return "return";
        }
        const parentStyle = window.getComputedStyle(renderData.containerParent);
        if (parentStyle.position === 'static') {
            renderData.containerParent.style.position = 'relative';
            sendLogToBackground("renderer: (3.1) Đã đặt parent của video thành position: relative để overlay ASS-CEE hoạt động. Thay đổi này có thể ảnh hưởng đến layout của web gốc.","warn");
        }
        const rawAR = videoRect.width / videoRect.height; // Có thể infinite (w/0) hoặc NaN (0/0), hoặc 0 (0/h)
        renderData.videoAR = isFinite(rawAR) ? rawAR : 0; // Nếu w=0 hoặc h=0 thì trả về 0
        // Đầu ra gián tiếp thứ ba: tỉ lệ khung hình của video YT (cố định với mỗi video)
        let overlay = document.getElementById(renderData.containerId);
        if (overlay && overlay.parentNode !== renderData.containerParent) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = renderData.containerId;
            overlay.style.zIndex = '10';
            renderData.containerParent.appendChild(overlay);
        }
        renderData.container = overlay; // Đầu ra gián tiếp thứ tư: tham chiếu đến node khung phụ đề
    } else {
        sendLogToBackground(`renderer: (3.1) Không tìm thấy video chính nào đủ điều kiện hiển thị.`,"warn");
        return "return";
    }
}
/**
 * 3.2. Hàm tiền xử lí: Chuẩn hóa và xử lí dữ liệu chung, chuẩn hóa tỉ lệ khung hình
 * @param renderData.subObj.parsedData.info.PlayResX (cần check trước)
 * @param renderData.subObj.parsedData.info.PlayResY (cần check trước)
 * @param renderData.subObj.parsedData.info.WrapStyle (có thể fallback)
 * @param renderData.videoAR (selectVideo cấp?)
 */
function preProcessSubData() {
    const info = renderData.subObj.parsedData.info;
    const rawSubAR = info.PlayResX / info.PlayResY;
    const isValidAR = isFinite(rawSubAR) && rawSubAR > 0;
    if (!isValidAR) sendLogToBackground(`renderer: (3.2) subAR có vấn đề, fallback về 16:9.`, "warn");
    const subAR = isValidAR ? rawSubAR : 16 / 9;
    const EPSILON = 0.04; // Ngưỡng sai số cho phép (lệch dưới 0.04 coi như bằng nhau)
    const isArDifferent = Math.abs(renderData.videoAR - subAR) > EPSILON;
    if (renderData.videoAR === 0 || isArDifferent) { 
        renderData.videoAR = subAR;
        sendLogToBackground(`renderer: (3.2) Lấy videoAR có vấn đề hoặc khác subAR (sai số tuyệt đối AR trên 0.04), lấy subAR thay thế: ${subAR.toFixed(4)}.`,"warn");
    }
    // Phần xử lí cho info.WrapStyle
    const rawStyleWrap = Number.parseInt(info.WrapStyle, 10);
    info.WrapStyle = (rawStyleWrap >= 0 && rawStyleWrap <= 3) ? rawStyleWrap : 0;
    renderData.cssConfig = {
        'white-space': 'pre-wrap',
        'max-width': '100%',
        'word-break': 'break-word'
    };
    // switch(info.WrapStyle) {
    //     case 0:
    //         renderData.cssConfig['text-wrap'] = 'pretty'; // Ko có thuật toán như Aegisub làm (Gemini bảo thế), to-do: check xem cái này có cần sửa gì ko (ở beta)
    //         break;
    //     case 1:
    //         renderData.cssConfig['text-wrap'] = 'wrap'; 
    //         break;
    //     case 2:
    //         renderData.cssConfig['white-space'] = 'pre'; // Thủ công, bỏ qua max-width tự động ngắt
    //         renderData.cssConfig['word-break'] = 'normal';
    //         break;
    //     case 3:
    //         renderData.cssConfig['text-wrap'] = 'balance'; // Dòng dưới rộng hơn/cân bằng
    //         break;
    // }
    switch (info.WrapStyle) {
        case 2:
            renderData.cssConfig['white-space'] = 'pre';
            break;
        default: // 0,1,3
            renderData.cssConfig['white-space'] = 'pre-wrap';
            break;
    }
}
/**
 * 3.3. Hàm thiết lập trình bám bắt video
 * @param {*} renderData.containerParent khung video yt (khác video yt nhé)
 * @param {*} renderData.container khung phụ đề
 * @param {*} renderData.videoAR tỉ lệ khung hình của video yt
 * @returns tạo trình bám bắt video
 */
function observeParentLayout() {
    var doLog = checkDoLog(['observeParentLayout','3.3','all']);
    if (preProcessStylesData() === "return") return "return"; // Hiệu chỉnh style (do khác biệt về cách tính giữa VSFilter và FreeType?)
    /**
     * 3.3.2. Hàm refresh (trong hàm 3.3. observeParentLayout()): Quy định những việc phải làm của Observer
     * @returns chạy 3.3.2.1, check thay đổi tọa độ-kích thước, nếu cần thiết, chạy hàm 3.3.2.2, 3.4.1, 1.2.
     */
    const refresh = () => {
        var invalidateResult = renderDataCheck(renderData,"ab");
        if (invalidateResult) return disableRenderLoop(`renderer: (3.3ab) có dữ liệu ko hợp lệ: ${invalidateResult}. Dừng chạy renderer.`);
        const bounds = computeAspectFitBounds(renderData.containerParent.getBoundingClientRect(), renderData.videoAR); 
        // Cập nhật khung video yt mới, tính toán tọa độ-kích thước khung phụ đề mới
        const last = renderData.videoObserver.lastBounds;
        const dimensionChange = !(last && last.width === bounds.width && last.height === bounds.height);
        const positionChange = !(last && last.left === bounds.left && last.top === bounds.top);
        if (!dimensionChange && !positionChange) {
            return;
        } // Check thay đổi tọa độ-kích thước. Chú ý: chỉ khi có thay đổi lần đầu thì mới bật observer, nếu ko thay đổi bao giờ thì observer làm gì?
        const dimChangeLog = dimensionChange ? `${Math.round(bounds.width)}x${Math.round(bounds.height)}` : "";
        const posChangeLog = positionChange ? `(${Math.round(bounds.left)},${Math.round(bounds.top)})` : "";
        renderData.videoObserver.lastBounds = bounds;
        applyOverlayBounds(renderData.container, bounds); // Áp dụng khung phụ đề mới
        if (doLog) sendLogToBackground(`renderer: (3.3) Parent đổi layout, cập nhật khung overlay: ${dimChangeLog}${(dimChangeLog && posChangeLog)?" ":""}${posChangeLog}.`);
        // Gửi log về background xem.
        if (processStylesPending() === "return") return "return"; // Cập nhật style mới tính toán xong cho render (ở đây là chạy khi có cập nhật khi có update dimension)
        // sendLogToBackground(`renderer: (3.3) [DEBUG] overlay trước khi update:\n  childElementCount=${renderData.container.childElementCount}, childNodes.length=${renderData.container.childNodes.length}`);
        if (updateVideoIdInRenderer() === "return") return "return"; // Nếu ko update được videoId thì hủy render loop
    };
    // Phần lập trình bám bắt video
    if (renderData.videoObserver.trackedParent !== renderData.containerParent || renderData.videoObserver.trackedAspectRatio !== renderData.videoAR) {
        disconnectVideoObserver(renderData.containerParent, renderData.videoAR);
    } // Nếu parent hoặc aspectRatio thay đổi thì reset observer
    if (window.ResizeObserver && !renderData.videoObserver.resize) {
        renderData.videoObserver.resize = new ResizeObserver(refresh);
        renderData.videoObserver.resize.observe(renderData.containerParent);
    } // Nếu resize thì lập trình bám bắt ngay
    if (window.MutationObserver && !renderData.videoObserver.mutation) {
        renderData.videoObserver.mutation = new MutationObserver(mutations => {
            const shouldRefresh = mutations.some(m => {
                if (m.type !== 'attributes') return false;
                if (!['style', 'class', 'id'].includes(m.attributeName)) return false;
                return true;
            });
            if (shouldRefresh) {
                const currentBounds = computeAspectFitBounds(renderData.containerParent.getBoundingClientRect(), renderData.videoAR);
                const last = renderData.videoObserver.lastBounds;
                if (!last || last.left !== currentBounds.left || last.top !== currentBounds.top || last.width !== currentBounds.width || last.height !== currentBounds.height) {
                    refresh();
                }
            }
        });
        renderData.videoObserver.mutation.observe(renderData.containerParent, { attributes: true, attributeFilter: ['style', 'class', 'id'] });
    } // Mà chỗ này liên quan đến mutation với attributes, ko hiểu lắm nên ko review đc
    if (refresh() === "return") return "return"; // Chạy refresh lần đầu tiên, nếu ko update được videoId thì hủy render loop
}
/**
 * 3.3.1. Tính toán khung chữ thực tế của font hiển thị trên web.
 * Học hỏi ass.js
 * @param renderData.subObj.parsedData.styles dùng .forEach((style) => {dùng style.fontSize, .fontName, ghi thêm style.customResize}) (cần check trước)
 */
function preProcessStylesData() {
    const result = []
    const canvas = document.createElement('canvas');
    renderData.subObj.parsedData.styles.forEach((style) => {
        const usedFontSize = 2048;
        const sample = "";
        const ctx = canvas.getContext('2d');
        ctx.font = `${usedFontSize}px "${style.fontName}"`;
        const metrics = ctx.measureText(sample);
        const ascentRaw = [metrics.fontBoundingBoxAscent, metrics.actualBoundingBoxAscent];
        const descentRaw = [metrics.fontBoundingBoxDescent, metrics.actualBoundingBoxDescent];
        const ascent = ascentRaw[0];
        const descent = descentRaw[0];
        style.customResize = usedFontSize / (ascent + descent);
        const rawResize = [usedFontSize / (ascentRaw[0] + descentRaw[0]), usedFontSize / (ascentRaw[1] + descentRaw[1])];
        result.push({
            fontFamily: style.fontName,
            fontSizeSetting: usedFontSize,
            rawResize: rawResize.map(r => r.toFixed(6)),
            customResize: style.customResize.toFixed(6)
        });
    });
    // sendLogToBackground('renderer: (3.3.1) Kết quả đo: ',"warn",result);
}
/**
 * 3.3.2.1. Hàm tính toán khung phụ đề (dựa trên tỉ lệ khung hình cố định của video và của sub)
 * (Copilot vibe, đã review). Chú ý: khung parent PHẢI luôn chạm ít nhất 1 chiều (cùng 1 kích thước cao/rộng) với video.
 * @param {*} parentRect kích thước của parent node (khung video yt)
 * @param {*} aspectRatio tỉ lệ khung hình cố định của node video
 * @returns {obj} {left, top, width, height}: tọa độ-kích thước của khung phụ đề
 */
function computeAspectFitBounds(parentRect, aspectRatio) {
    if (!parentRect || parentRect.width <= 0 || parentRect.height <= 0 || aspectRatio <= 0) {
        return { left: 0, top: 0, width: 0, height: 0 };
    } // Xử lí fallback tệ nhất: parent node ko tồn tại hoặc chưa load xong? hoặc tỉ lệ khung hình video xấu?
    const parentRatio = parentRect.width / parentRect.height; // Tỉ lệ khung hình của parent node
    let left, top, width, height; // Khai báo các thông số
    if (parentRatio > aspectRatio) { 
        // Nếu parentRatio lớn hơn (khung video dài hơn video, vd: video ở chế độ rạp chiếu phim)
        height = parentRect.height; // Chiều cao khung video, video và khung phụ đề sẽ bằng nhau
        width = height * aspectRatio; // Tính toán ngược lại theo tỉ lệ khung hình cố định
    } else {
        width = parentRect.width; // Chiều rộng khung video, video và khung phụ đề sẽ bằng nhau
        height = width / aspectRatio; // Tính toán ngược lại theo tỉ lệ khung hình cố định
    }
    return {
        left: (parentRect.width - width) / 2, // Tính toán xê dịch trái
        top: (parentRect.height - height) / 2, // Tính toán xê dịch trên
        width,
        height
    };
}
/**
 * 3.3.2.2. Hàm áp dụng tọa độ-kích thước mới tính toán vào khung phụ đề hiện có
 * (Copilot vibe, đã review)
 * @param {*} container khung phụ đề
 * @param {*} parent khung video yt (khác với video nhé)
 * @param {*} bounds tọa độ-kích thước mới tính toán
 * @returns {*} áp dụng bounds vào container.style
 */
function applyOverlayBounds(container, bounds) {
    // if (!container || !parent) {
    //     sendLogToBackground(`renderer: lỗi đầu vào hàm 7.2.2: không có khung video yt (parent?:${!!parent}), hoặc ko có khung phụ đề (container?:${!!container}).`,"error")
    //     return;
    // } // Nếu ko phát hiện 1 trong 2 node thì về.
    Object.assign(container.style, {
        position: 'absolute',
        left: `${Math.round(bounds.left)}px`,
        top: `${Math.round(bounds.top)}px`,
        width: `${Math.round(bounds.width)}px`,
        height: `${Math.round(bounds.height)}px`,
        pointerEvents: 'none'
    });
    // container.dataset.asscee_overlayRenderRoot = `${Math.round(bounds.width)}x${Math.round(bounds.height)}`;
    // Ghi vào để dễ xem, giờ ko cần nữa
}
/**
 * 3.4.1. Hàm tính toán và áp dụng style mới vào hàng chờ
 * @param {*} renderData.subObj.parsedData.info (cùng .PlayResX và .PlayResY) đã check từ renderDataCheck("a") và preProcessSubData()
 * @param {*} renderData.subObj.parsedData.styles đã check từ renderDataCheck("a")
 * @param {*} renderData.FALLBACK_DEFAULT_STYLE đã check từ renderDataCheck("a")
 * @param {*} renderData.container.getBoundingClientRect() đã check từ renderDataCheck("b") và selectVideo()
 * @returns {*} renderData.dpr, renderData.scaleWidth, renderData.scaleHeight thêm mới hoặc cập nhật
 * @returns trả về gián tiếp renderData.renderState.pendingStyles đã tính toán
 * @returns "return" hoặc "" nếu hủy/tạm dừng render loop
 */
function processStylesPending() {
    var doLog = checkDoLog(['processStylesPending','3.4','all']);
    // Áp dụng sửa đổi cho cả các styles trong renderData.subObj.parsedData.styles và renderData.FALLBACK_DEFAULT_STYLE
    // Nhiệm vụ check nội dung dữ liệu trước khi xử lí thì giao cho hàm observeParentLayout() gọi, nên ở đây ko cần check nữa
    const info = renderData.subObj.parsedData.info;
    // info
    const orgStyles = renderData.subObj.parsedData.styles.filter(style => style && typeof style === 'object');
    // styles nguyên bản
    // Lọc bỏ các style (trong styles) ko phải object?
    const containerRect = renderData.container.getBoundingClientRect();
    renderData.dpr = window.devicePixelRatio || 1;
    renderData.scaleWidth = (containerRect.width)/info.PlayResX;
    renderData.scaleHeight = containerRect.height/info.PlayResY;
    const isRenderableSize = containerRect.width > 240 && containerRect.height > 240;
    if (!isRenderableSize) {
        if (containerRect.width === 0 || containerRect.height === 0) {
            return disableRenderLoop("(3.4) Khung ko còn hợp lệ (0 x 0 px)");
        }
        renderData.renderState.doEnable = false;
        const msg = `renderer: (3.4) Kích thước container quá nhỏ, dưới 240px (${Math.round(containerRect.width)}x${Math.round(containerRect.height)}px). Tạm ngừng render để tránh vỡ font.`
        sendLogToBackground(msg, "warn");
        return;
    }
    scaler(renderData.FALLBACK_DEFAULT_STYLE, null, false); // Chạy cho FALLBACK để gán vào renderData.defaultStyle (pushMode = false)
    renderData.renderState.pendingStyles = {};
    orgStyles.forEach(style => {
        scaler(style, renderData.renderState.pendingStyles, true);
    }); // Chạy cho mảng style bằng forEach
    // sendLogToBackground(`renderer: (3.4) [DEBUG]: dpr=${renderData.dpr}, scale=${renderData.scaleWidth.toFixed(2)},${renderData.scaleHeight.toFixed(2)}`);
    if (doLog) sendLogToBackground(`renderer: (3.4) Đã áp dụng styles mới.`,"log",renderData.renderState.pendingStyles);
}
/**
 * 3.4.2. Hàm thực thi chuyển đổi style theo thay đổi kích thước khung hình (từ khung PlayResX-Y sang khung width-height của phụ đề)
 * @param {*} oldStyle 1 style cũ
 * @param {*} newStyles tham chiếu array style mới để push
 * @param {*} pushMode chế độ push (push vào array newStyles, cho các style khác) hoặc ghi đè vào renderData.defaultStyle (cho renderData.FALLBACK_DEFAULT_STYLE)
 * @returns ko trực tiếp trả về gì
 */
function scaler (oldStyle, newStyles, pushMode) {
    const requiredKeys = Object.keys(renderData.FALLBACK_DEFAULT_STYLE);
    // 1. Kiểm tra: Thiếu bất kỳ thuộc tính nào trong renderData.FALLBACK_DEFAULT_STYLE thì dừng luôn
    const isInvalid = requiredKeys.some(key => oldStyle[key] === undefined || oldStyle[key] === null);
    if (isInvalid) {
        sendLogToBackground(`renderer: (3.4.2) Style "${oldStyle.name}" thiếu thuộc tính so với FALLBACK_DEFAULT_STYLE, bị bỏ qua.`,"warn");
        return;
    } 
    // 2. Chuẩn hóa dữ liệu dựa theo kiểu dữ liệu gốc của FALLBACK_DEFAULT_STYLE
    const newStyle = {};
    requiredKeys.forEach(key => {
        newStyle[key] = (typeof renderData.FALLBACK_DEFAULT_STYLE[key] === 'boolean') ? (oldStyle[key] === "1" || oldStyle[key] === true) : String(oldStyle[key]);
    });
    newStyle.customResize = oldStyle.customResize;
    // 3. Xử lí ảnh hưởng khung video lên style
    // dòng Format có dạng:
    // Format: name, fontName, fontSize, primaryColour, secondaryColour, outlineColour, backColour, ...
    // bold, italic, underline, strikeOut, scaleX, scaleY, spacing, angle, borderStyle, outline, shadow, ...
    // alignment, marginL, marginR, marginV, encoding
    // Chỉnh sửa ở các thông số (theo thay đổi height): fontSize, spacing, marginL, marginR, marginV., kèm outline, shadow nếu info.ScaledBorderAndShadow = "yes"
    const info = renderData.subObj.parsedData.info;
    const keysToScale = ['fontSize', 'spacing', 'marginL', 'marginR', 'marginV'];
    if (info.ScaledBorderAndShadow === "yes") { keysToScale.push('outline', 'shadow');}
    keysToScale.forEach(key => {
        newStyle[key] = Number(oldStyle[key]) * renderData.scaleHeight;
    });
    // sendLogToBackground(`renderer test`,"warn",newStyle);
    // 4. Tính toán snapshot (chuyển từ obj sang CSS)
    // Ở đây dùng luôn hàm với đầu vào newStyle
    // 5. Đẩy vào mảng tham chiếu bên ngoài
    if (pushMode) {
        newStyles[newStyle.name] = styleObjToCss(newStyle);
    } else {
        renderData.defaultStyle = styleObjToCss(newStyle);
    }
    return;
};
/**
 * 3.4.3. Hàm chuyển đổi style từ object sang bộ CSS tĩnh (cấu trúc 2 lớp vỏ-ruột) (Gemini vibe, đã review)
 * @param {object} styleObj styleObj đầu vào chuẩn (tương tự renderData.FALLBACK_DEFAULT_STYLE. Xem processStylesPending().)
 * @returns {object} Trả về bộ CSS bọc trong styleName
 */
function styleObjToCss(styleObj) {
    const container = {
        'position': 'absolute',
        'display': 'flex',
        'box-sizing': 'border-box',
        'width': '100%',
        'height': '100%',
        'top': '0',
        'left': '0',
        'pointer-events': 'none',
        // Áp dụng margin đã scale
        'padding-left': `${styleObj.marginL}px`,
        'padding-right': `${styleObj.marginR}px`
    };
    const text = {
        // Font & Định dạng chữ
        'font-family': `"${styleObj.fontName}", sans-serif`, // to-do: cảnh báo người dùng nếu ko có font styleObj.fontName để hiển thị?
        'font-size': `${(styleObj.fontSize*(styleObj.customResize || 1)).toFixed(2)}px`,
        'line-height': `${styleObj.fontSize}px`,
        'letter-spacing': `${styleObj.spacing.toFixed(2)}px`,
        'font-weight': styleObj.bold ? 'bold' : 'normal',
        'font-style': styleObj.italic ? 'italic' : 'normal',
        'text-decoration': (styleObj.underline && styleObj.strikeOut) ? 'underline line-through' : styleObj.underline ? 'underline' : styleObj.strikeOut ? 'line-through' : 'none',
        // Cấu hình hiển thị và chống tràn dòng. to-do: xem info.wrapStyle để cập nhật theo
        ... renderData.cssConfig
    };
    // --- XỬ LÝ LAYOUT (ALIGNMENT) ---
    const align = styleObj.alignment;
    // Căn lề dọc (align-items) + MarginV
    if (align === "1" || align === "2" || align === "3") {
        container['align-items'] = 'flex-end';
        container['padding-bottom'] = `${styleObj.marginV}px`;
    } else if (align === "7" || align === "8" || align === "9") {
        container['align-items'] = 'flex-start';
        container['padding-top'] = `${styleObj.marginV}px`;
    } else { // 4, 5, 6 hoặc lỗi
        container['align-items'] = 'center';
    }
    // Căn lề ngang (justify-content & text-align)
    if (align === "1" || align === "4" || align === "7") {
        container['justify-content'] = 'flex-start';
        text['text-align'] = 'left';
    } else if (align === "3" || align === "6" || align === "9") {
        container['justify-content'] = 'flex-end';
        text['text-align'] = 'right';
    } else { // 2, 5, 8 hoặc lỗi
        container['justify-content'] = 'center';
        text['text-align'] = 'center';
    }
    // --- XỬ LÝ TRANSFORMS (SCALE & ROTATE) ---
    const containerTransforms = [];
    const textTransforms = [];
    if (styleObj.scaleX !== "100" || styleObj.scaleY !== "100") {
        textTransforms.push(`scale(${Number(styleObj.scaleX) / 100}, ${Number(styleObj.scaleY) / 100})`);
    }
    if (styleObj.angle !== "0") {
        textTransforms.push(`rotate(${-Number(styleObj.angle)}deg)`);
        const originMap = {
            "1": "left bottom",   "2": "center bottom", "3": "right bottom",
            "4": "left center",   "5": "center center", "6": "right center",
            "7": "left top",      "8": "center top",    "9": "right top"
        };
        text['transform-origin'] = originMap[align] || "center center";
    }
    if (containerTransforms.length) {
        container.transform = containerTransforms.join(' ');
    }
    if (textTransforms.length) {
        text.transform = textTransforms.join(' ');
        text.display = 'inline-block';
    }
    // --- XỬ LÝ BORDER & SHADOW ---
    const outlinePx = Number(styleObj.outline).toFixed(2);
    const shadowPx = Number(styleObj.shadow).toFixed(2);
    if (styleObj.borderStyle === "3") { // Kiểu Opaque Box (Khung nền)
        text['color'] = styleObj.primaryColour;
        text['background-color'] = styleObj.outlineColour;
        text['border'] = outlinePx > 0 ? `${outlinePx}px solid ${styleObj.outlineColour}` : 'none';
        text['box-shadow'] = shadowPx > 0 ? `${shadowPx}px ${shadowPx}px 0px ${styleObj.backColour}` : 'none';
        // Reset các thuộc tính của kiểu chữ viền (tránh lỗi cache style)
        text['-webkit-text-stroke'] = '0px transparent';
        text['text-shadow'] = 'none';
        text['paint-order'] = 'normal';
    } else { // Kiểu Outline/Shadow truyền thống (Mặc định)
        text['color'] = styleObj.primaryColour;
        text['background-color'] = 'transparent';
        text['border'] = 'none';
        text['box-shadow'] = 'none';
        if (outlinePx > 0) {
            text['paint-order'] = 'stroke fill';
            text['-webkit-text-stroke'] = `${outlinePx * 2}px ${styleObj.outlineColour}`;
        } else {
            text['-webkit-text-stroke'] = '0px transparent';
            text['paint-order'] = 'normal';
        }
        // Giữ nguyên shadowPx (không cộng outlinePx) để bóng đổ chuẩn từ tâm chữ
        text['text-shadow'] = shadowPx > 0 ? `${shadowPx}px ${shadowPx}px 0px ${styleObj.backColour}` : 'none';
    }
    return { container, text };
}
/**
 * 4.1. Hàm xóa dữ liệu render trong frame hiện tại
 * @param {*} renderData.renderState (luôn có 6 thuộc tính: 
 * currentStyles, pendingStyles, currentEvents, currentElements, frameId, doEnable)
 * @param {*} renderData.container Yêu cầu check trước
 */
function clearSubtitleFrame() {
    var doLog = checkDoLog(['clearSubtitleFrame','4.1','all']);
    const state = renderData.renderState;
    const container = renderData.container;
    if (doLog) sendLogToBackground(`renderer: (4.1) Tìm thấy ${Object.keys(state.currentElements).length} elements, ${Object.keys(state.currentEvents).length} events. Tiến hành xóa.`);
    Object.keys(state.currentElements).forEach(indexStr => {
        const element = state.currentElements[indexStr];
        if (element && typeof element.remove === 'function') {
            if (element.parentNode !== container) {
                sendLogToBackground(`renderer: (4.1) Element ${indexStr} ko ở trong container? parentNode=${element.parentNode?.id || element.parentNode?.tagName || "null"}`, "warn", element);
            }
            element.remove(); // Xóa khỏi màn hình (DOM)
        } else {
            sendLogToBackground(`renderer: (4.1) Ko có remove cho element ${indexStr}?:`, "warn", element);
        }
    });
    // Reset các object và array quản lý trạng thái về rỗng
    // Đặt lastActiveIndices về rỗng để frame tiếp theo sẽ rebuild toàn bộ subtitle đang active
    // thay vì chỉ xử lý các thay đổi incremental.
    state.currentElements = {};
    state.currentEvents = {};
    state.lastActiveIndices = [];
}
/**
 * 4.2. Hàm áp dụng style đang chờ vào trước khi frame loop render tiếp.
 */
function applyPendingStyles() {
    if (renderData.renderState.pendingStyles) {
        renderData.renderState.currentStyles = renderData.renderState.pendingStyles;
        renderData.renderState.pendingStyles = null;
        clearSubtitleFrame();
    }
}
/**
 * 4.3. Hàm xử lí dữ liệu render theo từng frame (Gemini vibe, đã review)
 */
function renderSubtitleFrameInLoop() {
    // Chú ý: log debug trong hàm này nếu luôn chạy, sẽ chạy theo tần số quét màn. (rAF())
    var doLog = checkDoLog(['renderSubtitleFrameInLoop','4.3','all']);
    const invalidateResult = renderDataCheck('bc');
    if (invalidateResult) {
        disableRenderLoop(`renderer: (4.3bc) Dữ liệu ko hợp lệ: ${invalidateResult}. Hủy render.`);
        return; // Dữ liệu giờ vẫn ko hợp lệ thì về luôn.
    }
    applyPendingStyles(); // Yêu cầu có .container hợp lệ
    const events = renderData.subObj.parsedData.events; // Yêu cầu có .events hợp lệ
    const state = renderData.renderState; // Yêu cầu có .renderState hợp lệ?
    const container = renderData.container; // Yêu cầu có .container hợp lệ
    const currentTime = Number.isFinite(renderData.video.currentTime) ? renderData.video.currentTime : 0; // Yêu cầu có .video hợp lệ
    // Đoạn này Copilot vibe, đã review.
    // Xử lí dựa trên con trỏ trong mảng đã sắp xếp theo starts và ends tăng dần
    // để rAF chỉ xử lí mỗi khi thay đổi danh sách events/line đang active (O(changes)), thay vì quét mọi events/lines mọi frame (O(n))
    /**
     * 4.3.1. Hàm tạo eventIndex lần đầu cho renderData.renderState (tối ưu rAF theo thay đổi danh sách active line thay vì mọi frame)
     * @returns state.eventIndex = { starts, ends, startPtr, endPtr, eventsRef }
     * @returns state.activeSet = Set() chứa các index của events đang active
     * @returns state.lastTime = Thời gian trước đó
     */
    const ensureIndex = () => {
        if (state.eventIndex && state.eventIndex.eventsRef === events) return; // Để chỉ chạy lần đầu.
        const starts = events.map((e, i) => ({ t: Number(e?.startTime) || 0, i })); // trích startTime của events/lines
        const ends = events.map((e, i) => ({ t: Number(e?.endTime) || -1, i })); // trích endTime của events/lines
        starts.sort((a, b) => a.t - b.t || a.i - b.i);
        ends.sort((a, b) => a.t - b.t || a.i - b.i);
        state.eventIndex = { starts, ends, startPtr: 0, endPtr: 0, eventsRef: events }; // Ptr: pointer, trỏ vào starts và ends
        state.activeSet = new Set();
        state.lastTime = Number.isFinite(state.lastTime) ? state.lastTime : 0;
    };
    ensureIndex();
    const idx = state.eventIndex;
    const currentActiveSet = state.activeSet || new Set();
    const prevTime = state.lastTime || 0;
    if (currentTime >= prevTime) {
        // Di chuyển con trỏ tiến tới currentTime, thêm các event mới bắt đầu và xóa các event đã kết thúc
        while (idx.startPtr < idx.starts.length && idx.starts[idx.startPtr].t <= currentTime) {
            currentActiveSet.add(idx.starts[idx.startPtr].i);
            idx.startPtr++;
        }
        while (idx.endPtr < idx.ends.length && idx.ends[idx.endPtr].t <= currentTime) {
            currentActiveSet.delete(idx.ends[idx.endPtr].i);
            idx.endPtr++;
        }
    } else {
        // Tính toán lại con trỏ nếu current time nhỏ hơn thời gian trước đó.
        const binSearchLastLE = (arr, time) => {
            let l = 0, r = arr.length - 1, pos = -1;
            while (l <= r) {
                const m = (l + r) >> 1;
                if (arr[m].t <= time) { pos = m; l = m + 1; } else r = m - 1;
            }
            return pos;
        };
        currentActiveSet.clear();
        const lastStart = binSearchLastLE(idx.starts, currentTime);
        if (lastStart >= 0) {
            for (let s = 0; s <= lastStart; s++) {
                const evIndex = idx.starts[s].i;
                const evEnd = Number(events[evIndex]?.endTime);
                if (!Number.isFinite(evEnd) || currentTime < evEnd) currentActiveSet.add(evIndex);
            }
        }
        // reposition pointers to next positions for forward scanning
        idx.startPtr = lastStart + 1;
        idx.endPtr = binSearchLastLE(idx.ends, currentTime) + 1;
    }
    state.lastTime = currentTime;
    state.eventIndex = idx;
    state.activeSet = currentActiveSet;
    // Nói chung đoạn này currentActiveSet đã chuẩn.
    // 2. So sánh sự thay đổi giữa currentActiveIndices và lastActiveIndices
    const currentActiveIndices = Array.from(currentActiveSet).sort((a, b) => a - b);
    const previousActiveIndices = Array.isArray(state.lastActiveIndices) ? state.lastActiveIndices : [];
    const previousActiveSet = new Set(previousActiveIndices);
    const addedActiveIndices = currentActiveIndices.filter(index => !previousActiveSet.has(index));
    const removedActiveIndices = previousActiveIndices.filter(index => !currentActiveSet.has(index));
    const activeIndexChanges = [];
    if (addedActiveIndices.length > 0) {
        activeIndexChanges.push(`thêm: ${addedActiveIndices.join(',')}`);
    }
    if (removedActiveIndices.length > 0) {
        activeIndexChanges.push(`xóa: ${removedActiveIndices.join(',')}`);
    }
    if (addedActiveIndices.length === 0 && removedActiveIndices.length === 0) return; // Nếu ko có thay đổi gì thì ko cần render tiếp
    if (activeIndexChanges.length > 0) {
        if (doLog) sendLogToBackground('renderer: (4.3) thay đổi active indices', 'log', activeIndexChanges);
    }
    // 2. Xóa các node bị loại bỏ khỏi active list, dựa trên removedActiveIndices
    [...removedActiveIndices].sort((a, b) => a - b).forEach(index => {
        const element = state.currentElements[index];
        if (element) {
            element.remove(); // Xóa khỏi giao diện
            delete state.currentElements[index];   // Xóa khỏi obj elements
            delete state.currentEvents[index];     // Xóa khỏi obj events
        }
    });
    // 3. Thêm mới các node mới xuất hiện, theo thứ tự index tăng dần
    [...addedActiveIndices].sort((a, b) => a - b).forEach(index => {
        const line = events[index];
        const styleName = line.style || 'Default';
        let styleCss = renderData.renderState.currentStyles?.[styleName];
        if (!styleCss) {
            sendLogToBackground(`renderer: (4.3) style ${line.style} này ko có trong currentStyles?`, 'warn');
            styleCss = renderData.defaultStyle;
        }

        




        
        // *** Đoạn này liên quan xử lí dữ liệu inline tags.
        const lineContainer = document.createElement('div'); // Vỏ
        // Danh sách các tag Aegisub ảnh hưởng đến toàn line (chỉ được tính tag đầu tiên/ tính 1 lần mỗi line)
        // \pos(x,y), \move(x0,y0,x1,y1[,t1,t2]), \an<x0>, \fad(t0,t1), \fade(a0,a1,a2,t0,t1,t2,t3)
        processGlobalInlineTags(currentTime, line, lineContainer, styleCss); // processLayoutTags
        processLocalInlineTags(currentTime, line, lineContainer, styleCss);
        // const textNode = document.createElement('span'); // Ruột
        // // Phần này sẽ đưa vào 5.2 processTextTags()
        // processTextTags(line, textNode, layoutContainer);
        // textNode.innerText = line.text
        //     .replace(/\{[^}]*\}/g, '')                              // Xóa tag
        //     .replace(/\\N/g, '\n')                                  // Đổi "\N" thành xuống dòng thật
        //     .replace(/\\n/g, info.WrapStyle === 2 ? '\n' : ' ');    // Đổi "\n" thành xuống dòng thật (chỉ khi WrapStyle = 2). info?
        // Object.assign(layoutContainer.style, styleCss.container);
        // Object.assign(textNode.style, styleCss.text);
        // layoutContainer.appendChild(textNode);
        // *** Hết đoạn liên quan xử lí dữ liệu inline tags







        layoutContainer.dataset.index = index;
        // Lưu lại ref của DOM element này vào object quản lý
        state.currentElements[index] = layoutContainer;
        // Tìm node đang render có index lớn hơn để chèn trước nó, tránh vòng lặp tìm index trên toàn bộ active list.
        let insertBeforeNode = null;
        for (const child of container.children) { // Quét từ cái đầu tiên trong container.children, tìm cái có index lớn hơn để chèn trước nó
            const childIndex = Number.parseInt(child.dataset?.index ?? '', 10);
            if (Number.isFinite(childIndex) && childIndex > index) {
                insertBeforeNode = child;
                break;
            }
        }
        if (insertBeforeNode) {
            container.insertBefore(layoutContainer, insertBeforeNode);
        } else {
            container.appendChild(layoutContainer);
        }
        processCollisions(layoutContainer); // 6.x. Xử lí chồng lấn
    });
    // Cập nhật lại state để check nếu cần
    state.currentEvents = {};
    currentActiveIndices.forEach(idx => {
        state.currentEvents[idx] = events[idx];
    });
    state.lastActiveIndices = currentActiveIndices;
}
/**
 * 4.4. Hàm mở chạy vòng lặp render theo frame (Gemini vibe, đã review)
 */
function enableRenderLoop() {
    const state = renderData.renderState;
    let currentFrameId = null;
    let lastLogTime = -1;
    /**
     * 4.4.1. Hàm đệ quy cho requestAnimationFrame
     * @param {*} timestamp 
     * @returns 
     */
    const tick = (timestamp) => {
        state.doEnable = state.doEnable ?? true;
        switch (true) {
            case (state.frameId !== currentFrameId): // Gemini vibe, bảo là tránh Loop Duplication / Race Condition
                sendLogToBackground('renderer (4.4): state.frameId khác currentFrameId nên ko render?',"warn");
                if (lastLogTime >= 0) lastLogTime = -1; // Biến lastLogTime thành chỉ dẫn cho clearSubtitleFrame() chạy 1 lần duy nhất
                return;
            case (state.doEnable === false):
                // Vẫn đăng ký khung hình tiếp theo để giữ vòng lặp sống, chờ observer kích hoạt lại
                if (lastLogTime < 0) clearSubtitleFrame(); // Cho dữ liệu trống thay vì renderSubtitleFrame(), chỉ chạy lần đầu khi (lastLogTime < 0)
                const idleFrameId = window.requestAnimationFrame(tick);
                state.frameId = idleFrameId;
                currentFrameId = idleFrameId;
                if (lastLogTime < 0) lastLogTime = timestamp; // Cập nhật lại mốc thời gian (lần đầu)
                if (timestamp - lastLogTime >= 500) { 
                    sendLogToBackground('renderer (4.4): doEnable đang tắt, clear frame',"warn");
                    lastLogTime = timestamp; // Cập nhật lại mốc thời gian
                }
                return;
            default: // Chỉ đăng ký frame tiếp theo nếu container vẫn tồn tại và loop chưa bị pause/stop
                renderSubtitleFrameInLoop();
                if (lastLogTime >= 0) lastLogTime = -1;
                state.frameId = window.requestAnimationFrame(tick);
                currentFrameId = state.frameId;
        }
    };
    window.isAssCeeRendererLoaded = true;
    const initialFrameId = window.requestAnimationFrame(tick);
    state.frameId = initialFrameId;
    currentFrameId = initialFrameId; 
}
/**
 * 4.5. Hàm chạy render chính
 * @param {obj} renderData
 */
function render(){ // Hàm chạy render trung tâm
    'use strict';
    /**
     * 4.5.1. Hàm chạy đệ quy/lặp selectVideo()
     * @returns "return" nếu cần thoát hàm render()
     */
    function retrySelectVideo() {
        if (selectVideo() === "return" || !renderData.container || !renderData.containerParent) {
            if (renderData.retryCount < 5) {
                renderData.retryCount += 1;
                sendLogToBackground(`renderer: (4.5) Ko thấy khung video. Thử lại lần ${renderData.retryCount}/5 sau 1s.`, "warn");
                setTimeout(retrySelectVideo, 1000);
            } else {
                sendLogToBackground(`renderer: (4.5) Thất bại sau ${renderData.retryCount} lần thử tìm video. Dừng chạy renderer.`, "warn");
            }
            return "return";
        }
        renderData.retryCount = 0;
    }
    // if (updateVideoIdInRenderer() === "return") return "return";
    if (retrySelectVideo() === "return") return "return";
    var invalidateResult = renderDataCheck(renderData,"a");
    if (invalidateResult) return disableRenderLoop(`renderer: (4.5a) có dữ liệu ko hợp lệ (a): ${invalidateResult}. Dừng chạy renderer.`);
    preProcessSubData(); // Chuẩn hóa, tính toán chung cho sub.
    if (observeParentLayout() === "return") return "return"; // Lập trình tính năng bám bắt video.
    enableRenderLoop(); // Chạy vòng lặp render theo frame
}







/**
 * 5.1. Hàm xử lí các tag layout trong văn bản. (Copilot vibe, đang review)
 * Chú ý: dữ liệu được chuẩn hóa theo chuẩn 4.3bc (renderDataCheck("bc"))
 * @param {number} currentTime renderData.video.currentTime (hàm 4.3 renderSubtitleFrameInLoop, parent? hàm này, đã chuẩn hóa)
 * @param {Object} line event[index], tức orgline/line trong Aegisub
 * @param {HTMLElement} layoutContainer node vỏ (div) chứa textNode. chi tiết xem hàm 3.4.3 styleObjToCss()
 * @param {HTMLElement} styleCss dữ liệu style với định dạng CSS, đầu ra hàm 3.4.3 styleObjToCss()
 * @param {Object} renderData.container.getBoundingClientRect ("b")
 * @param {number} renderData.scaleWidth ("c")
 * @param {number} renderData.scaleHeight ("c")
 * @returns Xử lí các tag áp dụng toàn bộ line: \pos(x,y), \move(x0,y0,x1,y1[,t1,t2]), \an<x0>, \fad(t0,t1), \fade(a0,a1,a2,t0,t1,t2,t3)
 */
function processGlobalInlineTags(currentTime, line, lineContainer, styleCss) {
    // \pos(x,y)
    // \move(x0,y0,x1,y1[,t1,t2])
    // \an<x0>
    // \fad(t0,t1)
    // \fade(a0,a1,a2,t0,t1,t2,t3)
    const containerRect = renderData.container.getBoundingClientRect();
    const scaleX = renderData.scaleWidth;
    const scaleY = renderData.scaleHeight;
    


    /**
     * 5.1.1. Hàm ghi đè vị trí (x, y, \pos) vào layoutContainer.style
     * @param {number} x tọa độ x
     * @param {number} y tọa độ y
     * @returns 
     */
    const applyPosition = (x, y) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        layoutContainer.style.position = 'absolute';
        layoutContainer.style.left = `${Math.round(x * scaleX)}px`;
        layoutContainer.style.top = `${Math.round(y * scaleY)}px`;
        layoutContainer.style.width = 'auto';
        layoutContainer.style.height = 'auto';
        layoutContainer.style.maxWidth = '100%';
        if (textNode) {
            textNode.style.display = 'inline-block';
            textNode.style.maxWidth = '100%';
        }
    };
    /**
     * 
     * @param {*} code 
     */
    const applyAlignment = (code) => {
        const align = Number(code);
        const alignMap = {
            1: { justify: 'flex-start', align: 'flex-end', textAlign: 'left' },
            2: { justify: 'center', align: 'flex-end', textAlign: 'center' },
            3: { justify: 'flex-end', align: 'flex-end', textAlign: 'right' },
            4: { justify: 'flex-start', align: 'center', textAlign: 'left' },
            5: { justify: 'center', align: 'center', textAlign: 'center' },
            6: { justify: 'flex-end', align: 'center', textAlign: 'right' },
            7: { justify: 'flex-start', align: 'flex-start', textAlign: 'left' },
            8: { justify: 'center', align: 'flex-start', textAlign: 'center' },
            9: { justify: 'flex-end', align: 'flex-start', textAlign: 'right' }
        };
        const resolved = alignMap[align] || alignMap[2];
        layoutContainer.style.justifyContent = resolved.justify;
        layoutContainer.style.alignItems = resolved.align;
        if (textNode) {
            textNode.style.textAlign = resolved.textAlign;
        }
    };

    const rawText = String(line?.text || '');

    const anMatch = rawText.match(/\\an(\d+)/i);
    if (anMatch) {
        applyAlignment(anMatch[1]);
    }

    const posMatch = rawText.match(/\\pos\(([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\)/i);
    if (posMatch) {
        applyPosition(Number(posMatch[1]), Number(posMatch[2]));
    }

    const moveMatch = rawText.match(/\\move\(([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)(?:\s*,\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?))?\)/i);
    if (moveMatch) {
        const x1 = Number(moveMatch[1]);
        const y1 = Number(moveMatch[2]);
        const x2 = Number(moveMatch[3]);
        const y2 = Number(moveMatch[4]);
        const t1 = moveMatch[5] !== undefined ? Number(moveMatch[5]) : Number(line?.startTime) || 0;
        const t2 = moveMatch[6] !== undefined ? Number(moveMatch[6]) : Number(line?.endTime) || t1;
        const currentTime = Number.isFinite(renderData?.video?.currentTime) ? renderData.video.currentTime : 0;
        const startTime = Math.min(t1, t2);
        const endTime = Math.max(t1, t2);
        const duration = Math.max(1, endTime - startTime);
        let progress = 0;
        if (currentTime <= startTime) {
            progress = 0;
        } else if (currentTime >= endTime) {
            progress = 1;
        } else {
            progress = (currentTime - startTime) / duration;
        }
        const x = x1 + (x2 - x1) * progress;
        const y = y1 + (y2 - y1) * progress;
        applyPosition(x, y);
    }
}
/**
 * 5.2. Hàm xử lí các tag văn bản
 * @param {object} line 
 * @param {HTMLElement} textNode 
 */
function processTextTags(line, textNode) {
    // Xử lí các tag văn bản
}

/**
 * 6.1. Hàm xử lí chồng lấn giữa các dòng phụ đề
 * @param {HTMLElement} layoutContainer
 */
function processCollisions(layoutContainer) {
    // Xử lí chồng lấn giữa các dòng phụ đề
}







// Phần chạy của renderer.
initRenderer();
autoRenderOnCache();