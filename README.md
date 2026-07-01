# Aegisub SoftSub Chrome Extension Engine (ASS-CEE)
**(Tái bút: lúc mới làm, tôi nghĩ ra quả tên khá khúm núm như vậy, hay gọi là extension (tiện ích) "Dự án 47" đi)**

**[Trao đổi về tiện ích này tại đây](https://github.com/PhongChillFansub/ASS-CEE/discussions/3)**

---

## Hướng dẫn sử dụng
1. Cài đặt [xem tại đây](#hướng-dẫn-cài-đặt).
2. Bấm vào icon để khởi động giao diện tương tác và trình render (để tự động render nếu bạn đang bật video và đã lưu dữ liệu phụ đề tương ứng)
<p align="center">
  <img width="25%" alt="image" src="https://github.com/user-attachments/assets/a2335ec0-2ec5-4231-b84b-056b150929c7" />
  <img width="25%" alt="image" src="https://github.com/user-attachments/assets/91387ccf-f61d-4fdd-bd3e-e04313390949" />
  <img width="25%" alt="image" src="https://github.com/user-attachments/assets/3ce806b4-9b3b-4307-9594-4ff9816d6541" />

  <br>
  <em>Ảnh (từ trái sang): Giao diện ban đầu (mặc định ở trang Quản lí nguồn); Khi bấm nút Danh sách trang (tab list); Khi chuyển sang trang Quản lí dữ liệu (và ở trên 1 trang video YouTube cụ thể nào đó);
</em>
</p>


3. 

---

## Thông báo: cập nhật bản v0.0.6-alpha 01juy06

- Thay đổi cách gọi tên từ v0.0 beta 0 alpha 6 (v0.0.0.6) sang v0.0 build 6 (v0.0.6)
- Sửa lỗi không thể thêm thư mục Google Drive vào danh sách nguồn
  <details>
    <summary><b>Cụ thể:</b></summary>
    do đặt sai permission trong manifest.
  </details>
- Thêm cài đặt các tab mà tiện ích được phép kích hoạt (hiện tại chỉ cho kích hoạt trên các trang của YouTube)
  <details>
    <summary><b>Cụ thể:</b></summary>
    thêm blacklist, whitelist cho các tab có URL mà background được phép chạy UI, renderer.
  </details>
- Sửa lỗi UI không hiển thị videoId cho người dùng khi cập nhật.
  <details>
    <summary><b>Cụ thể:</b></summary>
    phần xử lí currentId bị đặt sai chỗ.
  </details>

---

Tiện ích này được truyền cảm hứng từ 4 repo/extension khác là [Kull-Vietsub](https://github.com/zingky/Kull-Vietsub), [+Sub](https://github.com/plussub/plussub), [ASS.js](https://github.com/weizhenye/ASS) và [AxTongue](https://chromewebstore.google.com/detail/axtongue/ilbfbiamkpljhkhnhjiikeikefogpffh).

Trong đó, tiện ích này chịu ảnh hưởng trực tiếp và có thể sử dụng kho phụ đề từ [Kull-Vietsub](https://github.com/zingky/Kull-Vietsub).

---

## Tính năng chính

- Hoạt động trên trình duyệt Chromium phiên bản 102 trở lên. (người viết chỉ mới thử nghiệm trên Cốc Cốc trên Windows)
- Hiển thị phụ đề trên trang xem video YouTube hiện tại của người dùng
- Cho phép lưu nguồn, quản lí, tìm kiếm phụ đề từ nguồn thư mục trên GitHub, Google Drive (đường dẫn thư mục do người dùng nhập).
- Chỉ hỗ trợ định dạng Advanced SubStationAlpha đuôi .ass, tệp phụ đề tạo bằng phần mềm Aegisub.
- Cho phép tìm kiếm phụ đề theo bất kì chuỗi kí tự trùng khớp trong tên tệp, hỗ trợ tìm kiếm bằng ID của video, sử dụng thuật toán fileName.include().
- Cho phép người dùng lựa chọn video thủ công mà không cần tên tệp có ID video trùng khớp với video đang mở của tab.
- Cho phép lưu và xóa phụ đề trong bộ nhớ trình duyệt (chrome.storage.local) theo ID video, tự động sử dụng khi người dùng bật video có ID trùng khớp.

---

## Tính năng dự kiến 

- Thay đổi vị trí, thời gian hiển thị, ẩn/hiện phụ đề Aegisub (riêng lẻ theo từng kiểu dáng "style" hoặc toàn bộ) theo ID video, theo cài đặt trong tệp phụ đề, và theo thao tác thủ công của người dùng
- Hỗ trợ một số tag cơ bản của VSFilter trên Aegisub
- Hỗ trợ tính năng chống đè chữ (Collision Resolution) như Aegisub đã làm, đối với các dòng không có tọa độ ghi đè bằng tag \pos, \move
- Lên Chrome Web Store (Extension) và Firefox Add-ons (Extension)

---

## Hướng dẫn cài đặt

1. Tải về và giải nén thư mục extension.
2. Mở Chrome/Cốc Cốc, truy cập: `chrome://extensions/` hoặc Tiện ích mở rộng > Quản lý các tiện ích
3. Bật **Chế độ dành cho nhà phát triển** (góc trên bên phải).
4. Nhấn **Tải tiện ích đã giải nén** và chọn thư mục chứa extension.
5. Chọn thư mục tiện ích đã giải nén
6. Ghim (pin) tiện ích lên thanh công cụ nếu muốn tiện sử dụng.

---

## Credits
- Tiện ích này có sử dụng AI (Gemini, Copilot) để hỗ trợ giải pháp, viết chương trình và sửa lỗi.
- Tuy nhiên, người viết (Yukimuro - Phòng Chill Fansub) vẫn là người quản lí và định hình cấu trúc cho chương trình.
