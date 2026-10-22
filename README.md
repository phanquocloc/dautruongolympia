# 🔔 ANIME RELIGION QUIZ ARENA — RUNG CHUÔNG VÀNG 5 ĐỘI

> **Khẩu hiệu:** *“Giải mã tri thức – Khám phá niềm tin – Chinh phục chuông vàng!”*  
> **Chủ đề học thuật:**
> 1. *Quan điểm của chủ nghĩa Mác – Lênin về tôn giáo.*
> 2. *Tôn giáo ở Việt Nam và chính sách của Đảng, Nhà nước Việt Nam hiện nay.*

---

## 🌟 TỔNG QUAN HỆ THỐNG

**ANIME RELIGION QUIZ ARENA** là nền tảng web game tương tác thời gian thực chuyên nghiệp phục vụ thuyết trình, học tập và tổ chức cuộc thi Rung Chuông Vàng trong lớp học. Hệ thống kết hợp phong cách **Anime Cartoon hiện đại** với **bản sắc văn hóa, kiến trúc tín ngưỡng - tôn giáo truyền thống Việt Nam** (họa tiết trống đồng Đông Sơn, hoa sen, cổng đền chùa, chuông vàng ngũ sắc).

---

## 🚀 ĐƯỜNG DẪN TRUY CẬP CÁC GIAO DIỆN

Hệ thống đang chạy tại cổng **3000** trên máy tính của bạn:

| Giao diện | Địa chỉ trên Laptop | Địa chỉ trên Điện Thoại (Cùng Wi-Fi) | Mô tả |
| :--- | :--- | :--- | :--- |
| 🏠 **Trang Chủ / Hub** | `http://localhost:3000/` | `http://192.168.31.28:3000/` | Cổng thông tin, mã QR quét tham gia, giới thiệu 5 đội |
| 🖥️ **Màn Hình Trình Chiếu** | `http://localhost:3000/projector` | — | Chuẩn 16:9 cho máy chiếu/TV: Bảng điểm 5 đội, hiệu ứng chuông vàng, bức tranh bí ẩn, cúp vô địch |
| 👑 **Bảng Quản Trị MC** | `http://localhost:3000/mc` | — | Trung tâm điều khiển trận đấu của MC/Giảng viên: nhận chuông, chấm điểm, sửa câu hỏi, lịch sử sự kiện |
| 📱 **Điện Thoại Đội Chơi** | `http://localhost:3000/player` | `http://192.168.31.28:3000/player` | Giao diện smartphone: Chuông vàng siêu nhạy, chuông kép Vòng 2, thanh kéo thả cược điểm Vòng 3 |
| 🎮 **Phòng Giả Lập 5 Đội** | `http://localhost:3000/sandbox` | — | Giả lập đồng thời 5 smartphone trên 1 màn hình để test bấm chuông miligiây không cần 5 máy thật |

---

## 🛡️ 5 ĐỘI THI ĐẤU MẶC ĐỊNH (TỨ LINH & THẦN THÚ)

1. **Đội 1 – Hỏa Phượng** 🔴 (Phượng hoàng lửa, Màu Đỏ Son)
2. **Đội 2 – Thanh Long** 🔵 (Rồng xanh ngọc, Màu Xanh Ngọc)
3. **Đội 3 – Bạch Hổ** ⚪ (Hổ trắng oai phong, Màu Vàng Kim / Hổ)
4. **Đội 4 – Huyền Vũ** 🟣 (Rùa rắn linh thiêng, Màu Tím Huyền)
5. **Đội 5 – Kim Lân** 🟡 (Kỳ lân hoàng kim, Màu Vàng Ánh Kim)

*(MC có thể tự do đổi tên đội bất kỳ lúc nào trên Bảng điều khiển MC)*.

---

## 🎯 CẤU TRÚC 3 VÒNG THI ĐẤU

### 1. Vòng 1 — Khởi Động: Chuông Vàng Tri Thức
- Gồm **5 câu hỏi trắc nghiệm** nền tảng về bản chất, nguồn gốc nhận thức, tính chất và nguyên tắc giải quyết vấn đề tôn giáo theo chủ nghĩa Mác – Lênin, cùng khái niệm phân biệt Tín ngưỡng - Tôn giáo theo Luật 2016.
- **Cơ chế bấm chuông:** Máy chủ ghi nhận thời điểm bấm chuông đến từng miligiây. Đội nhanh nhất có **5 giây** để trả lời.
- **Tính điểm lũy tiến:**
  - Trả lời đúng lần 1: **+30 điểm**.
  - Nếu sai: Chuyển quyền cho đội bấm nhanh thứ hai (**+20 điểm** nếu đúng).
  - Nếu sai: Chuyển quyền cho đội thứ ba (**+10 điểm** nếu đúng).
  - Cả 3 đội sai: Công bố đáp án và lời giải thích học thuật, không đội nào có điểm.

### 2. Vòng 2 — Vượt Chướng Ngại Vật: Giải Mã Bức Tranh Bí Ẩn
- Bức tranh trung tâm khổ lớn về **Không gian văn hóa và đời sống tôn giáo hòa hợp ở Việt Nam** bị che bởi **6 mảnh ghép**.
- **Hai nút bấm chuông độc lập trên điện thoại:**
  - 🧩 **CHUÔNG MẢNH GHÉP (Nút Xanh Ngọc):** Giành quyền trả lời câu hỏi của mảnh ghép hiện tại (**+20 điểm** cho đội 1, **+10 điểm** cho đội 2; trả lời đúng mở mảnh ghép tương ứng).
  - 🔑 **CHUÔNG TỪ KHÓA (Nút Vàng Kim có biểu tượng chìa khóa):** Dành riêng để giải mã **Từ khóa chủ đề** của toàn bộ bức tranh bất kỳ lúc nào!
- **Quy tắc Từ Khóa:**
  - Đoán đúng từ khóa: Nhận ngay **+100 điểm**, kích hoạt hiệu ứng *"GIẢI MÃ THÀNH CÔNG"*, mở toàn bộ bức tranh!
  - Đoán sai: Bị khóa quyền bấm chuông từ khóa trong suốt phần còn lại của Vòng 2 (nhưng vẫn được trả lời mảnh ghép).

### 3. Vòng 3 — Về Đích: Cược Điểm & Thử Thách Cuối
- **Giai đoạn Đặt Cược (10 giây):**
  - Các đội dùng thanh trượt, các khối điểm nhanh (+10, +20, +50, Tất tay) để đặt cược từ **0 đến toàn bộ số điểm hiện có**.
  - Hết 10 giây hệ thống tự động khóa cược (đội không bấm mặc định 0 điểm).
- **Chuyển cảnh bí ẩn (3 giây):**
  - Màn hình chuyển hiệu ứng năng lượng huyền ảo, sau đó công bố bảng cược điểm của cả 5 đội cho cả lớp cùng xem.
- **Câu hỏi quyết định:**
  - Câu hỏi tình huống học thuật chuyên sâu về chính sách tôn giáo của Đảng và Nhà nước Việt Nam.
  - Cả 5 đội bấm chuông giành quyền (5 giây trả lời).
  - **Tính điểm:**
    - Trả lời đúng: **Cộng trọn vẹn số điểm đã cược**.
    - Trả lời sai/hết giờ: **Bị trừ số điểm đã cược**.
    - Đội không giành được quyền trả lời: **Bảo toàn điểm số**.
    - Điểm số không bao giờ âm (mức tối thiểu là 0).

### 4. Màn Hình Vinh Danh & Trao Giải Quán Quân
- **Giai đoạn 1 — Đóng băng sân khấu:** Nhạc nền hồi hộp, các biểu tượng sẵn sàng.
- **Giai đoạn 2 — Công bố cao trào từ Hạng 5 đến Hạng 1:**
  - MC bấm chuyển từng bước: Hạng 5 ➔ Hạng 4 ➔ Hạng 3 ➔ Hạng 2 ➔ **NHÀ VÔ ĐỊCH**.
  - Đội Quán quân được tôn vinh với **Cúp Chuông Vàng Anime**, pháo hoa giấy rực rỡ và nhạc chiến thắng.
- **Giai đoạn 3 — Bảng vàng danh dự:** Thống kê chi tiết điểm Vòng 1, Vòng 2, Điểm cược Vòng 3, và tổng điểm chung cuộc với quy tắc phá hòa minh bạch.

---

## 🔊 HỆ THỐNG ÂM THANH WEB AUDIO ĐỘC QUYỀN
Hệ thống tích hợp bộ tổng hợp âm thanh **Web Audio API** chạy trực tiếp trong trình duyệt, không phụ thuộc vào file MP3 bên ngoài, không lo lỗi mạng:
- Tiếng Chuông Vàng ngân vang (*Golden Bell Chime*).
- Tiếng còi bấm chuông nhanh (*Sci-Fi Anime Buzzer*).
- Âm thanh trả lời chính xác và tiếng còi báo sai chuẩn gameshow.
- Đồng hồ đếm ngược tích tắc và dồn dập trong 3 giây cuối.
- Khúc khải hoàn môn vinh danh chiến thắng (*Victory Anthem*).
- Nút bật/tắt âm thanh (Mute/Unmute) chủ động trên mọi giao diện.

---

## 🛠️ HƯỚNG DẪN CHẠY VÀ QUẢN TRỊ

1. **Khởi động server:**
   ```bash
   node server.js
   ```
2. **Chỉnh sửa ngân hàng câu hỏi:**
   - Bấm nút **"📚 Sửa Câu Hỏi"** trên Bảng Điều Khiển MC để sửa trực tiếp câu hỏi, các lựa chọn A/B/C/D, đáp án đúng và trích dẫn khoa học.
   - Hoặc chỉnh sửa trực tiếp file [questions.json](file:///c:/Users/ADMIN-PC/Desktop/quiz/data/questions.json).
3. **Chạy thử nghiệm tự động:**
   - Chạy lệnh sau để kiểm thử toàn diện toàn bộ 3 vòng đấu từ A-Z:
   ```bash
   node test_arena.js
   ```
