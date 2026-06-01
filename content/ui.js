// Code bằng tay (thực ra vẫn còn nhiều chỗ vibe coding)
// v0.0.0.2 01jun26
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
(async function() {
  'use strict';
  const containerId = 'asscee_overlayRoot';
  // Khai báo chung containerId để 2 file cùng nhận diện đc và giao tiếp. 
  // Tuy nhiên, do ko chạy ở background nên có tính độc lập theo tab (tab isolation)
  if (document.getElementById(containerId)) return; // Nếu trùng lặp thì thoát
  sendLogToBackground("ui: Đang khởi tạo giao diện nội bộ.");
  try {
    // Phần định nghĩa khung HTML
    const container = document.createElement('div');
    container.id = containerId;
    container.innerHTML = `
    <div class="asscee_ui">
      <!-- Khung giao diện -->

      <div class="asscee_barTitle">
        <!-- Thanh tiêu đề -->  
        <div class="asscee_titleLeftGrp">
          <!-- Chia thanh tiêu đề thành 2 phần: nút Danh sách trang và Tiêu đề ở trái -->
          <button id="asscee_tabBtn" class="asscee_tabBtn"></button>
          <span id="asscee_title" class="asscee_title"></span>
        </div>
          <!-- Nút ẩn giao diện ở bên phải -->
        <button id="asscee_closeBtn" class="asscee_closeBtn"></button>
        <!-- Hết thanh tiêu đề -->
      </div>
      
      <div id="asscee_menuExpand" class="asscee_menuExpand">
        <!-- Phần Danh sách trang (mở khi bấm tabBtn)-->
        <button class="asscee_menuItem active" data-asscee_tab-target="tab-1"></button>
        <button class="asscee_menuItem" data-asscee_tab-target="tab-2"></button>
        <button class="asscee_menuItem" data-asscee_tab-target="tab-3"></button>
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
  } catch (error) {
    sendLogToBackground(`ui: Lỗi khởi tạo khung HTML: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: Lỗi khởi tạo khung HTML:", error);
  }
  try {
    // Phần định nghĩa các thực -mộng- thể tương tác
    const tabListBtn = container.querySelector('#asscee_tabBtn');
    // Cho nút đổi trang hiển thị
    const menuExpand = container.querySelector('#asscee_menuExpand') 
    // Cho phần danh sách trang hiển thị
    const closeBtn = container.querySelector('#asscee_closeBtn');
    // Cho nút tạm ẩn giao diện
    const titleText = container.querySelector('#asscee_title');
    // Cho tiêu đề
    const footerInfo = container.querySelector('#asscee_footerInfo');
    // Cho phần thông tin ở footer
    const footerMisc = container.querySelector('#asscee_footerMisc');
    // Cho phần thông tin ở footer
    const tabItemBtns = container.querySelectorAll('[data-asscee_tab-target]');
    const tabContents = container.querySelectorAll('.asscee_tabPane');
    // Cho các nút chọn trang hiển thị và nội dung tương ứng

    // const menuBtn = container.querySelector('#ext-menu-btn');
    // const menuDropdown = container.querySelector('#ext-menu-dropdown');
    // const closeBtn = container.querySelector('#ext-close-btn');
    // const tabTitle = container.querySelector('#ext-tab-title');
    // const footerStatus = container.querySelector('#ext-footer-status');
    // const tabButtons = container.querySelectorAll('[data-tab-target]');
    // const tabContents = container.querySelectorAll('.ext-tab-pane');


    // Phần xử lí thuật toán
    const extensionName = 'ASS-CEE'
    const tabMap = {
      'tab-1': 'Quản lý nguồn',
      'tab-2': 'Quản lý phụ đề',
      'tab-3': 'Thông tin chung'
    };
    /**
     * Hàm xử lí lựa chọn trang
     * @param {*} tabId ở đây là giá trị của thuộc tính data-asscee_tab-target
     * Kết quả: thay đổi thuộc tính active của tab
     */
    function selectTab(tabId) {
      const tabLabel = tabMap[tabId] || 'Tab không xác định';
      // Lấy tên trang
      tabTitle.textContent = `${extensionName} (${tabLabel})`;
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
        if (content.id === `ext-${tabId}-content`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    }

    // Toggle tabListBtn
    tabListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuExpand.classList.toggle('show');
      const isShowing = menuDropdown.classList.contains('show');
      sendLogToBackground(`ui: Người dùng ${isShowing ? "mở" : "đóng"} danh mục menu lựa chọn Tab`);
    });

    // Tự động đóng menu nếu click bên ngoài vùng menu
    document.addEventListener('click', () => {
      if (menuExpand.classList.contains('show')) {
        menuExpand.classList.remove('show');
        sendLogToBackground("ui: Tự động đóng menu lựa chọn Tab khi click vùng trống");
      }
    });

    // Sự kiện nút đóng
    closeBtn.addEventListener('click', () => {
      container.style.setProperty('display', 'none', 'important');
      sendLogToBackground("ui: Người dùng nhấp nút tạm ẩn giao diện Extension");
    });

    // Chuyển tab
    tabItemBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab-target');
        selectTab(tabId);
      });
    });

    // --- 4. TÍNH NĂNG DI CHUYỂN KHUNG GIAO DIỆN (DRAGGABLE) ---
    const titleBar = container.querySelector('.ext-title-bar');
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function handleMove(clientX, clientY) {
      let newLeft = clientX - offsetX;
      let newTop = clientY - offsetY;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const extWidth = 400; 
      const extHeight = 400;

      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - extWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - extHeight));

      container.style.right = 'auto';
      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
    }

    function onStart(clientX, clientY) {
      isDragging = true;
      titleBar.style.cursor = 'grabbing';

      const rect = container.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;

      document.addEventListener('mousemove', onMove, { passive: false });
      document.addEventListener('mouseup', onStop);
      
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onStop);
    }

    function onMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    }

    function onTouchMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }

    function onStop() {
      if (isDragging) {
        isDragging = false;
        titleBar.style.cursor = 'grab';
        
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onStop);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onStop);

        sendLogToBackground(`ui: Đã dời vị trí Extension tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
      }
    }

    titleBar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('#ext-menu-btn') || e.target.closest('#ext-close-btn') || e.target.closest('#ext-menu-dropdown')) return;
      
      onStart(e.clientX, e.clientY);
      sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (chuột)");
    });

    titleBar.addEventListener('touchstart', (e) => {
      if (e.target.closest('#ext-menu-btn') || e.target.closest('#ext-close-btn') || e.target.closest('#ext-menu-dropdown')) return;
      
      const touch = e.touches[0];
      onStart(touch.clientX, touch.clientY);
      sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (cảm ứng)");
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;
        sendLogToBackground(`ui: Đã dời vị trí Extension (cảm ứng) tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
      }
    });

  } catch (error) {
    sendLogToBackground(`ui: Lỗi nghiêm trọng khi load UI: ${error.message}`, "error");
    console.error("[ASS-CEE] ui Không thể khởi tạo extension UI:", error);
  }
})();