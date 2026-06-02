// Code bằng tay (thực ra vẫn còn nhiều chỗ vibe coding)
// v0.0.0.2 02jun26
const extensionName = 'ASS-CEE'
const tabMap = {
  'tab1': 'Quản lý nguồn',
  'tab2': 'Quản lý phụ đề',
  'tab3': 'Thông tin chung'
};
/**
 * Hàm gửi log về background.js
 * @param {*} message nội dung
 * @param {*} type loại nội dung (default: "info" -> log, "warn" -> warn, "error" -> error)
 */
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
    console.warn("[ASS-CEE] ui: Không thể gửi log về background:", err);
  });
}
// Phần chạy chính của ui.js
// Cấu trúc: 
// 1. (tầng 1) khởi tạo khung HTML và các giao thức với nó
// 1.x. (tầng 2) các tính năng độc lập
(async function() {
  'use strict';
  const containerId = 'asscee_overlayRoot';
  // Khai báo chung containerId để 2 file cùng nhận diện đc và giao tiếp. 
  // Tuy nhiên, do ko chạy ở background nên có tính độc lập theo tab (tab isolation)
  if (document.getElementById(containerId)) return; // Nếu trùng lặp thì thoát
  sendLogToBackground("ui: Đang khởi tạo giao diện nội bộ.");
  try {
    // try..catch tầng 1, cho khung HTML và giao thức với các thực -mộng- thể của nó
    // 1. Phần định nghĩa khung HTML và giao thức với các thực -mộng- thể của nó
    const container = document.createElement('div');
    container.id = containerId;
    container.innerHTML = `
      <div class="asscee_ui">
        <!-- Khung giao diện -->

        <div class="asscee_barTitle">
          <!-- Thanh tiêu đề -->  
          <div class="asscee_titleLeftGrp">
            <!-- Chia thanh tiêu đề thành 2 phần: nút Danh sách trang và Tiêu đề ở trái -->
            <button id="asscee_tabListBtn" class="asscee_tabListBtn"></button>
            <span id="asscee_title" class="asscee_title"></span>
          </div>
            <!-- Nút ẩn giao diện ở bên phải -->
          <button id="asscee_closeBtn" class="asscee_closeBtn"></button>
          <!-- Hết thanh tiêu đề -->
        </div>
        
        <div id="asscee_tabListExpand" class="asscee_tabListExpand">
          <!-- Phần Danh sách trang (mở khi bấm tabBtn)-->
          <button class="asscee_tabListItem active" data-asscee_tab-target="tab1"></button>
          <button class="asscee_tabListItem" data-asscee_tab-target="tab2"></button>
          <button class="asscee_tabListItem" data-asscee_tab-target="tab3"></button>
        </div>

        <div class="asscee_workspace">
          <!-- Phần nội dung các trang-->
          <div id="asscee_tab1_content" class="asscee_tabPane active"></div>
          <div id="asscee_tab2_content" class="asscee_tabPane"></div>
          <div id="asscee_tab3_content" class="asscee_tabPane"></div>
        </div>

        <div class="asscee_footer">
          <!-- Phần footer-->
          <span id="asscee_footerInfo" class="asscee_footerInfo"></span>
          <span id="asscee_footerMisc" class="asscee_footerMisc"></span>
        </div>

      </div>
    `
    document.body.appendChild(container);
    sendLogToBackground("ui: Khởi tạo khung HTML thành công.");
    // Phần xử lí các nút giao diện
    // const barTitle = container.querySelector('.asscee_barTitle');
    // Cho toàn bộ thanh tiêu đề [đang nằm ở phần xử lí tính năng di chuyển giao diện]
    // const tabListBtn = container.querySelector('#asscee_tabListBtn');
    // Cho nút đổi trang hiển thị (thanh tiêu đề) 
    // const titleText = container.querySelector('#asscee_title');
    // Cho tiêu đề (thanh tiêu đề)
    // const closeBtn = container.querySelector('#asscee_closeBtn');
    // Cho nút tạm ẩn giao diện (thanh tiêu đề)
    // const tabListExpand = container.querySelector('#asscee_tabListExpand') 
    // Cho phần danh sách trang hiển thị
    // const tabItemBtns = container.querySelectorAll('[data-asscee_tab-target]');
    // Cho các nút chọn trang (danh sách trang hiển thị). 
    // Ở đây chọn theo tag data để thuận cho việc chèn các nút chuyển tab bên trong tab khác, chứ ko chỉ có trong danh sách.
    // const tabContents = container.querySelectorAll('.asscee_tabPane');
    // Cho các nút chọn trang hiển thị và nội dung tương ứng
    // const footerInfo = container.querySelector('#asscee_footerInfo');
    // Cho phần thông tin ở footer
    // const footerMisc = container.querySelector('#asscee_footerMisc');
    // Cho phần thông tin ở footer
    sendLogToBackground("ui: Xử lí giao thức với các thực thể trong khung HTML thành công.");
    // const menuBtn = container.querySelector('#ext-menu-btn');
    // const menuDropdown = container.querySelector('#ext-menu-dropdown');
    // const closeBtn = container.querySelector('#ext-close-btn');
    // const tabTitle = container.querySelector('#ext-tab-title');
    // const footerStatus = container.querySelector('#ext-footer-status');
    // const tabButtons = container.querySelectorAll('[data-tab-target]');
    // const tabContents = container.querySelectorAll('.ext-tab-pane');
    try {
      // try..catch tầng 2
      // 1.1. Phần xử lí các thao tác chọn trang hiển thị
      const tabListBtn = container.querySelector('#asscee_tabListBtn');
      // Cho nút đổi trang hiển thị (thanh tiêu đề) 
      const titleText = container.querySelector('#asscee_title');
      // Cho tiêu đề (thanh tiêu đề)
      const closeBtn = container.querySelector('#asscee_closeBtn');
      // Cho nút tạm ẩn giao diện (thanh tiêu đề)
      const tabListExpand = container.querySelector('#asscee_tabListExpand') 
      // Cho phần danh sách trang hiển thị
      const tabItemBtns = container.querySelectorAll('[data-asscee_tab-target]');
      // Cho các nút chọn trang (danh sách trang hiển thị). 
      // Ở đây chọn theo tag data để thuận cho việc chèn các nút chuyển tab bên trong tab khác, chứ ko chỉ có trong danh sách.
      const tabContents = container.querySelectorAll('.asscee_tabPane');
      // Cho các nút chọn trang hiển thị và nội dung tương ứng
      /**
       * Hàm xử lí lựa chọn trang
       * @param {*} tabId ở đây là giá trị của thuộc tính data-asscee_tab-target
       * Kết quả: thay đổi thuộc tính active của tab
       */
      function selectTab(tabId) {
        const tabLabel = tabMap[tabId] || 'Tab không xác định';
        // Lấy tên trang
        titleText.textContent = `${extensionName} (${tabLabel})`;
        // Thay đổi tiêu đề để chứa tên extension và tab đang sử dụng
        sendLogToBackground(`Người dùng chuyển sang tab: ${tabLabel}`);
        // Gửi log cho background để theo dõi
        tabItemBtns.forEach(btn => {
          // Quét từng cái tabItemBtns và thay đổi thuộc tính active của chúng
          const target = btn.getAttribute('data-asscee_tab-target');
          if (target === tabId) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        tabContents.forEach(content => {
          // Tương tự với tabContents
          if (content.id === `asscee_${tabId}_content`) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      }
      // Xử lí thao tác bấm nút tabListBtn
      tabListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tabListExpand.classList.toggle('show');
        const isShowing = tabListExpand.classList.contains('show');
        sendLogToBackground(`ui: Người dùng ${isShowing ? "mở" : "đóng"} danh mục menu lựa chọn Tab`);
      });
      // Xử lí thao tác bấm vào toàn trang (kể cả những vùng đã định dạng khác)
      document.addEventListener('click', () => {
        if (tabListExpand.classList.contains('show')) {
          // Đóng phần tabListExpand
          tabListExpand.classList.remove('show');
          sendLogToBackground("ui: Tự động đóng menu lựa chọn Tab khi click vùng trống");
        }
      });
      // Xử lí thao tác bấm nút closeBtn
      closeBtn.addEventListener('click', () => {
        container.style.setProperty('display', 'none', 'important');
        sendLogToBackground("ui: Người dùng nhấp nút tạm ẩn giao diện Extension");
      });
      // Xử lí thao tác bấm nút tabItemBtns
      tabItemBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabId = btn.getAttribute('data-tab-target');
          selectTab(tabId);
        });
      });
      } catch (error) {
      sendLogToBackground(`ui: Lỗi xử lí nút giao diện (1.1): ${error.message}`, "error");
      console.error("[ASS-CEE] ui: Lỗi xử lí nút giao diện (1.1):", error);
    }
    try {
      // try..catch tầng 2
      // 1.2. Phần xử lí tính năng di chuyển giao diện
      const barTitle = container.querySelector('.asscee_barTitle');
      // Cho toàn bộ thanh tiêu đề
      let isDragging = false; // Trạng thái kéo thả UI
      let offsetX = 0; // Vị trí của chuột so với góc trên bên trái của UI, chiều X
      let offsetY = 0; // Vị trí tương tự, chiều Y
      /**
       * Hàm trung tâm, xử lí tọa độ UI khi di chuyển
       * @param {*} clientX vị trí con trỏ (x)
       * @param {*} clientY vị trí con trỏ (y)
       * Đầu ra newLeft, newTop: vị trí mới của góc trên bên trái UI
       */
      function handleMove(clientX, clientY) {
        let newLeft = clientX - offsetX;
        let newTop = clientY - offsetY;
        // Tính toán tọa độ thô của UI
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const extWidth = 400; 
        const extHeight = 400;
        // Lấy kích thước khung UI và của cửa sổ trình duyệt
        newLeft = Math.max(0, Math.min(newLeft, viewportWidth - extWidth));
        newTop = Math.max(0, Math.min(newTop, viewportHeight - extHeight));
        // Bảo vệ tọa độ UI (tránh UI bay ra ngoài cửa sổ)
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        // Cài đặt lại UI, lấy góc trên bên trái làm gốc
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
        // Áp dụng tọa độ
      }
      /**
       * Hàm chuyển trạng thái UI sang kéo thả (chuyển vị trí), khi bấm vào thanh tiêu đề
       * @param {*} clientX vị trí con trỏ (x)
       * @param {*} clientY vị trí con trỏ (y)
       * @returns Đầu ra: mở thao tác di chuyển UI (addEventListener) bằng chuột
       */
      function barTitleOnClick(clientX, clientY) {
        isDragging = true; // Bật trạng thái kéo thả UI
        barTitle.style.cursor = 'grabbing'; // Đổi icon của con trỏ sang 'grabbing' (tay nắm)
        const rect = container.getBoundingClientRect(); // Lấy tọa độ 4 góc của UI để tính offset
        offsetX = clientX - rect.left; // Tính toán offsetX
        offsetY = clientY - rect.top; // Tính toán offsetY
        document.addEventListener('mousemove', barTitleOnClickHold, { passive: false });
        document.addEventListener('mouseup', barTitleOnRelease);
        // Mở cặp thao tác di chuyển khi nhấn giữ + di chuyển, và thả chuột.
        document.addEventListener('touchmove', barTitleOnTouchHold, { passive: false });
        document.addEventListener('touchend', barTitleOnRelease);
        // Tương tự với màn hình cảm ứng (chưa test)
      }
      /**
       * Hàm xử lí nhấn giữ + di chuyển chuột
       * @param {*} e (ko rõ)
       * @returns chạy handleMove()
       */
      function barTitleOnClickHold(e) {
        if (!isDragging) return;
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      }
      /**
       * Hàm xử lí nhấn giữ + di chuyển chạm (chưa test)
       * @param {*} e (ko rõ)
       * @returns chạy handleMove()
       */
      function barTitleOnTouchHold(e) {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
      /**
       * Hàm xử lí thả chuột/chạm
       */
      function barTitleOnRelease() {
        if (isDragging) {
          isDragging = false; // Tắt trạng thái kéo thả UI
          barTitle.style.cursor = 'grab'; // Đưa icon con trỏ về 'grab'
          document.removeEventListener('mousemove', barTitleOnClickHold);
          document.removeEventListener('mouseup', barTitleOnRelease);
          document.removeEventListener('touchmove', barTitleOnTouchHold);
          document.removeEventListener('touchend', barTitleOnRelease);
          // Đóng các thao tác kéo thả UI
          sendLogToBackground(`ui: Đã dời vị trí Extension tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
        }
      }
      // Xử lí thao tác bấm chuột vào thanh tiêu đề 
      barTitle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
        // Bỏ qua trường hợp bấm vào nút tabListBtn, closeBtn và tabListExpand (???)
        // Khi này, vẫn tính khi bấm vào title (dòng tiêu đề)
        barTitleOnClick(e.clientX, e.clientY);
        sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (chuột)");
      });
      // Xử lí thao tác bấm chạm vào thanh tiêu đề (chưa test)
      barTitle.addEventListener('touchstart', (e) => {
        if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
        // Bỏ qua trường hợp bấm vào nút tabListBtn, closeBtn và tabListExpand (???)
        // Khi này, vẫn tính khi bấm vào title (dòng tiêu đề)
        const touch = e.touches[0];
        barTitleOnClick(touch.clientX, touch.clientY);
        sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (cảm ứng)");
      }, { passive: true });
      // Xử lí thao tác nhả chạm (fallback trên toàn cửa sổ do touchstart có passive: true. Gemini bảo thế. chưa test)
      document.addEventListener('touchend', () => {
        if (isDragging) {
          isDragging = false;
          sendLogToBackground(`ui: Đã dời vị trí Extension (cảm ứng) tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
        }
      });
    } catch (error) {
      sendLogToBackground(`ui: Lỗi xử lí tính năng di chuyển (1.2): ${error.message}`, "error");
      console.error("[ASS-CEE] ui: Lỗi xử lí tính năng di chuyển (1.2):", error);
    }
  } catch (error) {
    sendLogToBackground(`ui: Lỗi khởi tạo và xử lí khung HTML (1.): ${error.message}`, "error");
    console.error("[ASS-CEE] ui: Lỗi khởi tạo và xử lí khung HTML (1.):", error);
  }
})();