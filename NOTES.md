# NOTES – CRM KPI giáo viên (v1.4)

Ghi lại các quyết định cho chỗ đặc tả chưa rõ, những gì đã làm ở từng bước, và việc còn tồn.
Đặc tả: `docs/spec.md` (v1.4). Ghi chú của bản v1.1: `docs/notes-v1.1.md`.

## Cách làm bản v1.4 (đã duyệt 27/09/2026)
- Làm trên nhánh `v1.4`; bản v1.1 giữ nguyên trên `master`.
- Giữ hạ tầng v1.1: Next.js 16, Prisma 7, đăng nhập cookie tự làm, `src/lib/time.ts`, lớp `storage`, Postgres nhúng, khung test Vitest/Playwright, cấu hình Railway, trang `/gioi-thieu`. Toàn bộ phần nghiệp vụ viết lại theo v1.4.
- Bỏ qua mục "Thay đổi so với v1.3" của đặc tả (build mới).

## Quyết định đã duyệt

### Cần quyết (A)
| # | Vấn đề | Quyết định |
|---|---|---|
| A1 | 6.2 giấu danh sách đăng ký, task chưa gửi lên với người chốt; 6.3 lại cho báo cáo của TK/HP có các dữ liệu đó | Báo cáo làm đúng 6.3 (bảng tổng hợp, không kèm file). Giới hạn 6.2 chỉ áp cho màn hình Chốt và quyền mở file |
| A2 | Đổi chức vụ khi đang có KPI ở kỳ chưa chốt (nhiệm vụ theo vị trí cũ không còn khớp) | Kỳ đã chốt giữ nguyên (`KetQuaKy.doiTuong` lưu vị trí lúc chốt). Kỳ chưa chốt: hộp xác nhận ghi rõ dữ liệu KPI kỳ chưa chốt sẽ bị xóa; đồng ý thì xóa |
| A3 | "Chặn nút Gửi" khi thiếu người duyệt/chốt | Thiếu người duyệt **hoặc** người chốt → chặn Gửi đăng ký. Thiếu người chốt → chặn nút Gửi lên của người duyệt. Nộp minh chứng, xin thêm vẫn cho (có cảnh báo). Người mới được gán thấy ngay việc đang chờ |
| A4 | Thư viện PDF | pdfmake + font Noto Sans nhúng |

### Tự xử lý (B)
| # | Vấn đề | Quyết định |
|---|---|---|
| B5 | Bảng 10.1 dòng "gửi đăng ký lần đầu" không nhắc kỳ | Mọi thao tác ghi đều cần kỳ đã công bố và chưa chốt |
| B6 | Sửa sau khi bị từ chối mà về Nháp thì dính hạn đăng ký | Giữ trạng thái Bị từ chối trong lúc sửa (tự lưu); gửi → Chờ duyệt |
| B7 | "Kỳ hiện tại" làm kỳ sau chỉ đăng ký được đúng ngày bắt đầu | Dropdown chọn kỳ đã công bố ở Đầu kỳ, Cuối kỳ, Duyệt, Chốt, Báo cáo; mặc định kỳ hiện tại, không có thì kỳ công bố gần nhất |
| B8 | Người duyệt trả làm lại task bị trả về | Bài nộp gần nhất → Bị từ chối + nhận xét mới (nhận xét cũ vẫn trong `LichSuTask`). `nhanXetChot` = nhận xét trả về gần nhất; Chốt không có ô nhận xét |
| B9 | 12.3 cho HT "trả về" task HP, bảng 5.3 không có | HT chỉ có Chốt / Hủy duyệt với task HP đã duyệt. Nhãn: "Hiệu trưởng đã duyệt – chờ chốt"; lý do thiếu: "Đã duyệt nhưng chưa được chốt" |
| B10 | "Cũ nhất lên trước" theo mốc nào | Hàng chờ theo `KpiTask.capNhatLuc`; màn hình Chốt theo `guiChotLuc` |
| B11 | "x/y đã xem" có thể x > y | x chỉ đếm trong y người đang ở vị trí nhận. HT thấy mọi quy định đã ban hành |
| B12 | Mốc nhắc việc | Gửi khi còn ≤ N ngày, mỗi mốc 1 lần/người/kỳ (`ThongBao.maSuKien`). Deadline: người còn task bắt buộc chưa chốt. Chỉ gửi khi N > 0. Không báo cho chính người thao tác. "Kỳ đã chốt" → mọi GV, TBM, TK, HP, HT |
| B13 | Điều kiện công bố kỳ | ≥1 nhiệm vụ và đủ 4 bảng xếp loại (mỗi bảng ≥1 bậc). Nhiệm vụ không có task bắt buộc → 100%, admin thấy cảnh báo. Đã có người đăng ký/làm → khóa xóa, khóa sửa điểm, khóa đổi loại task |
| B14 | Minh chứng bắt buộc file? | ≥1 file mỗi lần nộp, tối đa 10 file; link phải http/https |
| B15 | Tên file/tiêu đề báo cáo | `BaoCao_<DonVi>_Ky<soKy>-<namHoc>_<YYYYMMDD>[_TamTinh]`; HP nhiều khoa → `CacKhoaPhuTrach`; tiêu đề "KỲ <soKy> NĂM HỌC <namHoc>" |
| B16 | Đơn vị khi đổi chức vụ | Tự gán: GV/TBM → bộ môn duy nhất, TK → khoa duy nhất, vai trò khác bỏ đơn vị. HP rời chức → khoa "chưa có hiệu phó" |
| B17 | Hạn đăng ký kỳ seed hết 23:59 ngày seed | Giữ đúng đặc tả; trước demo admin sửa ngày bắt đầu |
| B18 | Schema | Chỉnh chi tiết giữ ý nghĩa (xem đầu `prisma/schema.prisma`) |
| B19 | Cron chốt kỳ nào | Chỉ kỳ đã công bố; kỳ đã chốt khóa cả sửa ngày |

---

## Bước 1 – Khởi tạo, schema, seed, đăng nhập, menu ✅

**Đã làm**
- Schema viết lại theo 12.1 (`prisma/schema.prisma`), một migration khởi tạo mới `khoi_tao_v14` (bỏ migration v1.1). Chỉnh so với đặc tả:
  - Prisma 7 (`prisma-client`, URL ở `prisma.config.ts`); ngày kỳ `@db.Date`
  - thêm `YeuCauThemTask.kyId`, `ThongBao.maSuKien`, `KpiTask.capNhatLuc`, `KetQuaKy.doiTuong`
  - `onDelete: Restrict` ở `DangKyNhiemVu.nhiemVu`, `KpiTask.task`, `YeuCauThemTask.task`
  - unique `Ky(namHoc, soKy)`, `BacXepLoai(kyId, doiTuong, ten)`; thêm index
- Seed theo 12.4: 1 khoa (hiệu phó phụ trách `hp.tranthiphuong`), 1 bộ môn, 8 tài khoản, kỳ đã công bố (bắt đầu = ngày seed, kết thúc +30 ngày), 26 nhiệm vụ (GV 10, TBM 6, TK 5, HP 5; mỗi nhiệm vụ 2–3 task bắt buộc + 1 mở rộng), 4 bảng xếp loại A1…F.
- `src/lib/roles.ts` (thêm `DOI_TUONGS`, `chucDanh`, `laDoiTuong`), `src/lib/menu.ts` đúng bảng 2.1, `NguoiDung` có thêm `khoaId`.
- Màn hình dùng chung có một đường dẫn: `/dau-ky`, `/cuoi-ky`, `/duyet`, `/chot`, `/bao-cao`, `/giay-to`, `/quy-dinh`. Tạm thời là trang giữ chỗ, mỗi trang đã chặn vai trò ở server.
- Xóa code nghiệp vụ v1.1 (`/gv/*`, `/tbm/*`, `/ht/*`, service, test cũ). Code cũ xem lại trên `master`.
- Test: E2E `e2e/buoc-01-dang-nhap.spec.ts` 16/16 (8 tài khoản đúng menu + trang chủ; chặn route sai vai trò cho GV, TBM, HP, HT, Admin; sai mật khẩu; đăng xuất). Unit test cũ (`time`, `username`, `rules`, `xep-loai`, `ky-hien-tai`) 20/20.

**Tự chọn**
- **DB mới cho v1.4:** `crm_kpi_v14` (dev) và `crm_kpi_v14_test` (test). DB `crm_kpi`, `crm_kpi_test` của v1.1 giữ nguyên, không xóa (lệnh đổi tên/xóa DB bị chặn). `scripts/dev-db.mjs`, `.env`, `.env.example`, cấu hình Vitest/Playwright đã trỏ sang DB mới. Không cần cho v1.1 nữa thì bạn tự xóa 2 DB cũ.
- Trang chủ mỗi vai trò = mục menu đầu tiên (HT → Chốt task trưởng khoa).

**Còn tồn**
- Không có.

## Bước 2 – nguoiDuyet, nguoiChot, lọc phạm vi theo đơn vị ✅

**Đã làm**
- `src/lib/kpi/chuoi.ts`: **bảng cấu hình chuỗi duyệt – chốt** duy nhất (vị trí → vai trò người duyệt, người chốt, cờ `gopDuyetChot` cho HP), `viTriDuocDuyet`, `viTriDuocChot`, `PHAM_VI_BAO_CAO`.
- `src/lib/co-cau.ts` (hàm thuần trên ảnh chụp cơ cấu):
  - `nguoiDuyet(u)`, `nguoiChot(u)`: cùng một hàm tra "người giữ vai trò R phụ trách u" (TBM cùng bộ môn, TK cùng khoa, HP của khoa, HT)
  - `lyDoThieuNguoi`, `lyDoKhongGuiDangKy` (A3: thiếu người duyệt hoặc người chốt → chặn gửi)
  - `nguoiToiDuyet(m)`, `nguoiToiChot(m)`: lọc ngược bằng chính `nguoiDuyet`/`nguoiChot` nên luôn khớp nhau
  - `phamViBaoCao(m)` (mục 6.3), `tenDonVi(u)`, `canhBaoThieuNguoi()` (cho trang Xem cấu hình)
- `src/lib/services/co-cau.ts`: `taiCoCau(tx)` tải cơ cấu hiện tại từ DB; `layCoCau()` cache theo request cho page.
- Test:
  - unit `src/lib/co-cau.test.ts` 16 test: đủ 4 vị trí; HT/Admin không có người duyệt; thiếu TBM / TK / HP / HT; `hieuPhoId` trỏ tới người không còn là HP; cảnh báo admin; dữ liệu giả 2 khoa để kiểm tra lọc đơn vị (người duyệt/chốt, người mình duyệt/chốt, phạm vi báo cáo, tên đơn vị)
  - tích hợp `tests/co-cau.int.test.ts` trên seed

**Tự chọn**
- Người chốt trên màn hình Chốt không gồm HP: HT chốt task HP ngay trên màn hình Duyệt (mục 6.1, 7.5).
- Tên đơn vị của HP là danh sách khoa phụ trách; chưa phụ trách khoa nào → "Chưa phụ trách khoa nào".

**Còn tồn**
- Không có.

## Bước 3 – Admin: Quản lý đăng nhập ✅

**Đã làm**
- `/admin/tai-khoan`: bảng Tên đăng nhập | Chức vụ | Tên người | Mật khẩu | Sửa; dưới chức vụ ghi đơn vị (bộ môn / khoa / "Phụ trách: …" với hiệu phó); tìm theo tên, lọc theo chức vụ.
- Dialog Thêm/Sửa: xem trước tên đăng nhập (sinh ở server); chức vụ Hiệu phó có ô chọn nhiều **Khoa phụ trách** (chỉ khoa chưa có hiệu phó + khoa người đó đang phụ trách, khoa của hiệu phó khác ghi rõ tên); nút Đặt lại mật khẩu; đổi tên đăng nhập thì báo tên mới.
- `src/lib/services/tai-khoan.ts`:
  - `donViTheoVaiTro` (B16): GV/TBM → bộ môn duy nhất, TK → khoa duy nhất, còn lại bỏ đơn vị
  - `kiemTraGioiHan` (2.4): 1 TBM/bộ môn, 1 TK/khoa, 1 HT; lỗi ghi rõ người đang giữ chức
  - `ganKhoaPhuTrach`: khoa đã có hiệu phó khác → chặn; cập nhật có điều kiện
  - `soKyCoKpiChuaChot`, `xoaKpiKyChuaChot` (A2)
- Server chặn: chỉ ADMIN; không tự xóa, không tự hạ chức; đổi chức vụ khi có KPI ở kỳ chưa chốt phải có `xacNhanXoaKpi` (dialog hiện cảnh báo + ô tick bắt buộc); hiệu phó rời chức → các khoa thành "chưa có hiệu phó"; xóa tài khoản xóa luôn file minh chứng trên ổ đĩa. Thêm/sửa chạy tuần tự bằng `pg_advisory_xact_lock` để hai admin không vượt giới hạn cùng lúc.
- Test:
  - tích hợp `tests/tai-khoan.int.test.ts` 10: quyền, tự hạ chức/tự xóa, gán đơn vị, 4 case phụ "cơ cấu và tài khoản" mục 15 (đổi `gv.tranthibinh` lên TBM bị chặn → hạ `tbm.phamthibich` → lên được `tbm.tranthibinh`; xóa HP → TBM/TK bị chặn gửi + admin có cảnh báo; tạo HP mới gán khoa → chạy lại; GV trùng tên → số 2), giới hạn TK/HT/HP, A2
  - E2E `e2e/buoc-03-tai-khoan.spec.ts` 6/6

**Tự chọn**
- Hiệu phó được phép không phụ trách khoa nào (nhiều hiệu phó được phép).
- Sửa mà không đổi họ tên hay chức vụ thì giữ nguyên tên đăng nhập.
- `pg_advisory_xact_lock` trả kiểu `void` mà adapter pg của Prisma không đọc được → gọi dạng `SELECT 1 FROM pg_advisory_xact_lock(...)`.

**Còn tồn**
- Không có.

## Bước 4 – Admin: Phân việc đầu kỳ (4 vị trí) ✅

**Đã làm**
- `/admin/phan-viec`: danh sách kỳ, cột "Số nhiệm vụ (GV · TBM · TK · HP)". Dialog Tạo kỳ: tên, năm học, kỳ số 1–4, ngày bắt đầu/kết thúc, **Sao chép từ kỳ trước** (chép nhiệm vụ, task, bảng xếp loại cả 4 vị trí).
- `/admin/phan-viec/[kyId]?viTri=gv|tbm|tk|hp`:
  - khối thông tin kỳ: sửa ngày, hạn đăng ký/deadline, nút **Công bố** (có xác nhận); chưa công bố được thì ghi rõ lý do
  - 4 tab vị trí **Giáo viên | Trưởng bộ môn | Trưởng khoa | Hiệu phó** (kèm số nhiệm vụ, biểu tượng cảnh báo nếu vị trí chưa có bảng xếp loại)
  - trong mỗi vị trí: tab Nhiệm vụ & task (thêm/sửa/xóa, cảnh báo nhiệm vụ chưa có task bắt buộc) và tab Bảng xếp loại (sửa cả bảng, lưu một lần)
- `src/lib/services/phan-viec.ts`: `layKyChuaChot`, `saoChepKy`, `lyDoChuaCongBoDuoc` (B13), các hàm kiểm tra khóa.
- Server chặn: chỉ ADMIN; vị trí phải là GV/TBM/TK/HP; kỳ đã chốt khóa mọi thay đổi (kể cả sửa ngày); trùng (năm học, kỳ số); ngày kết thúc ≥ ngày bắt đầu; công bố cần ≥1 nhiệm vụ và đủ 4 bảng xếp loại; kỳ đã công bố không xóa hết bậc của một vị trí; tên/ngưỡng bậc không trùng trong một vị trí; nhiệm vụ đã có người đăng ký (mọi trạng thái) → không xóa, không sửa điểm; task đã có người làm/xin → không xóa, không đổi loại; nhiệm vụ đã có đăng ký Đã duyệt → không thêm task bắt buộc.
- Test: tích hợp `tests/phan-viec.int.test.ts` 8; E2E `e2e/buoc-04-phan-viec.spec.ts` 4/4.

**Tự chọn**
- Chỉ sửa được ngày của kỳ; tên, năm học, kỳ số cố định sau khi tạo.
- Công bố là một chiều. Nút "Chốt kỳ ngay" làm ở bước 8.

**Sự cố trong bước**
- Trong lúc làm bước 4, `.gitignore` bị một tiến trình bên ngoài ghi đè bằng mẫu chung (mất các dòng `/.devdb`, `/.next`, `/src/generated`…), khiến commit bước 4 lần đầu dính ~3.700 file rác (DB dev, cache build; không có `.env`). Đã làm lại commit bước 4 (commit chưa push) và khôi phục `.gitignore` gốc, giữ thêm các dòng mới (`dist/`, `__pycache__/`, `.venv/`). Không file nào trên đĩa bị xóa.

**Còn tồn**
- Không có.

## Bước 5 – Luồng KPI chung: Đầu kỳ + màn hình Duyệt tab Đăng ký ✅

**Đã làm**
- `src/lib/rules.ts` viết lại chung cho mọi cấp (bảng 10.1 + B5, B6).
- `src/lib/services/dang-ky.ts` (một bộ code cho GV, TBM, TK, HP):
  - `chonNhiemVu`: chỉ nhiệm vụ đúng vị trí mình; tạo Nháp, khóa dòng `DangKy` (`FOR UPDATE`) rồi kiểm tra luật
  - `guiDangKy`: ≥1 nhiệm vụ; A3 (thiếu người duyệt hoặc người chốt → chặn); tính điểm/xếp loại theo bảng đúng vị trí; báo người duyệt
  - `duyetDangKy` / `tuChoiDangKy`: chỉ người duyệt theo `nguoiDuyet()` (khác → 404); tính lại điểm/xếp loại; duyệt thì giao task bắt buộc (Chưa làm); từ chối bắt buộc nhận xét
- `/dau-ky?kyId=`: một trang cho 4 vị trí; nhãn nút "Gửi lên <chức danh người duyệt>" lấy từ bảng cấu hình chuỗi; banner thiếu người (A3) và khóa nút Gửi; dropdown chọn kỳ (B7, `src/lib/services/ky.ts`).
- Màn hình Duyệt dùng chung `/duyet?kyId=&tab=tong-quan|hang-cho`:
  - tiêu đề theo menu ("Duyệt giáo viên", "Duyệt trưởng bộ môn", "Duyệt trưởng khoa", "Duyệt & chốt hiệu phó")
  - ô đếm (đăng ký chờ duyệt, task chờ duyệt, đã duyệt chưa gửi lên/chưa chốt, chờ chốt, bị trả về, xin thêm chờ duyệt); với HT → HP ẩn các ô/cột không dùng (Chờ chốt, Bị trả về) và "Chưa gửi lên" đổi thành "Chưa chốt"
  - bảng người (`src/lib/services/duyet.ts`): chỉ người mà mình là người duyệt
- `/duyet/[nguoiId]?kyId=&tab=dang-ky|task|xin-them`: người không thuộc phạm vi duyệt → 404. Tab Đăng ký: nhiệm vụ đã chọn, điểm, xếp loại → Duyệt / Từ chối (bắt buộc nhận xét).
- `src/lib/thong-bao.ts`: `guiThongBao(tx, nguoiNhan, noiDung, { link, maSuKien, tru })` (bỏ người thao tác – B12) + `LINK` các đường dẫn trong thông báo. `src/lib/validate.ts`: `NhanXetBatBuoc`, `NhanXetTuyChon`.
- Test: tích hợp `tests/dang-ky.int.test.ts` 11 (4 vị trí → đúng người duyệt, người khác/người chốt không duyệt được, giao đúng task bắt buộc, thông báo; nhiệm vụ sai vị trí; HT/Admin bị chặn; 2 case phụ về ngày; từ chối bắt buộc nhận xét; hết deadline; kỳ chốt; A3 khi khoa chưa có hiệu phó); E2E `e2e/buoc-05-dau-ky.spec.ts` 6/6.

**Tự chọn**
- Gửi lại sau khi bị từ chối thì xóa nhận xét cũ; khi duyệt, nhận xét tùy chọn.
- Người duyệt thấy tab Đăng ký "Chưa gửi danh sách đăng ký" khi người đó còn Nháp (danh sách chỉ lên người duyệt khi đã gửi).

**Còn tồn**
- Tab Hàng chờ, tab Task và minh chứng, tab Xin thêm task: bước 6.

## Bước 6 – Luồng KPI chung: Cuối kỳ + màn hình Duyệt đầy đủ ✅

**Đã làm**
- `src/lib/kpi/trang-thai.ts`: **máy trạng thái task duy nhất** (bảng 5.3). `luatChuyen(hanhDong, gop)` cho 10 hành động (Nộp, Sửa bài nộp, Duyệt, Từ chối, Hủy duyệt, Gửi lên, Chốt, Trả về, Trả làm lại, Duyệt lại); task HP chỉ khác cờ `gop` (Chốt từ Đã duyệt, không có Gửi lên/Trả về). `hanhDongDuocPhep` cho giao diện, `lyDoKhongChuyen` cho server. Nhãn "người làm KPI thấy" theo chức danh (vd "Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt"; HP: "Hiệu trưởng đã duyệt – chờ chốt").
- `src/lib/ket-qua.ts`: **một hàm** `tinhKetQuaThuan` (mục 10.3) + `src/lib/services/ket-qua.ts` (`tinhKetQua(kyId, userId)`, `taiKetQua` theo lô). Chỉ `DA_CHOT` được tính; thống kê 5 phần biểu đồ; lý do task thiếu (5.4).
- `src/lib/services/kpi-task.ts` `thucHienTask`: tư cách (người duyệt / người chốt) tính theo cơ cấu hiện tại; kiểm tra thời gian, luật chuyển, nhận xét bắt buộc; A3 khi Gửi lên thiếu người chốt; cập nhật có điều kiện; cập nhật bài nộp gần nhất (duyệt/từ chối/hủy duyệt); ghi `LichSuTask`; thông báo mục 11.
- `src/lib/services/bai-nop.ts` (nộp / sửa lần nộp hiện tại), `yeu-cau.ts` (xin thêm, duyệt/từ chối yêu cầu), `quyen-file.ts` (quyền xem file 12.2), `lich-su.ts`.
- API: `POST /api/kpi-task/[id]/bai-nop`, `PATCH /api/bai-nop/[id]`, `GET /api/files/[id]` (PDF/ảnh inline).
- `/cuoi-ky?kyId=` (chung 4 vị trí): biểu đồ tròn 5 phần (Đã chốt / Đang treo / Chờ duyệt / Bị từ chối gồm bị trả về / Chưa làm), % ở giữa, "Đang treo: N task", xếp loại đăng ký, "+N task vượt", đếm ngược deadline; danh sách nhiệm vụ → task; Xin thêm task; banner khi thiếu người duyệt (vẫn nộp được, A3). `/cuoi-ky/task/[kpiTaskId]`: nộp / sửa / nộp lại, lịch sử các lần nộp.
- Màn hình Duyệt: cột **% hoàn thành**; tab **Hàng chờ** (Chờ duyệt, Bị trả về, Đã duyệt; cũ nhất lên trước theo `capNhatLuc`); trang chi tiết người: tab **Task và minh chứng** (lọc theo trạng thái, mở task: minh chứng PDF/ảnh xem ngay, Word/Excel tải về, ghi chú, link, lịch sử nộp, nhật ký xử lý; nút theo máy trạng thái), tab **Xin thêm task**.
- Component dùng chung cho Duyệt và Chốt: `src/components/kpi/chi-tiet-task-quan-ly.tsx`, `nut-thao-tac-task.tsx` + server action chung `src/components/kpi/actions.ts` (`thaoTacTask`), nhãn nút ở `src/lib/kpi/nut-task.ts`.
- Test: unit `trang-thai` 9, `ket-qua` 8; tích hợp `tests/kpi-task.int.test.ts` 12 (nộp/sửa/khóa, sai định dạng, người khác/Admin không sửa được, duyệt–hủy duyệt–gửi lên, hủy duyệt sau khi gửi bị chặn, từ chối + nộp lại, người không phải người duyệt bị chặn, TBM và TK tới Chờ chốt, HT duyệt rồi chốt task HP, xin thêm, quyền file, hết deadline/kỳ chốt); E2E `e2e/buoc-06-cuoi-ky.spec.ts` 7/7.

**Tự chọn**
- Hủy duyệt: bài nộp gần nhất về Chờ duyệt và xóa nhận xét/người duyệt của lần duyệt đó (lịch sử vẫn trong `LichSuTask`).
- Không gửi thông báo khi Hủy duyệt và Duyệt lại (đặc tả không liệt kê).
- Trang chi tiết người trên màn hình Duyệt dùng tham số `?task=` để mở một task; Hàng chờ và thông báo dẫn thẳng tới task đó.
- Nhật ký xử lý (có nhận xét của người chốt) chỉ hiện cho cấp quản lý; người làm KPI chỉ thấy lịch sử các lần nộp và nhận xét của người duyệt.

**Còn tồn**
- Màn hình Chốt và xử lý task bị trả về trên giao diện: bước 7 (service đã có).

**Ghi chú git**
- Trong bước 5, nhánh `v1.4` đã được đổi tên thành `main` và gắn remote `origin` (GitHub), kèm 2 commit tự động "Initial commit", "Add teacher scoring page" chứa file của bước 5 (đã push nên không sửa lại lịch sử). Tôi không push; các bước tiếp tục commit trên `main`.

## Bước 7 – Màn hình Chốt (TK, HP, HT) ✅

**Đã làm**
- `/chot?kyId=&loc=&nguoi=&donVi=&task=` (một trang cho TK → task GV "Chốt task giáo viên", HP → task TBM "Chốt task trưởng bộ môn", HT → task TK "Chốt task trưởng khoa"):
  - chỉ người mà mình là người chốt (`nguoiToiChot`), chỉ task `CHO_CHOT` / `DA_CHOT` / `TRA_VE`; không có danh sách đăng ký
  - ô đếm task chờ chốt; mặc định lọc Chờ chốt, cũ nhất lên trước theo `guiChotLuc` (B10); lọc theo trạng thái, theo người, theo đơn vị
  - mở task: dùng chung `ChiTietTaskQuanLy` (minh chứng xem/tải, nhận xét của người duyệt trong lịch sử nộp) → **Chốt** / **Trả về** (bắt buộc nhận xét)
- Người duyệt xử lý task bị trả về trên màn hình Duyệt: thấy nhận xét của người chốt, nút **Trả <chức danh> làm lại** (→ Bị từ chối, nhận xét mới người làm KPI thấy) hoặc **Duyệt lại** (→ Đã duyệt, rồi gửi lại).
- Toàn bộ vòng trạng thái dùng lại `thucHienTask` + máy trạng thái của bước 6; không có code riêng theo vai trò.
- Test: tích hợp `tests/chot.int.test.ts` 5 (đủ vòng 5.3 kể cả trả về → trả làm lại → nộp lại → chốt và trả về → duyệt lại; % chỉ tăng khi chốt (0 → 33,33); người làm KPI không thấy nhận xét của người chốt; người chốt không chốt được task chưa gửi lên; đã chốt không ai sửa; đúng cấp HP chốt TBM, HT chốt TK; thiếu hiệu phó → TK không gửi lên task TBM); E2E `e2e/buoc-07-chot.spec.ts` 5/5.

**Tự chọn**
- Lọc "theo đơn vị" dùng tên đơn vị của người làm KPI (bộ môn của GV/TBM, khoa của TK).
- Task đang mở được tra riêng (vẫn trong phạm vi được thấy) nên vừa chốt xong vẫn còn hiện chi tiết.

**Còn tồn**
- Không có.

## Bước 8 – Chốt kỳ + kết quả + nhắc việc ✅

**Đã làm**
- `src/lib/services/chot-ky.ts`:
  - `chotKy(kyId)`: một transaction; đặt `daChot` có điều kiện (chạy hai lần không nhân đôi); tính kết quả cho **mọi tài khoản đang là GV, TBM, TK, HP** bằng hàm dùng chung `taiKetQua`/`tinhKetQuaThuan`; upsert `KetQuaKy` (kèm `doiTuong`, `taskThieu` có lý do, `taskVuot`, `soTreo`); thông báo kết quả cho từng người làm KPI, thông báo chung cho HT
  - `chotCacKyQuaHan()`: chỉ kỳ đã công bố và quá deadline (B19)
- `src/lib/services/nhac-viec.ts` (B12): hạn đăng ký còn ≤3 ngày → người chưa gửi; deadline còn ≤7 ngày → người còn task bắt buộc chưa chốt; mốc 7 ngày (2 < N ≤ 7) và 2 ngày (N ≤ 2) → người duyệt "Còn N task đã duyệt chưa gửi lên" (HT với task HP: "chưa chốt"), người chốt "Còn N task chờ chốt". Chống trùng bằng `maSuKien`, chỉ gửi khi N > 0.
- `POST /api/cron/chot-ky` (header `Authorization: Bearer <CRON_SECRET>`, so sánh timing-safe): chốt kỳ quá hạn + nhắc việc.
- Admin: nút **Chốt kỳ ngay** (có xác nhận) trên trang chi tiết kỳ.
- Kết quả: `/cuoi-ky` hiện khối Kết quả sau khi chốt kỳ (kết quả thực hiện + xếp loại đăng ký, % hoàn thành, task còn thiếu kèm lý do mục 5.4, task làm vượt); trước khi chốt không hiện (người làm KPI chỉ thấy kết quả cuối cùng). Màn hình Duyệt thêm cột **Kết quả** khi kỳ đã chốt.
- Test:
  - tích hợp `tests/kich-ban-15.int.test.ts` 12: **toàn bộ kịch bản chính mục 15 qua action/API thật** (6 người → Không đạt – A1 với 11 task "Chưa nộp minh chứng"; Đạt – C; Vượt chỉ tiêu – B với đúng 2 task vượt, task mở rộng chỉ duyệt không tính; Đạt – B; Đạt – A1; Đạt – B), case treo đến hết kỳ (lý do đúng), không đăng ký → Không đạt – F + ghi chú, sau chốt mọi thao tác bị khóa, thông báo; cron sai secret → 401, chỉ chốt kỳ quá hạn, chạy lại không chốt lại; nhắc việc đúng người, không trùng, mốc 2 ngày gửi thêm
  - E2E `e2e/buoc-08-kich-ban-15.spec.ts` 9/9: trạng thái cuối kịch bản dựng bằng SQL, admin bấm Chốt kỳ ngay trên giao diện, 6 tài khoản thấy đúng kết quả, TBM thấy cột Kết quả, thao tác bị khóa
  - **Hồi quy toàn bộ: unit 52, tích hợp 59, E2E 53 – tất cả pass.**

**Tự chọn**
- Người làm KPI tạo sau khi chốt kỳ không có kết quả ("Kỳ đã chốt nhưng không có kết quả cho tài khoản của bạn").
- "Kỳ đã chốt" gửi cho người làm KPI (kèm kết quả của họ) và HT; TBM/TK/HP đã nhận thông báo kết quả của chính mình nên không gửi thêm thông báo thứ hai.
- E2E bước 8 dựng dữ liệu bằng SQL cho nhanh; chuỗi thao tác đầy đủ đã kiểm ở test tích hợp và E2E bước 5–7.

**Còn tồn**
- Không có.

## Bước 9 – Xuất báo cáo Excel/PDF (4 cấp) ✅

**Đã làm**
- Thư viện: `exceljs@4.4.0`, `pdfmake@0.3.11` (thêm `serverExternalPackages` trong `next.config.ts`); dev: `@types/pdfmake`, `pdfjs-dist` (chỉ để test trích chữ từ PDF).
- `src/lib/bao-cao/`:
  - `du-lieu.ts`: dữ liệu theo phạm vi `phamViBaoCao` (TBM: GV bộ môn; TK: GV + TBM của khoa; HP: GV + TBM + TK các khoa phụ trách; HT: cả 4 vị trí toàn trường), không gồm người xuất; kỳ chưa chốt tính bằng hàm dùng chung `taiKetQua` (TẠM TÍNH), đã chốt lấy `KetQuaKy`
  - `excel.ts`: 3 sheet **Đăng ký nhiệm vụ | Kết quả | Chi tiết task** đúng cột mục 6.3; dòng đầu ghi tiêu đề + "(TẠM TÍNH)"; cột Tình trạng "Tạm tính / Đã chốt kỳ"
  - `pdf.ts`: A4 ngang, quốc hiệu, "Quảng Ninh, ngày … tháng … năm …" (hằng số `DIA_DANH` ở `src/lib/cau-hinh.ts`), dòng KHOA (TBM, TK) và BỘ MÔN (chỉ TBM), tiêu đề "BÁO CÁO KẾT QUẢ THỰC HIỆN NHIỆM VỤ – KỲ n NĂM HỌC …", "(TẠM TÍNH)" khi chưa chốt, khối chữ ký theo người xuất (TRƯỞNG BỘ MÔN / TRƯỞNG KHOA / KT. HIỆU TRƯỞNG – PHÓ HIỆU TRƯỞNG / HIỆU TRƯỞNG). Tất cả: bảng Kết quả + bảng Đăng ký; 1 người: thông tin + nhiệm vụ đã đăng ký + chi tiết task + kết quả
  - `ten-file.ts`: `BaoCao_<DonVi>_Ky<n>-<namHoc>_<YYYYMMDD>[_TamTinh]` (B15)
- `GET /api/bao-cao?kyId=&viTri=…&nguoiId=&dinhDang=xlsx|pdf` (chặn ở server: vai trò, phạm vi, người ngoài phạm vi → 403).
- `/bao-cao`: chọn kỳ → tick chức vụ trong phạm vi → Tất cả / 1 người → Xuất Excel / Xuất PDF; ghi chú TẠM TÍNH khi kỳ chưa chốt.
- Test:
  - unit `ten-file` 2
  - tích hợp `tests/bao-cao.int.test.ts` 9: phạm vi đúng cho TBM/TK/HP/HT; chức vụ ngoài phạm vi, người ngoài phạm vi, GV/Admin bị chặn; Excel đủ 3 sheet đúng cột, % chỉ đếm task đã chốt, tạm tính; **PDF trích chữ bằng pdf.js ra đúng tiếng Việt** (quốc hiệu, tiêu đề, tên người), A4 ngang, font Roboto nhúng, khối chữ ký đúng từng cấp, dòng KHOA/BỘ MÔN đúng; 1 người; sau chốt kỳ hết "TẠM TÍNH", tên file không còn `_TamTinh`
  - E2E `e2e/buoc-09-bao-cao.spec.ts` 3/3 (tải file thật qua trình duyệt, đúng tên file). Đã render PDF ra ảnh để xem bố cục bằng mắt.

**Tự chọn**
- **Font: Roboto 3.014** (kèm gói pdfmake, giấy phép OFL) thay cho Noto Sans: đặc tả cho phép một trong hai, đã kiểm tra đủ glyph tiếng Việt bằng fontkit. File TTF chép vào `assets/fonts/Roboto/` (không phụ thuộc đường dẫn trong node_modules); CLAUDE.md đã cập nhật.
- Tiêu đề mục (I., II., III.) nằm ngay trong bảng nên không bị lẻ cuối trang; bảng không cắt một dòng ra hai trang và lặp lại dòng tiêu đề cột khi sang trang.
- Ngày giờ trong Excel ghi dạng chữ `HH:mm dd/MM/yyyy` giờ VN (tránh lệch múi giờ khi mở file).
- Tên file "1 người" dùng cùng mẫu với "Tất cả" (đặc tả chỉ nêu một mẫu).

**Còn tồn**
- Không có.

## Bước 10 – Ban hành quy định + Nhận giấy tờ + Admin Nhận chỉ thị ✅

**Đã làm**
- `src/lib/services/van-ban.ts`:
  - `banHanhQuyDinh`: tiêu đề, nội dung, file đính kèm (cùng luật minh chứng, không bắt buộc), **tick vị trí nhận** (GV, TBM, TK, HP, Admin; ≥1); lưu `VanBan.viTriNhan`; thông báo "Quy định mới" cho mọi tài khoản đang ở các vị trí được tick (link theo vai trò: Admin → Nhận chỉ thị, còn lại → Nhận giấy tờ)
  - người nhận tính theo **chức vụ hiện tại** mỗi lần xem (`viTriNhan has role`): người thêm vào sau cũng thấy, đổi chức vụ thì thấy quy định của vị trí mới
  - `danhDauDaXem` (lần đầu mở, chỉ người nhận), `nguoiNhanHienTai` ("x/y đã xem", x chỉ đếm trong y người đang ở vị trí nhận – B11)
- `POST /api/quy-dinh` (chỉ HT). Quyền file quy định: HT, người có vị trí được tick, Admin (`quyen-file.ts` bước 6).
- HT: `/quy-dinh` (danh sách đã ban hành: tiêu đề, ngày, vị trí nhận, "x/y đã xem"), `/quy-dinh/moi` (form, "Chọn tất cả", số người hiện tại mỗi vị trí), `/quy-dinh/[id]` (nội dung, file, ai đã xem / chưa, lọc theo vị trí).
- Nhận: `/giay-to` + `/giay-to/[id]` (GV, TBM, TK, HP), `/admin/chi-thi` + `/admin/chi-thi/[id]` (Admin) dùng chung `src/components/giay-to/*`; nhãn **Mới** khi chưa xem; mở ra: nội dung + file (xem/tải).
- `DanhSachFile` chuyển sang `src/components/chung/danh-sach-file.tsx` (dùng chung cho minh chứng và quy định).
- Test: tích hợp `tests/van-ban.int.test.ts` 6 (chỉ HT ban hành, kiểm tra dữ liệu; tick GV + Admin → 3 GV + admin thấy, TBM/TK/HP không thấy, thông báo đúng người/đúng link; 1 GV mở → 1/4; GV mới → thấy, 1/5; đổi chức vụ; quyền file); E2E `e2e/buoc-10-quy-dinh.spec.ts` 5/5 (đủ 4 case phụ "ban hành quy định" mục 15 qua giao diện).

**Tự chọn**
- HT thấy mọi quy định đã ban hành (không chỉ của mình) – B11.
- Ghi nhận đã xem bằng action gọi từ trình duyệt khi trang mở (không ghi lúc render, tránh prefetch đánh dấu nhầm) – giữ cách của v1.1.
- Tiêu đề ≤300 ký tự, nội dung ≤20.000 ký tự, tối đa 10 file.

**Còn tồn**
- Không có.
