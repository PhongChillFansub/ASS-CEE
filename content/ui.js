// Code bằng tay
// v0.0.0.5 28jun26
var uiData = window.uiData || {}; // Obj lưu toàn bộ dữ liệu UI, có bảo tồn do chạy nhiều lần file ui.js này
/**
 * (6.2.)1.1. Hàm gửi log về background.js
 * @param {string} message nội dung
 * @param {string} type loại nội dung (default: "info" -> log, "warn" -> warn, "error" -> error, "table" -> table)
 * @param {*} extra dữ liệu bổ sung
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
    console.warn("[ASS-CEE] ui: Không thể gửi log về background:", err);
  });
}
/**
 * 1.2. Hàm điều khiển ẩn/hiện của UI
 * @param {string} containerId [outdated] Id để giao tiếp với content.js (bản cũ điều khiển ẩn/hiện ở content.js)
 * Bản mới điều khiển trực tiếp trên này
 * @param {boolean} forceShow trạng thái (boolean), nếu undefined thì đảo ngược trạng thái hiện tại
 * @returns gửi log về background
 */
function toggleOverlay(containerId, forceShow) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const shouldShow = typeof forceShow === 'boolean' 
    ? forceShow 
    : window.getComputedStyle(container).display === 'none';
  if (shouldShow) {
    container.style.setProperty('display', 'block', 'important');
    sendLogToBackground("ui: (1.2) Đã hiện giao diện UI.");
  } else {
    container.style.setProperty('display', 'none', 'important');
    sendLogToBackground("ui: (1.2) Đã ẩn giao diện UI.");
  }
}
/**
 * 1.3. Hàm tính thời gian (N (đơn vị) trước) và tuyệt đối (HH:MM:SS DD/MM/YYYY)
 * @param {string} timestamp thời gian
 * @returns {Object} thời gian tương đối và tuyệt đối
 */
function getRelativeTimeString(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return { relative: "Không rõ", exact: "Thời gian không hợp lệ" };
  }
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  let relative = "";
  if (diffInSeconds < 60) {
    relative = "Vừa xong";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    relative = `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    relative = `${hours} giờ trước`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    relative = `${days} ngày trước`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    relative = `${months} tháng trước`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    relative = `${years} năm trước`;
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const exact = `${hours}:${minutes}:${seconds} ${day}/${month}/${date.getFullYear()}`;
  return { relative, exact };
}
/**
 * 1.4. Hàm cập nhật video ID vào UI
 * @param {object} uiData Yêu cầu có sẵn uiData
 * @returns cập nhật lên uiData.currentId
 */
function updateVideoIdInUI() {
  const getYouTubeVideoId = () => new URLSearchParams(window.location.search).get('v');
  // Định dạng lưu id YT: "<11 char base64>"
  // const getBilibiliVideoId = () => `${window.location.pathname.match(/\/video\/(BV\w+)/)?.[1]}?${new URLSearchParams(window.location.search).get('p') || 1}`;
  // Định dạng lưu id BiliBili: "BV<10 char base58>?<p>"
  // const getLocalVideoId = (keepFileExtension) => decodeURIComponent(window.location.href).split('/').pop().replace(keepFileExtension ? /^/ : /\.[^/.]+$/, "");
  // Định dạng lưu id local: "<tên file><đuôi file (có thể tùy chỉnh)>"
  const url = window.location.href;
  uiData.currentId = (() => {
    switch (true) {
      case url.startsWith('https://www.youtube.com/watch?v='): // Tab YT
        return getYouTubeVideoId();
      // case url.startsWith('https://www.bilibili.com/video/'): // Tab BiliBili
      //   return getBilibiliVideoId();
      // case url.startsWith('file:///'): // Tab local
      //   return getLocalVideoId(false);
      default:
        sendLogToBackground(`ui: (1.4) Ko thể tách ID từ url ${url}.`,"warn");
        return null; // Trả về giá trị mặc định nếu không khớp trang nào
    }
  if (uiData.currentId) {
    if (uiData.searchInput) {
      uiData.searchInput.value = uiData.currentId;
    } else {
      sendLogToBackground(`ui: (1.4) searchInput trống? (chưa chạy mục Quản lí dữ liệu?)`,"warn");
    }
    sendLogToBackground(`ui: Cập nhật ID video hiện tại: ${uiData.currentId}`);
  }
  })();
}
// Lắng nghe khi người dùng bấm xem video khác trên YouTube (không load lại trang)
document.addEventListener("yt-navigate-finish", () => {
  updateVideoIdInUI();
});
/**
 * 2.1. Hàm chạy hạng mục 1. Khởi tạo khung UI và API của nó.
 */
function buildMainHTML() {
  uiData.extensionName = 'ASS-CEE';
  uiData.tabMap = {
    'tab1': 'Quản lý nguồn',
    'tab2': 'Quản lý dữ liệu',
    'tab3': 'Quản lý phụ đề',
    'tab4': 'Thông tin chung'
  };
  uiData.tabListBtnIcon = '☰';
  uiData.closeBtnIcon = '✕';
  uiData.container = document.createElement('div');
  uiData.container.id = uiData.containerId;
  uiData.container.innerHTML = `
    <div id="asscee_ui" class="asscee_UI">
      <!-- Khung giao diện -->

      <div id="asscee_titleBar" class="asscee_BarTitle">
        <!-- Thanh tiêu đề -->  
        <div id="asscee_titleLeftGrp" class="asscee_LRGroup">
          <!-- Chia thanh tiêu đề thành 2 phần: nút Danh sách trang và Tiêu đề ở trái -->
          <button id="asscee_tabListBtn" class="asscee_BtnSqr"></button>
          <span id="asscee_title" class="asscee_Text"></span>
        </div>
          <!-- Nút ẩn giao diện ở bên phải -->
        <button id="asscee_closeBtn" class="asscee_BtnSqr"></button>
        <!-- Hết thanh tiêu đề -->
      </div>
      
      <div id="asscee_tabListExpand" class="asscee_ListExpand">
        <!-- Phần Danh sách trang (mở khi bấm tabBtn)-->
        <button class="asscee_TextBtn active" data-asscee_tab-target="tab1"></button>
        <button class="asscee_TextBtn" data-asscee_tab-target="tab2"></button>
        <button class="asscee_TextBtn" data-asscee_tab-target="tab3"></button>
        <button class="asscee_TextBtn" data-asscee_tab-target="tab4"></button>
      </div>

      <div id="asscee_workspace" class="asscee_Workspace">
        <!-- Phần nội dung các trang-->
        <div id="asscee_tab1_content" class="asscee_TabPane active"></div>
        <div id="asscee_tab2_content" class="asscee_TabPane"></div>
        <div id="asscee_tab3_content" class="asscee_TabPane"></div>
        <div id="asscee_tab4_content" class="asscee_TabPane"></div>
      </div>

      <div class="asscee_Footer">
        <!-- Phần footer -->
        <span id="asscee_footerInfo" class="asscee_Text"></span>
        <span id="asscee_footerMisc" class="asscee_TextInBox"></span>
      </div>

    </div>
  `;
  document.body.appendChild(uiData.container); // Lệnh này sẽ hiển thị UI ngay
  // Phần khởi tạo DOM API
  uiData.barTitle = uiData.container.querySelector('#asscee_titleBar'); // toàn bộ thanh tiêu đề
  uiData.tabListBtn = uiData.container.querySelector('#asscee_tabListBtn'); // nút đổi trang hiển thị (thanh tiêu đề) 
  uiData.titleText = uiData.container.querySelector('#asscee_title'); // tiêu đề (thanh tiêu đề)
  uiData.closeBtn = uiData.container.querySelector('#asscee_closeBtn'); // nút tạm ẩn giao diện (thanh tiêu đề)
  uiData.tabListExpand = uiData.container.querySelector('#asscee_tabListExpand'); // phần danh sách trang hiển thị
  uiData.tabItemBtns = uiData.container.querySelectorAll('[data-asscee_tab-target]'); // các nút chọn trang (danh sách trang hiển thị). 
  // Ở đây chọn theo tag data để thuận cho việc chèn các nút chuyển tab bên trong tab khác, chứ ko chỉ có trong danh sách.
  uiData.tabContents = uiData.container.querySelectorAll('.asscee_TabPane');
  uiData.footerInfo = uiData.container.querySelector('#asscee_footerInfo');
  uiData.footerMisc = uiData.container.querySelector('#asscee_footerMisc');
  // Phần cài đặt các nội dung cơ bản
  uiData.tabListBtn.textContent = uiData.tabListBtnIcon; // Nút danh sách trang hiển thị
  uiData.tabListBtn.title = "Danh sách trang (Tab)"; // Tooltip cho nút danh sách trang hiển thị
  uiData.closeBtn.textContent = uiData.closeBtnIcon; // Nút tạm ẩn UI
  uiData.closeBtn.title = "Tạm ẩn giao diện Extension"; // Tooltip cho nút tạm ẩn UI
  uiData.tabItemBtns.forEach(btn => { // Nội dung các mục trong trang hiển thị
      const targetId = btn.getAttribute('data-asscee_tab-target');
      btn.textContent = uiData.tabMap[targetId] || 'undefined';
    });
}
/**
 * 2.2. Hàm chạy hạng mục 2. Khởi tạo logic trên danh sách trang hiển thị.
 */
function buildTabListLogic() {
    // Xử lí thao tác bấm nút tabListBtn
  uiData.tabListBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    uiData.tabListExpand.classList.toggle('show');
    const isShowing = uiData.tabListExpand.classList.contains('show');
    // sendLogToBackground(`ui: Người dùng ${isShowing ? "mở" : "đóng"} danh mục menu lựa chọn Tab`);
  });
    // Xử lí thao tác bấm vào toàn trang (kể cả những vùng đã định dạng khác)
  document.addEventListener('click', () => {
    if (uiData.tabListExpand.classList.contains('show')) {
      // Đóng phần tabListExpand
      uiData.tabListExpand.classList.remove('show');
      // sendLogToBackground("ui: Tự động đóng menu lựa chọn Tab khi click vùng trống");
    }
  });
  // Xử lí thao tác bấm nút closeBtn
  uiData.closeBtn.addEventListener('click', () => {
    uiData.container.style.setProperty('display', 'none', 'important');
    // sendLogToBackground("ui: Người dùng nhấp nút tạm ẩn giao diện Extension");
  });
  // Xử lí thao tác bấm nút tabItemBtns
  uiData.tabItemBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-asscee_tab-target');
      selectTab(tabId);
    });
  });
  selectTab('tab1');
}
/**
 * 2.2.1. Hàm xử lí lựa chọn trang (dùng trong hạng mục 2)
 * @param {string} tabId ở đây là giá trị của thuộc tính data-asscee_tab-target
 * @returns {void} Kết quả: thay đổi thuộc tính active của tab
 */
function selectTab(tabId) {
  const tabLabel = uiData.tabMap[tabId] || 'Tab không xác định';
  uiData.titleText.textContent = `${uiData.extensionName} (${tabLabel})`;
  // sendLogToBackground(`Người dùng chuyển sang tab: ${tabLabel}`);
  uiData.tabItemBtns.forEach(btn => {
    const target = btn.getAttribute('data-asscee_tab-target');
    if (target === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  uiData.tabContents.forEach(content => {
    if (content.id === `asscee_${tabId}_content`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}
/**
 * 2.3. Hàm chạy hạng mục 3. Tính năng di chuyển giao diện.
 */
function buildDragFeature() {
  uiData.isDragging = false; // Trạng thái kéo thả UI
  uiData.offsetX = 0; // Vị trí của chuột so với góc trên bên trái của UI, chiều X
  uiData.offsetY = 0; // Vị trí tương tự, chiều Y
  // Xử lí thao tác bấm chuột vào thanh tiêu đề 
  uiData.barTitle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
    // Bỏ qua trường hợp bấm vào nút tabListBtn, closeBtn và tabListExpand (???)
    // Khi này, vẫn tính khi bấm vào title (dòng tiêu đề)
    barTitleOnClick(e.clientX, e.clientY);
    // sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (chuột)");
  });
  // Xử lí thao tác bấm chạm vào thanh tiêu đề (chưa test)
  uiData.barTitle.addEventListener('touchstart', (e) => {
    if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
    // Bỏ qua trường hợp bấm vào nút tabListBtn, closeBtn và tabListExpand (???)
    // Khi này, vẫn tính khi bấm vào title (dòng tiêu đề)
    const touch = e.touches[0];
    barTitleOnClick(touch.clientX, touch.clientY);
    // sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (cảm ứng)");
  }, { passive: true });
  // Xử lí thao tác nhả chạm (fallback trên toàn cửa sổ do touchstart có passive: true. Gemini bảo thế. chưa test)
  document.addEventListener('touchend', () => {
    if (uiData.isDragging) {
      uiData.isDragging = false;
      // sendLogToBackground(`ui: Đã dời vị trí Extension (cảm ứng) tới tọa độ mới: left=${uiData.container.style.left}, top=${uiData.container.style.top}`);
    }
  });
}
/**
 * 2.3.1. Hàm xử lí tọa độ UI khi di chuyển (dùng trong hạng mục 3)
 * @param {number} clientX vị trí con trỏ (x)
 * @param {number} clientY vị trí con trỏ (y)
 * @returns {Object} uiData.container.style.left, uiData.container.style.top = newLeft, newTop:
 * vị trí mới của góc trên bên trái UI
 */
function handleMove(clientX, clientY) {
  let newLeft = clientX - uiData.offsetX;
  let newTop = clientY - uiData.offsetY;
  // Tính toán tọa độ thô của UI
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const extWidth = 400; 
  const extHeight = 400;
  // Lấy kích thước khung UI và của cửa sổ trình duyệt
  newLeft = Math.max(0, Math.min(newLeft, viewportWidth - extWidth));
  newTop = Math.max(0, Math.min(newTop, viewportHeight - extHeight));
  // Bảo vệ tọa độ UI (tránh UI bay ra ngoài cửa sổ)
  uiData.container.style.right = 'auto';
  uiData.container.style.bottom = 'auto';
  // Cài đặt lại UI, lấy góc trên bên trái làm gốc
  uiData.container.style.left = `${newLeft}px`;
  uiData.container.style.top = `${newTop}px`;
  // Áp dụng tọa độ
}
/**
 * 2.3.2. Hàm chuyển trạng thái UI sang kéo thả (chuyển vị trí), khi bấm vào thanh tiêu đề (dùng trong hạng mục 3)
 * @param {number} clientX vị trí con trỏ (x)
 * @param {number} clientY vị trí con trỏ (y)
 * @returns {void} Đầu ra: mở thao tác di chuyển UI (addEventListener) bằng chuột
 */
function barTitleOnClick(clientX, clientY) {
  uiData.isDragging = true; // Bật trạng thái kéo thả UI
  uiData.barTitle.style.cursor = 'grabbing'; // Đổi icon của con trỏ sang 'grabbing' (tay nắm)
  const rect = uiData.container.getBoundingClientRect(); // Lấy tọa độ 4 góc của UI để tính offset
  uiData.offsetX = clientX - rect.left; // Tính toán offsetX
  uiData.offsetY = clientY - rect.top; // Tính toán offsetY
  document.addEventListener('mousemove', barTitleOnClickHold, { passive: false });
  document.addEventListener('mouseup', barTitleOnRelease);
  // Mở cặp thao tác di chuyển khi nhấn giữ + di chuyển, và thả chuột.
  document.addEventListener('touchmove', barTitleOnTouchHold, { passive: false });
  document.addEventListener('touchend', barTitleOnRelease);
  // Tương tự với màn hình cảm ứng (chưa test)
}
/**
 * 2.3.3. Hàm xử lí nhấn giữ + di chuyển chuột (dùng trong hạng mục 3)
 * @param {MouseEvent} e (ko rõ)
 * @returns {void} chạy handleMove()
 */
function barTitleOnClickHold(e) {
  if (!uiData.isDragging) return;
  e.preventDefault();
  handleMove(e.clientX, e.clientY);
}
/**
 * 2.3.4. Hàm xử lí nhấn giữ + di chuyển chạm (chưa test) (dùng trong hạng mục 3)
 * @param {TouchEvent} e (ko rõ)
 * @returns {void} chạy handleMove()
 */
function barTitleOnTouchHold(e) {
  if (!uiData.isDragging) return;
  e.preventDefault();
  const touch = e.touches[0];
  handleMove(touch.clientX, touch.clientY);
}
/**
 * 2.3.5. Hàm xử lí thả chuột/chạm (dùng trong hạng mục 3)
 * @returns {void} Đầu ra: tắt thao tác di chuyển UI (removeEventListener)
 */
function barTitleOnRelease() {
  if (uiData.isDragging) {
    uiData.isDragging = false; // Tắt trạng thái kéo thả UI
    uiData.barTitle.style.cursor = 'grab'; // Đưa icon con trỏ về 'grab'
    document.removeEventListener('mousemove', barTitleOnClickHold);
    document.removeEventListener('mouseup', barTitleOnRelease);
    document.removeEventListener('touchmove', barTitleOnTouchHold);
    document.removeEventListener('touchend', barTitleOnRelease);
    // Đóng các thao tác kéo thả UI
    // sendLogToBackground(`ui: Đã dời vị trí Extension tới tọa độ mới: left=${uiData.container.style.left}, top=${uiData.container.style.top}`);
  }
}
/**
 * 2.4. Hàm chạy hạng mục 4. Tính năng trong tab 1: Quản lí nguồn.
 */
async function buildSourceManagerTab() {
  if (!uiData.tabContents[0]) {
    sendLogToBackground("ui: ko có khung tabContents[0] để render? Mục 1.3 bị bỏ qua.", "error");
    return;
  }
  uiData.tabContents[0].innerHTML = `
    <!-- Tab 1: Quản lí nguồn (folder)-->
    <div id="asscee_linkInputBar" class="asscee_InputBar"> <!-- Thanh ghi thêm nguồn -->
      <input 
        type="text" 
        id="asscee_linkInput"
        class="asscee_Input"
        autocomplete="off"
      />
      <!-- placeholder="Thêm nguồn (link folder GitHub/GDrive)..."? -->
      <button id="asscee_addFolderBtn" class="asscee_BtnSqr"></button>
      <!-- Nút thêm nguồn -->
    </div>
    <div class="asscee_Divider"> <!-- Phần ngăn cách-->
      <span id="asscee_dividerText" class="asscee_Text"></span>
      <div class="asscee_DividerLine"></div>
    </div>
    <div class="asscee_ListContainer"> <!-- Phần danh sách nguồn -->
      <ul id="asscee_linkList" class="asscee_List">
        </ul>
    </div>
  `;
  uiData.linkInput = uiData.tabContents[0].querySelector('#asscee_linkInput');
  uiData.linkList = uiData.tabContents[0].querySelector('#asscee_linkList');
  uiData.addFolderBtn = uiData.tabContents[0].querySelector('#asscee_addFolderBtn');
  uiData.tabContents[0].querySelector('#asscee_dividerText').textContent = "Danh sách nguồn";
  uiData.linkInput.placeholder = "Thêm nguồn (link folder GitHub/GDrive)...";
  uiData.addFolderBtn.title = "(+) Nếu có link, nút này thêm thư mục vào danh sách.\n(↺) Nếu ko có link, nút này sẽ tải lại các nguồn đã có.";
  const updateAddFolderBtnIcon = () => {
    const urlValue = uiData.linkInput.value.trim();
    uiData.addFolderBtn.textContent = urlValue ? "+" : "↺";
  };
  uiData.linkInput.addEventListener("input", updateAddFolderBtnIcon);
  updateAddFolderBtnIcon();
  uiData.addFolderBtn.addEventListener("click", async () => {
    const urlValue = uiData.linkInput.value.trim();
    if (!urlValue) {
      uiData.addFolderBtn.disabled = true;
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SUB.SEARCH',
          payload: { videoId: "", folderMode: true }
        });
        if (response && response.payload) {
          renderLinkList(response.payload);
        } else {
          console.warn("Không nhận được dữ liệu hợp lệ từ background.");
        }
      } catch (error) {
        console.error("Lỗi khi refetch folder:", error);
      } finally {
        uiData.addFolderBtn.disabled = false;
        updateAddFolderBtnIcon();
      }
      return;
    }
    // Khóa nút khi thêm nguồn
    uiData.addFolderBtn.disabled = true;
    chrome.runtime.sendMessage({
      type: "SOURCE.ADD",
      payload: { url: urlValue }
    }, async (response) => {
      uiData.addFolderBtn.disabled = false;
      if (chrome.runtime.lastError) {
        console.error("Lỗi khi thêm nguồn:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.type === "SOURCE.ADDED") {
        const results = response.payload;
        const successes = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);
        if (successes.length > 0) {
          uiData.linkInput.value = "";
          updateAddFolderBtnIcon();
          await initSourceList();
        }
        let reportMessage = "";
        if (successes.length > 0 && failures.length === 0) {
          reportMessage = `Đã thêm thành công ${successes.length} nguồn!`;
        } else if (successes.length === 0 && failures.length > 0) {
          const errorDetails = failures.map(f => `- ${f.error}`).join("\n");
          reportMessage = `Thêm nguồn thất bại:\n${errorDetails}`;
        } else {
          const errorDetails = failures.map(f => `- Link: ${f.url || 'Ẩn danh'}\n Lỗi: ${f.error}`).join("\n");
          reportMessage = `Kết quả xử lý:\n- Thành công: ${successes.length} nguồn\n- Thất bại: ${failures.length} nguồn\n\nChi tiết lỗi:\n${errorDetails}`;
        }
        alert(reportMessage);
      } else if (response && response.type === "SOURCE.NOT_ADDED") {
        alert("Thêm nguồn thất bại: " + response.payload);
      }
    });
  });
  await initSourceList();
}
/**
 * 2.4.1. Hàm render danh sách nguồn (dùng trong hạng mục 4)
 * @param {Array<Object>} linksArray danh sách nguồn (nhận getSourceList() từ background/storage.js, xem pipeline mục 2.2)
 * @returns {void} Đầu ra: render danh sách nguồn vào uiData.linkList trong tab 1, gắn sự kiện cho từng item
 */
function renderLinkList(linksArray) {
  if (!uiData.linkList) {
    sendLogToBackground("ui: [ASS-CEE] ko có khung linkList để render?", "error");
    return;
  }
  const fragment = document.createDocumentFragment();
  if (!linksArray || linksArray.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "asscee_Text";
    emptyLi.textContent = "Chưa có nguồn nào được thêm.";
    fragment.appendChild(emptyLi);
    uiData.linkList.innerHTML = "";
    uiData.linkList.appendChild(fragment);
    return;
  }
  linksArray.forEach((item) => {
    const timeInfo = getRelativeTimeString(item.savedAt);
    const li = document.createElement("li");
      li.className = "asscee_LinkItem";
      li.style.cursor = "pointer";
      li.title = `Bấm để chuyển sang tab/truy cập:\n${item.url}`;
      // --- Tạo Row 1 (Tên thư mục & Nút xóa) ---
      const row1 = document.createElement("div");
        row1.className = "asscee_ItemRow";
        const titleSpan = document.createElement("span");
          titleSpan.className = "asscee_Text asscee_ItemTitle";
          titleSpan.textContent = item.folderName;
          titleSpan.title = `${item.folderName}\n${li.title}`;
        row1.appendChild(titleSpan);
        const deleteBtn = document.createElement("button");
          deleteBtn.className = "asscee_BtnSqr asscee_ItemDeleteBtns";
          deleteBtn.textContent = "×";
          deleteBtn.title = "Xóa nguồn";
        row1.appendChild(deleteBtn);
      li.appendChild(row1);
      // --- Tạo Row 2 (Thông tin ID & Thời gian lưu) ---
      const row2 = document.createElement("div");
        row2.className = "asscee_ItemRow";
        const idSpan = document.createElement("span");
          idSpan.className = "asscee_Text asscee_SubText asscee_ItemIdSub";
          idSpan.textContent = `ID: ${item.folderId}`;
          idSpan.title = `ID: ${item.folderId}\n${li.title}`;
        row2.appendChild(idSpan);
        const timeSpan = document.createElement("span");
          timeSpan.className = "asscee_Text asscee_SubText asscee_ItemTimeSub";
          timeSpan.textContent = timeInfo.relative;
          timeSpan.title = `Thời điểm thêm: ${timeInfo.exact}\n${li.title}`;
        row2.appendChild(timeSpan);
      li.appendChild(row2);    
      // --- Sự kiện click vào thẻ li ---
      li.addEventListener("click", (e) => { 
        if (e.target.closest(".asscee_ItemDeleteBtns")) return;
        const targetUrl = String(item.url).trim(); // Sử dụng item.url gốc chưa bị escape
        if (/^(javascript|data):/i.test(targetUrl)) {
          console.warn("[ASS-CEE] URL không an toàn bị chặn:", targetUrl);
          return;
        }
        window.open(targetUrl, "_blank");
      });
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetTime = item.savedAt;
        chrome.runtime.sendMessage({
          type: "SOURCE.REMOVE",
          payload: { savedAt: targetTime }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Lỗi kết nối background:", chrome.runtime.lastError.message);
            return;
          }
          if (response && response.type === "SOURCE.REMOVED") {
            renderLinkList(response.payload);
          } else if (response && response.type === "ERROR") {
            console.error("Lỗi từ backend:", response.payload);
          }
        });
      });
    fragment.appendChild(li);
  });
  uiData.linkList.innerHTML = "";
  uiData.linkList.appendChild(fragment);
}
/**
 * 2.4.2. Tải danh sách nguồn từ background.js và render danh sách nguồn.
 */
async function initSourceList() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "SOURCE.GET_ALL" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Không thể lấy danh sách nguồn:", chrome.runtime.lastError.message);
        resolve();
        return;
      }
      if (response && response.type === "SOURCE.LIST") {
        renderLinkList(response.payload);
      }
      resolve();
    });
  });
}
/**
 * 2.5. Hàm chạy hạng mục 5. Tính năng trong tab 2: Quản lý phụ đề.
 */
function buildSubtitleManagerTab() {
  if (!uiData.tabContents[1]) {
    sendLogToBackground("ui: [ASS-CEE] không có khung tabContents[1] để render. Mục 1.4 bị bỏ qua.", "error");
    return;
  }
  uiData.tabContents[1].innerHTML = `
    <div id="asscee_searchInputBar" class="asscee_InputBar" style="display: flex; flex-direction: row; align-items: center; gap: 6px; width: 100%;">
      <input 
        type="text" 
        id="asscee_searchInput"
        class="asscee_Input"
        placeholder="Tìm kiếm..."
        autocomplete="off"
        style="flex: 1; min-width: 0; padding: 6px 8px;"
      />
      <input 
        type="file" 
        id="asscee_localFileInput" 
        accept=".ass" 
        style="display: none;" 
      />
      <div style="display: flex; gap: 4px; flex-shrink: 0;">
        <button 
          id="asscee_updateIdBtn" 
          class="asscee_BtnSqr" 
          title="Lấy Video ID (YouTube) từ tab hiện tại"
          style="padding: 6px 8px; cursor: pointer;"
        >🆔</button>
        <button 
          id="asscee_localSubBtn" 
          class="asscee_BtnSqr" 
          title="Tải phụ đề từ máy (.ass)"
          style="padding: 6px 8px; cursor: pointer;"
        >📁</button>
        <button 
          id="asscee_cacheSubBtn" 
          class="asscee_BtnSqr" 
          title="Tìm kiếm trong cache (tìm theo ID)"
          style="padding: 6px 8px; cursor: pointer;"
        >💾</button>
        <button 
          id="asscee_scanSubBtn" 
          class="asscee_BtnSqr" 
          title="Quét phụ đề từ các nguồn thư mục đã có\n(tìm tự do trên tên tệp)"
          style="padding: 6px 8px; cursor: pointer;"
        >🌐</button>
      </div>
    </div>

    <div class="asscee_Divider">
      <span id="asscee_dividerText" class="asscee_Text">Kết quả tìm kiếm</span>
      <div class="asscee_DividerLine"></div>
    </div>
    <div class="asscee_ListContainer">
      <ul id="asscee_subFileArray" class="asscee_List">
        <li class="asscee_Text asscee_SubText" style="text-align: center; padding: 10px 0;">Kết quả tìm kiếm sẽ hiển thị ở đây.</li>
      </ul>
    </div>
  `;
  uiData.searchInput = uiData.tabContents[1].querySelector('#asscee_searchInput');
  uiData.updateIdBtn = uiData.tabContents[1].querySelector('#asscee_updateIdBtn');
  uiData.localSubInput = uiData.tabContents[1].querySelector('#asscee_localFileInput');
  uiData.localSubBtn = uiData.tabContents[1].querySelector('#asscee_localSubBtn');
  uiData.cacheSubBtn = uiData.tabContents[1].querySelector('#asscee_cacheSubBtn');
  uiData.scanSubBtn = uiData.tabContents[1].querySelector('#asscee_scanSubBtn');
  uiData.subFileArray = uiData.tabContents[1].querySelector('#asscee_subFileArray');
  updateVideoIdInUI();
  // Lấy videoId từ tab hiện tại
  uiData.updateIdBtn.addEventListener('click', async () => {
    updateVideoIdInUI();
  });
  // 1. Quét online
  uiData.scanSubBtn.addEventListener('click', async () => {
    const searchId = uiData.searchInput.value.trim();
    uiData.scanSubBtn.disabled = true;
    try {
      await initSubFileArray(searchId, uiData.currentId, false); 
    } catch (error) {
      console.error("Lỗi khi quét phụ đề trực tuyến:", error);
      sendLogToBackground(`ui: Lỗi quét phụ đề trực tuyến: ${error.message}`, "error");
    } finally {
      uiData.scanSubBtn.disabled = false;
    }
  });
  // 2. Tìm trong cache
  uiData.cacheSubBtn.addEventListener('click', async () => {
    const searchId = uiData.searchInput.value.trim();
    uiData.cacheSubBtn.disabled = true;
    try {
      await initSubFileArray(searchId, uiData.currentId, true);
    } catch (error) {
      console.error("Lỗi khi quét phụ đề từ cache:", error);
      sendLogToBackground(`ui: Lỗi quét phụ đề từ cache: ${error.message}`, "error");
    } finally {
      uiData.cacheSubBtn.disabled = false;
    }
  });
  // 3. Tải file cục bộ
  uiData.localSubBtn.addEventListener('click', () => {
    updateVideoIdInUI();
    uiData.localSubInput.click();
  });
  uiData.localSubInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const searchId = uiData.searchInput.value;
    if (!uiData.currentId) {
      alert("Tính năng nạp phụ đề cục bộ yêu cầu bạn phải ở trên trang video YouTube có ID hợp lệ.\nVui lòng mở một video YouTube và thử lại.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function(evt) {
      const rawText = evt.target.result;
      chrome.runtime.sendMessage({
        type: "SUB.LOCAL",
        payload: {
          videoId: uiData.currentId,
          rawText: rawText,
          fileName: file.name
        }
      }, async (response) => {
        uiData.localSubInput.value = "";
        if (chrome.runtime.lastError) {
          console.error("Lỗi nạp file cục bộ:", chrome.runtime.lastError.message);
          return;
        }
        sendLogToBackground(`ui: Đã lưu thành công phụ đề cục bộ cho video ID: ${uiData.currentId}, file: ${file.name}`);
        await initSubFileArray(searchId, uiData.currentId, true);
      });
    };
    reader.readAsText(file);
  });
}
/**
 * 2.5.1. Hàm render danh sách tệp phụ đề (mục 1.4)
 * @param {Array} candidates danh sách các file phụ đề 
 * (xem mục 2.3.2 (candidates) với quét file online, 2.4.3.2 (cacheList) với quét cache)
 * (chú ý: candidate.videoId/cachedId là thuộc tính chỉ cacheList có, candidates ko có)
 * @param {string} searchId Id mà user tìm kiếm (thanh tìm kiếm. nếu để trống tức là tìm toàn bộ nguồn/cache)
 * @param {string} targetId Id trích từ tab hiện tại
 * @param {boolean} cacheSearchMode chế độ quét cache hay quét online (true = cache, false = online)
 */
function renderSubFileArray(candidates, searchId, targetId, cacheSearchMode = false) {
  if (!uiData.subFileArray) {
    sendLogToBackground("ui: ko có khung linkList để render?", "error");
    return;
  }
  uiData.tabContents[1].querySelector('#asscee_dividerText').textContent = `Kết quả tìm kiếm (${candidates.length} tệp)`;
  const fragment = document.createDocumentFragment();
  if (!candidates || candidates.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "asscee_Text asscee_SubText";
    emptyLi.textContent = "Danh sách tệp phụ đề kết quả trống.";
    fragment.appendChild(emptyLi);
    uiData.subFileArray.innerHTML = "";
    uiData.subFileArray.appendChild(fragment);
    return;
  }
  candidates.forEach((candidate) => {
    const li = document.createElement("li");
    li.className = "asscee_LinkItem";
    li.style.cursor = "pointer";
    const timeInfo = candidate.cachedAt ? getRelativeTimeString(candidate.cachedAt) : {}; 
    const exactTimeText = timeInfo.exact ? `Thời điểm thêm: ${timeInfo.exact}` : '';
    const displayName = `${candidate.videoId ? candidate.videoId + ': ' : ''}${candidate.fileName}`; 
    const baseTitle = `Bấm để chuyển sang tab/truy cập thư mục nguồn của tệp này:\n${candidate.viewUrl}`;
    let liTitle, nameTitle, folderTitle, timeTitle;
    if (cacheSearchMode) {
      liTitle = baseTitle;
      nameTitle = `${displayName}\nID: ${candidate.videoId}\n\n${baseTitle}`;
      folderTitle = `${candidate.sourceType}: ${candidate.groupName}\n\n${baseTitle}`;
      timeTitle = `${exactTimeText}\n\n${baseTitle}`;
    } else {
      liTitle = `Tệp: ${displayName}\nThư mục: ${candidate.sourceType}, ${candidate.groupName}\n\n${baseTitle}`;
      nameTitle = liTitle;
      folderTitle = liTitle;
      timeTitle = liTitle;
    }
    li.title = liTitle;
    if (candidate.videoId !== candidate.cachedId) {
      sendLogToBackground(`ui: Video ID khác với cached ID: ${candidate.videoId} !== ${candidate.cachedId}`, "warn");
    }
    // --- Tạo Row 1 (Tiêu đề & Group Buttons) ---
    const row1 = document.createElement("div");
      row1.className = "asscee_ItemRow";
      const titleSpan = document.createElement("span");
        titleSpan.className = "asscee_Text asscee_ItemTitle";
        titleSpan.textContent = displayName;
        titleSpan.title = nameTitle;
      row1.appendChild(titleSpan);
      const btnGroup = document.createElement("div");
        btnGroup.className = "asscee_LRGroup";
        const itemSelectBtn = document.createElement("button");
          itemSelectBtn.className = "asscee_BtnSqr asscee_ItemSelectBtns";
          itemSelectBtn.textContent = "✓";
          itemSelectBtn.title = "Sử dụng và lưu cache với videoId hiện tại";
        btnGroup.appendChild(itemSelectBtn);
        const itemDeleteBtn = document.createElement("button");
          itemDeleteBtn.className = "asscee_BtnSqr asscee_ItemDeleteBtns";
          itemDeleteBtn.textContent = "✕";
          itemDeleteBtn.title = "Xóa cache";
        btnGroup.appendChild(itemDeleteBtn);
      row1.appendChild(btnGroup);
    li.appendChild(row1);
    // --- Tạo Row 2 (Thông tin thư mục nguồn & Thời gian) ---
    const row2 = document.createElement("div");
      row2.className = "asscee_ItemRow";
      const idSpan = document.createElement("span");
        idSpan.className = "asscee_Text asscee_SubText asscee_ItemIdSub";
        idSpan.textContent = `${candidate.sourceType}: ${candidate.groupName}`;
        idSpan.title = folderTitle;
      row2.appendChild(idSpan);
      const timeSpan = document.createElement("span");
        timeSpan.className = "asscee_Text asscee_SubText asscee_ItemTimeSub";
        timeSpan.textContent = timeInfo.relative || '';
        timeSpan.title = timeTitle;
      row2.appendChild(timeSpan);    
    li.appendChild(row2);
    // --- Thiết lập trạng thái hiển thị và vô hiệu hóa của các nút bấm ---
    if (!targetId || (cacheSearchMode && candidate.videoId === targetId)) {
      itemSelectBtn.title = itemSelectBtn.title + "\n(Đang bị vô hiệu hóa)";
      itemSelectBtn.disabled = true;
      itemSelectBtn.style.display = "none";
    } else {
      itemSelectBtn.disabled = false;
      itemSelectBtn.style.display = "inline-block";
    }
    li.addEventListener("click", (e) => { 
      if (e.target.closest("button")) return;
      const targetUrl = String(candidate.viewUrl).trim(); // Sử dụng item.url gốc chưa bị escape
      if (/^(javascript|data):/i.test(targetUrl)) {
        console.warn("[ASS-CEE] URL không an toàn bị chặn:", targetUrl);
        return;
      }
      window.open(candidate.viewUrl, "_blank");
    });
    itemSelectBtn.addEventListener("click", () => {
      itemSelectBtn.disabled = true;
      chrome.runtime.sendMessage({
        type: "SUB.SELECT",
        payload: { videoId: targetId, candidate: candidate }
      }, (response) => {
        itemSelectBtn.disabled = false;
        if (chrome.runtime.lastError) {
          console.error("Lỗi khi áp dụng phụ đề:", chrome.runtime.lastError.message);
          return;
        }
        sendLogToBackground(`ui: Đã chọn áp dụng phụ đề cho video ID: ${targetId}.`, "info");
      });
    });
    if (!cacheSearchMode) {
      itemDeleteBtn.disabled = true;
      itemDeleteBtn.style.display = "none";
      itemDeleteBtn.title = itemDeleteBtn.title + "\n(Đang bị vô hiệu hóa)";
    } else {
      itemDeleteBtn.disabled = false;
      itemDeleteBtn.style.display = "inline-block";
    }
    itemDeleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); 
      e.preventDefault();
      itemDeleteBtn.disabled = true;
      chrome.runtime.sendMessage({
        type: "SUB.REMOVE",
        payload: { videoId: candidate.videoId }
      }, (response) => {
        itemDeleteBtn.disabled = false;
        if (chrome.runtime.lastError) {
          console.error("Lỗi khi xóa cache phụ đề:", chrome.runtime.lastError.message);
          return;
        }
        if (response && response.type === "SUB.REMOVED" && response.payload === true) {
          sendLogToBackground(`ui: Đã xóa phụ đề cache của video ID: ${candidate.videoId}.`);
          chrome.runtime.sendMessage({ type: "SUB.GET_ALL", payload: { videoId: searchId } }, (cacheResponse) => {
            if (cacheResponse && cacheResponse.type === "SUB.LIST") {
              renderSubFileArray(cacheResponse.payload, searchId, targetId, true);
            } else {
              sendLogToBackground("ui: Không thể tải lại danh sách cache sau khi xóa.", "warn");
            }
          });
        } else {
          sendLogToBackground(`ui: Xóa cache tệp phụ đề thất bại cho video ID: ${candidate.videoId}`, "warn");
          alert("Xóa cache tệp phụ đề thất bại. Vui lòng xem console.");
        }
      });
    });
    fragment.appendChild(li);
  });
  uiData.subFileArray.innerHTML = "";
  uiData.subFileArray.appendChild(fragment);
}
/**
 * 2.5.2. Tải danh sách tệp phụ đề từ background.js và render danh sách tệp phụ đề.
 * @param {string} searchId Id mà user tìm kiếm (thanh tìm kiếm. nếu để trống tức là tìm toàn bộ nguồn/cache)
 * @param {string} targetId Id trích từ tab hiện tại
 * @param {boolean} cacheSearchMode chế độ quét cache hay quét online (true = cache, false = online)
 */
async function initSubFileArray(searchId = "", targetId = "", cacheSearchMode = false) {
  return new Promise((resolve) => {
    const messageType = cacheSearchMode ? "SUB.GET_ALL" : "SUB.SEARCH";
    const payload = cacheSearchMode ? { videoId: searchId } : { videoId: searchId, folderMode: false };
    chrome.runtime.sendMessage({ type: messageType, payload: payload }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Không thể lấy danh sách phụ đề:", chrome.runtime.lastError.message);
        resolve();
        return;
      }
      if (response) {
        const candidates = response.payload || [];
        renderSubFileArray(candidates, searchId, targetId, cacheSearchMode);
      } else {
        sendLogToBackground("ui: Không nhận được phản hồi hợp lệ khi tải danh sách phụ đề.", "warn");
      }
      resolve(); // Giải phóng Promise
    });
  });
}
// Phần chạy chính của ui.js
(async function() {
  'use strict';
  uiData.containerId = 'asscee_overlayRoot';
  const currentUrl = window.location.href;
  if (currentUrl.startsWith('about:')) {
    sendLogToBackground("[ASS-CEE] ui: Bỏ qua trang about: vì UI không chạy ở đây. " + currentUrl, "warn");
    return;
  }
  if (document.getElementById(uiData.containerId)) return;
  sendLogToBackground("ui: Đang khởi tạo giao diện nội bộ.");
  try { buildMainHTML() } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1. Khởi tạo khung UI và API của nó: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1. Khởi tạo khung UI và API của nó:", error);
    return;
  } finally {
    toggleOverlay(uiData.containerId, false);
  }
  try { buildTabListLogic() } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 2. Khởi tạo logic trên danh sách trang hiển thị: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 2. Khởi tạo logic trên danh sách trang hiển thị:", error);
  }
  try { buildDragFeature() } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 3. Tính năng di chuyển giao diện: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 3. Tính năng di chuyển giao diện:", error);
  }
  try { await buildSourceManagerTab() } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1.3. Tính năng trong tab 1: Quản lí nguồn: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1.3. Tính năng trong tab 1: Quản lí nguồn:", error);
  }
  try { buildSubtitleManagerTab() } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1.4. Tính năng trong tab 2: Quản lý phụ đề: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1.4. Tính năng trong tab 2: Quản lý phụ đề:", error);
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "TOGGLE_OVERLAY_SIGNAL") {
      toggleOverlay(uiData.containerId, msg.payload);
      sendResponse({ ok: true });
      return true;
    }
  });
  window.isAssCeeUILoaded = true; // Để cho background kiểm tra.
})();