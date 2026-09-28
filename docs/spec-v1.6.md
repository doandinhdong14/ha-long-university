# CRM chấm KPI – ĐH Hạ Long · Bản sửa đổi v1.6

> **Phiên bản:** v1.6 – 28/09/2026
> **Loại tài liệu:** **bản sửa đổi** trên nền đặc tả v1.4 (`docs/spec.md`) và phần bổ sung menu Admin v1.5 (nếu đã làm).
> **Nguyên tắc:** chỗ nào file này nói khác v1.4 thì **làm theo file này**. Chỗ nào file này không nhắc tới thì **giữ nguyên như v1.4**.

---

## 0. Hướng dẫn cho Claude Code

1. Đọc `docs/spec.md` (v1.4) để nắm hệ thống, rồi đọc hết file này trước khi sửa.
2. Tạo nhánh `feature/v1.6`. Làm theo **thứ tự ở mục 11**, xong mỗi bước chạy typecheck + build, commit `v1.6 – Bước X: <tên bước>`.
3. Được **sửa trực tiếp** code, schema, seed. **Được xóa dữ liệu demo và seed lại.**
4. Mọi kiểm tra quyền, trạng thái, hạn thời gian vẫn làm **ở server**.
5. Test cũ nào hỏng vì hành vi **cố ý thay đổi** trong file này (bỏ bước Gửi lên, bỏ xin thêm task) thì **sửa test cho đúng hành vi mới**, không xóa. Liệt kê các test đã sửa vào `NOTES.md`.
6. Ghi vào `NOTES.md`: nguyên nhân lỗi ở mục 7.1, quyết định tự chọn, việc còn tồn.
7. Không làm gì ngoài danh sách thay đổi ở mục 1.

---

## 1. Tóm tắt thay đổi

| # | Thay đổi | Mục |
|---|---|---|
| 1 | Đầu kỳ: **mọi nhiệm vụ đều bắt buộc**, tick sẵn và khóa. Thêm khối **"Đăng ký cải tiến sáng tạo"** (tự chọn) kèm file mẫu **Phụ lục IV** | 2 |
| 2 | **Bỏ** cơ chế "xin thêm task mở rộng" (chỉ ẩn giao diện, giữ dữ liệu) | 3 |
| 3 | Cải tiến sáng tạo được chốt = **+10%**, tối đa **110%**. Tính lại kết quả | 4 |
| 4 | Cuối kỳ có **2 biểu đồ tròn**: "Đánh giá của cấp trên" (trái) và "Tự đánh giá" (phải) | 5 |
| 5 | Trạng thái task, lý do thiếu, bảng tổng quan, Excel, thông báo cập nhật theo các thay đổi trên | 6 |
| 6 | **Bỏ bước "Gửi lên"**: người duyệt bấm Duyệt là task tự lên người chốt. Kiểm tra lỗi "trưởng khoa thấy Chờ chốt trống" | 7 |
| 7 | Thêm mục **"Theo dõi kết quả đã chốt"** cho Hiệu phó và Hiệu trưởng (chỉ xem) | 8 |

---

## 2. Đầu kỳ: nhiệm vụ bắt buộc + Đăng ký cải tiến sáng tạo

Áp dụng cho **GV, TBM, TK, HP** (mục Đầu kỳ của luồng KPI chung).

### 2.1 Nhiệm vụ bắt buộc
- **Mọi nhiệm vụ** admin tạo cho vị trí của người đó đều là bắt buộc.
- Thẻ nhiệm vụ hiện sẵn dấu tick, **khóa không bỏ được**, có nhãn **"Bắt buộc"** (kèm icon khóa).
- Danh sách task trong thẻ **chỉ hiện task Bắt buộc** (task loại Mở rộng cũ bị ẩn, mục 3).
- **Server tự quyết danh sách nhiệm vụ:** khi lưu nháp hoặc gửi, server luôn ghi **toàn bộ** nhiệm vụ thường của vị trí vào đăng ký, **bỏ qua** danh sách nhiệm vụ client gửi lên. Client chỉ gửi được đúng 1 giá trị: có đăng ký cải tiến hay không.
- Thay luật "phải chọn ít nhất 1 nhiệm vụ" bằng: vị trí không có nhiệm vụ nào → hiện *"Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin"* và khóa nút Gửi.
- Xếp loại A1–F **giữ nguyên cách tính** (tổng điểm các nhiệm vụ đã đăng ký). Cải tiến sáng tạo **không cộng điểm**.

### 2.2 Khối "Đăng ký cải tiến sáng tạo"
Nằm **bên dưới** danh sách nhiệm vụ, trên nút Gửi.

```
┌─ Đăng ký cải tiến sáng tạo (không bắt buộc) ─────────────────┐
│  [icon Word]  Phụ lục IV            [ Tải về ]                │
│                                                               │
│  ☐ Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này       │
│  Hoàn thành và được chốt: +10% (tối đa 110%).                 │
│  Không ảnh hưởng xếp loại đăng ký.                            │
└───────────────────────────────────────────────────────────────┘
```

- **File Phụ lục IV:** file tĩnh, đường dẫn cố định **`public/templates/phu-luc-iv.docx`**, dùng chung cho cả 4 vị trí và mọi kỳ. Nút **Tải về** trỏ tới `/templates/phu-luc-iv.docx`.
  - Tạo sẵn thư mục `public/templates/` (có `.gitkeep`). **Không tự tạo file docx giả**: chủ dự án sẽ tự chèn file thật vào sau.
  - Server kiểm tra file có tồn tại không. Chưa có → thẻ file hiện *"Mẫu Phụ lục IV đang được cập nhật"*, nút Tải về bị khóa; ô tick đăng ký **vẫn dùng được**.
  - Không làm xem trước nội dung Word.
- **Ô tick đăng ký:** tick/bỏ tick được khi danh sách đang **Nháp** (trước hạn đăng ký) hoặc **Bị từ chối** (trước deadline). Các trạng thái khác → khóa.
- **Thanh tổng kết** thêm 1 ý: `Số nhiệm vụ – Tổng điểm – Xếp loại dự kiến – Cải tiến sáng tạo: Có/Không`.

### 2.3 Gửi và duyệt
- Bấm **Gửi** → lên người duyệt như cũ.
- Người duyệt vẫn duyệt/từ chối **cả danh sách**. Tab "Đăng ký nhiệm vụ" ở màn hình Duyệt hiện thêm dòng **"Đăng ký cải tiến sáng tạo: Có/Không"**.
- Được duyệt → hệ thống tạo task cho người đó:
  - Mọi task **Bắt buộc** của các nhiệm vụ thường.
  - **1 task cải tiến sáng tạo** nếu có đăng ký (mục 2.4).
  - **Không** tạo task loại Mở rộng.
- Hết hạn đăng ký mà chưa gửi: **giữ luật cũ** (chốt kỳ ra Không đạt – bậc thấp nhất).

### 2.4 Cách lưu cải tiến sáng tạo (đề xuất, được chọn cách đơn giản hơn nếu giữ đúng hành vi)
- Mỗi **(kỳ, vị trí)** có đúng **1 nhiệm vụ hệ thống** `laCaiTien = true`:
  - Tên: *Đăng ký cải tiến sáng tạo*, điểm = 0.
  - Có đúng 1 task, loại **`CAI_TIEN`**: *Sản phẩm cải tiến sáng tạo*, mô tả: *Nộp Phụ lục IV đã điền và các file sản phẩm cải tiến.*
- Viết hàm `damBaoNhiemVuCaiTien(kyId)` **chạy nhiều lần không bị trùng**. Gọi khi: tạo kỳ, sao chép kỳ (không copy nhiệm vụ cải tiến của kỳ cũ, tạo lại bằng hàm này), seed.
- Tick cải tiến = thêm nhiệm vụ cải tiến vào `DangKyNhiemVu`; không tick = không có.
- Mọi chỗ liệt kê nhiệm vụ thường (thẻ đầu kỳ, admin, tổng điểm) phải lọc `laCaiTien = false`.

### 2.5 Admin – Phân việc đầu kỳ
- Danh sách nhiệm vụ mỗi vị trí hiện thêm 1 dòng cố định **"Đăng ký cải tiến sáng tạo (hệ thống)"**, **không sửa, không xóa** được (chặn cả ở API).
- Thêm nhiệm vụ vào kỳ **đã công bố** → hiện cảnh báo: *"Người đã gửi đăng ký sẽ không tự có nhiệm vụ này. Nên hoàn tất nhiệm vụ trước khi công bố kỳ."*

### 2.6 Cuối kỳ
- Người có đăng ký cải tiến thấy thêm khối **"Cải tiến sáng tạo"** bên dưới danh sách nhiệm vụ, chứa 1 task cải tiến.
- Task cải tiến dùng **đúng giao diện và vòng trạng thái** như task thường (nộp minh chứng nhiều file, sửa khi chờ duyệt, bị từ chối nộp lại, duyệt → chốt). Gợi ý dưới ô tải file: *"Nộp Phụ lục IV đã điền và file sản phẩm."*
- Không đăng ký → không có khối này.

---

## 3. Bỏ "xin thêm task mở rộng"

- **Ẩn** toàn bộ giao diện:
  - Khối "Xin thêm task" ở Cuối kỳ.
  - Tab "Xin thêm task", ô đếm và cột "Xin thêm chờ duyệt" ở màn hình Duyệt.
- **Chặn ở server:** tạo yêu cầu, duyệt yêu cầu xin thêm → trả lỗi *"Chức năng không còn sử dụng"*.
- **Admin:** form task **ẩn ô chọn loại**, task mới luôn là Bắt buộc. Task Mở rộng cũ (nếu có) hiện nhãn *"Mở rộng – không còn sử dụng"*.
- **Tính toán:** task loại Mở rộng **bị bỏ qua hoàn toàn** (không tạo, không đếm, không hiện).
- **Giữ nguyên dữ liệu:** không xóa bảng `YeuCauThemTask`, không xóa giá trị `MO_RONG` trong enum.
- Seed mới **không tạo** task Mở rộng.

---

## 4. Tính kết quả mới (thay mục 10.3 của v1.4)

### 4.1 Công thức
Hàm dùng chung `tinhKetQua(kyId, userId)` (chốt kỳ, báo cáo tạm tính, biểu đồ, bảng tổng quan):

```
THUONG_CAI_TIEN = 10   // phần trăm cộng thêm

nếu không có đăng ký, hoặc đăng ký chưa Đã duyệt:
    ketQua = KHONG_DAT, xepLoai = bậc thấp nhất
    phanTramBatBuoc = 0, phanTram = 0, tuDanhGia = 0
    trangThaiCaiTien = KHONG_DANG_KY
    ghiChu = "Chưa có danh sách nhiệm vụ được duyệt"
    dừng

batBuoc  = task loại BAT_BUOC của người này trong kỳ
caiTien  = task loại CAI_TIEN của người này trong kỳ (0 hoặc 1)
           (task MO_RONG: bỏ qua)

nếu batBuoc rỗng:
    phanTramBatBuoc = 0, ghiChu = "Chưa có task bắt buộc"
ngược lại:
    phanTramBatBuoc = số batBuoc DA_CHOT / số batBuoc × 100

daNopBatBuoc = số batBuoc có trạng thái KHÁC CHUA_LAM
tuDanhGiaBatBuoc = daNopBatBuoc / số batBuoc × 100   (batBuoc rỗng → 0)

caiTienDaChot = caiTien tồn tại và trạng thái DA_CHOT
caiTienDaNop  = caiTien tồn tại và trạng thái KHÁC CHUA_LAM

phanTram  = phanTramBatBuoc  + (caiTienDaChot ? 10 : 0)   // tối đa 110
tuDanhGia = tuDanhGiaBatBuoc + (caiTienDaNop  ? 10 : 0)   // tối đa 110

trangThaiCaiTien = không có caiTien → KHONG_DANG_KY
                   caiTienDaChot    → DA_CHOT
                   còn lại           → CHUA_CHOT

// SO SÁNH BẰNG SỐ LƯỢNG TASK, KHÔNG so sánh số thập phân %
nếu số batBuoc DA_CHOT < số batBuoc (hoặc batBuoc rỗng):
    ketQua = KHONG_DAT
    taskThieu = batBuoc không DA_CHOT, kèm lý do (mục 6.2)
nếu không, và caiTienDaChot:
    ketQua = VUOT          // 110%
    taskVuot = [task cải tiến]
còn lại:
    ketQua = DAT           // 100%

xepLoai = xepLoai của đăng ký (không đổi)
```

- **Cải tiến không bù được phần bắt buộc còn thiếu.** Ví dụ bắt buộc 90% + cải tiến đã chốt → `phanTram` = 100% nhưng **vẫn Không đạt**. Vì vậy mọi nơi hiện % đều phải có dòng tách **"Bắt buộc 90% · Cải tiến +10%"** (mục 5.3) để không bị hiểu nhầm.
- **Tự đánh giá chỉ để tham khảo**, không ảnh hưởng kết quả.
- Hiển thị % làm tròn số nguyên; lưu số thập phân.

### 4.2 Hiển thị kết quả sau khi chốt kỳ
| Kết quả | Hiển thị |
|---|---|
| Không đạt | **Không đạt – A1** + danh sách task bắt buộc còn thiếu kèm lý do |
| Đạt | **Đạt – A1** |
| Vượt chỉ tiêu | **Vượt chỉ tiêu – A1 (110%)** + *"Cải tiến sáng tạo đã được chốt"* |

- Có đăng ký cải tiến mà chưa được chốt → thêm 1 dòng ghi chú: *"Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – <lý do theo mục 6.2>"*. Cải tiến **không nằm** trong danh sách task thiếu.

---

## 5. Hai biểu đồ tròn

Áp dụng ở **Cuối kỳ** của GV, TBM, TK, HP và **trang chi tiết 1 người** ở màn hình Duyệt.

### 5.1 Bố cục
- 2 biểu đồ **cạnh nhau** (trái – phải) trên máy tính; **xếp dọc** trên điện thoại.
- Viết **1 component dùng chung** (vd `BieuDoKpi`), truyền dữ liệu và tiêu đề.

| Vị trí | Tiêu đề | Vòng trong (task bắt buộc) | Số ở giữa |
|---|---|---|---|
| Trái | **Đánh giá của cấp trên** | **Giữ nguyên** 5 phần như hiện tại: Đã chốt / Đang treo / Chờ duyệt / Bị từ chối / Chưa làm | `phanTram` |
| Phải | **Tự đánh giá** | 2 phần: **Đã nộp** (mọi trạng thái khác Chưa làm, kể cả bị từ chối, bị trả về, đang chờ) / **Chưa nộp** | `tuDanhGia` |

### 5.2 Vòng ngoài cải tiến (+10%)
Biểu đồ tròn không vẽ quá 100%, nên phần +10% là **1 vòng mỏng bên ngoài**:
- Chỉ hiện khi người đó **có đăng ký** cải tiến.
- Là 1 vòng tròn đủ 360°:
  - Biểu đồ **cấp trên**: tô màu nổi khi cải tiến **đã chốt**, xám nhạt khi chưa.
  - Biểu đồ **tự đánh giá**: tô màu nổi khi cải tiến **đã nộp**, xám nhạt khi chưa.
- Chú thích / tooltip: *"Cải tiến sáng tạo +10% – <trạng thái>"*.
- Dùng Recharts với 2 lớp `Pie` (vòng trong, vòng ngoài).

### 5.3 Dòng phụ dưới mỗi biểu đồ
- Luôn hiện dòng tách: **"Bắt buộc X% · Cải tiến +10%"**. Nếu cải tiến chưa đạt: *"Cải tiến: chưa chốt"* (cấp trên) / *"Cải tiến: chưa nộp"* (tự đánh giá). Không đăng ký: bỏ phần cải tiến.
- Biểu đồ cấp trên giữ dòng **"Đang treo: N task"** như cũ.
- Nhãn "+N task vượt" cũ: **bỏ** (thay bằng vòng ngoài).

---

## 6. Các chỗ bị ảnh hưởng

### 6.1 Màn hình Duyệt – tab Tổng quan
- **Bỏ** cột và ô đếm: "Chưa gửi lên" (mục 7), "Xin thêm chờ duyệt" (mục 3).
- Cột "% hoàn thành" đổi tên **"Đánh giá cấp trên %"**.
- **Thêm** cột **"Tự đánh giá %"** và cột **"Cải tiến"** (Không đăng ký / trạng thái task cải tiến).

### 6.2 Lý do task còn thiếu (thay mục 5.4 của v1.4)
| Trạng thái | Lý do |
|---|---|
| `CHUA_LAM` | Chưa nộp minh chứng |
| `TU_CHOI` | Bị từ chối, chưa nộp lại |
| `CHO_DUYET` | Chờ duyệt, chưa được duyệt kịp |
| `DA_DUYET` (chỉ task HP) | Đã duyệt nhưng chưa được chốt |
| `CHO_CHOT` | Chờ chốt, chưa được chốt kịp |
| `TRA_VE` | Bị cấp chốt trả về, chưa xử lý xong |

### 6.3 Xuất báo cáo
**Excel**
| Sheet | Thay đổi |
|---|---|
| Đăng ký nhiệm vụ | Thêm cột **Đăng ký cải tiến (Có/Không)** |
| Kết quả | Thêm cột **% bắt buộc**, **Tự đánh giá %**. Cột "% hoàn thành" đổi tên **Đánh giá cấp trên %**. Cột "Task vượt" đổi thành **Cải tiến sáng tạo** (Không đăng ký / Đã chốt / Chưa chốt) |
| Chi tiết task | Cột Loại hiện **Bắt buộc** hoặc **Cải tiến sáng tạo** |

**PDF:** chỉ đổi cột "Task vượt" thành **"Cải tiến sáng tạo"**. Không thêm cột khác.

### 6.4 Thông báo
- **Bỏ:** thông báo liên quan xin thêm task; nhắc việc "Còn N task đã duyệt chưa gửi lên" của chuỗi GV/TBM/TK.
- **Đổi:** "Người duyệt gửi task lên → người chốt" nay bắn **ngay khi người duyệt bấm Duyệt**.
- **Giữ:** nhắc người chốt "Còn N task chờ chốt"; nhắc hiệu trưởng "Còn N task hiệu phó đã duyệt chưa chốt".
- **Không** thêm thông báo cho mục Theo dõi (mục 8).

---

## 7. Bỏ bước "Gửi lên" + kiểm tra lỗi "Chờ chốt trống"

### 7.1 Kiểm tra lỗi trước (bước đầu tiên, trên code hiện tại, CHƯA SỬA)
Hiện tượng: GV nộp → TBM duyệt → trưởng khoa vào "Chốt task giáo viên" thấy **trống**.

Tái hiện bằng seed và ghi kết luận vào `NOTES.md`:
1. **Không bấm** "Gửi lên trưởng khoa": theo v1.4 task ở `DA_DUYET`, trưởng khoa **đúng là không thấy**. Đây là nguyên nhân khả năng cao, sẽ hết sau khi làm 7.2.
2. **Có bấm** "Gửi lên trưởng khoa" (task `CHO_CHOT`) mà trưởng khoa vẫn không thấy → **lỗi thật**. Kiểm tra:
   - `nguoiChot(GV)` có ra đúng trưởng khoa: bộ môn của GV → `khoaId` → user role TK có cùng `khoaId`.
   - Seed: tài khoản `tk.levankhoa` có `khoaId` chưa; bộ môn có `khoaId` đúng chưa.
   - Truy vấn trang Chốt: lọc đúng người làm KPI (role GV, `boMon.khoaId` = khoa của TK), đúng trạng thái `CHO_CHOT`, đúng **kỳ** (kỳ mặc định của trang có trùng kỳ của task không).
   - Chuỗi TBM → HP và TK → HT có cùng lỗi không.
3. Lỗi thật thì **sửa**, ghi rõ nguyên nhân.

### 7.2 Luồng mới cho task GV, TBM, TK
| Hành động | Trước (v1.4) | Sau (v1.6) |
|---|---|---|
| Người duyệt bấm **Duyệt** | → `DA_DUYET`, phải bấm thêm **Gửi lên** | → **`CHO_CHOT` ngay**, lưu `guiChotLuc`, báo người chốt |
| **Hủy duyệt** | Chỉ khi `DA_DUYET` | Khi **`CHO_CHOT`** (người chốt chưa chốt) → `CHO_DUYET`; bài nộp gần nhất → `CHO_DUYET` |
| Task bị trả về (`TRA_VE`), người duyệt bấm **Duyệt lại** | → `DA_DUYET` rồi gửi lại | → **`CHO_CHOT` ngay** |
| Nút **Gửi lên** | Có | **Bỏ** |

- Hủy duyệt và Chốt dùng **cập nhật có điều kiện trạng thái** (chỉ cập nhật khi task đang đúng `CHO_CHOT`) để 2 người bấm cùng lúc không làm sai dữ liệu. Task đã chốt → hủy duyệt bị chặn.
- Hủy duyệt → task **biến mất** khỏi danh sách Chờ chốt của người chốt.
- Tab Hàng chờ của người duyệt: chỉ còn `CHO_DUYET` và `TRA_VE`.
- Nhãn cho người làm KPI giữ nguyên: *"<Người duyệt> đã duyệt – chờ <người chốt> chốt"*.
- Lịch sử: ghi `DUYET` (không ghi `GUI_CHOT` nữa); hủy ghi `HUY_DUYET`.
- **Task của HP giữ nguyên:** hiệu trưởng bấm **Duyệt** (→ `DA_DUYET`) rồi bấm **Chốt** (2 nút), hủy duyệt khi `DA_DUYET`.
- Dữ liệu cũ (nếu không reset): task GV/TBM/TK đang `DA_DUYET` → chuyển sang `CHO_CHOT`.

### 7.3 Test tự động bắt buộc
Cho **cả 4 chuỗi**, sau khi người duyệt bấm Duyệt, người chốt **thấy task ngay** trong Chờ chốt:
- GV → TBM duyệt → **TK** thấy
- TBM → TK duyệt → **HP** thấy
- TK → HP duyệt → **HT** thấy
- HP → HT duyệt → HT thấy nút **Chốt**

---

## 8. Theo dõi kết quả đã chốt (Hiệu phó, Hiệu trưởng)

### 8.1 Menu
- **Hiệu phó:** thêm mục **"Theo dõi kết quả đã chốt"** ngay sau "Chốt task trưởng bộ môn".
- **Hiệu trưởng:** thêm mục **"Theo dõi kết quả đã chốt"** ngay sau "Duyệt & chốt hiệu phó".

### 8.2 Phạm vi
Chỉ hiện task ở trạng thái **`DA_CHOT`**. Task ở mọi trạng thái khác **không hiện**.

| Người xem | Thấy task đã chốt của |
|---|---|
| Hiệu phó | **GV** (trưởng khoa đã chốt) và **TBM** (chính mình đã chốt) thuộc **các khoa mình phụ trách** |
| Hiệu trưởng | **GV, TBM, TK, HP** toàn trường |

(Gồm cả task do chính mình chốt để xem mọi thứ đã chốt ở một chỗ.)

### 8.3 Giao diện
- **Ô đếm** trên cùng: số task đã chốt theo từng chức vụ.
- **Bộ lọc:** kỳ (mặc định kỳ hiện tại), khoa, bộ môn, chức vụ, người, loại (Nhiệm vụ / Cải tiến sáng tạo).
- **Bảng:** Họ tên · Chức vụ · Đơn vị · Nhiệm vụ · Task · Người duyệt · Người chốt · Ngày chốt · **Xem**. Mới chốt nhất lên trước, **50 dòng/trang**.
- **Xem** → chi tiết task **chỉ đọc**: minh chứng (PDF/ảnh xem ngay, Word/Excel tải về), ghi chú, link, lịch sử (duyệt, chốt, nhận xét).
- Người duyệt lấy từ bài nộp đã duyệt gần nhất; người chốt và ngày chốt lấy từ task.

### 8.4 Quyền
- **Chỉ xem**: không có nút sửa, không hủy chốt. API của trang chỉ đọc; mọi thao tác ghi bị chặn.
- Route chỉ HP và HT vào được; vai trò khác gõ thẳng đường dẫn → bị chặn.
- **Quyền xem file** (`/api/files/[id]`) mở thêm: minh chứng của task `DA_CHOT` xem được bởi HP (nếu người làm KPI thuộc khoa HP phụ trách, chức vụ GV hoặc TBM) và HT (mọi người).
- Không gửi thông báo.

---

## 9. Dữ liệu

### 9.1 Thay đổi Prisma schema
```prisma
enum LoaiTask {
  BAT_BUOC
  MO_RONG   // không còn dùng, giữ để không mất dữ liệu
  CAI_TIEN  // MỚI
}

enum TrangThaiCaiTien {   // MỚI
  KHONG_DANG_KY
  CHUA_CHOT
  DA_CHOT
}

model NhiemVu {
  // ... giữ nguyên các trường cũ
  laCaiTien Boolean @default(false)   // MỚI
}

model KetQuaKy {
  // ... giữ nguyên các trường cũ
  phanTramBatBuoc  Float            @default(0)              // MỚI
  tuDanhGia        Float            @default(0)              // MỚI
  trangThaiCaiTien TrangThaiCaiTien @default(KHONG_DANG_KY)  // MỚI
  // phanTram: nay là tổng, đã cộng +10 cải tiến (tối đa 110)
  // taskVuot: nay chỉ chứa task cải tiến (nếu đã chốt)
}
```
Không đổi `TrangThaiTask`, `HanhDongTask` (giá trị `GUI_CHOT` giữ lại, không dùng nữa).

### 9.2 Seed
- Reset database và seed lại.
- **Không** tạo task Mở rộng.
- Gọi `damBaoNhiemVuCaiTien` cho kỳ demo.
- Giữ nguyên tài khoản, khoa, bộ môn, số nhiệm vụ, điểm, bảng xếp loại của v1.4.

---

## 10. Nếu đã có menu Admin "Phân hệ mở rộng" (v1.5)
Trong file config phân hệ, sửa mục **2.3 Quy đổi sáng kiến / cải tiến / đề tài**:
- `trangThai: "MOT_PHAN"`
- `ghiChu: "Hiện đã có Đăng ký cải tiến sáng tạo (+10%) theo mẫu Phụ lục IV. Quy đổi sang điểm sẽ bổ sung ở giai đoạn sau."`

Chưa có v1.5 thì bỏ qua mục này.

---

## 11. Thứ tự làm

| Bước | Nội dung | Xong khi |
|---|---|---|
| 1 | Tạo nhánh. **Tái hiện lỗi mục 7.1 trên code hiện tại**, ghi nguyên nhân vào `NOTES.md` | Có kết luận rõ: do chưa bấm Gửi lên, hay lỗi thật ở đâu |
| 2 | Schema + migration + reset seed + `damBaoNhiemVuCaiTien` (gọi ở tạo kỳ, sao chép kỳ, seed) | Mỗi kỳ, mỗi vị trí có đúng 1 nhiệm vụ cải tiến |
| 3 | Bỏ bước Gửi lên (mục 7.2) + sửa lỗi thật nếu có + test mục 7.3 | 4 chuỗi đều hiện đúng ở Chờ chốt ngay sau khi duyệt |
| 4 | Bỏ xin thêm task mở rộng (mục 3) | Không còn giao diện, API trả lỗi |
| 5 | Đầu kỳ mới + Phụ lục IV + admin Phân việc (mục 2) | Nhiệm vụ khóa tick, cải tiến tick được, server tự điền nhiệm vụ |
| 6 | Cuối kỳ: task cải tiến + `tinhKetQua` mới (mục 2.6, 4) | Ra đúng kết quả các ví dụ ở mục 12 |
| 7 | Hai biểu đồ + vòng ngoài + dòng tách (mục 5) | Hiện đúng ở Cuối kỳ và chi tiết người ở màn hình Duyệt |
| 8 | Bảng Tổng quan, Excel, PDF, thông báo (mục 6) | Đúng cột, đúng tên |
| 9 | Theo dõi kết quả đã chốt + quyền file (mục 8) | Đúng phạm vi HP, HT; chỉ đọc |
| 10 | Cập nhật config v1.5 nếu có (mục 10) | – |
| 11 | Nghiệm thu mục 12, sửa test cũ bị ảnh hưởng | Toàn bộ test pass |

---

## 12. Nghiệm thu

### 12.1 Kịch bản chính
Mọi GV đăng ký đủ 10 nhiệm vụ (100 điểm) → xếp loại **A1**.

| Người | Cải tiến | Thực hiện | Cấp trên | Tự đánh giá | Kết quả |
|---|---|---|---|---|---|
| `gv.nguyenvanan` | Không | ~50% task bắt buộc được chốt, còn lại chưa nộp | ~50% | ~50% | **Không đạt – A1** |
| `gv.tranthibinh` | Không | 100% bắt buộc được chốt | 100% | 100% | **Đạt – A1** |
| `gv.levancuong` | Có | 100% bắt buộc + cải tiến được chốt | **110%** | **110%** | **Vượt chỉ tiêu – A1 (110%)** |
| `tbm.phamthibich` | Có | 100% bắt buộc (TK duyệt → HP chốt) + cải tiến được chốt | 110% | 110% | **Vượt chỉ tiêu** |
| `tk.levankhoa` | Có | 100% bắt buộc (HP duyệt → HT chốt), cải tiến đã nộp chưa chốt | 100% | 110% | **Đạt** + ghi chú cải tiến chưa chốt |
| `hp.tranthiphuong` | Không | 100% bắt buộc (HT duyệt → HT chốt) | 100% | 100% | **Đạt** |

### 12.2 Case phụ – tính toán và biểu đồ
- [ ] 10 task bắt buộc: 3 đã chốt, 2 chờ duyệt, 1 bị từ chối, 4 chưa làm → **Cấp trên 30%**, **Tự đánh giá 60%**
- [ ] Bắt buộc 90% + cải tiến đã chốt → hiện **100%**, dòng tách "Bắt buộc 90% · Cải tiến +10%", kết quả **Không đạt**
- [ ] Không đăng ký cải tiến → không có vòng ngoài, không có khối Cải tiến ở Cuối kỳ
- [ ] Cải tiến đã nộp chưa chốt → vòng ngoài biểu đồ Tự đánh giá tô màu, biểu đồ Cấp trên xám
- [ ] Hai biểu đồ đúng tiêu đề, cạnh nhau trên máy tính, xếp dọc trên điện thoại
- [ ] Người duyệt mở chi tiết 1 người thấy đủ 2 biểu đồ

### 12.3 Case phụ – đầu kỳ
- [ ] Mọi nhiệm vụ hiện tick sẵn, khóa; gửi request sửa tay bỏ bớt nhiệm vụ → server vẫn ghi đủ nhiệm vụ
- [ ] Tick/bỏ tick cải tiến khi Nháp được; khi Chờ duyệt/Đã duyệt bị khóa
- [ ] Chưa có file Phụ lục IV → hiện "đang được cập nhật", vẫn đăng ký được; chép file vào `public/templates/phu-luc-iv.docx` → tải về được
- [ ] Người duyệt thấy dòng "Đăng ký cải tiến sáng tạo: Có/Không"
- [ ] Admin không sửa/xóa được nhiệm vụ cải tiến (cả ở API); sao chép kỳ → mỗi vị trí vẫn đúng 1 nhiệm vụ cải tiến
- [ ] Không còn giao diện xin thêm task; gọi API xin thêm → bị từ chối

### 12.4 Case phụ – duyệt, chốt, lỗi Chờ chốt
- [ ] 4 chuỗi ở mục 7.3 đều pass
- [ ] Không còn nút "Gửi lên", không còn cột/ô "Chưa gửi lên"
- [ ] Hủy duyệt khi người chốt chưa chốt → task về Chờ duyệt, biến mất khỏi Chờ chốt; đã chốt → bị chặn
- [ ] Người chốt trả về → người duyệt Duyệt lại → task lên thẳng Chờ chốt
- [ ] Task HP: hiệu trưởng vẫn 2 nút Duyệt rồi Chốt

### 12.5 Case phụ – Theo dõi kết quả đã chốt
- [ ] HP thấy task đã chốt của GV và TBM thuộc khoa mình phụ trách; không thấy TK, HP, khoa khác, task chưa chốt
- [ ] HT thấy task đã chốt của cả 4 chức vụ toàn trường
- [ ] Lọc theo kỳ, khoa, bộ môn, chức vụ, người, loại chạy đúng; phân trang 50 dòng
- [ ] Mở được minh chứng; không có nút thay đổi; gọi API ghi → bị chặn
- [ ] GV, TBM, TK gõ thẳng đường dẫn → bị chặn

### 12.6 Case phụ – báo cáo và hồi quy
- [ ] Excel: có các cột mới ở mục 6.3, % đúng công thức mục 4
- [ ] PDF: cột "Cải tiến sáng tạo" thay "Task vượt", tiếng Việt không lỗi font
- [ ] Các chức năng không nhắc trong file này (tài khoản, ban hành quy định, deadline, chốt kỳ, menu Admin) chạy như cũ
- [ ] Toàn bộ test pass (test cũ đã sửa theo hành vi mới được liệt kê trong `NOTES.md`)

---

## 13. Không đổi
- Chuỗi người duyệt – người chốt của 4 vị trí.
- Luật hạn đăng ký, deadline, chốt kỳ, "hết hạn là khóa hết".
- Cách tính xếp loại A1–F.
- Tài khoản, tên đăng nhập, mật khẩu, cơ cấu tổ chức.
- Ban hành quy định, Nhận giấy tờ, Nhận chỉ thị.
- Phạm vi Xuất báo cáo của từng cấp.
- Menu Admin (ngoài mục 10).