// Code bằng tay (thực ra vẫn còn nhiều chỗ vibe coding)
// v0.0.0.2 10jun26
/**
 * Hàm gửi log về background.js
 * @param {*} message nội dung
 * @param {*} type loại nội dung (default: "info" -> log, "warn" -> warn, "error" -> error)
 */
function sendLogToBackground(message, type = 'info') {
  chrome.runtime.sendMessage({
    type: 'LOG',
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
/**
 * Tính thời gian tương đối ở mọi thời điểm và định dạng thời gian chính xác
 * @param {number|string|Date} timestamp - Mốc thời gian cần tính
 * @returns {Object} { relative: string, exact: string }
 */
function getRelativeTimeString(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return { relative: "Không rõ", exact: "Thời gian không hợp lệ" };
  }
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  // 1. Tính thời gian tương đối (relative) ở mọi thời điểm
  let relative = "";
  if (diffInSeconds < 60) {
    relative = "Vừa xong";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    relative = `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    relative = `${hours} giờ trước`;
  } else if (diffInSeconds < 2592000) { // Dưới 30 ngày
    const days = Math.floor(diffInSeconds / 86400);
    relative = `${days} ngày trước`;
  } else if (diffInSeconds < 31536000) { // Dưới 365 ngày (1 năm)
    const months = Math.floor(diffInSeconds / 2592000);
    relative = `${months} tháng trước`;
  } else { // Từ 1 năm trở lên
    const years = Math.floor(diffInSeconds / 31536000);
    relative = `${years} năm trước`;
  }
  // 2. Định dạng thời gian chính xác (exact) cho tooltip title (HH:MM:SS DD/MM/YYYY)
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const exact = `${hours}:${minutes}:${seconds} ${day}/${month}/${date.getFullYear()}`;
  return { relative, exact };
}
// Phần hàm chạy các hạng mục
/**
 * Hàm chạy mục 1. Khởi tạo khung UI và API của nó.
 */
function buildMainHTML() {
  uiData.extensionName = 'ASS-CEE';
  uiData.tabMap = {
    'tab1': 'Quản lý nguồn',
    'tab2': 'Quản lý phụ đề',
    'tab3': 'Thông tin chung'
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
        <div id="asscee_titleLeftGrp" class="asscee_TitleLeftGrp">
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
      </div>

      <div id="asscee_workspace" class="asscee_Workspace">
        <!-- Phần nội dung các trang-->
        <div id="asscee_tab1_content" class="asscee_TabPane active"></div>
        <div id="asscee_tab2_content" class="asscee_TabPane"></div>
        <div id="asscee_tab3_content" class="asscee_TabPane"></div>
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
  uiData.closeBtn.textContent = uiData.closeBtnIcon; // Nút tạm ẩn UI
  uiData.tabItemBtns.forEach(btn => { // Nội dung các mục trong trang hiển thị
      const targetId = btn.getAttribute('data-asscee_tab-target');
      btn.textContent = uiData.tabMap[targetId] || 'undefined';
    });
}
/**
 * Hàm xử lí lựa chọn trang (dùng trong mục 1.1.)
 * @param {*} tabId ở đây là giá trị của thuộc tính data-asscee_tab-target
 * Kết quả: thay đổi thuộc tính active của tab
 */
function selectTab(tabId) {
  const tabLabel = uiData.tabMap[tabId] || 'Tab không xác định';
  // Lấy tên trang
  uiData.titleText.textContent = `${uiData.extensionName} (${tabLabel})`;
  // Thay đổi tiêu đề để chứa tên extension và tab đang sử dụng
  sendLogToBackground(`Người dùng chuyển sang tab: ${tabLabel}`);
  // Gửi log cho background để theo dõi
  uiData.tabItemBtns.forEach(btn => {
    // Quét từng cái tabItemBtns và thay đổi thuộc tính active của chúng
    const target = btn.getAttribute('data-asscee_tab-target');
    if (target === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  uiData.tabContents.forEach(content => {
    // Tương tự với tabContents
    if (content.id === `asscee_${tabId}_content`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}
/**
 * Hàm chạy mục 1.1. Khởi tạo logic trên danh sách trang hiển thị
 */
function buildTabListLogic() {
  // Xử lí thao tác bấm nút tabListBtn
  uiData.tabListBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    uiData.tabListExpand.classList.toggle('show');
    const isShowing = tabListExpand.classList.contains('show');
    sendLogToBackground(`ui: Người dùng ${isShowing ? "mở" : "đóng"} danh mục menu lựa chọn Tab`);
  });
  // Xử lí thao tác bấm vào toàn trang (kể cả những vùng đã định dạng khác)
  document.addEventListener('click', () => {
    if (uiData.tabListExpand.classList.contains('show')) {
      // Đóng phần tabListExpand
      uiData.tabListExpand.classList.remove('show');
      sendLogToBackground("ui: Tự động đóng menu lựa chọn Tab khi click vùng trống");
    }
  });
  // Xử lí thao tác bấm nút closeBtn
  uiData.closeBtn.addEventListener('click', () => {
    uiData.container.style.setProperty('display', 'none', 'important');
    sendLogToBackground("ui: Người dùng nhấp nút tạm ẩn giao diện Extension");
  });
  // Xử lí thao tác bấm nút tabItemBtns
  uiData.tabItemBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-asscee_tab-target');
      selectTab(tabId);
    });
  });
  selectTab('tab1'); // Chạy selectTab lần đầu để hiển thị nội dung đầu tiên
}
/**
 * Hàm trung tâm, xử lí tọa độ UI khi di chuyển (dùng trong mục 1.2.)
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
  uiData.container.style.right = 'auto';
  uiData.container.style.bottom = 'auto';
  // Cài đặt lại UI, lấy góc trên bên trái làm gốc
  uiData.container.style.left = `${newLeft}px`;
  uiData.container.style.top = `${newTop}px`;
  // Áp dụng tọa độ
}
/**
 * Hàm chuyển trạng thái UI sang kéo thả (chuyển vị trí), khi bấm vào thanh tiêu đề (dùng trong mục 1.2.)
 * @param {*} clientX vị trí con trỏ (x)
 * @param {*} clientY vị trí con trỏ (y)
 * @returns Đầu ra: mở thao tác di chuyển UI (addEventListener) bằng chuột
 */
function barTitleOnClick(clientX, clientY) {
  isDragging = true; // Bật trạng thái kéo thả UI
  uiData.barTitle.style.cursor = 'grabbing'; // Đổi icon của con trỏ sang 'grabbing' (tay nắm)
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
 * Hàm xử lí nhấn giữ + di chuyển chuột (dùng trong mục 1.2.)
 * @param {*} e (ko rõ)
 * @returns chạy handleMove()
 */
function barTitleOnClickHold(e) {
  if (!isDragging) return;
  e.preventDefault();
  handleMove(e.clientX, e.clientY);
}
/**
 * Hàm xử lí nhấn giữ + di chuyển chạm (chưa test) (dùng trong mục 1.2.)
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
 * Hàm xử lí thả chuột/chạm (dùng trong mục 1.2.)
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
/**
 * Hàm chạy mục 1.2. Tính năng di chuyển giao diện
 */
function buildDragFeature() {
  let isDragging = false; // Trạng thái kéo thả UI
  let offsetX = 0; // Vị trí của chuột so với góc trên bên trái của UI, chiều X
  let offsetY = 0; // Vị trí tương tự, chiều Y
  // Xử lí thao tác bấm chuột vào thanh tiêu đề 
  uiData.barTitle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
    // Bỏ qua trường hợp bấm vào nút tabListBtn, closeBtn và tabListExpand (???)
    // Khi này, vẫn tính khi bấm vào title (dòng tiêu đề)
    barTitleOnClick(e.clientX, e.clientY);
    sendLogToBackground("ui: Bắt đầu di chuyển giao diện Extension UI (chuột)");
  });
  // Xử lí thao tác bấm chạm vào thanh tiêu đề (chưa test)
  uiData.barTitle.addEventListener('touchstart', (e) => {
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
}
/**
 * Hàm render danh sách nguồn (dùng trong mục 1.3.)
 * @param {*} linksArray danh sách nguồn (nhận getSourceList() từ background/storage.js, xem pipeline mục 2.2)
 */
function renderLinkList(linksArray) {
  if (!uiData.linkList) {
    sendLogToBackground("ui: [ASS-CEE] ko có khung linkList để render?", "error");
    return;
  } // linkList không được định nghĩa?
  uiData.linkList.innerHTML = ""; // Xóa sạch danh sách cũ, render lại từ đầu.
  // Trường hợp mảng trống
  if (!linksArray || linksArray.length === 0) {
    const emptyLi = document.createElement("li"); // Tạm thời tạo ra element <li> mới
    emptyLi.style.cssText = "color: #606060; text-align: center; padding: 15px; font-size: 11px;";
    emptyLi.textContent = "Chưa có nguồn nào được thêm.";
    uiData.linkList.appendChild(emptyLi);
    return;
  }
  linksArray.forEach((item) => {
    const li = document.createElement("li");
    li.className = "asscee_LinkItem";
    const timeInfo = getRelativeTimeString(item.savedAt);
    const hasFolder = item.folderName && item.id;
    const line1Left = hasFolder ? item.folderName : "Nguồn ẩn danh";
    const line2Left = hasFolder ? `ID: ${item.id}` : item.url;

    li.innerHTML = `
      <div class="asscee_ItemRow">
        <span class="asscee_Text">${line1Left}</span>
        <button class="asscee_BtnSqr asscee_itemDeleteBtn" title="Xóa nguồn">×</button>
      </div>
      <div class="asscee_ItemRow">
        <span class="asscee_Text asscee_SubText asscee_itemIdSub">${line2Left}</span>
        <span class="asscee_Text asscee_SubText asscee_itemTimeSub" title="${timeInfo.exact}">${timeInfo.relative}</span>
      </div>
    `;
    li.addEventListener("click", (e) => { // SỰ KIỆN 1: Click vào li để copy link nguồn
      // Nếu click trúng nút xóa thì bỏ qua không copy
      if (e.target.closest(".asscee_itemDeleteBtn")) return;
      navigator.clipboard.writeText(item.url).then(() => {
        console.log("Đã copy link nguồn: " + item.url);
      }).catch(err => {
        console.error("Lỗi khi copy link: ", err);
      });
    });
    // SỰ KIỆN 2: Click vào nút xóa nguồn liên kết với background.js (xem mục 3.4)
    const deleteBtn = li.querySelector(".asscee_itemDeleteBtn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Ngăn sự kiện click bị lan ra thẻ li bên ngoài
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
          // Mảng data mới trả về sau khi xóa thành công nằm trong response.payload
          renderLinkList(response.payload);
        } else if (response && response.type === "ERROR") {
          console.error("Lỗi từ backend:", response.payload);
        }
      });
    });
  uiData.linkList.appendChild(li);
  });
};
function initSourceList() {
  chrome.runtime.sendMessage({ type: "SOURCE.GET_ALL" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Không thể lấy danh sách nguồn:", chrome.runtime.lastError.message);
      return;
    }
    if (response && response.type === "SOURCE.LIST") {
      renderLinkList(response.payload);
    }
  });
}


/**
 * Hàm chạy mục 1.3. Tính năng trong tab 1: Quản lí nguồn
 */
function buildSourceManagerTab() {
  if (!uiData.tabContents[0]) {
    sendLogToBackground("ui: [ASS-CEE] ko có khung tabContents[0] để render? Mục 1.3 bị bỏ qua.", "error");
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
  uiData.linkInput = uiData.tabContents[0].querySelector('#asscee_linkInput'); // phần đầu vào link folder
  uiData.linkList = uiData.tabContents[0].querySelector('#asscee_linkList'); // phần danh sách link folder đã có trong cache
  uiData.addFolderBtn = uiData.tabContents[0].querySelector('#asscee_addFolderBtn');
  // phần nút thêm nguồn
  uiData.tabContents[0].querySelector('#asscee_dividerText').textContent = "Danh sách nguồn";
  // phần chữ ở dòng divider (chỉ áp phần text, ko có logic gì thêm)
  uiData.linkInput.placeholder = "Thêm nguồn (link folder GitHub/GDrive)...";
  uiData.addFolderBtn.textContent = "+";
  // Thêm nguồn bằng cách bấm vào nút thêm
  uiData.addFolderBtn.addEventListener("click", () => {
    const urlValue = uiData.linkInput.value.trim();
    if (!urlValue) return;
    // Khóa nút tạm thời để tránh click liên tục khi đang xử lý
    uiData.addFolderBtn.disabled = true;
    chrome.runtime.sendMessage({
      type: "SOURCE.ADD",
      payload: { url: urlValue }
    }, (response) => {
      uiData.addFolderBtn.disabled = false; // Mở khóa nút
      if (chrome.runtime.lastError) {
        console.error("Lỗi khi thêm nguồn:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.type === "SOURCE.ADDED") {
        uiData.linkInput.value = ""; // Xóa text trong ô input sau khi thêm thành công
        // Giao thức trả về folderData của phần tử vừa thêm hoặc toàn mảng tùy backend lo,
        // Ở đây ta gọi lại danh sách tổng mới nhất để đồng bộ UI
        initSourceList(); 
      } else if (response && response.type === "ERROR") {
        console.error("Thêm nguồn thất bại:", response.payload);
        alert("Lỗi: " + response.payload); // Hiển thị thông báo lỗi nếu cần
      }
    });
  });
  // Hoặc người dùng có thể nhấn Enter trong ô input để thêm nguồn nhanh
  uiData.linkInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      uiData.addFolderBtn.click();
    }
  });
  initSourceList(); // Kích hoạt nạp danh sách ban đầu ngay lập tức
}
// Phần chạy chính của ui.js
(async function() {
  'use strict';
  const uiData = {}; // Obj lưu toàn bộ dữ liệu UI (sử dụng để lưu dữ liệu chung cho mọi hạng mục)
  uiData.containerId = 'asscee_overlayRoot';
  // Khai báo chung containerId để 2 file (content.js, ui.js) cùng nhận diện đc và giao tiếp. 
  // Tuy nhiên, do ko chạy ở background nên có tính độc lập theo tab (tab isolation)
  if (document.getElementById(uiData.containerId)) return; // Nếu trùng lặp thì thoát
  sendLogToBackground("ui: Đang khởi tạo giao diện nội bộ.");
  try { // Phần chạy mục 1.
    buildMainHTML(); // Chạy mục 1.
    sendLogToBackground("ui: chạy xong mục 1. Khởi tạo khung UI và API của nó.");
  } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1. Khởi tạo khung UI và API của nó: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1. Khởi tạo khung UI và API của nó:", error);
    return;
  }
  try { // Phần chạy mục 1.1.
    buildTabListLogic(); // Hàm chạy mục 1.1. Khởi tạo logic trên danh sách trang hiển thị
    sendLogToBackground("ui: chạy xong mục 1.1. Khởi tạo logic trên danh sách trang hiển thị.");
  } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1.1. Khởi tạo logic trên danh sách trang hiển thị: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1.1. Khởi tạo logic trên danh sách trang hiển thị:", error);
  }
  try { // Phần chạy mục 1.2.
    buildDragFeature(); // Hàm chạy mục 1.2. Tính năng di chuyển giao diện
    sendLogToBackground("ui: chạy xong mục 1.2. Tính năng di chuyển giao diện.");
  } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1.2. Tính năng di chuyển giao diện: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1.2. Tính năng di chuyển giao diện:", error);
  }
  try { // Phần chạy mục 1.3.
    buildSourceManagerTab(); // Hàm chạy mục 1.3. Tính năng trong tab 1: Quản lí nguồn
    sendLogToBackground("ui: chạy xong mục 1.3. Tính năng trong tab 1: Quản lí nguồn.");
  } catch (error) {
    sendLogToBackground(`ui: chạy lỗi mục 1.3. Tính năng trong tab 1: Quản lí nguồn: ${error.message}`, "error");
    console.error("[ASS-CEE] ui: chạy lỗi mục 1.3. Tính năng trong tab 1: Quản lí nguồn:", error);
  }
})();