// Code bằng tay
// v0.0.0.2 03jun26
// Hàm gửi log từ content.js về background.js
function sendLogToBackground(message, type = 'info') {
  chrome.runtime.sendMessage({
    type: 'LOG_FROM_CONTENTS',
    payload: {
      type: type,
      text: message,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  }).catch(err => {
    console.warn("[ASS-CEE] content: Không thể gửi log về background:", err);
  });
}
// Phần chạy chính của content.js (tạm thời chỉ đảm nhận việc ẩn/hiện UI)
// Thực tế, phần ẩn/hiện UI có thể chuyển hẳn sang ui.js. 
// Tuy nhiên, do chưa đủ TRÌNH (chuyển sang bị lỗi ko hiện UI luôn) nên để lại ở đây.
(function() {
  'use strict';
  const containerId = 'asscee_overlayRoot';
  const container = document.getElementById(containerId);
  if (!container) return;
  // Lấy giá trị display thực tế mà mắt người dùng đang nhìn thấy trên màn hình
  const computedDisplay = window.getComputedStyle(container).display;
  // Nếu CSS thực tế là none, tiến hành HIỆN nó lên
  if (computedDisplay === 'none') {
    container.style.setProperty('display', 'block', 'important');
    sendLogToBackground("content: Đã hiện giao diện UI.");
  } else {
    // Nếu CSS thực tế khác none (đang hiện), tiến hành ẨN nó đi
    container.style.setProperty('display', 'none', 'important');
    sendLogToBackground("content: Đã ẩn giao diện UI.");
  }
})();