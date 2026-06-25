// Code bằng tay
// v0.0.0.4 25jun26
/**
 * 7.1.1. (6.1.1.) Hàm gửi log về background.js
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
      timestamp: new Date().toISOString()
    }
  }).catch(err => {
    console.warn("[ASS-CEE] ui: Không thể gửi log về background:", err);
  });
}
/**
 * 7.1.2. (6.2.4.1.) Hàm lấy YouTube Video ID từ URL hiện tại
 * @returns {string} videoId hoặc chuỗi rỗng
 */
function getYouTubeVideoId() { return new URLSearchParams(window.location.search).get('v'); }
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { // Nhận thủ công (UI bắt background gửi) 
    if (msg?.type === 'RENDER' && (msg.payload !== null && typeof msg.payload === 'object' && !Array.isArray(msg.payload))) {
        Object.assign(subObj, msg.payload); // Nhận dữ liệu để render
        sendLogToBackground("renderer: Nhận tín hiệu thủ công thành công:");
        render();
    } else {
        sendLogToBackground("renderer: Tín hiệu từ Background ko phải RENDER?")
    }
    sendResponse({ type: 'LOGGED' }); // Làm cảnh. Vì ở background-side ko đọc response khi gửi tín hiệu render.
});
chrome.runtime.sendMessage({ // Tự động chạy (1 lần, khi chạy file này theo manifest)
    type: 'SUB.USE_CACHE',
    payload: { videoId: getYouTubeVideoId() }
}, (response) => {
    // response của 'SUB.USE_CACHE': { type: 'SUB.READY', payload: await subObj/useSubData(payload.videoId) }
    if (response && response.type === 'SUB.USE_CACHE') {
        Object.assign(subObj, msg.payload); // Nhận dữ liệu để render
        sendLogToBackground("renderer: Tự động nhận tín hiệu thành công:");
        render();     
    } else {
        sendLogToBackground("renderer: Tự động nhận tín hiệu thất bại.");
    }
});
function render(){ // Hàm chạy chính hiện tại
    const subObj = {};
    'use strict';
    const FALLBACK_DEFAULT_STYLE = {
        Name: "Default",                            // Tên style (style.name, line.styleref.name, syl.style.name)
        Fontname: "Arial",                          // Tên font (\fn)
        Fontsize: "20",                             // Font size (\fs, px, với PlayRes 640x480)
        PrimaryColour: "rgba(255,255,255,1.0)",     // Màu 1, main (\1c)
        SecondaryColour: "rgba(255,0,0,1.0)",       // Màu 2, pre-kara (\2c)
        OutlineColour: "rgba(0,0,0,1.0)",           // Màu 3, outline (\3c)
        BackColour: "rgba(0,0,0,1.0)",              // Màu 4, shadow (\4c)
        Bold: false,                                // In đậm (\b, boolean)
        Italic: false,                              // In nghiêng (\i, boolean)
        Underline: false,                           // Gạch dưới (\u, boolean)
        StrikeOut: false,                           // Gạch ngang (\s, boolean)
        ScaleX: "100",                              // ScaleX (\fscx, %)
        ScaleY: "100",                              // ScaleY (\fscx, %)
        Spacing: "0",                               // (\fsp, px)
        Angle: "0",                                 // (\fr hoặc \frz, degree)
        BorderStyle: "1",                           // Kiểu border (1: viền thường, 3: box)
        Outline: "2",                               // (\bord, px. có \xbord và \ybord)
        Shadow: "2",                                // (\shad, px. có \xshad và \yshad)
        Alignment: "2",                             // (\an, 1-9 kiểu numpad)
        MarginL: "20",                              // (px, left)
        MarginR: "20",                              // (px, right)
        MarginV: "20",                              // (px, vertical)
        Encoding: "1"                               // (\fe, nên bị bỏ qua.)
    };
    // Font mặc định khi tạo file mới (trong Aegisub)
    // Cấu trúc đầu vào file renderer: (payload khi gửi "SUB.READY") : = subObj hoặc useSubData(), xem mục 2.4.3.1.
    // subObj_specimen = { // subObj_specimen là mẫu subObj tham khảo, ko dùng trực tiếp
    //     videoId,
    //     fileObj: {
    //         id,
    //         fileName,
    //         fetchUrl,
    //         viewUrl,
    //         sourceType,
    //         groupName
    //     },
    //     parsedData: {
    //         info: {
    //             Title,                      
    //             // Tiêu đề (tùy chọn)
    // 			ScriptType,                 
    //             // Phiên bản script (nên là v4.00+)
    // 			WrapStyle: 0,                  
    //             // Cách xuống dòng tự động (0 (mặc định): tự động, dòng trên dài hơn; 1: tự động, chỉ xuống khi chạm rìa (\N); 2: thủ công (\N, \n); 3: tự động, dòng dưới rộng hơn)
    // 			PlayResX,                   
    //             // Độ phân giải video, X (px)
    // 			PlayResY,                   
    //             // Độ phân giải video, Y (px)
    // 			ScaledBorderAndShadow: true       
    //             // Có scale border và shadow theo PlayRes? (0: không, 1: có (mặc định)) (ảnh hưởng đến cách tính kích thước outline/shadow)
    //         },
    //         styles: [{
    //                 Name, 
    //                 Fontname, 
    //                 Fontsize, 
    //                 PrimaryColour, 
    //                 SecondaryColour, 
    //                 OutlineColour, 
    //                 BackColour, 
    //                 Bold, 
    //                 Italic, 
    //                 Underline, 
    //                 StrikeOut, 
    //                 ScaleX, 
    //                 ScaleY, 
    //                 Spacing, 
    //                 Angle, 
    //                 BorderStyle, 
    //                 Outline, 
    //                 Shadow, 
    // 				Alignment, 
    //                 MarginL, 
    //                 MarginR, 
    //                 MarginV, 
    //                 Encoding
    //             }],
    //         events: [{
    //             Layer, 
    //             Start, 
    //             End, 
    //             Style, 
    //             Name, 
    //             // Actor
    //             MarginL, 
    //             // theo style chứ ko theo line
    //             MarginR, 
    //             // theo style chứ ko theo line
    //             MarginV, 
    //             // theo style chứ ko theo line
    //             Effect, 
    //             // có quan trọng ko?
    //             Text
    //         }]
    //     },
    //     cachedAt
    // }
    const videos = Array.from(document.querySelectorAll('video')); // Lấy toàn bộ video trên trang web.
    if (videos.length === 0) {
        sendLogToBackground("renderer: Không phát hiện thẻ <video> nào trên trang.");
        return;
    }
    sendLogToBackground(`renderer: [${new Date().toLocaleTimeString()}] Phát hiện ${videos.length} video(s) trên trang:`);
    const videoTableData = videos.map((video, index) => {
        // 1. Tự động gán ID định danh duy nhất nếu chưa có
        if (!video.dataset.detectedId) {
            video.dataset.detectedId = 'vid_' + Math.random().toString(36).substring(2, 9);
        }
        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);
        // 2. Tính toán trạng thái hiển thị vật lý và CSS
        const isVisibleCSS = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        const hasSize = rect.width > 0 && rect.height > 0;
        const isVisible = isVisibleCSS && hasSize;
        // 3. Tiêu chí xác định video chính (Kích thước lớn + đang hiển thị)
        const isMain = isVisible && rect.width > 300 && rect.height > 150;
        return {
            "STT": index + 1,
            "Detected ID": video.dataset.detectedId,
            "Thời gian hiện tại": video.currentTime.toFixed(2) + " giây",
            "Kích thước thực tế": `${rect.width.toFixed(0)}x${rect.height.toFixed(0)} px`,
            "Trạng thái hiển thị": isVisible ? "HIỂN THỊ" : "BỊ ẨN",
            "Là Video Chính?": isMain ? "⭐ CHÍNH (ĐÚNG)" : "Phụ / Ẩn",
            "Class Name": video.className ? `.${video.className.split(' ').join('.')}` : "Không có",
            "Source URL": video.currentSrc ? video.currentSrc.substring(0, 60) + "..." : "Không có nguồn"
        };
    });
    // In bảng tổng hợp trực quan ra Console
    sendLogToBackground(videoTableData, "table");
    // Tìm và làm nổi bật video được thuật toán xác định là chính
    const mainVideo = videos.find(video => {
        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 300 && rect.height > 150;
        return isVisible;
    });
    if (mainVideo) {
        sendLogToBackground(`renderer: Video chính đang chọn là [ID: ${mainVideo.dataset.detectedId}] - Giây hiện tại: ${mainVideo.currentTime.toFixed(2)}s`);
    } else {
        sendLogToBackground(`renderer: Không tìm thấy video chính nào đủ điều kiện hiển thị.`);
    }
}

/**
 * ASS-CEE Renderer
 * Unified DOM ASS renderer with standardized subtitle data and optimized redraw.
 */
// (function () {
//   'use strict';

//   if (typeof window.ASS_CEE === 'undefined') {
//     window.ASS_CEE = {}; 
//   }

  

//   class AssCeeRenderer {
//     constructor(layerId = 'ass-cee-layer') {
//       this.layerId = layerId;
//       this.overlay = null;
//       this.data = null;
//       this.settings = {};
//       this.lastCacheKey = '';
//       this.isRunning = false;
//       this.playResX = 384;
//       this.playResY = 288;
//     }

//     init() {
//       this.overlay = document.getElementById(this.layerId) || this.createOverlay();
//       if (!this.isRunning) {
//         this.isRunning = true;
//         requestAnimationFrame(this.loop.bind(this));
//       }
//     }

//     createOverlay() {
//       const el = document.createElement('div');
//       el.id = this.layerId;
//       Object.assign(el.style, {
//         position: 'absolute',
//         inset: '0',
//         pointerEvents: 'none',
//         overflow: 'hidden',
//         zIndex: '9999'
//       });
//       document.body.appendChild(el);
//       return el;
//     }

//     updateData(data) {
//       if (!data) {
//         this.data = null;
//         return;
//       }

//       if (data.parsedData) {
//         this.data = data.parsedData;
//       } else {
//         this.data = {
//           events: data.subtitles || [],
//           styles: data.styleSettings || {}
//         };
//       }

//       this.playResX = parseInt(this.data.info?.PlayResX, 10) || data.playResX || 384;
//       this.playResY = parseInt(this.data.info?.PlayResY, 10) || data.playResY || 288;
//       this.lastCacheKey = '';
//     }

//     loop() {
//       this.render();
//       requestAnimationFrame(this.loop.bind(this));
//     }

//     clear() {
//       if (this.overlay) {
//         this.overlay.innerHTML = '';
//       }
//       this.lastCacheKey = '';
//     }

//     render() {
//       if (!this.overlay || !this.data || !this.data.events?.length) {
//         this.clear();
//         return;
//       }

//       const video = document.querySelector('video');
//       if (!video) {
//         this.clear();
//         return;
//       }

//       const time = video.currentTime * 1000;
//       const settings = window.ASS_CEE.storage?.loadGlobal?.() || {};
//       const activeSubs = this.getActiveSubtitles(time);
//       const rect = this.overlay.getBoundingClientRect();

//       if (!activeSubs.length || rect.width === 0 || rect.height === 0) {
//         this.clear();
//         return;
//       }

//       const cacheKey = this.buildCacheKey(activeSubs, rect, settings);
//       if (cacheKey === this.lastCacheKey) {
//         return;
//       }
//       this.lastCacheKey = cacheKey;

//       this.overlay.innerHTML = '';
//       const fragment = document.createDocumentFragment();
//       const scaleX = rect.width / this.playResX;
//       const scaleY = rect.height / this.playResY;

//       activeSubs.forEach(sub => {
//         const styleName = sub.style || sub.Style || 'Default';
//         const style = this.normalizeStyle(this.data.styles?.[styleName] || this.data.styles?.Default || DEFAULT_STYLE);
//         if (!style.visible) return;

//         const element = this.createSubtitleElement(sub, style, settings, time, scaleX, scaleY);
//         if (element) fragment.appendChild(element);
//       });

//       this.overlay.appendChild(fragment);
//     }

//     getActiveSubtitles(time) {
//       return this.data.events.filter(item => {
//         const start = item.StartMs ?? item.start ?? 0;
//         const end = item.EndMs ?? item.end ?? 0;
//         return time >= start && time <= end;
//       });
//     }

//     buildCacheKey(activeSubs, rect, settings) {
//       return [
//         rect.width,
//         rect.height,
//         activeSubs.length,
//         activeSubs.map(s => `${s.StartMs ?? s.start}-${s.EndMs ?? s.end}-${s.Text ?? s.text}`).join('|'),
//         settings.fontFamily || '',
//         settings.fontSize || '',
//         settings.outlineWidth || ''
//       ].join('|');
//     }

//     normalizeStyle(rawStyle) {
//       const style = {
//         ...DEFAULT_STYLE,
//         ...(rawStyle || {})
//       };

//       return {
//         ...style,
//         PrimaryColour: this.assColorToCss(style.PrimaryColour) || DEFAULT_STYLE.PrimaryColour,
//         OutlineColour: this.assColorToCss(style.OutlineColour) || DEFAULT_STYLE.OutlineColour,
//         BackColour: this.assColorToCss(style.BackColour) || DEFAULT_STYLE.BackColour,
//         Fontname: style.Fontname || DEFAULT_STYLE.Fontname,
//         Fontsize: style.Fontsize || DEFAULT_STYLE.Fontsize,
//         Bold: style.Bold ?? DEFAULT_STYLE.Bold,
//         Italic: style.Italic ?? DEFAULT_STYLE.Italic,
//         Underline: style.Underline ?? DEFAULT_STYLE.Underline,
//         BorderStyle: style.BorderStyle ?? DEFAULT_STYLE.BorderStyle,
//         Outline: style.Outline ?? DEFAULT_STYLE.Outline,
//         Shadow: style.Shadow ?? DEFAULT_STYLE.Shadow,
//         Alignment: style.Alignment ?? DEFAULT_STYLE.Alignment,
//         MarginL: style.MarginL ?? DEFAULT_STYLE.MarginL,
//         MarginR: style.MarginR ?? DEFAULT_STYLE.MarginR,
//         MarginV: style.MarginV ?? DEFAULT_STYLE.MarginV,
//         visible: style.visible !== false,
//         override: style.override || false
//       };
//     }

//     createSubtitleElement(sub, style, global, time, scaleX, scaleY) {
//       const rawText = sub.Text ?? sub.text ?? '';
//       const text = this.cleanText(rawText);
//       if (!text) return null;

//       const posX = (sub.filePos?.x ?? style.posX ?? (this.playResX / 2)) * scaleX;
//       const posY = (sub.filePos?.y ?? style.posY ?? (this.playResY - 35)) * scaleY;
//       const fontSize = (parseFloat(style.Fontsize) || 24) * scaleY;
//       const outline = parseFloat(style.Outline) || 2;
//       const shadow = parseFloat(style.Shadow) || 2;
//       const isBold = style.Bold === '1' || style.Bold === '-1';
//       const isItalic = style.Italic === '1' || style.Italic === '-1';
//       const textColor = style.PrimaryColour;
//       const outlineColor = style.OutlineColour;
//       const shadowColor = style.BackColour;

//       const lineOp = this.computeOpacity(sub, time, global);

//       const wrapper = document.createElement('div');
//       wrapper.style.position = 'absolute';
//       wrapper.style.left = `${posX}px`;
//       wrapper.style.top = `${posY}px`;
//       wrapper.style.transform = 'translate(-50%, -50%)';
//       wrapper.style.pointerEvents = 'none';
//       wrapper.style.whiteSpace = 'pre-wrap';
//       wrapper.style.textAlign = 'center';
//       wrapper.style.display = 'inline-flex';
//       wrapper.style.flexDirection = 'column';
//       wrapper.style.alignItems = 'center';
//       wrapper.style.opacity = `${lineOp}`;
//       wrapper.style.zIndex = '9999';

//       const textContainer = document.createElement('div');
//       textContainer.style.position = 'relative';
//       textContainer.style.display = 'inline-block';

//       if (sub.syllables?.length) {
//         this.appendKaraokeSyllables(textContainer, sub, time, global, fontSize, textColor, shadowColor);
//       } else {
//         const span = document.createElement('span');
//         span.innerText = text;
//         span.style.position = 'relative';
//         span.style.color = textColor;
//         span.style.fontFamily = style.Fontname;
//         span.style.fontSize = `${fontSize}px`;
//         span.style.fontWeight = isBold ? 'bold' : 'normal';
//         span.style.fontStyle = isItalic ? 'italic' : 'normal';
//         span.style.textDecoration = style.Underline === '1' ? 'underline' : 'none';
//         span.style.lineHeight = '1.2';
//         span.style.textShadow = this.buildTextShadow(outline, outlineColor, shadow, shadowColor);
//         textContainer.appendChild(span);
//       }

//       wrapper.appendChild(textContainer);
//       this.applyAlignment(wrapper, parseInt(style.Alignment, 10) || 2, scaleX, scaleY, style);
//       return wrapper;
//     }

//     appendKaraokeSyllables(container, sub, time, global, fontSize, defaultColor, shadowColor) {
//       sub.syllables.forEach(syl => {
//         const span = document.createElement('span');
//         span.innerText = syl.text;
//         span.style.display = 'inline-block';
//         span.style.position = 'relative';
//         span.style.fontFamily = global.fontFamily || 'Arial, sans-serif';
//         span.style.fontSize = `${fontSize}px`;
//         span.style.marginRight = '2px';
//         span.style.textShadow = this.buildTextShadow(1, shadowColor, 0, shadowColor);

//         let ks = global.kPost || {};
//         let zoom = 1;
//         if (time < syl.timeStart) {
//           ks = global.kPre || {};
//         } else if (time >= syl.timeStart && time < syl.timeEnd) {
//           ks = global.kActive || {};
//           const dur = syl.timeEnd - syl.timeStart || 1;
//           const progress = (time - syl.timeStart) / dur;
//           zoom = 1 + ((ks.zoom || 1) - 1) * (1 - Math.abs(progress - 0.5) * 2);
//         }

//         span.style.color = ks.c1 || defaultColor;
//         span.style.transform = `scale(${zoom})`;
//         container.appendChild(span);
//       });
//     }

//     computeOpacity(sub, time, global) {
//       const start = sub.StartMs ?? sub.start ?? 0;
//       const end = sub.EndMs ?? sub.end ?? 0;
//       const fadeIn = (global.fadIn || 0) / 1000;
//       const fadeOut = (global.fadOut || 0) / 1000;
//       let opacity = 1;
//       if (fadeIn > 0 && time - start < fadeIn) {
//         opacity = Math.max(0, (time - start) / fadeIn);
//       } else if (fadeOut > 0 && end - time < fadeOut) {
//         opacity = Math.max(0, (end - time) / fadeOut);
//       }
//       return opacity;
//     }

//     applyAlignment(element, alignment, scaleX, scaleY, style) {
//       const marginL = (parseInt(style.MarginL, 10) || 20) * scaleX;
//       const marginR = (parseInt(style.MarginR, 10) || 20) * scaleX;
//       const marginV = (parseInt(style.MarginV, 10) || 20) * scaleY;

//       element.style.left = `calc(${element.style.left} + ${marginL}px)`;

//       if ([1, 2, 3].includes(alignment)) {
//         element.style.bottom = `${marginV}px`;
//         element.style.top = 'auto';
//       } else if ([7, 8, 9].includes(alignment)) {
//         element.style.top = `${marginV}px`;
//       }

//       if ([1, 4, 7].includes(alignment)) {
//         element.style.justifyContent = 'flex-start';
//         element.style.alignItems = 'flex-start';
//         element.style.textAlign = 'left';
//       } else if ([3, 6, 9].includes(alignment)) {
//         element.style.justifyContent = 'flex-end';
//         element.style.alignItems = 'flex-end';
//         element.style.textAlign = 'right';
//       }
//     }

//     buildTextShadow(outline, outlineColor, shadow, shadowColor) {
//       const shadows = [];
//       if (outline > 0) {
//         const offsets = [
//           [-outline, -outline], [0, -outline], [outline, -outline],
//           [-outline, 0], [outline, 0],
//           [-outline, outline], [0, outline], [outline, outline]
//         ];
//         offsets.forEach(([x, y]) => {
//           shadows.push(`${x}px ${y}px 0 ${outlineColor}`);
//         });
//       }
//       if (shadow > 0) {
//         shadows.push(`${shadow}px ${shadow}px ${shadow}px ${shadowColor}`);
//       }
//       return shadows.join(', ');
//     }

//     cleanText(rawText) {
//       if (!rawText) return '';
//       return rawText.replace(/\{[^}]+\}/g, '').replace(/\\N/gi, '\n').trim();
//     }

//     assColorToCss(value) {
//       if (!value || typeof value !== 'string') return null;
//       const hex = value.trim().replace(/^&H/, '').replace(/&$/, '');
//       if (/^[0-9A-Fa-f]{8}$/.test(hex)) {
//         const alpha = 1 - parseInt(hex.substr(0, 2), 16) / 255;
//         const blue = parseInt(hex.substr(2, 2), 16);
//         const green = parseInt(hex.substr(4, 2), 16);
//         const red = parseInt(hex.substr(6, 2), 16);
//         return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(2)})`;
//       }
//       if (/^rgba?\(/i.test(value) || /^#/.test(value)) {
//         return value;
//       }
//       return null;
//     }
//   }

//   window.ASS_CEE.renderer = new AssCeeRenderer();
// })();
