# Aegisub SoftSub Chrome Extension Engine (ASS-CEE)
**(Tái bút: lúc mới làm, tôi nghĩ ra quả tên khá khúm núm như vậy, hay gọi là extension (tiện ích) "Dự án 47" đi)**

**[Trao đổi về tiện ích này tại đây](https://github.com/PhongChillFansub/ASS-CEE/discussions/3)**

---

## Hướng dẫn sử dụng (bản v0.0.6)
1. Cài đặt [xem tại đây](#hướng-dẫn-cài-đặt).

2. Bấm vào icon để khởi động giao diện tương tác và trình render (để tự động render nếu bạn đang bật video và đã lưu dữ liệu phụ đề tương ứng) (ảnh 1.1)
   Có thể chuyển sang các trang khác bằng cách bấm vào hình "☰" ở bên trái tiêu đề, rồi chọn các trang cần chuyển. (ảnh 1.2)
   Tiêu đề luôn hiển thị tên trang đang hiện trong ngoặc đơn (ảnh 1.1, ảnh 1.3)
<p align="center">
  <img width="30%" alt="image" src="https://github.com/user-attachments/assets/a2335ec0-2ec5-4231-b84b-056b150929c7" />
  <img width="30%" alt="image" src="https://github.com/user-attachments/assets/91387ccf-f61d-4fdd-bd3e-e04313390949" />
  <img width="30%" alt="image" src="https://github.com/user-attachments/assets/3ce806b4-9b3b-4307-9594-4ff9816d6541" />
  <br>
  <em>Ảnh (từ trái sang):<br> 1.1. Giao diện ban đầu (mặc định ở trang Quản lí nguồn);<br> 1.2. Khi bấm nút Danh sách trang (tab list);<br> 1.3. Khi chuyển sang trang Quản lí dữ liệu (và ở trên 1 trang video YouTube cụ thể nào đó).
  </em>
</p>

3. Thêm nguồn bằng cách dán đường link của thư mục, sau đó bấm nút "+" (như ảnh 2.1). Nếu không dán đường link nào (mặc định), nút "+" sẽ chuyển thành nút "↺", dùng khi cần tiện ích tự động cập nhật lại các nguồn đã có trong danh sách nguồn. (xem ảnh 1.1, 1.2). Sau đó sẽ có kết quả thêm nguồn, bấm OK để đóng.
   Khi thêm thành công, danh sách nguồn sẽ cập nhật lại, hiển thị nguồn đã được thêm như hình 2.3.
<p align="center">
   <img width="30%" alt="image" src="https://github.com/user-attachments/assets/12663f33-0877-4b73-ac2f-294689e4ac6e" />
   <img width="30%" alt="image" src="https://github.com/user-attachments/assets/d8407084-b06b-4a87-ab21-8d4bbcef4332" />
   <img width="30%" alt="image" src="https://github.com/user-attachments/assets/d9e5e658-58ad-494f-9d2e-5ba933442c9e" />
  <br>
  <em>Ảnh (từ trái sang):<br> 2.1. Thao tác thêm nguồn; 2.2. Thông báo kết quả thêm nguồn; 2.3. Nguồn thư mục trong danh sách
  </em>
</p>

4. Lúc này, chuyển sang trang Quản lí dữ liệu (ảnh 1.3) khi đang bật một video YouTube cụ thể, tiện ích sẽ tự động cập nhật ID và hiển thị trên thanh tìm kiếm.
   Ở bên phải, có 4 nút chức năng, lần lượt là: Lấy video ID từ tab YouTube hiện tại 🆔, tải phụ đề từ máy 📁, tìm kiếm trong cache 💾, và tìm kiếm trong các nguồn 🌐.
   Bấm vào các nút trên để sử dụng tính năng tương ứng.
   - Chú ý: nếu thanh tìm kiếm trống, việc tìm kiếm trong cache và trong các nguồn sẽ hiển thị toàn bộ kết quả (tất cả tệp phụ đề đã lưu, và tất cả tệp phụ đề có trong các nguồn)

5. Sau khi chọn tìm kiếm trong các nguồn, kết quả sẽ hiển thị như ví dụ hình 4.1. Ở các ô tệp phụ đề đang hiển thị, chọn ✓ để áp dụng thủ công tệp đó với video hiện tại, chọn ✕ để xóa tệp đó khỏi bộ nhớ cache.
   Ở chế độ tìm kiếm trong các nguồn, nút ✕ bị vô hiệu hóa, và các tệp không hiển thị thời gian thêm.
   Ở chế độ tìm kiếm trong bộ nhớ (cache), nút ✓ bị vô hiệu hóa nếu tệp đó đang được sử dụng (cùng video ID với video YouTube đang mở), hoặc đang không bật video nào (không có video ID để áp dụng và lưu phụ đề).

<p align="center">
  <img width="80%" alt="image" src="https://github.com/user-attachments/assets/87397812-aea1-410f-a9e3-121479f91ac3" />
  <br>
  <em>Ảnh 3.1. Ví dụ kết quả tìm kiếm phụ đề trong các nguồn</em>
</p>

6. Sau khi thêm phụ đề vào bộ nhớ cache, kết quả sẽ hiển thị như hình 4.1.
   Chú ý: nếu vẫn không thấy phụ đề xuất hiện, có thể tải lại trang.
   
<p align="center">
  <img width="80%" alt="image" src="https://github.com/user-attachments/assets/a0caec30-4395-44b4-a241-371437cfa48e" />
  <br>
  <em>Ảnh 4.1. Ví dụ hiển thị phụ đề sau khi đã thêm vào bộ nhớ cache</em>
</p>

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
