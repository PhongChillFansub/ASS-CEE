// Code bằng tay
// v0.0.0.5 28jun26
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
 */
function updateVideoIdInRenderer() {
  const getYouTubeVideoId = () => new URLSearchParams(window.location.search).get('v');
  // Định dạng lưu id YT: "<11 char base64>"
  // const getBilibiliVideoId = () => `${window.location.pathname.match(/\/video\/(BV\w+)/)?.[1]}?${new URLSearchParams(window.location.search).get('p') || 1}`;
  // Định dạng lưu id BiliBili: "BV<10 char base58>?<p>"
  // const getLocalVideoId = (keepFileExtension) => decodeURIComponent(window.location.href).split('/').pop().replace(keepFileExtension ? /^/ : /\.[^/.]+$/, "");
  // Định dạng lưu id local: "<tên file><đuôi file (có thể tùy chỉnh)>"
  const url = window.location.href;
  renderData.tabMode = "youtube"
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
        sendLogToBackground(`renderer: (1.2) Ko thể tách ID từ url ${url}.`,"warn");
        return null; // Trả về giá trị mặc định nếu không khớp trang nào
    }
    if (renderData?.currentId) {
        sendLogToBackground(`renderer: (1.2) Cập nhật ID video hiện tại: ${renderData.currentId}`);
    } else {
        sendLogToBackground(`renderer: (1.2) Ko thể tách ID từ url ${url}`,"warn");
    }
  })();
}
/**
 * 1.3. Hàm chạy tự động tìm, chọn video, và tạo lập khung phụ đề ban đầu.
 * @param {obj} renderData Tham chiếu obj ghi dữ liệu chung. luôn có vì đã rào trước ở đầu hàm render()
 * @returns Tất cả đầu ra là gián tiếp:
 * @returns {*} renderData.containerId: id khung sub, 
 * @returns {*} renderData.containerParent: tham chiếu node cha của khung sub và video (thực tế là node cha của cha của video),
 * @returns {*} renderData.videoAR: tỉ lệ khung hình (cố định) của node video,
 * @returns {*} renderData.container: tham chiếu node khung sub,
 * @returns {*} renderData.video: tham chiếu node video,
 */
function selectVideo(renderData) {
    const videos = Array.from(document.querySelectorAll('video')); // Lấy toàn bộ video trên trang web.
    if (videos.length === 0) {
        sendLogToBackground("renderer: (1.3) Không phát hiện thẻ <video> nào trên trang.","warn");
        return;
    }
    sendLogToBackground(`renderer: (1.3) Phát hiện ${videos.length} video(s) trên trang:`);
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
    sendLogToBackground(videoTableData, "table");
    // Hiển thị kết quả video chính đã được xác định ở trên
    renderData.containerId = 'asscee_overlayRenderRoot';
    // Đầu ra gián tiếp thứ nhất: ID của node khung phụ đề
    if (selectedVideo) {
        const videoRect = selectedVideo.getBoundingClientRect();
        sendLogToBackground(`renderer: (1.3) Video được chọn là [ID: ${selectedVideo.dataset.detectedId}] - Kích thước: ${Math.round(videoRect.width)}x${Math.round(videoRect.height)}`);
        // if (renderData.isLocalVideo) { // Đoạn
        //     // Dành cho local: video tag là frame, overlay phải nằm ngoài <video> vì <div> không phải con hợp lệ của <video>.
        //     const originalParent = selectedVideo.parentNode || selectedVideo;
        //     let localParent = originalParent;
        //     if (originalParent === document.body || originalParent === document.documentElement) {
        //         const wrapper = document.createElement('div');
        //         wrapper.style.position = 'relative';
        //         wrapper.style.display = 'inline-block';
        //         wrapper.style.width = `${Math.round(videoRect.width)}px`;
        //         wrapper.style.height = `${Math.round(videoRect.height)}px`;
        //         originalParent.insertBefore(wrapper, selectedVideo);
        //         wrapper.appendChild(selectedVideo);
        //         localParent = wrapper;
        //         sendLogToBackground(`renderer: (1.3) Local video wrapper created around <video> to avoid body/html positioning issues.`, "log");
        //     }
        //     renderData.containerParent = localParent;
        //     renderData.video = selectedVideo; // Dùng video element để truy cập currentTime / playback timing.
        //     renderData.videoSource = selectedVideo.querySelector('source') || null; // Dòng này chỉ để ghi log
        //     sendLogToBackground(`renderer: (1.3) Local video detected. containerParent = ${renderData.containerParent.tagName}, videoSource = ${renderData.videoSource ? '<source>' : 'none'}`,"log");
        // } else {
        // }
        renderData.containerParent = selectedVideo.closest('#movie_player') || selectedVideo.parentNode;
        renderData.video = selectedVideo;
        // Đầu ra gián tiếp thứ hai: tham chiếu đến node cha của khung phụ đề
        if (!renderData.containerParent) {
            sendLogToBackground("renderer: (1.3) Không tìm được parent hợp lệ cho video.","warn");
            return;
        }
        const parentStyle = window.getComputedStyle(renderData.containerParent);
        if (parentStyle.position === 'static') {
            renderData.containerParent.style.position = 'relative';
            sendLogToBackground("renderer: (1.3) Đã đặt parent của video thành position: relative để overlay ASS-CEE hoạt động. Thay đổi này có thể ảnh hưởng đến layout của web gốc.","warn");
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
        sendLogToBackground(`renderer: (1.3) Không tìm thấy video chính nào đủ điều kiện hiển thị.`,"warn");
    }
}
/**
 * 1.4. Hàm kiểm tra và hợp lệ hóa dữ liệu (chỉ chạy 1 lần khi chạy hàm chính render())
 * @param {obj} renderData Tham chiếu obj ghi dữ liệu chung. luôn có vì đã rào trước ở đầu hàm render()
 * @param {obj} renderData.subObj Tham chiếu ghi dữ liệu sub nhận từ background. luôn có vì đã rào trước ở đầu hàm render()
 * @returns {string} string tên của dữ liệu ko tồn tại. Chú ý: đầu ra hàm này là text chỉ báo lỗi, phải có Log và throw new Error bọc vào.
 * @returns Tất cả dữ liệu được hợp lệ hóa là đầu ra gián tiếp:
 * @returns renderData.FALLBACK_DEFAULT_STYLE
 * @returns renderData.subObj.parsedData
 * @returns renderData.subObj.parsedData.info
 * @returns renderData.subObj.parsedData.info.WrapStyle (fallback = 0)
 * @returns renderData.cssConfig (tạo mới)
 * @returns renderData.subObj.parsedData.info.PlayResX
 * @returns renderData.subObj.parsedData.info.PlayResY
 * @returns renderData.videoAR
 */
function renderDataValidate(renderData){
    // Mặc định hàm 7.1.3. đã đảm bảo có các dữ liệu trên hợp lệ: .overlayId, .containerParent, .videoAR, .video, .container
    const info = renderData?.subObj?.parsedData?.info;
    switch (true) {
        case !renderData.FALLBACK_DEFAULT_STYLE: // FALLBACK_DEFAULT_STYLE
            return "FALLBACK_DEFAULT_STYLE";
        case (typeof info !== 'object' || info === null || Array.isArray(info)): // Mặc định có subObj (rào trước ở đầu hàm render())
            return "subObj?.parsedData?.info";
        case !Array.isArray(renderData?.subObj?.parsedData?.events): // Mặc định có subObj (rào trước ở đầu hàm render())
            return "subObj.parsedData.events";
    }
    switch (true) {
    case !info.PlayResX || !Number.isInteger(Number(info.PlayResX)):
        return "info.PlayResX";
    case !info.PlayResY || !Number.isInteger(Number(info.PlayResY)):
        return "info.PlayResY";
    }
    info.PlayResX = Number.parseInt(info.PlayResX, 10);
    info.PlayResY = Number.parseInt(info.PlayResY, 10);
    const rawSubAR = info.PlayResX / info.PlayResY;
    const isValidAR = isFinite(rawSubAR) && rawSubAR > 0;
    if (!isValidAR) sendLogToBackground(`renderer: (1.4) subAR có vấn đề, fallback về 16:9.`, "warn");
    const subAR = isValidAR ? rawSubAR : 16 / 9;
    const EPSILON = 0.04; // Ngưỡng sai số cho phép (lệch dưới 0.04 coi như bằng nhau)
    const isArDifferent = Math.abs(renderData.videoAR - subAR) > EPSILON;
    if (renderData.videoAR === 0 || isArDifferent) { 
        renderData.videoAR = subAR;
        sendLogToBackground(`renderer: (1.4) Lấy videoAR có vấn đề hoặc khác subAR (sai số tuyệt đối AR trên 0.04), lấy subAR thay thế: ${subAR.toFixed(4)}.`,"warn");
    }
    // Phần xử lí cho info.WrapStyle
    const rawStyleWrap = Number.parseInt(info.WrapStyle, 10);
    info.WrapStyle = (rawStyleWrap >= 0 && rawStyleWrap <= 3) ? rawStyleWrap : 0;
    renderData.cssConfig = {
        'white-space': 'pre-wrap',
        'max-width': '100%',
        'word-break': 'break-word'
    };
    switch(info.WrapStyle) {
        case 0:
            renderData.cssConfig['text-wrap'] = 'pretty'; // Ko có thuật toán như Aegisub làm (Gemini bảo thế), to-do: check xem cái này có cần sửa gì ko (ở beta)
            break;
        case 1:
            renderData.cssConfig['text-wrap'] = 'wrap'; 
            break;
        case 2:
            renderData.cssConfig['white-space'] = 'pre'; // Thủ công, bỏ qua max-width tự động ngắt
            renderData.cssConfig['word-break'] = 'normal';
            break;
        case 3:
            renderData.cssConfig['text-wrap'] = 'balance'; // Dòng dưới rộng hơn/cân bằng
            break;
    }
    return "";
}
// Phần khai báo dữ liệu chung
var renderData = window.renderData || {}; // renderData chung (tương tự uiData)
renderData.subObj = {}; // Reset subObj (dữ liệu phụ đề) mỗi lần chạy render.
renderData.retryCount = 0; // Lưu số lần thử tìm video
renderData.videoObserver = { // Lưu dữ liệu bám bắt video (mục 7.2. bám bắt video)
    resize: null,
    mutation: null,
    trackedParent: null,
    trackedAspectRatio: null,
    lastBounds: null
}; 
renderData.renderState = { // Lưu dữ liệu render (mục 7.3. render)
    currentStyles: null, // Có dùng
    pendingStyles: null, // Có dùng
    currentEvents: [], // Có dùng
    currentEventsIndex: null, // Có dùng
    activeElements: {}, // Có dùng
    frameId: null, // Có dùng
    doEnable: true, // Khi mới mở thì để state true để mở renderLoop
};
/**
 * 2.1. Hàm tính toán khung phụ đề (dựa trên tỉ lệ khung hình cố định của video và của sub)
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
 * 2.2. Hàm áp dụng tọa độ-kích thước mới tính toán vào khung phụ đề hiện có
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
 * 2.3. Hàm thiết lập trình bám bắt video
 * (Copilot vibe, đã review)
 * @param {*} parent khung video yt (khác video yt nhé)
 * @param {*} container khung phụ đề
 * @param {*} aspectRatio tỉ lệ khung hình của video yt
 * @returns tạo trình bám bắt video
 */
function observeParentLayout(parent, container, aspectRatio) {
    // if (!parent || !container || !aspectRatio) {
    //     sendLogToBackground(`renderer: lỗi đầu vào 7.2.3.: thiếu khung video yt (parent?:${!!parent}), khung phụ đề (container?:${!!container}), hoặc tỷ lệ khung hình (aspectRatio?:${!!aspectRatio}).`, "error");
    //     return; // Nếu ko đủ 3 đầu vào thì về
    // }
    /**
     * 2.3.1. Hàm refresh (trong hàm 2.3. observeParentLayout()): Quy định những việc phải làm của Observer
     * @returns chạy hàm 2.1, check thay đổi tọa độ-kích thước, chạy hàm 2.2 và gửi log về nếu cần.
     */
    const refresh = () => {
        const bounds = computeAspectFitBounds(parent.getBoundingClientRect(), aspectRatio); 
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
        applyOverlayBounds(container, bounds); // Áp dụng khung phụ đề mới
        sendLogToBackground(`renderer: 2.3. Parent đổi layout, cập nhật khung overlay: ${dimChangeLog}${(dimChangeLog && posChangeLog)?" ":""}${posChangeLog}.`, "log");
        // Gửi log về background xem.
        pendingStylesCalculate(); // Cập nhật style mới tính toán xong cho render (ở đây là chạy khi có cập nhật khi có update dimension)
        sendLogToBackground(`renderer: 2.3. (DEBUG) overlay trước khi update:\n  childElementCount=${container.childElementCount}, childNodes.length=${container.childNodes.length}`);
        autoRenderOnCache();
    };
    // Phần lập trình bám bắt video
    if (renderData.videoObserver.trackedParent !== parent || renderData.videoObserver.trackedAspectRatio !== aspectRatio) {
        if (renderData.videoObserver.resize) {
            renderData.videoObserver.resize.disconnect();
        }
        if (renderData.videoObserver.mutation) {
            renderData.videoObserver.mutation.disconnect();
        }
        renderData.videoObserver.trackedParent = parent;
        renderData.videoObserver.trackedAspectRatio = aspectRatio;
        renderData.videoObserver.resize = null;
        renderData.videoObserver.mutation = null;
        renderData.videoObserver.lastBounds = null;
    } // Chỗ này kiểm tra nếu parent và aspectRatio thay đổi (có thể là chuyển sang khung vid khác)
    if (window.ResizeObserver && !renderData.videoObserver.resize) {
        renderData.videoObserver.resize = new ResizeObserver(refresh);
        renderData.videoObserver.resize.observe(parent);
    } // Nếu resize thì lập trình bám bắt ngay
    if (window.MutationObserver && !renderData.videoObserver.mutation) {
        renderData.videoObserver.mutation = new MutationObserver(mutations => {
            const shouldRefresh = mutations.some(m => {
                if (m.type !== 'attributes') return false;
                if (!['style', 'class', 'id'].includes(m.attributeName)) return false;
                return true;
            });
            if (shouldRefresh) {
                const currentBounds = computeAspectFitBounds(parent.getBoundingClientRect(), aspectRatio);
                const last = renderData.videoObserver.lastBounds;
                if (!last || last.left !== currentBounds.left || last.top !== currentBounds.top || last.width !== currentBounds.width || last.height !== currentBounds.height) {
                    refresh();
                }
            }
        });
        renderData.videoObserver.mutation.observe(parent, { attributes: true, attributeFilter: ['style', 'class', 'id'] });
    } // Mà chỗ này liên quan đến mutation với attributes, ko hiểu lắm nên ko review đc
    refresh(); // Refresh luôn
}
/**
 * 3.1. Hàm chuyển đổi style từ object sang bộ CSS tĩnh (cấu trúc 2 lớp vỏ-ruột) (Gemini vibe, đã review)
 * @param {object} styleObj styleObj đầu vào chuẩn (tương tự renderData.FALLBACK_DEFAULT_STYLE. Xem hàm 7.3.2)
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
        'font-size': `${(styleObj.fontSize/renderData.dpr).toFixed(4)}px`,
        'letter-spacing': `${styleObj.spacing}px`,
        'font-weight': styleObj.bold ? 'bold' : 'normal',
        'font-style': styleObj.italic ? 'italic' : 'normal',
        'text-decoration': (styleObj.underline && styleObj.strikeOut) ? 'underline line-through' : styleObj.underline ? 'underline' : styleObj.strikeOut ? 'line-through' : 'none',
        // 'line-height': "normal"; // Giãn cách dòng, tạm thời bỏ qua. to-do: sẽ xem có vấn đề gì ở beta.
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
    const transforms = [];
    if (styleObj.scaleX !== "100" || styleObj.scaleY !== "100") {
        transforms.push(`scale(${Number(styleObj.scaleX) / 100}, ${Number(styleObj.scaleY) / 100})`);
    }
    if (styleObj.angle !== "0") {
        transforms.push(`rotate(${-Number(styleObj.angle)}deg)`);
        const originMap = {
            "1": "left bottom",   "2": "center bottom", "3": "right bottom",
            "4": "left center",   "5": "center center", "6": "right center",
            "7": "left top",      "8": "center top",    "9": "right top"
        };
        text['transform-origin'] = originMap[align] || "center center";
    }
    if (transforms.length > 0) {
        text['transform'] = transforms.join(' ');
        text['display'] = 'inline-block';
    }
    // --- XỬ LÝ BORDER & SHADOW ---
    const outlinePx = Number(styleObj.outline);
    const shadowPx = Number(styleObj.shadow);
    if (styleObj.borderStyle === "3") {
        text['color'] = styleObj.primaryColour;
        text['background-color'] = styleObj.outlineColour;
        text['border'] = outlinePx > 0 ? `${outlinePx}px solid ${styleObj.outlineColour}` : 'none';
        if (shadowPx > 0) text['box-shadow'] = `${shadowPx}px ${shadowPx}px 0px ${styleObj.backColour}`;
    } else {
        text['color'] = styleObj.primaryColour;
        text['background-color'] = 'transparent';
        if (outlinePx > 0) {
            text['paint-order'] = 'stroke fill';
            text['-webkit-text-stroke'] = `${outlinePx}px ${styleObj.outlineColour}`;
        }
        if (shadowPx > 0) {
            text['text-shadow'] = `${shadowPx + outlinePx}px ${shadowPx + outlinePx}px 0px ${styleObj.backColour}`;
        }
    }
    // Trả về cấu trúc lưu trữ tĩnh
    return { container, text };
}
/**
 * 3.2. Hàm thực thi chuyển đổi style theo thay đổi kích thước khung hình (từ khung PlayResX-Y sang khung width-height của phụ đề)
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
        sendLogToBackground(`renderer: (3.2) Style "${oldStyle.name}" thiếu thuộc tính so với FALLBACK_DEFAULT_STYLE, bị bỏ qua.`,"warn");
        return;
    } 
    // 2. Chuẩn hóa dữ liệu dựa theo kiểu dữ liệu gốc của FALLBACK_DEFAULT_STYLE
    const newStyle = {};
    requiredKeys.forEach(key => {
        newStyle[key] = (typeof renderData.FALLBACK_DEFAULT_STYLE[key] === 'boolean') ? (oldStyle[key] === "1" || oldStyle[key] === true) : String(oldStyle[key]);
    });
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
 * 3.3. Hàm tính toán và áp dụng style mới vào hàng chờ
 * @returns trả về gián tiếp renderData.renderState.pendingStyles đã tính toán sẵn
 * @returns tín hiệu tạm ngừng hoặc dừng hẳn render
 */
function pendingStylesCalculate() {
    // Áp dụng sửa đổi cho cả các styles trong renderData.subObj.parsedData.styles và renderData.FALLBACK_DEFAULT_STYLE
    // Nhiệm vụ check nội dung dữ liệu trước khi xử lí thì giao cho hàm 7.1.4.
    // Chú ý: chỉ chạy sau khi đã áp dụng kích thước mới cho renderData.container
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
            emitRenderControl('RENDER.STOP');
            sendLogToBackground(`renderer: (3.3) Khung ko còn hợp lệ (không thể nhìn thấy), kết thúc render.`);
            return;
        }
        if (!renderData.renderState.paused) {
            emitRenderControl('RENDER.PAUSE');
        }
        const msg = `renderer: (3.3) Kích thước container quá nhỏ, dưới 240px (${Math.round(containerRect.width)}x${Math.round(containerRect.height)}px). Tạm ngừng render để tránh vỡ font.`
        sendLogToBackground(msg, "warn");
        return;
    }
    if (renderData.renderState.paused || renderData.renderState.stopRequested) {
        emitRenderControl('RENDER.RESUME');
    }
    // Chạy cho FALLBACK để gán vào renderData.defaultStyle (truyền false)
    scaler(renderData.FALLBACK_DEFAULT_STYLE, null, false);
    // Chạy cho mảng style viết đúng cú pháp forEach
    renderData.renderState.pendingStyles = {};
    orgStyles.forEach(style => {
        scaler(style, renderData.renderState.pendingStyles, true);
    });
    sendLogToBackground(`renderer: (3.3) Đã áp dụng styles mới.`,"log",renderData.renderState.pendingStyles);
}
/**
 * 3.4. Hàm áp dụng style đang chờ vào trước khi frame loop render tiếp.
 */
function applyPendingStyles() {
    if (renderData.renderState.pendingStyles) {
        renderData.renderState.currentStyles = renderData.renderState.pendingStyles;
        renderData.renderState.pendingStyles = null;
        const state = renderData.renderState;
        const container = renderData.container;
        if (container && state.activeElements && Object.keys(state.activeElements).length > 0) {
            Object.values(state.activeElements).forEach(el => {
                if (el && el.parentNode === container) {
                    el.remove();
                }
            });
            state.activeElements = {};
            state.currentEvents = [];
            state.currentEventsIndex = null;
        }
    }
}
/**
 * 3.5. Hàm xử lí dữ liệu render theo từng frame (Gemini vibe, đã review)
 * @returns 
 */
function renderSubtitleFrame() {
    const video = renderData.video;
    const container = renderData.container;
    if (!video || !container) return;
    applyPendingStyles();
    const events = renderData.subObj.parsedData.events;
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const state = renderData.renderState;
    // 1. Tìm tất cả các index của những dòng cần hiển thị lúc này
    const currentActiveIndices = [];
    events.forEach((line, index) => {
        const start = Number(line?.startTime) || 0;
        const end = Number(line.endTime) || -1;
        if (currentTime >= start && currentTime < end) {
            currentActiveIndices.push(index);
        }
    });
    // 2. XÓA: Duyệt các phần tử đang hiển thị trên màn hình, nếu index nào KHÔNG CÒN active thì xóa khỏi DOM
    Object.keys(state.activeElements).forEach(indexStr => {
        const index = Number.parseInt(indexStr, 10);
        if (!currentActiveIndices.includes(index)) {
            state.activeElements[index].remove(); // Xóa khỏi giao diện
            delete state.activeElements[index];   // Xóa khỏi bộ nhớ theo dõi
        }
    });
    // 3. THÊM MỚI & SẮP XẾP THỨ TỰ (Luôn tăng dần theo index)
    currentActiveIndices.forEach(index => {
        // Nếu dòng này ĐÃ ĐANG HIỂN THỊ thì giữ nguyên, không làm gì cả
        if (state.activeElements[index]) return;
        // Nếu là dòng mới, tiến hành tạo DOM
        const line = events[index];
        const styleName = line.style || 'Default';
        let styleCss = renderData.renderState.currentStyles?.[styleName];
        if (!styleCss) {
            sendLogToBackground(`renderer: (3.5) style ${line.style} này ko có trong currentStyles?`,"warn");
            styleCss = renderData.defaultStyle;
        }
        const layoutContainer = document.createElement('div'); // Vỏ
        const textNode = document.createElement('span'); // Ruột
        textNode.innerText = line.text.replace(/\{[^}]*\}/g, ''); // Text (tạm thời xóa hết tag trong text, sẽ xử lí sau)
        Object.assign(layoutContainer.style, styleCss.container);
        Object.assign(textNode.style, styleCss.text);
        layoutContainer.appendChild(textNode);
        // Lưu lại ref của DOM element này vào object quản lý
        state.activeElements[index] = layoutContainer;
        // Xử lý chèn DOM theo đúng thứ tự index tăng dần:
        // Tìm xem có phần tử nào có index lớn hơn index hiện tại đang nằm trong container không
        const nextActiveIndex = currentActiveIndices.find(idx => idx > index && state.activeElements[idx]?.parentNode === container);
        if (nextActiveIndex) {
            // Chèn vào TRƯỚC phần tử có index lớn hơn kế tiếp để giữ đúng thứ tự
            container.insertBefore(layoutContainer, state.activeElements[nextActiveIndex]);
        } else {
            // Nếu không có ai lớn hơn nó, cứ push vào cuối container
            container.appendChild(layoutContainer);
        }
    });
    // Cập nhật lại state để check nếu cần
    state.currentEvents = currentActiveIndices.map(idx => events[idx]);
    state.currentEventsIndex = currentActiveIndices;
    // sendLogToBackground(`renderer: 3.5. (DEBUG) overlay sau tính toán:\n  childElementCount=${container.childElementCount}, childNodes.length=${container.childNodes.length}`);
    // Lệnh log debug này sẽ chạy theo tần số quét màn.
}
/**
 * 3.6. Hàm xóa dữ liệu render trong frame (Gemini vibe, chưa review)
 */
function clearSubtitleFrame() {
    const state = renderData.renderState;
    if (!state || !state.activeElements) {
        sendLogToBackground('renderer (3.6) Ko có renderState?.activeElements để xóa dữ liệu?',"warn");
    }
    // Duyệt qua tất cả các index đang hiển thị để dọn dẹp sạch sẽ
    Object.keys(state.activeElements).forEach(indexStr => {
        const element = state.activeElements[indexStr];
        if (element && typeof element.remove === 'function') {
            element.remove(); // Xóa khỏi màn hình (DOM)
        }
    });
    // Reset các object và array quản lý trạng thái về rỗng
    state.activeElements = {};
    state.currentEvents = [];
    state.currentEventsIndex = [];
}
/**
 * 3.7. Hàm mở chạy vòng lặp render theo frame (Gemini vibe, đã review)
 */
function enableRenderLoop() {
    const state = renderData.renderState;
    let currentFrameId = null;
    let lastLogTime = 0;
    const tick = (timestamp) => {
        state.doEnable = state.doEnable ?? true;
        switch (true) {
        case (state.frameId !== currentFrameId): // Gemini vibe, bảo là tránh Loop Duplication / Race Condition
            sendLogToBackground('renderer (3.7): state.frameId khác currentFrameId nên ko render?');
            return;
        case !renderData.container: // Ko có container để render
            disableRenderLoop(); // Hủy render
            sendLogToBackground('renderer (3.7): ko có container?');
            return;
        case (state.doEnable === false):
            // Vẫn đăng ký khung hình tiếp theo để giữ vòng lặp sống, chờ observer kích hoạt lại
            clearSubtitleFrame(); // Cho dữ liệu trống thay vì renderSubtitleFrame()
            const idleFrameId = window.requestAnimationFrame(tick);
            state.frameId = idleFrameId;
            currentFrameId = idleFrameId;
            if (timestamp - lastLogTime >= 500) { 
                sendLogToBackground('renderer (3.7): clear frame?');
                lastLogTime = timestamp; // Cập nhật lại mốc thời gian
            }
            return;
        default: // Chỉ đăng ký frame tiếp theo nếu container vẫn tồn tại và loop chưa bị pause/stop
            renderSubtitleFrame();
            state.frameId = window.requestAnimationFrame(tick);
            currentFrameId = state.frameId;
        }
    };
    const initialFrameId = window.requestAnimationFrame(tick);
    state.frameId = initialFrameId;
    currentFrameId = initialFrameId; 
}
/**
 * 3.8. Hàm hủy chạy vòng lặp render theo frame (Gemini vibe, chưa review)
 */
function disableRenderLoop() {
    clearSubtitleFrame();
    const state = renderData.renderState;
    state.state = false;
    if (state.frameId) {
        window.cancelAnimationFrame(state.frameId);
        sendLogToBackground(`Đã hủy frameId: ${state.frameId} từ bên ngoài.`);
    }
    state.frameId = null;
}
renderData.FALLBACK_DEFAULT_STYLE = {
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
    encoding: "1"                               // (\fe, nên bị bỏ qua.)
};
/**
 * 3.9. Hàm chạy render chính
 */
function render(){ // Hàm chạy chính của renderer
    'use strict';
    if (!renderData?.currentId || !(renderData.subObj && Object.keys(renderData.subObj).length > 0)) { 
        // Nếu ko có renderData, hoặc currentId (videoId gửi background lấy data) hoặc subObj (cache trống) thì về luôn;
        return;
    } 
    selectVideo(renderData); // Thiết lập renderData.container, .video, .videoAR, .
    if (!renderData.container) {
        if (renderData.retryCount < 5) {
            renderData.retryCount += 1;
            sendLogToBackground(`renderer: Có videoId và dữ liệu nhưng không có khung video. Thử lại lần ${renderData.retryCount}/5 sau 1s.`,"warn");
            setTimeout(render, 1000);
        } else {
            sendLogToBackground(`renderer: Thất bại sau ${renderData.retryCount} lần thử tìm video. Dừng retry. Chạy lại thủ công để khởi động lại quá trình.`,"warn");
        }
        return;
    }
    renderData.retryCount = 0;
    window.isAssCeeRendererLoaded = true;
    // Hết vòng lặp tìm video. Tiến hành kiểm tra dữ liệu hợp lệ trước rồi mới render.
    const invalidateResult = renderDataValidate(renderData);
    if (invalidateResult) {
        sendLogToBackground(`renderer: có dữ liệu ko hợp lệ: ${invalidateResult}. Hủy render.`,"error");
        return; // Dữ liệu giờ vẫn ko hợp lệ thì về luôn.
    }
    // Sau đoạn này đã đảm bảo được FALLBACK, info(.WrapStyle, .PlayResX, .PlayResY), cssConfig, .videoAR (đã xử lí) từ *Validate()
    // .containerId, .containerParent, .videoAR (thô), .container, .video từ selectVideo()
    observeParentLayout(renderData.containerParent, renderData.container, renderData.videoAR);
    // Lập trình tính năng bám bắt video.
    // if (renderData.renderState.stopRequested || renderData.renderState.paused) {
    //     sendLogToBackground(`renderer: renderLoop không khởi tạo do trạng thái paused/stopRequested sau khi tính styles.`, "warn");
    //     return;
    // }
    // renderData.renderState.stopRequested = false;
    // renderData.renderState.paused = false;
    sendLogToBackground(`renderer: Đã chuẩn bị xong. Tiến hành renderLoop.`);
    enableRenderLoop(); // Chạy vòng lặp render theo frame
}
// Phần trình xử lí phản hồi, tự động lấy cache và render
/**
 * Hàm lập trình tính năng tự động lấy cache và render
 */
function autoRenderOnCache() {
    renderData.lastId = renderData.currentId;
    updateVideoIdInRenderer();
    if (!renderData.currentId || renderData.currentId === renderData.lastId ) {
        disableRenderLoop();
        return;
    }
    chrome.runtime.sendMessage({ // Tự động chạy (1 lần, khi chạy file này theo manifest)
        type: 'SUB.USE_CACHE',
        payload: { videoId: renderData.currentId }
    }, (response) => {
        // response của 'SUB.USE_CACHE': { type: 'SUB.READY', payload: await subObj/useSubData(payload.videoId) }
        if (response && response.type === 'SUB.READY') {
            renderData.subObj = { ...response.payload }; // Nhận dữ liệu để render
            sendLogToBackground(`renderer: Tự động nhận tín hiệu (${renderData.currentId}) thành công:`,"log", response.payload || '(cache trống)');
            window.isAssCeeRendererLoaded = true; // Đánh dấu renderer đã khởi tạo thành công khi script đã được khởi động
            render();
            window.isAssCeeRendererLoaded = false;
        } else {
            sendLogToBackground(`renderer: Tự động nhận tín hiệu (${renderData.currentId}) thất bại.`,"warn", response);
        }
    });
}
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
        disableRenderLoop();
        sendResponse({ type: 'RENDER.CONTROL', action: 'STOPPED' });
        return;
    }
    if (msg?.type === 'RENDER' && (msg.payload !== null && typeof msg.payload === 'object' && !Array.isArray(msg.payload))) {
        const currentUrl = window.location.href;
        if (currentUrl.startsWith('about:')) {
            sendLogToBackground("renderer: Bỏ qua trang about: vì render không chạy ở đây. " + currentUrl,"warn");
            return;
        }
        renderData.subObj = { ...msg.payload }; // Nhận dữ liệu để render
        sendLogToBackground("renderer: Nhận tín hiệu thủ công thành công:");
        window.isAssCeeRendererLoaded = true; // Đánh dấu renderer đã khởi tạo thành công khi script đã được khởi động
        render();
        window.isAssCeeRendererLoaded = false;
    } else if (msg?.action || (msg?.type === 'RENDER' && !msg.payload)) {
    } else {
        sendLogToBackground("renderer: Tín hiệu từ Background (gửi cho renderer) ko phải RENDER chuẩn?","warn", msg)
    }
    sendResponse({ type: 'RENDERED' });
});
autoRenderOnCache();