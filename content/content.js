// v0.0.8 29juy26
// Hợp nhất ui và renderer để tối giản content-side, đơn giản hóa giao tiếp ui-renderer.
// (xem pipeline mục 6.2.)
/** Định nghĩa/chú thích object folderData (pipeline mục 2.1): 
 * @typedef {object} folderData Dữ liệu 1 nguồn thư mục
 * @property {string} url Link nhận từ người dùng (content-side)
 * @property {string} type Loại thư mục (github hoặc gdrive). Lấy từ fetcher.js > fetchSubtitleFile*()
 * @property {string} folderName Tên thư mục. Lấy từ fetcher.js > fetchSubtitleFile*()
 * @property {string} folderId Link thư mục (GDrive) hoặc string đường dẫn (GitHub). Lấy từ fetcher.js > fetchSubtitleFile*()
 * @property {number} savedAt Thời điểm lưu nguồn. Lấy từ storage.js > addSource()
 */
/** Định nghĩa/chú thích object candidate (pipeline mục 2.3.2):
 *  
 * Chú ý: Các biến đánh dấu * trong comment (videoId, cachedId, cachedAt), chỉ các tệp từ cache mới có.
 * @typedef {object} candidate Dữ liệu 1 tệp phụ đề. Lấy từ scanGitHub() và scanGDrive()
 * @property {string} id item.SHA (GitHub) hoặc id trên link (GDrive)
 * @property {string} fileName Tên tệp
 * @property {string} fetchUrl Link API để extension tải tệp về
 * @property {string} viewUrl Link của thư mục nguồn
 * @property {string} sourceType Loại thư mục (folderData.type)
 * @property {string} groupName Tên thư mục (folderData.folderName)
 * @property {string} videoId *Id dùng đặt tên trong SUBTITLE_DATA_KEY: ${SUBTITLE_DATA_KEY_BASE}_${videoId}
 * @property {string} cachedId *Id được lưu trong SUBTITLE_DATA_KEY.videoId
 * @property {number} cachedAt *Thời điểm lưu tệp trong cache. Lấy từ storage.js > addSubData()
 */
/** Định nghĩa/chú thích object contentData.dragUIData: 
 * @typedef {Object} dragUIData
 * @property {boolean} isDragging Trạng thái kéo thả UI
 * @property {number} offsetX Vị trí của chuột so với góc trên bên trái của UI, chiều X
 * @property {number} offsetY Vị trí của chuột so với góc trên bên trái của UI, chiều Y
 */
/** Định nghĩa/chú thích object contentData.renderData: 
 * @typedef {Object} renderData
 * @property {Object|null} currentStyles object lưu trữ các style ĐANG DÙNG để render (applyPendingStyles() và renderSubtitleFrame())
 * @property {Object|null} pendingStyles object lưu trữ các style ĐANG CHỜ để render (2.4.1 processStylesPending() và 3.1 applyPendingStyles())
 * @property {Object<number, Object>} currentEvents tham chiếu các element đang render, [index của event trong array .events]: tham chiếu obj event 
 * @property {Object<number, HTMLElement>} currentElements tham chiếu các element đang render, [index của event trong array .events]: tham chiếu element 
 * @property {number|null} frameId ID của requestVideoFrameCallback hiện tại
 * @property {boolean} doEnable lưu trạng thái tiếp tục/tạm dừng render loop (chú ý: khác với hủy render)
 * @property {Array<number>|null} lastActiveIndices lưu mảng các index của events đã render ở frame trước (để so sánh và xử lí thông minh)
 */
/** Định nghĩa/chú thích object contentData: 
 * @typedef {Object} contentData Dữ liệu chung
 * @property {string} extensionName Tên extension (PD-47.ass)
 * @property {Object<string, string>} tabMap 
 * Tên các tab (tab0: Quản lý nguồn, tab1: Quản lý dữ liệu, tab2: Quản lý phụ đề, tab3: Thông tin chung)
 * @property {string} tabListBtnIcon Icon tabListBtn (icon danh sách trang/tab ☰)
 * @property {string} closeBtnIcon Icon closeBtn (icon nút đóng/hủy ✕)
 * @property {string} containerId id của khung phụ đề (subtitles-ssa2css47), hiện trên cây DOM.
 * @property {string} uiContainerId id của UI (UI-ssa2css47), hiện trên cây DOM.
 * @property {string} [currentVideoId] videoId hiện tại
 * @property {string} [lastVideoId] videoId liền trước
 * @property {boolean} experimentalRenderMode Chế độ thử nghiệm (renderer)
 * @property {dragUIData} dragUIData Dữ liệu trạng thái kéo thả của UI (2.3.*)
 * @property {Array<string>} debugLogSetting Cấu hình hiển thị log (debug)
 * @property {Array<number>} retryCount Số lần thử tìm video dạng [index, maxTry]
 * @property {{
 * resize: Function|null, 
 * mutation: Function|null, 
 * trackedParent: Element|null, 
 * trackedAspectRatio: number|null, 
 * lastBounds: DOMRect|null,
 * }} videoObserver 
 * Dữ liệu bám bắt video, dùng trong hàm refresh()
 * @property {renderData} renderData Dữ liệu trạng thái render, dùng trong phần tính năng render
 * @property {HTMLDivElement} uiContainer Phần container của UI.
 * @property {Draggable} draggableUI Đối tượng xử lý chức năng kéo thả của UI. (dùng thanh tiêu đề để di chuyển UI)
 * @property {class} Draggable Cấu trúc đối tượng cho phép kéo thả, dùng cho UI. (ChatGPT vibe, chưa test). to-do: các line phụ đề.
 * 
 * @property {HTMLElement} [barTitle] Thanh tiêu đề UI
 * @property {HTMLButtonElement} [tabListBtn] Nút mở danh sách tab, để đổi trang hiển thị (UI)
 * @property {HTMLElement} [titleText] Nội dung tiêu đề UI
 * @property {HTMLButtonElement} [closeBtn] Nút tạm ẩn UI
 * @property {HTMLElement} [tabListExpand] Phần danh sách tab
 * @property {NodeList} [tabItemBtns] Các nút chọn tab (trong danh sách tab)
 * @property {NodeList} [tabContents] Các pane nội dung tab. [index]: `tab${index}`
 * @property {HTMLElement} [footerInfo] Phần footer info
 * @property {HTMLElement} [footerMisc] Phần footer misc (ko biết để làm gì :v)
 * @property {HTMLInputElement} [linkInput] Ô nhập link nguồn
 * @property {HTMLUListElement} [linkList] Danh sách nguồn
 * @property {HTMLButtonElement} [addFolderBtn] Nút thêm nguồn
 * @property {HTMLInputElement} [searchInput] Ô tìm kiếm phụ đề
 * @property {HTMLButtonElement} [updateIdBtn] Nút lấy ID video
 * @property {HTMLInputElement} [localSubInput] Input chọn file phụ đề cục bộ
 * @property {HTMLButtonElement} [localSubBtn] Nút tải file phụ đề cục bộ
 * @property {HTMLButtonElement} [cacheSubBtn] Nút tìm phụ đề trong cache
 * @property {HTMLButtonElement} [scanSubBtn] Nút tìm phụ đề trên các nguồn online
 * @property {HTMLUListElement} [subFileArray] Danh sách kết quả tìm kiếm tệp phụ đề
 */
/** @type {contentData} */
var contentData = {
  extensionName: 'PD-47.ass',
  tabMap: {
    'tab0': 'Quản lý nguồn',
    'tab1': 'Quản lý dữ liệu',
    'tab2': 'Quản lý phụ đề',
    'tab3': 'Thông tin chung'
  },
  tabListBtnIcon: '☰',
  closeBtnIcon: '✕',
  containerId: 'subtitles-ssa2css47',
  uiContainerId: 'UI-ssa2css47',
  currentVideoId: '',
  lastVideoId: '',
  dragUIData: {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  },
  experimentalRenderMode: false,
  debugLogSetting: ["new"],
  retryCount: [0, 5],
  videoObserver: {
    resize: null,
    mutation: null,
    trackedParent: null,
    trackedAspectRatio: null,
    lastBounds: null,
  },
  renderData: {
    currentStyles: null,
    pendingStyles: null,
    currentEvents: {},
    currentElements: {},
    frameId: null,
    doEnable: true,
    lastActiveIndices: null,
  },
  uiContainer: document.createElement('div'),
  draggableUI: null,
  Draggable: class {
    /**
     * Khởi tạo đối tượng kéo thả.
     * @param {HTMLElement} target Phần tử sẽ được di chuyển.
     * @param {HTMLElement} handle Phần tử dùng để bấm kéo. 
     */
    constructor(target, handle) {
      /** Phần tử sẽ được di chuyển. vd: node UI */
      this.target = target;
      /** Phần tử dùng để bấm kéo. vd: node barTitle */
      this.handle = handle;
      /** Trạng thái kéo thả */
      this.isDragging = false; 
      /** vd: Vị trí của chuột so với góc trên bên trái của UI, chiều X */
      this.offsetX = 0;
      /** vd: Vị trí của chuột so với góc trên bên trái của UI, chiều Y */
      this.offsetY = 0;
      // Khóa các hàm với đối tượng this. (ChatGPT bảo thế)
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onTouchStart = this.onTouchStart.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onTouchMove = this.onTouchMove.bind(this);
      this.stopDrag = this.stopDrag.bind(this);
      this.init();
    }
    /** Đăng ký các sự kiện. buildDragFeature(). */
    init() {
      this.handle.addEventListener("mousedown", this.onMouseDown);
      this.handle.addEventListener("touchstart", this.onTouchStart, {passive: true});
    }
    /** Lúc bắt đầu bấm */
    onMouseDown(e) {
      if (e.button !== 0) return;
      if (e.target.closest('.asscee_noCSS_dragIgnore')) return;
      this.startDrag(e.clientX, e.clientY);
    }
    /** Lúc bắt đầu chạm */
    onTouchStart(e) {
      if (e.target.closest('.asscee_noCSS_dragIgnore')) return;
      const touch = e.touches[0];
      this.startDrag(touch.clientX, touch.clientY);
    }
    /**
     * Bắt đầu kéo. barTitleOnClick()
     * @param {number} clientX vị trí con trỏ (x)
     * @param {number} clientY vị trí con trỏ (y)
     */
    startDrag(clientX, clientY) {
      this.isDragging = true; // Bật trạng thái kéo thả UI
      this.handle.style.cursor = 'grabbing'; // Đổi icon của con trỏ sang 'grabbing' (tay nắm)
      const rect = this.target.getBoundingClientRect(); // Lấy tọa độ 4 góc của UI để tính offset
      this.offsetX = clientX - rect.left; // Tính toán offsetX
      this.offsetY = clientY - rect.top; // Tính toán offsetY
      document.addEventListener('mousemove', this.onMouseMove, { passive: false });
      document.addEventListener('mouseup', this.stopDrag);
      // Mở cặp thao tác di chuyển khi nhấn giữ + di chuyển, và thả chuột.
      document.addEventListener('touchmove', this.onTouchMove, { passive: false });
      document.addEventListener('touchend', this.stopDrag);
      // Tương tự với màn hình cảm ứng (chưa test)
    }
    /**
     * Tính toán và cập nhật vị trí mới.
     * @param {number} clientX vị trí con trỏ (x)
     * @param {number} clientY vị trí con trỏ (y)
     */
    handleMove(clientX, clientY) {
      let newLeft = clientX - this.offsetX;
      let newTop = clientY - this.offsetY;
      // Tính toán tọa độ thô của UI
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const extWidth = 400; 
      const extHeight = 400;
      // Lấy kích thước khung UI và của cửa sổ trình duyệt
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - extWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - extHeight));
      // Bảo vệ tọa độ UI (tránh UI bay ra ngoài cửa sổ)
      this.target.style.right = 'auto';
      this.target.style.bottom = 'auto';
      // Cài đặt lại UI, lấy góc trên bên trái làm gốc
      this.target.style.left = `${newLeft}px`;
      this.target.style.top = `${newTop}px`;
      // Áp dụng tọa độ
    }
    /**
     * Xử lý giữ chuột và di chuyển.
     * @param {MouseEvent} e
     */
    onMouseMove(e) {
      if (!this.isDragging) return;
      e.preventDefault();
      this.handleMove(e.clientX, e.clientY);
    }
    /**
     * Xử lý giữ ngón tay và di chuyển.
     * @param {TouchEvent} e
     */
    onTouchMove(e) {
      if (!this.isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMove(touch.clientX, touch.clientY);
    }
    /**
     * Kết thúc kéo.
     */
    stopDrag() {
      if (this.isDragging) {
        this.isDragging = false; // Tắt trạng thái kéo thả UI
        this.handle.style.cursor = 'grab'; // Đưa icon con trỏ về 'grab'
        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("touchmove", this.onTouchMove);
        document.removeEventListener("mouseup", this.stopDrag);
        document.removeEventListener("touchend", this.stopDrag);
        // Đóng các thao tác kéo thả UI
      }
    }
  }
}

/** (6.2.)1.1. Hàm gửi log về background.js
 * @param {string} message nội dung
 * @param {string} type loại nội dung (default: "info" -> log, "warn" -> warn, "error" -> error, "table" -> table)
 * @param {*} extra dữ liệu bổ sung
 */
function sendLogToBackground(message, type = 'info', extra = undefined) {
  chrome.runtime.sendMessage({
    type: 'LOG',
    payload: {
      type: type,
      text: `[${contentData.extensionName}] content: ${message}`,
      url: window.location.href,
      title: document.title,
      now: Date.now(),
      extra: extra, // Dữ liệu bổ sung (array, object, số, v.v.)
    }
  }).catch(err => {
    console.warn(`[${contentData.extensionName}] content: Không thể gửi log về background:`, err); 
    // Ghi lỗi không thể gửi log về background.
    console.warn(`[${contentData.extensionName}: ${type}] content: ${message}`, extra);
    // Ghi log đang cần gửi.
  });
}
/** 1.2. Hàm điều khiển ẩn/hiện của node bất kì (theo Id)
 * @param {string} nodeId
 * Bản mới điều khiển trực tiếp trên này
 * @param {boolean} forceShow trạng thái (boolean), nếu undefined thì đảo ngược trạng thái hiện tại
 * @returns gửi log về background
 */
function toggleOverlay(nodeId, forceShow) {
  const node = document.getElementById(nodeId);
  if (!node) return;
  const detectedNode = (nodeId === contentData.uiContainerId ? "node UI" : nodeId === contentData.containerId ? "node render" : "cụ thể?")
  const shouldShow = typeof forceShow === 'boolean' 
    ? forceShow 
    : window.getComputedStyle(node).display === 'none';
  if (shouldShow) {
    node.style.setProperty('display', 'block', 'important');
    sendLogToBackground(`(1.2) Đã hiện ${nodeId} (${detectedNode}).`);
  } else {
    node.style.setProperty('display', 'none', 'important');
    sendLogToBackground(`(1.2) Đã ẩn ${nodeId} (${detectedNode}).`);
  }
}
/** 1.3. Hàm tính thời gian (N (đơn vị) trước) và tuyệt đối (HH:MM:SS DD/MM/YYYY)
 * @param {string} timestamp thời gian đầu vào
 * @returns {timeInfoFormat} thời gian tương đối và tuyệt đối
 * @typedef {object} timeInfoFormat
 * @property {string} relative thời gian tương đối (Vừa xong hoặc X đơn vị trước)
 * @property {string} exact thời gian tuyệt đối (HH:MM:SS DD/MM/YYYY)
 */
function getRelativeTimeString(timestamp) {
  if (!timestamp) return {};
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
/** 1.4. Hàm cập nhật video ID
 * @param {object} contentData.searchInput (gián tiếp, tùy chọn) ô tìm kiếm phụ đề, mục Quản lí dữ liệu
 * @returns {boolean} trực tiếp: trạng thái hủy render. 
 * 
 * gián tiếp: cập nhật lên .currentVideoId dạng `#${id}`, cập nhật (push) .lastVideoId.
 */
function updateVideoId() {
  const getYouTubeVideoId = () => new URLSearchParams(window.location.search).get('v'); // Định dạng lưu id YT: "<11 char base64>"
  const getBilibiliVideoId = () => `${window.location.pathname.match(/\/video\/(BV\w+)/)?.[1]}?${new URLSearchParams(window.location.search).get('p') || 1}`;
  // Định dạng lưu id BiliBili: "BV<10 char base58>?<p>"
  const url = window.location.href;
  contentData.lastVideoId = contentData.currentVideoId; // Push .currentVideoId cũ thành .lastVideoId.
  contentData.currentVideoId = (() => { // đặt .currentVideoId mới
    switch (true) {
      case url.startsWith('https://www.youtube.com/watch?v='): // Tab YT
        return getYouTubeVideoId();
      case url.startsWith('https://www.bilibili.com/video/'): // Tab BiliBili
        return getBilibiliVideoId();
      default:
        sendLogToBackground(`(1.4) Ko thể tách ID từ url ${url}.`,"warn");
        return ""; // Trả về giá trị mặc định nếu không khớp trang nào
    }
  })();
  if (contentData.currentVideoId) { // Nếu tồn tại Id mới đặt
    if (contentData.searchInput) contentData.searchInput.value = `#${contentData.currentVideoId}`;
    sendLogToBackground(`(1.4) Cập nhật ID video hiện tại: ${contentData.currentVideoId}`);
  }
  if (!contentData.currentVideoId || contentData.currentVideoId !== contentData.lastVideoId) { // Nếu ko tồn tại id mới, hoặc id thay đổi
    // disableRenderLoop(`videoId thay đổi từ "${contentData.lastVideoId}" sang "${contentData.currentVideoId}".`);
    return true;
  }
  return false;
}
// Lắng nghe khi người dùng bấm xem video khác trên YouTube (không load lại trang): cập nhật videoID.
document.addEventListener("yt-navigate-finish", () => {
  updateVideoId();
});
/** 2.1.0. Khởi tạo khung UI và API của nó. */
function buildMainHTML() {
  contentData.uiContainer.id = contentData.uiContainerId;
  contentData.uiContainer.innerHTML = `
    <div id="asscee_ui" class="asscee_UI">

      <div id="asscee_titleBar" class="asscee_BarTitle">

        <div id="asscee_titleLeftGrp" class="asscee_LRGroup">
          <button id="asscee_tabListBtn" class="asscee_BtnSqr asscee_noCSS_dragIgnore"></button>
          <span id="asscee_title" class="asscee_Text"></span>
        </div>

        <button id="asscee_closeBtn" class="asscee_BtnSqr asscee_noCSS_dragIgnore"></button>

      </div>

      <div id="asscee_tabListExpand" class="asscee_ListExpand">
        <button class="asscee_TextBtn active" data-asscee_tab-target="tab0"></button>
        <button class="asscee_TextBtn" data-asscee_tab-target="tab1"></button>
        <button class="asscee_TextBtn" data-asscee_tab-target="tab2"></button>
        <button class="asscee_TextBtn" data-asscee_tab-target="tab3"></button>
      </div>

      <div id="asscee_workspace" class="asscee_Workspace">
        <div id="asscee_tab0_content" class="asscee_TabPane active"></div>
        <div id="asscee_tab1_content" class="asscee_TabPane"></div>
        <div id="asscee_tab2_content" class="asscee_TabPane"></div>
        <div id="asscee_tab3_content" class="asscee_TabPane"></div>
      </div>

      <div class="asscee_Footer">
        <span id="asscee_footerInfo" class="asscee_Text"></span>
        <span id="asscee_footerMisc" class="asscee_TextInBox"></span>
      </div>

    </div>
  `;
  // Phần khởi tạo DOM API
  contentData.barTitle = contentData.uiContainer.querySelector('#asscee_titleBar');
  contentData.tabListBtn = contentData.uiContainer.querySelector('#asscee_tabListBtn');
  contentData.titleText = contentData.uiContainer.querySelector('#asscee_title');
  contentData.closeBtn = contentData.uiContainer.querySelector('#asscee_closeBtn');
  contentData.tabListExpand = contentData.uiContainer.querySelector('#asscee_tabListExpand');
  contentData.tabItemBtns = contentData.uiContainer.querySelectorAll('[data-asscee_tab-target]');
  contentData.tabItemBtns.forEach(btn => { // Nội dung các nút chọn tab / trang hiển thị
    const targetId = btn.getAttribute('data-asscee_tab-target');
    btn.textContent = contentData.tabMap[targetId] || 'undefined';
  });
  // Ở đây chọn theo tag data để thuận cho việc chèn các nút chuyển tab bên trong tab khác, chứ ko chỉ chuyển từ nút trong danh sách.
  contentData.tabContents = contentData.uiContainer.querySelectorAll('.asscee_TabPane');
  contentData.footerInfo = contentData.uiContainer.querySelector('#asscee_footerInfo');
  contentData.footerMisc = contentData.uiContainer.querySelector('#asscee_footerMisc');
  contentData.tabListBtn.textContent = contentData.tabListBtnIcon; // Nội dung nút mở danh sách tab
  contentData.tabListBtn.title = "Danh sách trang (Tab)"; // Tooltip nút mở danh sách tab
  contentData.closeBtn.textContent = contentData.closeBtnIcon; // Nội dung nút tạm ẩn UI
  contentData.closeBtn.title = "Tạm ẩn giao diện Extension"; // Tooltip nút tạm ẩn UI
  document.body.appendChild(contentData.uiContainer); // Lệnh này sẽ hiển thị UI ngay
}
/** 2.2.0. Khởi tạo logic trên danh sách trang hiển thị. */
function buildTabListLogic() {
  // 1. Xử lí thao tác bấm nút tabListBtn
  /** Phần danh sách tab (contentData.tabListExpand) */
  const tabListExpand = contentData.tabListExpand;
  contentData.tabListBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Chặn nổi lên document (do nếu nổi lên document thì sẽ kích hoạt .remove("show").)
    tabListExpand.classList.toggle('show');
  });
  // 2. Xử lí thao tác bấm vào toàn trang (kể cả những vùng đã định dạng khác): Đóng phần tabListExpand
  document.addEventListener('click', () => tabListExpand.classList.remove('show'));
  // 3. Xử lí thao tác bấm nút closeBtn (tạm ẩn UI)
  contentData.closeBtn.addEventListener('click', () => contentData.uiContainer.style.setProperty('display', 'none', 'important'));
  // 4. Xử lí thao tác bấm các nút tabItemBtns
  contentData.tabItemBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-asscee_tab-target');
      selectTab(tabId);
    });
  });
  selectTab('tab0'); // Mặc định chọn tab0
}
/** 2.2.1. Hàm xử lí lựa chọn trang
 * @param {string} tabId ở đây là giá trị của thuộc tính data-asscee_tab-target
 * @returns {void} Kết quả: thay đổi thuộc tính active của tab
 */
function selectTab(tabId) {
  const tabLabel = contentData.tabMap[tabId] || 'Tab không xác định'; // Lấy tên tab
  contentData.titleText.textContent = `${contentData.extensionName} (${tabLabel})`; // Đặt nội dung tiêu đề UI theo tên tab hiện tại
  contentData.tabItemBtns.forEach(btn => {
    const target = btn.getAttribute('data-asscee_tab-target'); // Lấy dữ liệu để kiểm tra
    if (target === tabId) btn.classList.add('active'); // Nếu là tab được chọn thì đổi thuộc tính CSS thành active
    else btn.classList.remove('active'); // Ko thì xóa active
  });
  contentData.tabContents.forEach(content => {
    if (content.id === `asscee_${tabId}_content`) content.classList.add('active'); // Tương tự với các nút chọn tab, đổi CSS của pane thành active
    else content.classList.remove('active'); // Ko thì xóa active
  });
}
// /**
//  * 2.3.0. Tính năng di chuyển giao diện.
//  */
// function buildDragFeature() {
//   // 1. Xử lí thao tác bấm chuột vào thanh tiêu đề 
//   contentData.barTitle.addEventListener('mousedown', (e) => {
//     if (e.button !== 0) return;
//     if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
//     // Bỏ qua trường hợp bấm vào nút .tabListBtn, .closeBtn và .tabListExpand trên bar
//     // Khi này, chỉ tính khi bấm vào phần còn lại, gồm cả .titleText (dòng tiêu đề)
//     barTitleOnClick(e.clientX, e.clientY);
//   });
//   // 2. Xử lí thao tác bấm chạm vào thanh tiêu đề (chưa test)
//   contentData.barTitle.addEventListener('touchstart', (e) => {
//     if (e.target.closest('#asscee_tabListBtn') || e.target.closest('#asscee_closeBtn') || e.target.closest('#asscee_tabListExpand')) return;
//     // Tương tự bấm chuột
//     const touch = e.touches[0];
//     barTitleOnClick(touch.clientX, touch.clientY);
//   }, { passive: true });
// }
// /**
//  * 2.3.1. Hàm xử lí tọa độ UI khi di chuyển (dùng trong hạng mục 3)
//  * @param {number} clientX vị trí con trỏ (x)
//  * @param {number} clientY vị trí con trỏ (y)
//  * @returns {Object} contentData.uiContainer.style.left, contentData.uiContainer.style.top = newLeft, newTop:
//  * vị trí mới của góc trên bên trái UI
//  */
// function handleMove(clientX, clientY) {
//   let newLeft = clientX - contentData.dragUIData.offsetX;
//   let newTop = clientY - contentData.dragUIData.offsetY;
//   // Tính toán tọa độ thô của UI
//   const viewportWidth = window.innerWidth;
//   const viewportHeight = window.innerHeight;
//   const extWidth = 400; 
//   const extHeight = 400;
//   // Lấy kích thước khung UI và của cửa sổ trình duyệt
//   newLeft = Math.max(0, Math.min(newLeft, viewportWidth - extWidth));
//   newTop = Math.max(0, Math.min(newTop, viewportHeight - extHeight));
//   // Bảo vệ tọa độ UI (tránh UI bay ra ngoài cửa sổ)
//   contentData.uiContainer.style.right = 'auto';
//   contentData.uiContainer.style.bottom = 'auto';
//   // Cài đặt lại UI, lấy góc trên bên trái làm gốc
//   contentData.uiContainer.style.left = `${newLeft}px`;
//   contentData.uiContainer.style.top = `${newTop}px`;
//   // Áp dụng tọa độ
// }
// /**
//  * 2.3.2. Hàm chuyển trạng thái UI sang kéo thả (chuyển vị trí), khi bấm vào thanh tiêu đề (dùng trong hạng mục 3)
//  * @param {number} clientX vị trí con trỏ (x)
//  * @param {number} clientY vị trí con trỏ (y)
//  * @returns {void} Đầu ra: mở thao tác di chuyển UI (addEventListener) bằng chuột
//  */
// function barTitleOnClick(clientX, clientY) {
//   contentData.dragUIData.isDragging = true; // Bật trạng thái kéo thả UI
//   contentData.barTitle.style.cursor = 'grabbing'; // Đổi icon của con trỏ sang 'grabbing' (tay nắm)
//   const rect = contentData.uiContainer.getBoundingClientRect(); // Lấy tọa độ 4 góc của UI để tính offset
//   contentData.dragUIData.offsetX = clientX - rect.left; // Tính toán offsetX
//   contentData.dragUIData.offsetY = clientY - rect.top; // Tính toán offsetY
//   document.addEventListener('mousemove', barTitleOnClickHold, { passive: false });
//   document.addEventListener('mouseup', barTitleOnRelease);
//   // Mở cặp thao tác di chuyển khi nhấn giữ + di chuyển, và thả chuột.
//   document.addEventListener('touchmove', barTitleOnTouchHold, { passive: false });
//   document.addEventListener('touchend', barTitleOnRelease);
//   // Tương tự với màn hình cảm ứng (chưa test)
// }
// /**
//  * 2.3.3. Hàm xử lí nhấn giữ + di chuyển chuột
//  * @param {MouseEvent} e (ko rõ)
//  * @returns {void} chạy handleMove()
//  */
// function barTitleOnClickHold(e) {
//   if (!contentData.dragUIData.isDragging) return;
//   e.preventDefault();
//   handleMove(e.clientX, e.clientY);
// }
// /**
//  * 2.3.4. Hàm xử lí nhấn giữ + di chuyển chạm (chưa test)
//  * @param {TouchEvent} e (ko rõ)
//  * @returns {void} chạy handleMove()
//  */
// function barTitleOnTouchHold(e) {
//   if (!contentData.dragUIData.isDragging) return;
//   e.preventDefault();
//   const touch = e.touches[0];
//   handleMove(touch.clientX, touch.clientY);
// }
// /**
//  * 2.3.5. Hàm xử lí thả chuột/chạm (dùng trong hạng mục 3)
//  * @returns {void} Đầu ra: tắt thao tác di chuyển UI (removeEventListener)
//  */
// function barTitleOnRelease() {
//   if (contentData.dragUIData.isDragging) {
//     contentData.dragUIData.isDragging = false; // Tắt trạng thái kéo thả UI
//     contentData.barTitle.style.cursor = 'grab'; // Đưa icon con trỏ về 'grab'
//     document.removeEventListener('mousemove', barTitleOnClickHold);
//     document.removeEventListener('mouseup', barTitleOnRelease);
//     document.removeEventListener('touchmove', barTitleOnTouchHold);
//     document.removeEventListener('touchend', barTitleOnRelease);
//     // Đóng các thao tác kéo thả UI
//     // sendLogToBackground(`Đã dời vị trí Extension tới tọa độ mới: left=${contentData.uiContainer.style.left}, top=${contentData.uiContainer.style.top}`);
//   }
// }
/** 3.0.0. Tính năng trong tab 0: Quản lí nguồn. */
function buildSourceManagerTab() {
  if (!contentData.tabContents[0]) {
    sendLogToBackground("ko có khung tabContents[0] để render? Tab 1 bị bỏ qua.", "warn");
    return;
  }
  /** Tab 0: Quản lí nguồn (folder) */
  contentData.tabContents[0].innerHTML = `
    <div id="asscee_linkInputBar" class="asscee_InputBar">

      <input 
        type="text" 
        id="asscee_linkInput"
        class="asscee_Input"
        autocomplete="off"
        placeholder="Thêm nguồn (link folder GitHub/GDrive)..."
      />

      <button 
        id="asscee_addFolderBtn" 
        class="asscee_BtnSqr" 
        title="(+) Nếu có link, nút này thêm thư mục vào danh sách.\n(↺) Nếu ko có link, nút này sẽ tải lại các nguồn đã có."
      ></button>

    </div>

    <div class="asscee_Divider">
      <span id="asscee_dividerText" class="asscee_Text">Danh sách nguồn</span>
      <div class="asscee_DividerLine"></div>
    </div>
    
    <div class="asscee_ListContainer">
      <ul id="asscee_linkList" class="asscee_List">
        <li class="asscee_Text asscee_SubText" style="text-align: center; padding: 10px 0;">Chưa có nguồn nào được thêm.</li>
      </ul>
    </div>
  `;
  contentData.linkInput = contentData.tabContents[0].querySelector('#asscee_linkInput');
  contentData.linkList = contentData.tabContents[0].querySelector('#asscee_linkList');
  contentData.addFolderBtn = contentData.tabContents[0].querySelector('#asscee_addFolderBtn');
  /** Hàm cập nhật nút thêm nguồn theo giá trị ô input */
  const updateAddFolderBtnIcon = () => {
    contentData.addFolderBtn.textContent = contentData.linkInput.value.trim() ? "+" : "↺"; // Nếu có nhập gì thì "+", ko thì "↺"
  };
  contentData.linkInput.addEventListener("input", updateAddFolderBtnIcon); // Cập nhật mỗi khi giá trị trên ô input thay đổi
  updateAddFolderBtnIcon(); // Chạy lần đầu.
  contentData.addFolderBtn.addEventListener("click", async () => {
    if (contentData.addFolderBtn.disabled === true) return;
    contentData.addFolderBtn.disabled = true;
    if (!contentData.linkInput.value.trim()) {
      // Chế độ "↺"
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SUB.SEARCH',
          payload: { videoId: "", folderMode: true }
        });
        if (response.type === "SOURCE.LIST" && response.payload) {
          renderLinkList(response.payload);
        } else {
          throw new Error(response.payload);
        }
      } catch (error) {
        sendLogToBackground("Lỗi khi refetch folder:","warn",error);
      } finally {
        contentData.addFolderBtn.disabled = false;
        updateAddFolderBtnIcon();
      }
      return;
    }
    // Chế độ "+" (có hỗ trợ nhiều nguồn)
    chrome.runtime.sendMessage({
        type: "SOURCE.ADD",
        payload: { url: urlValue }
      }, async (response) => {
        contentData.addFolderBtn.disabled = false;
        if (chrome.runtime.lastError) {
          alert(`[${contentData.extensionName}] Lỗi giao tiếp (runtime.lastError) khi thêm nguồn:`, chrome.runtime.lastError.message);
          return;
        }
        if (!response) {
          alert(`[${contentData.extensionName}] Ko có response? Xem lại background.js.`);
          return;
        }
        if (response.type === "SOURCE.ADDED") {
          const results = response.payload;
          const successes = results.filter(r => r.success);
          const failures = results.filter(r => !r.success);
          if (successes.length > 0) {
            contentData.linkInput.value = "";
            updateAddFolderBtnIcon();
            await initSourceList();
          }
          let reportMessage = "";
          const errorDetails = failures.map(f => `- Link: ${f.url || 'Ko rõ'}\n Lỗi: ${f.error}`).join("\n");
          reportMessage = `[${contentData.extensionName}] Kết quả xử lý ${results.length} nguồn:\n- Thành công: ${successes.length} nguồn\n- Thất bại: ${failures.length} nguồn\nChi tiết lỗi (nếu có):\n${errorDetails}`;
          alert(reportMessage);
        } else if (response.type === "SOURCE.NOT_ADDED") {
          alert(`[${contentData.extensionName}] Thêm nguồn thất bại:`, response.payload);
        }
    });
  });
}
/** 3.0.1. Hàm render danh sách nguồn
 * @param {Array<folderData>} linksArray 
 * danh sách nguồn (nhận getSourceList() từ background/storage.js, xem pipeline mục 2.2)
 * @returns Đầu ra: render danh sách nguồn vào contentData.linkList trong tab 1, gắn sự kiện cho từng item
 */
function renderLinkList(linksArray) {
  if (!contentData.linkList) {
    sendLogToBackground("ko có khung linkList để render?", "warn");
    return;
  }
  /** Node tạm để thêm vào .linkList chỉ sau khi đủ các node con */
  const fragment = document.createDocumentFragment();
  if (!Array.isArray(linksArray) || linksArray.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "asscee_Text asscee_SubText";
    emptyLi.style = "text-align: center; padding: 10px 0;";
    emptyLi.textContent = "Chưa có nguồn nào được thêm.";
    fragment.appendChild(emptyLi);
    contentData.linkList.replaceChildren(fragment);
    return;
  }
  linksArray.forEach((item) => {
    /** Lấy thời gian thêm của từng nguồn */
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
          sendLogToBackground("URL không an toàn bị chặn:","warn",targetUrl);
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
            alert(`[${contentData.extensionName}] Lỗi kết nối background:`, chrome.runtime.lastError.message);
            return;
          }
          if (response && response.type === "SOURCE.REMOVED") {
            renderLinkList(response.payload);
          } else if (response && response.type === "ERROR") {
            alert(`[${contentData.extensionName}] Lỗi từ backend:`, response.payload);
          }
        });
      });
    fragment.appendChild(li);
  });
  contentData.linkList.replaceChildren(fragment);
}
/** 3.0.2. Tải danh sách nguồn từ background.js và render danh sách nguồn. */
async function initSourceList() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "SOURCE.GET_ALL" }, (response) => {
      if (chrome.runtime.lastError) {
        alert("[PD-47.ass] Không thể lấy danh sách nguồn:", chrome.runtime.lastError.message);
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
/** 3.1.0. Tính năng trong tab 1: Quản lý phụ đề. */
function buildSubtitleManagerTab() {
  if (!contentData.tabContents[1]) {
    sendLogToBackground("không có khung tabContents[1] để render. Tab 1 bị bỏ qua.", "error");
    return;
  }
  contentData.tabContents[1].innerHTML = `
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
          title="Tải chỉ 1 tệp phụ đề từ máy (chỉ hỗ trợ .ass)"
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
  contentData.searchInput = contentData.tabContents[1].querySelector('#asscee_searchInput');
  contentData.updateIdBtn = contentData.tabContents[1].querySelector('#asscee_updateIdBtn');
  contentData.localSubInput = contentData.tabContents[1].querySelector('#asscee_localFileInput');
  contentData.localSubBtn = contentData.tabContents[1].querySelector('#asscee_localSubBtn');
  contentData.cacheSubBtn = contentData.tabContents[1].querySelector('#asscee_cacheSubBtn');
  contentData.scanSubBtn = contentData.tabContents[1].querySelector('#asscee_scanSubBtn');
  contentData.subFileArray = contentData.tabContents[1].querySelector('#asscee_subFileArray');
  updateVideoId();
  // Lấy videoId từ tab hiện tại
  contentData.updateIdBtn.addEventListener('click', async () => {
    updateVideoId();
  });
  // 1. Quét online
  contentData.scanSubBtn.addEventListener('click', async () => {
    const searchId = contentData.searchInput.value.trim();
    contentData.scanSubBtn.disabled = true;
    try {
      await initSubFileArray(searchId, contentData.currentVideoId, false); 
    } catch (error) {
      alert(`[${contentData.extensionName}] Lỗi khi quét phụ đề trực tuyến:`, error.message);
      sendLogToBackground(`Lỗi quét phụ đề trực tuyến: ${error.message}`, "error");
    } finally {
      contentData.scanSubBtn.disabled = false;
    }
  });
  // 2. Tìm trong cache
  contentData.cacheSubBtn.addEventListener('click', async () => {
    const searchId = contentData.searchInput.value.trim();
    contentData.cacheSubBtn.disabled = true;
    try {
      await initSubFileArray(searchId, contentData.currentVideoId, true);
    } catch (error) {
      alert(`[${contentData.extensionName}] Lỗi khi quét phụ đề từ cache:`, error.message);
      sendLogToBackground(`Lỗi quét phụ đề từ cache: ${error.message}`, "error");
    } finally {
      contentData.cacheSubBtn.disabled = false;
    }
  });
  // 3. Tải file cục bộ
  contentData.localSubBtn.addEventListener('click', () => {
    updateVideoId();
    contentData.localSubInput.click();
  });
  contentData.localSubInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const searchId = contentData.searchInput.value;
    if (!contentData.currentVideoId) {
      alert(`[${contentData.extensionName}] Tính năng nạp phụ đề cục bộ yêu cầu bạn phải ở trên trang video (YT, bilibili) có ID hợp lệ.\nHãy mở một video và thử lại.`);
      return;
    }
    const rawText = await file.text();
    chrome.runtime.sendMessage({
      type: "SUB.LOCAL",
      payload: {
        videoId: contentData.currentVideoId,
        rawText: rawText,
        fileName: file.name
      }
    }, async (response) => {
      contentData.localSubInput.value = "";
      if (chrome.runtime.lastError) {
        alert(`[${contentData.extensionName}] Lỗi nạp file cục bộ:`, chrome.runtime.lastError.message);
        return;
      }
      sendLogToBackground(`Đã lưu thành công phụ đề cục bộ cho video ID: ${contentData.currentVideoId}, file: ${file.name}`);
      await initSubFileArray(searchId, contentData.currentVideoId, true);
    });
  });
}
/** 3.1.1. Hàm render danh sách tệp phụ đề
 * @param {Array<candidate>} candidates danh sách các file phụ đề 
 * (xem mục 2.3.2 (candidates) với quét file online, 2.4.3.2 (cacheList) với quét cache)
 * (chú ý: videoId, cachedId, cachedAt là thuộc tính chỉ cacheList có, candidates ko có)
 * @param {string} searchId Id mà user tìm kiếm (thanh tìm kiếm. nếu để trống tức là tìm toàn bộ nguồn/cache)
 * @param {string} targetId Id trích từ tab hiện tại
 * @param {boolean} cacheSearchMode chế độ quét cache hay quét online (true = cache, false = online)
 */
function renderSubFileArray(candidates, searchId, targetId, cacheSearchMode = false) {
  if (!contentData.subFileArray) {
    sendLogToBackground("ko có khung linkList để render?", "warn");
    return;
  }
  contentData.tabContents[1].querySelector('#asscee_dividerText').textContent = `Kết quả tìm kiếm (${candidates.length} tệp)`;
  const fragment = document.createDocumentFragment();
  if (!candidates || candidates.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "asscee_Text asscee_SubText";
    emptyLi.style = "text-align: center; padding: 10px 0;";
    emptyLi.textContent = "Danh sách tệp phụ đề kết quả trống.";
    fragment.appendChild(emptyLi);
    contentData.subFileArray.replaceChildren(fragment);
    return;
  }
  candidates.forEach((candidate) => {
    const li = document.createElement("li");
    li.className = "asscee_LinkItem";
    li.style.cursor = "pointer";
    const timeInfo = getRelativeTimeString(candidate.cachedAt); 
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
      sendLogToBackground(`Video ID khác với cached ID: ${candidate.videoId} !== ${candidate.cachedId}`, "warn");
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
        sendLogToBackground("URL không an toàn bị chặn:", "warn", targetUrl);
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
          alert(`[${contentData.extensionName}] Lỗi khi áp dụng phụ đề:`, chrome.runtime.lastError.message);
          return;
        }
        sendLogToBackground(`Đã chọn áp dụng phụ đề cho video ID: ${targetId}.`);
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
          alert(`[${contentData.extensionName}] Lỗi khi xóa cache phụ đề:`, chrome.runtime.lastError.message);
          return;
        }
        if (response && response.type === "SUB.REMOVED" && response.payload === true) {
          sendLogToBackground(`Đã xóa phụ đề cache của video ID: ${candidate.videoId}.`);
          chrome.runtime.sendMessage({ type: "SUB.GET_ALL", payload: { videoId: searchId } }, (cacheResponse) => {
            if (cacheResponse && cacheResponse.type === "SUB.LIST") {
              renderSubFileArray(cacheResponse.payload, searchId, targetId, true);
            } else {
              sendLogToBackground("Không thể tải lại danh sách cache sau khi xóa.", "warn");
            }
          });
        } else {
          sendLogToBackground(`Xóa cache tệp phụ đề thất bại cho video ID: ${candidate.videoId}`, "warn");
          alert(`[${contentData.extensionName}] Xóa cache tệp phụ đề thất bại. Vui lòng xem console.`);
        }
      });
    });
    fragment.appendChild(li);
  });
  contentData.subFileArray.innerHTML = "";
  contentData.subFileArray.appendChild(fragment);
}
/** 3.1.2. Tải danh sách tệp phụ đề từ background.js và render danh sách tệp phụ đề.
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
        alert(`[${contentData.extensionName}] Không thể lấy danh sách phụ đề:`, chrome.runtime.lastError.message);
        resolve();
        return;
      }
      if (response && response.payload && Array.isArray(response.payload)) {
        const candidates = response.payload;
        renderSubFileArray(candidates, searchId, targetId, cacheSearchMode);
      } else {
        sendLogToBackground("Không nhận được phản hồi hợp lệ khi tải danh sách phụ đề.", "warn",response.payload);
      }
      resolve(); // Giải phóng Promise
    });
  });
}
// Phần chạy chính của ui.js
function main() {
  'use strict';
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "TOGGLE_OVERLAY_SIGNAL") {
      toggleOverlay(contentData.uiContainerId, msg.payload);
      sendResponse({ ok: true });
      return true;
    }
  }); // Phần lập trình nghe tín hiệu từ background
  if (document.getElementById(contentData.uiContainerId)) { // Nếu có trước đó thì thoát luôn.
    sendLogToBackground(`content: Đã có sẵn containerId (luồng khác đang chạy). Dừng chạy content.js luồng này.`, "warn");
    return;
  } 
  try { buildMainHTML() } catch (error) {
    sendLogToBackground(`chạy lỗi mục 210: ${error.message}`, "error");
    return;
  } finally {
    toggleOverlay(contentData.uiContainerId, true);
  }
  try { buildTabListLogic() } catch (error) {
    sendLogToBackground(`chạy lỗi mục 220: ${error.message}`, "error");
  }
  try { contentData.draggableUI = new contentData.Draggable(contentData.uiContainer, contentData.barTitle) } catch (error) {
    sendLogToBackground(`chạy lỗi mục Tính năng di chuyển giao diện: ${error.message}`, "error");
  }
  try { buildSourceManagerTab() } catch (error) {
    sendLogToBackground(`chạy lỗi mục 300: ${error.message}`, "error");
  }
  try { buildSubtitleManagerTab() } catch (error) {
    sendLogToBackground(`chạy lỗi mục 310: ${error.message}`, "error");
  }
};
main();