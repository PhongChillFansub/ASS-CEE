// Code bằng tay
// v0.0.0.2 28may26
// Phần chạy chính của ui.js
(function() {
  const containerId = 'chrome-extension-overlay-root';
  // Khai báo chung containerId để 2 file cùng nhận diện đc và giao tiếp. 
  // Tuy nhiên, do ko chạy ở background nên có tính độc lập theo tab (tab isolation)
  if (document.getElementById(containerId)) return; // Nếu trùng lặp thì thoát
  // Hàm tiện ích hỗ trợ gửi log từ ui.js về background.js
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
  // Khởi phát log đầu tiên khi nạp thành công giao diện
  sendLogToBackground("[ASS-CEE] ui: nạp thành công, đang khởi tạo DOM.","info");
  // --- 1. NHÚNG PHONG CÁCH CSS ---
  const css = `
    #chrome-extension-overlay-root {
    /* Phần quy định UI cho "khung UI" */
      position: fixed !important;
      right: 20px;
      top: 20px;
      width: 400px !important;
      height: 400px !important;
      z-index: 2147483647 !important; /* Luôn luôn nổi trên cùng của trang web */
      box-sizing: border-box !important;
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
      user-select: none !important;
      display: block;
    }
    /* Phần quy định UI cho các mục con của mục "khung UI" */
    #chrome-extension-overlay-root * {
      box-sizing: border-box !important;
      margin: 0px !important; /*to-do: thử các giá trị khác?*/
      padding: 5px !important; /*to-do: thử các giá trị khác?*/
    }
    /* Khung giao diện chính. to-do: thử các giá trị khác? */
    .chrome-ext-container {
      width: 100% !important;
      height: 100% !important;
      background-color: #1e2024 !important;
      border: 1px solid rgba(60, 64, 67, 0.8) !important;
      border-radius: 12px !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      position: relative !important;
      color: #e8eaed !important;
    }
    /* Thanh tiêu đề. to-do: thử các giá trị khác? */
    .ext-title-bar {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 8px 12px !important;
      background-color: #17191c !important;
      border-bottom: 1px solid rgba(60, 64, 67, 0.8) !important;
      height: 38px !important;
      cursor: grab !important;
    }
    .ext-left-section {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    /* Nút Menu Hamburger ☰ */
    .ext-menu-btn {
      background: none !important;
      border: none !important;
      color: #9aa0a6 !important;
      font-size: 16px !important;
      cursor: pointer !important;
      padding: 4px !important;
      border-radius: 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
    }
    .ext-menu-btn:hover {
      color: #e8eaed !important;
      background-color: #2a2d32 !important;
    }
    .ext-menu-btn:active {
      transform: scale(0.92) !important;
    }
    /* Chữ hiển thị tab đang chạy */
    .ext-title-text {
      font-size: 12px !important;
      color: #9aa0a6 !important;
      letter-spacing: 0.5px !important;
      font-weight: 500 !important;
    }
    /* Nút đóng ✕ */
    .ext-close-btn {
      background: none !important;
      border: none !important;
      color: #9aa0a6 !important;
      font-size: 12px !important;
      cursor: pointer !important;
      width: 24px !important;
      height: 24px !important;
      border-radius: 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
    }
    .ext-close-btn:hover {
      color: #ff6b6b !important;
      background-color: rgba(255, 107, 107, 0.1) !important;
    }
    .ext-close-btn:active {
      transform: scale(0.9) !important;
    }
    /* Hộp thoại Menu Dropdown danh sách Tab */
    .ext-menu-dropdown {
      position: absolute !important;
      top: 36px !important;
      left: 8px !important;
      width: 144px !important;
      background-color: #17191c !important;
      border: 1px solid rgba(60, 64, 67, 0.8) !important;
      border-radius: 8px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6) !important;
      z-index: 30 !important;
      padding: 4px 0 !important;
      display: none;
    }
    .ext-menu-dropdown.show {
      display: block !important;
    }
    .ext-dropdown-item {
      width: 100% !important;
      text-align: left !important;
      background: none !important;
      border: none !important;
      color: #9aa0a6 !important;
      padding: 8px 12px !important;
      font-size: 12px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      display: block !important;
    }
    .ext-dropdown-item:hover {
      color: #e8eaed !important;
      background-color: #2a2d32 !important;
    }
    .ext-dropdown-item.active {
      color: #f2994a !important;
      background-color: rgba(242, 153, 74, 0.08) !important;
      font-weight: 600 !important;
    }
    /* Workspace Content Areas (Hoàn toàn trống rỗng) */
    .ext-workspace {
      flex: 1 !important;
      background-color: #1e2024 !important;
      position: relative !important;
      overflow: hidden !important;
    }
    .ext-tab-pane {
      display: none !important;
      width: 100% !important;
      height: 100% !important;
    }
    .ext-tab-pane.active {
      display: none !important;
    }
    /* Footer Trạng Thái */
    .ext-footer {
      padding: 10px 12px !important;
      border-top: 1px solid rgba(60, 64, 67, 0.4) !important;
      background-color: #17191c !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      height: 34px !important;
    }
    .ext-footer-info {
      font-size: 9px !important;
      font-family: monospace !important;
      color: #5f6368 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
    }
    .ext-footer-res {
      font-size: 9px !important;
      font-family: monospace !important;
      color: #9aa0a6 !important;
      background-color: rgba(60, 64, 67, 0.3) !important;
      border: 1px solid rgba(65, 69, 73, 0.6) !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
    }
  `;

  const styleNode = document.createElement('style');
  styleNode.id = 'chrome-ext-ui-styles';
  styleNode.textContent = css;
  document.head.appendChild(styleNode);

  // --- 2. NHÚNG HTML KHUNG GIAO DIỆN ---
  const container = document.createElement('div');
  container.id = containerId;

  container.innerHTML = `
    <div class="chrome-ext-container">
      <!-- Title Bar -->
      <div class="ext-title-bar">
        <div class="ext-left-section">
          <!-- Nút Menu ☰ -->
          <button id="ext-menu-btn" class="ext-menu-btn" title="Danh sách các Tab">☰</button>
          <!-- no title (Tab X) -->
          <span id="ext-tab-title" class="ext-title-text">no title (Tab 1)</span>
        </div>
        <!-- Nút Đóng Ký tự ✕ -->
        <button id="ext-close-btn" class="ext-close-btn" title="Ẩn Extension">✕</button>
      </div>

      <!-- Menu Dropdown chứa danh sách Tabs -->
      <div id="ext-menu-dropdown" class="ext-menu-dropdown">
        <button class="ext-dropdown-item active" data-tab-target="tab-1">Tab 1</button>
        <button class="ext-dropdown-item" data-tab-target="tab-2">Tab 2</button>
        <button class="ext-dropdown-item" data-tab-target="tab-3">Tab 3</button>
      </div>

      <!-- Khu vực nội dung trống hoàn chỉnh -->
      <div class="ext-workspace">
        <div id="ext-tab-1-content" class="ext-tab-pane active"></div>
        <div id="ext-tab-2-content" class="ext-tab-pane"></div>
        <div id="ext-tab-3-content" class="ext-tab-pane"></div>
      </div>

      <!-- Footer Trạng thái -->
      <div class="ext-footer">
        <span id="ext-footer-status" class="ext-footer-info">Active: Tab 1</span>
        <span class="ext-footer-res">400 × 400 px</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // --- 3. ĐĂNG KÝ CÁC SỰ KIỆN TƯƠNG TÁC ---
  const menuBtn = container.querySelector('#ext-menu-btn');
  const menuDropdown = container.querySelector('#ext-menu-dropdown');
  const closeBtn = container.querySelector('#ext-close-btn');
  const tabTitle = container.querySelector('#ext-tab-title');
  const footerStatus = container.querySelector('#ext-footer-status');

  const tabButtons = container.querySelectorAll('[data-tab-target]');
  const tabContents = container.querySelectorAll('.ext-tab-pane');

  function selectTab(tabId) {
    let tabLabel = 'Tab 1';
    if (tabId === 'tab-2') tabLabel = 'Tab 2';
    if (tabId === 'tab-3') tabLabel = 'Tab 3';

    // Đổi hiển thị: "no title (Tên tab đang chọn)"
    tabTitle.textContent = `no title (${tabLabel})`;

    sendLogToBackground(`Người dùng chuyển sang tab: ${tabLabel}`);

    // Toggle menu items active style
    tabButtons.forEach(btn => {
      const target = btn.getAttribute('data-tab-target');
      if (target === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle active panes
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

  // Sự kiện nút đóng: Ẩn nó đi (style.display = 'none') đúng như cơ chế Toggle của content.js
  closeBtn.addEventListener('click', () => {
    container.style.setProperty('display', 'none', 'important');
    sendLogToBackground("Người dùng nhấp nút [✕] đóng/ẩn giao diện Extension");
  });

  // Xử lý chuyển tab khi nhấn các tùy chọn trong menu
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

  // Hàm xử lý di chuyển chung cho cả Chuột và Cảm ứng
  function handleMove(clientX, clientY) {
    let newLeft = clientX - offsetX;
    let newTop = clientY - offsetY;

    // Giới hạn trong Viewport không cho kéo ra ngoài
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

  // Khởi tạo sự kiện di chuyển (Chỉ đăng ký lắng nghe di chuột KHI ĐÃ BẤM XUỐNG)
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
    e.preventDefault(); // Chặn bôi đen chọn chữ khi đang kéo UI
    handleMove(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault(); // Chặn cuộn trang web nền khi đang kéo UI trên mobile
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY); // Đã sửa: dùng trực tiếp touch.clientY
  }

  function onStop() {
    if (isDragging) {
      isDragging = false;
      titleBar.style.cursor = 'grab';
      
      // Gỡ bỏ hoàn toàn mọi sự kiện khi dừng kéo để giải phóng luồng chính
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onStop);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onStop);

      sendLogToBackground(`Đã dời vị trí Extension tới tọa độ mới: left=${container.style.left}, top=${container.style.top}`);
    }
  }

  // Lắng nghe bấm chuột trái trên Title Bar
  titleBar.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('#ext-menu-btn') || e.target.closest('#ext-close-btn') || e.target.closest('#ext-menu-dropdown')) return;
    
    onStart(e.clientX, e.clientY);
    sendLogToBackground("Bắt đầu di chuyển giao diện Extension UI (chuột)");
  });

  // Lắng nghe cảm ứng trên Title Bar
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

})();
