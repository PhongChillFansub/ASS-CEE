// Code bằng tay (thực ra vẫn còn nhiều chỗ vibe coding)
// v0.0.0.2 29may26
// Phần chạy chính của ui.js
(async function() {
  const containerId = 'chrome-extension-overlay-root';
  // Khai báo chung containerId để 2 file cùng nhận diện đc và giao tiếp. 
  // Tuy nhiên, do ko chạy ở background nên có tính độc lập theo tab (tab isolation)
  if (document.getElementById(containerId)) return; // Nếu trùng lặp thì thoát
  // Hàm gửi log về background.js
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
  sendLogToBackground("[ASS-CEE] ui: Đang nạp tài nguyên ui.css và ui.html...");
  try {
    // --- 1. NHÚNG STYLE CSS TỪ content/ui.css ---
    const styleNode = document.createElement('link');
    styleNode.id = 'chrome-ext-ui-styles';
    styleNode.rel = 'stylesheet';
    styleNode.href = chrome.runtime.getURL('content/ui.css');
    document.head.appendChild(styleNode);
    // --- 2. TẢI VÀ NHÚNG HTML TỪ content/ui.html ---
    const response = await fetch(chrome.runtime.getURL('content/ui.html'));
    const htmlText = await response.text();
    const container = document.createElement('div');
    container.id = containerId;
    container.innerHTML = htmlText;
    document.body.appendChild(container);
    sendLogToBackground("[ASS-CEE] ui: Khởi tạo DOM thành công.", "info");
    // --- 3. ĐĂNG KÝ CÁC SỰ KIỆN TƯƠNG TÁC ---
    const menuBtn = container.querySelector('#ext-menu-btn');
    const menuDropdown = container.querySelector('#ext-menu-dropdown');
    const closeBtn = container.querySelector('#ext-close-btn');
    const tabTitle = container.querySelector('#ext-tab-title');
    const footerStatus = container.querySelector('#ext-footer-status');
    const tabButtons = container.querySelectorAll('[data-tab-target]');
    const tabContents = container.querySelectorAll('.ext-tab-pane');
    // --- 4. Phần xử lí thuật toán ---
    function selectTab(tabId) {
      let tabLabel = 'Tab 1';
      if (tabId === 'tab-2') tabLabel = 'Tab 2';
      if (tabId === 'tab-3') tabLabel = 'Tab 3';
      tabTitle.textContent = `no title (${tabLabel})`;
      sendLogToBackground(`Người dùng chuyển sang tab: ${tabLabel}`);
      tabButtons.forEach(btn => {
        const target = btn.getAttribute('data-tab-target');
        if (target === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      tabContents.forEach(content => {
        if (content.id === `ext-${tabId}-content`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      if (footerStatus) {
        footerStatus.textContent = `Active: ${tabLabel}`;
      }
    }

    // Toggle Menu ☰
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('show');
      const isShowing = menuDropdown.classList.contains('show');
      sendLogToBackground(`Người dùng ${isShowing ? "mở" : "đóng"} danh mục menu lựa chọn Tab`);
    });

    // Tự động đóng menu nếu click bên ngoài vùng menu
    document.addEventListener('click', () => {
      if (menuDropdown.classList.contains('show')) {
        menuDropdown.classList.remove('show');
        sendLogToBackground("Tự động đóng menu lựa chọn Tab khi click vùng trống");
      }
    });

    // Sự kiện nút đóng
    closeBtn.addEventListener('click', () => {
      container.style.setProperty('display', 'none', 'important');
      sendLogToBackground("Người dùng nhấp nút [✕] đóng/ẩn giao diện Extension");
    });

    // Chuyển tab
    tabButtons.forEach(btn => {
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

        sendLogToBackground(`Đã dời vị trí Extension tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
      }
    }

    titleBar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('#ext-menu-btn') || e.target.closest('#ext-close-btn') || e.target.closest('#ext-menu-dropdown')) return;
      
      onStart(e.clientX, e.clientY);
      sendLogToBackground("Bắt đầu di chuyển giao diện Extension UI (chuột)");
    });

    titleBar.addEventListener('touchstart', (e) => {
      if (e.target.closest('#ext-menu-btn') || e.target.closest('#ext-close-btn') || e.target.closest('#ext-menu-dropdown')) return;
      
      const touch = e.touches[0];
      onStart(touch.clientX, touch.clientY);
      sendLogToBackground("Bắt đầu di chuyển giao diện Extension UI (cảm ứng)");
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;
        sendLogToBackground(`Đã dời vị trí Extension (cảm ứng) tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
      }
    });

  } catch (error) {
    sendLogToBackground(`Lỗi nghiêm trọng khi load UI: ${error.message}`, "error");
    console.error("[ASS-CEE] Không thể khởi tạo extension UI:", error);
  }
})();