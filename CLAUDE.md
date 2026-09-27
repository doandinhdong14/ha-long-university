# CLAUDE.md – CRM chấm KPI giáo viên (ĐH Hạ Long) – v1.4

Đặc tả: `docs/spec.md` (v1.4). Trước mỗi bước, đọc lại các mục đặc tả liên quan.
Build mới theo v1.4: **bỏ qua mục "Thay đổi so với v1.3"** và ý 7 của mục 0 trong đặc tả.
Chỗ đặc tả chưa rõ: chọn cách đơn giản nhất, ghi vào `NOTES.md` (vấn đề – quyết định – lý do). Khi file này và đặc tả lệch nhau thì theo đặc tả, trừ những điểm đã ghi trong `NOTES.md`.

## Phạm vi và cách làm
- Demo 1 luồng: 1 khoa, 1 bộ môn, 3 GV, **đủ 6 vai trò**: Admin, GV, TBM, TK, HP, HT. Mỗi tài khoản có đúng 1 vai trò.
- Làm lần lượt 12 bước ở mục 13. Chỉ sang bước sau khi bước hiện tại chạy thử đạt cột "Xong khi".
- Mọi truy vấn đều lọc theo đơn vị (`boMonId`, `khoaId`, `Khoa.hieuPhoId`), để sau này mở rộng nhiều khoa/bộ môn không phải sửa.

## Stack (không tự đổi)
- Next.js 16 (App Router) + TypeScript strict
- PostgreSQL + Prisma 7. Schema theo mục 12.1: được chỉnh chi tiết nhưng phải giữ ý nghĩa; chỗ chỉnh ghi vào `NOTES.md`.
- Đăng nhập: session cookie tự làm (httpOnly, ký bằng `AUTH_SECRET`); mật khẩu hash bcrypt
- Tailwind CSS + shadcn/ui; biểu đồ tròn dùng Recharts
- Xuất Excel: exceljs. Xuất PDF: pdfmake, **bắt buộc nhúng font có tiếng Việt** (Roboto, file TTF trong `assets/fonts/`)
- File lưu trên ổ đĩa server tại `UPLOAD_DIR`, chỉ đọc/ghi qua lớp `src/lib/storage`
- Deploy trên Railway: app + PostgreSQL + Volume + Cron
- Biến môi trường: `DATABASE_URL`, `AUTH_SECRET`, `UPLOAD_DIR`, `CRON_SECRET`, `TZ=Asia/Ho_Chi_Minh`

## Quy tắc bắt buộc

### Mọi kiểm tra quyền và thời gian đều làm ở server
- Kiểm tra quyền (vai trò, đơn vị, người duyệt/người chốt, chủ sở hữu) và kiểm tra thời gian/trạng thái (hạn đăng ký, deadline, kỳ đã công bố, kỳ đã chốt) **phải làm ở server**: trong server action, route handler và page server. Ẩn hoặc khóa nút trên giao diện chỉ là lớp phụ.
- Page gọi `yeuCauVaiTro(...)`, server action / route handler gọi `kiemTraVaiTro(...)` (`src/lib/auth/dal.ts`) trước khi làm việc khác. Không tin id, vai trò hay kỳ do client gửi lên: luôn tra lại DB rồi kiểm tra quyền.
- Người duyệt / người chốt chỉ lấy qua `nguoiDuyet(u)` / `nguoiChot(u)` (mục 3.2), tính theo cơ cấu **hiện tại**, không lưu cứng. Không tìm thấy → báo "Chưa có <chức danh> phụ trách, vui lòng liên hệ admin" và chặn ở server.
- Luật thời gian/trạng thái (bảng 10.1) chỉ viết ở `src/lib/rules.ts`. Máy trạng thái task (bảng 5.3) chỉ viết ở một file. Không so sánh ngày, không kiểm tra chuyển trạng thái rải rác trong component.
- Hết deadline hoặc kỳ đã chốt: chặn mọi thao tác ghi trong kỳ đó, với mọi vai trò. Người làm KPI chỉ thấy kỳ đã công bố.
- Chuyển trạng thái bằng cập nhật có điều kiện (`updateMany` với `where: { trangThai: ... }`) trong transaction, để hai người thao tác cùng lúc không ghi đè nhau. Mọi hành động trên task ghi vào `LichSuTask`.
- Không ai sửa được bài đã nộp của người khác. Người làm KPI chỉ sửa bài của mình khi task còn `CHO_DUYET`. Admin chỉ được xem.
- Người chốt chỉ thấy task `CHO_CHOT`, `DA_CHOT`, `TRA_VE` của những người mình chốt; không thấy danh sách đăng ký, không thấy task chưa gửi lên. Nhận xét của người chốt chỉ người duyệt thấy; người làm KPI chỉ thấy trạng thái.
- File chỉ tải qua `GET /api/files/[id]`, kiểm tra quyền theo mục 12.2. Không phục vụ `UPLOAD_DIR` dạng file tĩnh.
- Kiểm tra file ở server: chỉ nhận PDF, JPG, PNG, DOC/DOCX, XLS/XLSX; tối đa 20MB/file.
- Ma trận quyền đầy đủ: mục 12.3.

### Một bộ code dùng chung cho mọi cấp
- **Luồng KPI** (Đầu kỳ, Trong kỳ, Cuối kỳ của GV, TBM, TK, HP), **màn hình Duyệt** (TBM→GV, TK→TBM, HP→TK, HT→HP), **màn hình Chốt** (TK→GV, HP→TBM, HT→TK) và **Xuất báo cáo** (TBM, TK, HP, HT): mỗi thứ là **một bộ route + component + service**, chỉ khác tham số (ai duyệt, ai chốt, phạm vi, nhãn chức danh).
- Khác biệt giữa các cấp khai báo trong **một bảng cấu hình** chuỗi duyệt – chốt. Không copy file/route riêng cho từng vai trò, không rải `if (role === ...)` trong component.
- Task của HP là trường hợp riêng duy nhất (HT vừa duyệt vừa chốt bằng 2 nút, không dùng `CHO_CHOT`/`TRA_VE`): xử lý bằng một cờ trong bảng cấu hình, vẫn dùng chung code.

### Chỉ task `DA_CHOT` mới được tính
- "Hoàn thành", % hoàn thành, task vượt: **chỉ đếm `DA_CHOT`**. `DA_DUYET`, `CHO_CHOT` là "đang treo": chỉ hiển thị, không tính.
- Kết quả tính bằng **một hàm** `tinhKetQua(kyId, userId)` (mục 10.3), dùng chung cho biểu đồ tròn, chốt kỳ và báo cáo tạm tính. Không tự đếm lại ở chỗ khác.
- Xếp loại theo bảng xếp loại **đúng vị trí** (GV/TBM/TK/HP) của kỳ đó.

### Múi giờ Asia/Ho_Chi_Minh
- Múi giờ nghiệp vụ là Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè).
- Mọi phép tính "hôm nay", "cuối ngày", hạn đăng ký, deadline đều đi qua `src/lib/time.ts`. Không dùng `setHours` và không dựa vào TZ của máy chủ.
- `hanDangKy` = 23:59:59 ngày bắt đầu kỳ; `deadline` = 23:59:59 ngày kết thúc kỳ (giờ Việt Nam).
- Railway Cron chạy theo giờ UTC: 00:05 giờ Việt Nam tương ứng với `5 17 * * *`.

### Giao diện tiếng Việt
- Toàn bộ chữ trên giao diện, thông báo lỗi, thông báo trong web và nội dung file Excel/PDF viết bằng tiếng Việt có dấu.
- Tên model và tên trường giữ như đặc tả (`kyId`, `trangThai`…). URL viết tiếng Việt không dấu, dạng kebab-case (vd `/dau-ky`).
- Menu theo vai trò khai báo trong `src/lib/menu.ts`, theo bảng 2.1, riêng mục "Cuối kỳ" tách thành Trong kỳ + Cuối kỳ (`NOTES.md`): GV 4, TBM 6, TK 7, HP 7, HT 4, Admin 4 mục.

## Ngoài phạm vi (mục 14): KHÔNG làm
- 5 mục + HGT của Admin
- Giao diện quản lý khoa/bộ môn (chỉ seed sẵn)
- Kiêm nhiệm (1 người nhiều vai trò)
- Đổi mật khẩu, chính sách bảo mật mật khẩu (chỉ có nút Admin đặt lại về `123456`)
- Thông báo qua email/Zalo (chỉ làm thông báo trong web)
- Xuất kèm file minh chứng
- Dashboard thống kê toàn trường (chỉ có xuất báo cáo)
- Quy ước đặt tên tài liệu

Nếu thấy luồng chỉ chạy được khi làm một mục trong danh sách trên thì dừng lại hỏi, không tự làm.

## Lệnh
- `npm run db:start` / `npm run db:stop`: Postgres nhúng cho dev (cổng 5433, dữ liệu ở `.devdb/`), tạo cả DB `crm_kpi_v14` và `crm_kpi_v14_test`
- `npm run dev`: chạy dev ở http://localhost:3000
- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run db:migrate`: tạo migration khi đổi schema. `npm run db:seed`: seed (chỉ khi DB trống)
- `npm run db:reset`: xóa sạch DB dev rồi seed lại. Prisma chặn AI tự chạy lệnh này; chỉ người dùng chạy.
- `npm test`: unit test (Vitest, `src/**/*.test.ts`)
- `npm run test:int`: test tích hợp (`tests/*.int.test.ts`), gọi thẳng server action/service trên DB `crm_kpi_v14_test`
- `npm run e2e`: E2E (Playwright + Chrome cài sẵn) trên DB `crm_kpi_v14_test`, server cổng 3100. Cần `npm run build` trước.
- `npm run release`: migrate deploy + seed (bước pre-deploy trên Railway). Cấu hình deploy: `railway.json` (app), `railway.cron.json` (cron); hướng dẫn trong `NOTES.md`, phần bước Deploy.

## Next.js 16
@AGENTS.md
