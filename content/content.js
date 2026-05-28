// Thử nghiệm ui.js
/**
 * Content Script: content.js
 * 
 * Đây là file ĐIỀU PHỐI CHUNG (Dispatcher) duy nhất.
 * Nhiệm vụ duy nhất của file này là:
 * 1. Kiểm tra sự tồn tại của giao diện (với ID: `chrome-extension-overlay-root`).
 * 2. Nếu đã tồn tại -> Chỉ Toggle (Ẩn/Hiện) hiển thị của container, KHÔNG tải lại ui.js.
 * 3. Nếu chưa tồn tại -> Thực hiện inject động tập tin giao diện chính `ui.js` vào trang web của người dùng.
 */

(function() {
  const containerId = 'chrome-extension-overlay-root';
  const container = document.getElementById(containerId);

  // --- 1. KIỂM TRA SỰ TỒN TẠI VÀ TOGGLE ---
  if (container) {
    if (container.style.display === 'none') {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  } else {
    // --- 2. ĐIỀU PHỐI: NẠP ĐỘNG FILE UI.JS ---
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('ui.js');
    script.id = 'chrome-extension-ui-script';
    (document.head || document.documentElement).appendChild(script);
  }
})();
