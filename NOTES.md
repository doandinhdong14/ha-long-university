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

## Bước 11 – Admin Xem cấu hình + Thông báo ✅

**Đã làm**
- `/admin/cau-hinh?tab=…&kyId=…` (chỉ xem, không có nút sửa/xóa/duyệt/chốt), 6 tab:
  - **Kỳ và bảng xếp loại**: mọi kỳ (kể cả chưa công bố), hạn đăng ký/deadline, 4 bảng xếp loại + số nhiệm vụ mỗi vị trí
  - **Tài khoản và cơ cấu**: cảnh báo đơn vị thiếu người duyệt/chốt (`canhBaoThieuNguoi`), cây khoa → bộ môn với TK, HP phụ trách, TBM, số GV; bảng tài khoản kèm đơn vị
  - **Đăng ký nhiệm vụ** của từng người (4 vị trí): trạng thái, số nhiệm vụ, điểm, xếp loại, thời điểm gửi/duyệt, người duyệt + nhận xét
  - **Tiến độ task và minh chứng**: %, 5 phần biểu đồ, task vượt (hàm `taiKetQua` chung); trang `/admin/cau-hinh/nguoi/[userId]` xem biểu đồ, từng task với lịch sử nộp (mở xem/tải file), nhật ký xử lý, nhận xét người chốt
  - **Kết quả các kỳ** (`KetQuaKy`, kèm vị trí lúc chốt, lý do task thiếu)
  - **Quy định đã ban hành** + "x/y đã xem"; `/admin/cau-hinh/quy-dinh/[id]` ai đã xem/chưa, lọc theo vị trí (admin xem ở đây không bị tính là đã xem)
- Thông báo: chuông ở header (giữ từ v1.1: số chưa đọc, danh sách 20 thông báo mới nhất, bấm vào → đánh dấu đã đọc và đi tới trang liên quan, tự tải lại mỗi 60 giây). Đủ các sự kiện mục 11 (tạo ở các bước 5–10).
- Test: tích hợp `tests/thong-bao.int.test.ts` 5 (chuỗi sự kiện mục 11: gửi đăng ký → người duyệt, duyệt → người làm, nộp → người duyệt, gửi lên → người chốt, chốt → người làm + người duyệt, không báo người thao tác, trả về → người duyệt (người làm không nhận), xin thêm; API chuông chỉ trả thông báo của mình, 401 khi chưa đăng nhập, đánh dấu đọc chỉ tác động của mình); E2E `e2e/buoc-11-cau-hinh.spec.ts` 4/4.
- **Hồi quy toàn bộ: unit 54, tích hợp 79, E2E 65 – tất cả pass.**

**Tự chọn**
- Trang tiến độ một người của admin không dùng `ChiTietTaskQuanLy` (vốn có nút thao tác) mà ghép `LichSuNop` + `NhatKyTask` để chắc chắn chỉ xem.
- Bật `trace: "retain-on-failure"` cho Playwright: một lần chạy cả bộ E2E có 1 test bước 7 bị treo tới timeout, chạy lại (cả bộ và lặp 3 lần riêng) đều đạt; nếu lặp lại sẽ có trace để chẩn đoán.

**Còn tồn**
- Lỗi chập chờn E2E nói trên chưa tái hiện được.

## Bước 12 – Chuẩn bị deploy Railway ✅ (chưa deploy; bạn tự đăng nhập Railway)

**Đã làm**
- Rà lại cấu hình deploy (giữ từ v1.1, vẫn đúng cho v1.4):
  - `railway.json` (service app): builder Railpack, build `npm run build` (prisma generate + next build), pre-deploy `npm run release` (= `prisma migrate deploy && prisma db seed`; seed tự bỏ qua khi DB đã có dữ liệu), start `npm run start` (Next đọc `PORT` do Railway cấp), healthcheck `/dang-nhap`
  - `railway.cron.json` (service cron, cùng repo): lịch `5 17 * * *` (UTC = 00:05 giờ VN), chạy `npm run cron:chot-ky` → `scripts/cron-chot-ky.mjs` gọi `POST {APP_URL}/api/cron/chot-ky` với `Authorization: Bearer <CRON_SECRET>` (chốt kỳ quá hạn + nhắc việc), lỗi thì thoát mã 1
- Phụ thuộc cần lúc chạy đều ở `dependencies`: `prisma`, `tsx`, `dotenv` (bước pre-deploy), `pdfmake`, `exceljs` (xuất báo cáo, khai báo `serverExternalPackages`). Font PDF nằm trong repo (`assets/fonts/Roboto/`), đọc theo `process.cwd()` (thư mục gốc app trên Railway).
- Đã mô phỏng ở máy (DB test): `npm run build` → `npm run release` (không có migration mới, seed bỏ qua) → `PORT=3200 npm run start` → `/dang-nhap` 200, `/` 307 → `/dang-nhap`, `/gioi-thieu` 200, `/api/bao-cao` chưa đăng nhập 401 → script cron đúng secret 200 `{"ok":true,"daChot":[],"nhacViec":{…}}`, sai secret 401 và thoát mã 1. Xuất PDF/Excel trên bản build production đã chạy qua E2E bước 9.

### Hướng dẫn deploy lên Railway

**0. Đưa code lên GitHub**
Repo đã có remote `origin` = `https://github.com/doandinhdong14-afk/halong-kpi-crm.git`, nhánh `main`. Đẩy các commit mới nhất:
```bash
git push origin main
```

**1. Tạo project + service app**
- Railway → New Project → Deploy from GitHub repo → chọn `halong-kpi-crm`, nhánh `main`. Đặt tên service là **`app`**.
- Railway tự đọc `railway.json` ở gốc repo (build, pre-deploy, start, healthcheck).

**2. Thêm PostgreSQL**: trong project → New → Database → **PostgreSQL** (tên mặc định `Postgres`).

**3. Gắn Volume cho app**: chuột phải service `app` → Attach Volume → mount path **`/data`**.
Không tăng số replica của app lên >1 (Volume chỉ gắn được 1 instance).

**4. Biến môi trường của service `app`** (tab Variables):
| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | chuỗi ngẫu nhiên ≥32 ký tự, vd chạy `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `CRON_SECRET` | một chuỗi ngẫu nhiên khác |
| `UPLOAD_DIR` | `/data/uploads` |
| `TZ` | `Asia/Ho_Chi_Minh` |

**5. Tạo domain**: service `app` → Settings → Networking → Generate Domain. Deploy lại nếu cần.
Lần deploy đầu, bước pre-deploy tạo bảng và seed dữ liệu demo: 8 tài khoản (mật khẩu `123456`), 1 khoa, 1 bộ môn, **Kỳ 1 – 2026-2027 bắt đầu đúng ngày deploy**, 26 nhiệm vụ cho 4 vị trí, 4 bảng xếp loại.

**6. Service cron**
- Trong project → New → GitHub repo → cùng repo, nhánh `main`. Đặt tên **`cron`**.
- Settings → Config-as-code → Railway config file path: **`/railway.cron.json`**. Kiểm tra Settings → Cron Schedule hiện `5 17 * * *`.
- Variables của `cron`:
  | Biến | Giá trị |
  |---|---|
  | `APP_URL` | `https://${{app.RAILWAY_PUBLIC_DOMAIN}}` |
  | `CRON_SECRET` | `${{app.CRON_SECRET}}` |
- Railway Cron chạy theo **UTC**: `5 17 * * *` = 00:05 giờ Việt Nam.

**7. Kiểm tra sau deploy**
- Mở domain → đăng nhập `admin.quantri` / `123456` → Phân việc đầu kỳ thấy "Kỳ 1 – 2026-2027" Đã công bố, 10 · 6 · 5 · 5 nhiệm vụ.
- Đăng nhập lần lượt 8 tài khoản seed, mỗi người đúng menu (bảng 2.1).
- Nộp thử một file minh chứng, redeploy app, file vẫn mở được → Volume hoạt động.
- Xuất thử một báo cáo PDF (vd `tbm.phamthibich` → Xuất báo cáo) → tiếng Việt hiển thị đúng.
- Chạy cron thử: service `cron` → Deployments → Run now (hoặc từ máy):
  `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/chot-ky`
  → `{"ok":true,"daChot":[],"nhacViec":{…}}`.

**Lưu ý vận hành**
- Hạn đăng ký của kỳ seed là 23:59 ngày deploy (B17). Trước buổi demo: admin sửa ngày bắt đầu kỳ (Phân việc đầu kỳ → chi tiết kỳ → Lưu ngày), hoặc làm lại DB từ máy bằng `DATABASE_URL="<DATABASE_PUBLIC_URL của Postgres>" npm run db:reset` (xóa sạch dữ liệu, chỉ bạn chạy).
- Kịch bản nghiệm thu mục 15: admin dùng nút **Chốt kỳ ngay** thay vì chờ cron.
- File nằm trên Volume, không nằm trong backup của Postgres → sao lưu Volume riêng nếu cần.
- Upload đi qua route handler (không qua proxy nên không bị cắt 10MB); tối đa 10 file × 20MB mỗi lần nộp.

**Chưa kiểm chứng được ở máy**
- Chưa chạy thật trên Railway (không có tài khoản). Nếu dashboard báo `preDeployCommand`/`cronSchedule` sai định dạng, chỉnh trực tiếp trong Settings: Pre-deploy `npm run release`; cron `5 17 * * *`, start `npm run cron:chot-ky`.

**Còn tồn**
- Không có (ngoài việc deploy thật do bạn thực hiện).

### Deploy thật (27/09/2026)
- Project Railway `halong-kpi-crm` (region US West): `app`, `Postgres`, `cron`, Volume `app-volume` gắn `/data`. Domain: https://app-production-b269.up.railway.app. Repo thật: `doandinhdong14/ha-long-university` (không phải `halong-kpi-crm` như mục 0 ở trên).
- Vấn đề: Railway đã bỏ Config-as-Code cho project mới — không đọc `preDeployCommand` trong `railway.json`, API từ chối đặt "Railway config file path" (`/railway.cron.json`). Quyết định: đặt thẳng trong Settings của service. `app`: build `npm run build`, pre-deploy `npm run release`, start `npm run start`, restart ON_FAILURE ×5, `PORT=8080` (khớp domain). `cron`: lịch `5 17 * * *`, start `npm run cron:chot-ky`, restart NEVER. Lý do: cách đơn giản nhất còn chạy được; hai file `railway*.json` giữ lại làm tài liệu.
- Vấn đề: API Railway không nhận `healthcheckPath` có dấu gạch ngang (`/dang-nhap`), còn `/` trả 307. Quyết định: để trống healthcheck. Lý do: app có Volume nên Railway luôn tắt bản cũ rồi mới bật bản mới, healthcheck không giúp gì thêm.
- Railway chưa được cài GitHub App nên chưa xem được repo → lần đầu upload bằng `railway up` từ `git archive HEAD` (commit `070a018`). Muốn tự deploy khi push: cài Railway GitHub App cho repo, rồi service `app` → Settings → Source → Connect Repo, nhánh `main`.
- `cron` được upload từ một thư mục riêng chỉ có `package.json` + `scripts/cron-chot-ky.mjs` (không có `railway.json` của app). Không nối `cron` với repo GitHub, để khỏi dính cấu hình của app.
- Đã kiểm tra: `/dang-nhap` 200, `/api/bao-cao` 401 khi chưa đăng nhập, cron đúng secret trả `ok:true`, sai secret 401; đăng nhập `admin.quantri` và `tbm.phamthibich` đúng menu.

## Giao diện toàn hệ thống – tông xanh blue (ngoài 12 bước)
- **Vấn đề:** đồng bộ giao diện cả hệ thống với trang `/gioi-thieu` (logo trường, tông xanh `#1877F2`, không dùng xanh lá).
- **Quyết định:** chỉ đổi phần trình bày. Cụ thể: token màu trong `globals.css` (thêm màu `navy` cho tiêu đề); header có logo và ảnh đại diện chữ tắt; sidebar có biểu tượng theo đường dẫn (bề rộng giữ `w-60` vì thanh tổng kết Đầu kỳ dùng `md:left-60`); trang đăng nhập chia 2 cột; card, bảng, nút. Các màu trạng thái trước đây là xanh lá: "Đã chốt" và "Đạt" chuyển sang xanh blue, "Vượt chỉ tiêu" chuyển sang vàng. Không sửa server action, route, service, luật hay dữ liệu; giữ nguyên chữ, label và cấu trúc `aside nav a` / `header` mà E2E dùng.
- **Lý do:** yêu cầu "chỉ đổi giao diện, không động vào backend, cách hoạt động".

## Tách "Cuối kỳ" thành "Trong kỳ" + "Cuối kỳ" (ngoài 12 bước, 27/09/2026)
- **Vấn đề:** người dùng yêu cầu đổi mục "Cuối kỳ" (làm task, theo dõi tiến độ) thành "Trong kỳ", và thêm mục "Cuối kỳ" mới chỉ hiện những gì đã chốt – hoàn thành trong kỳ, giao diện đầy đủ như Trong kỳ. Lệch bảng 2.1 của đặc tả (mỗi người làm KPI thêm 1 mục menu: GV 4, TBM 6, TK 7, HP 7).
- **Quyết định:**
  - Trang cũ chuyển nguyên sang `/trong-ky` (cả `/trong-ky/task/[kpiTaskId]` và server action xin thêm task), không đổi cách hoạt động. Đường dẫn cũ `/cuoi-ky/task/:id` (trong thông báo đã lưu ở DB) chuyển hướng sang `/trong-ky/task/:id` bằng `redirects` trong `next.config.ts`.
  - `/cuoi-ky` mới: chỉ để xem. Cùng tiêu đề, chọn kỳ, khối kết quả kỳ (khi kỳ đã chốt), thẻ tổng quan (biểu đồ tròn, xếp loại đăng ký, task vượt) như Trong kỳ; danh sách nhiệm vụ – task chỉ gồm task `DA_CHOT` (ẩn nhiệm vụ chưa có task nào được chốt). Không có nút nộp, xin thêm task, đếm ngược. Link "Chi tiết" mở trang chi tiết task của Trong kỳ với `?tu=cuoi-ky` để nút quay lại về Cuối kỳ.
  - Giao diện chung của hai trang ở `src/components/kpi/kpi-cua-toi.tsx`, dữ liệu chung ở `src/lib/services/kpi-cua-toi.ts`; % và biểu đồ vẫn chỉ qua `tinhKetQua`.
  - Thông báo: duyệt đăng ký, duyệt/từ chối xin thêm task, nhắc deadline → Trong kỳ; kỳ đã chốt (kết quả) → Cuối kỳ.
- **Lý do:** giữ một bộ route + component + service cho mọi cấp; không đổi luật, trạng thái hay dữ liệu.

## Nút "Reset dữ liệu" của Admin (ngoài 12 bước, 27/09/2026)
- **Vấn đề:** người dùng cần một nút đỏ trong tài khoản admin để xóa hết dữ liệu (minh chứng, tài liệu) mà không mất tài khoản. Đặc tả không có chức năng này (admin vốn chỉ xem bài nộp).
- **Quyết định (người dùng chọn "Giữ kỳ & phân việc"):**
  - Nút đỏ "Reset dữ liệu" ở đầu trang Phân việc đầu kỳ, cạnh "Tạo kỳ"; bấm phải xác nhận thêm một lần ở hộp thoại.
  - Xóa: đăng ký nhiệm vụ, task KPI (kèm bài nộp, file minh chứng, lịch sử), yêu cầu thêm task, kết quả kỳ, quy định/tài liệu đã ban hành (kèm file, danh sách đã xem), thông báo; file trên ổ đĩa xóa sau khi transaction commit. Kỳ đã chốt được mở lại (`daChot = false`).
  - Giữ: tài khoản, mật khẩu, khoa/bộ môn, hiệu phó phụ trách, kỳ (kể cả trạng thái công bố), nhiệm vụ, task, bảng xếp loại.
  - Server action `resetDuLieuHeThong` (`admin/phan-viec/actions.ts`) kiểm tra vai trò ADMIN ở server; logic ở `src/lib/services/reset-du-lieu.ts`; test `tests/reset.int.test.ts`.
- **Lý do:** làm lại demo ngay trên giao diện, không cần `npm run db:reset` từ máy; phân việc của admin không phải nhập lại.

---

# v1.6 (spec: `docs/spec-v1.6.md`, nhánh `feature/v1.6`)

Bản sửa đổi trên nền v1.4. Làm theo thứ tự mục 11 của spec-v1.6; mỗi bước typecheck + build rồi commit `v1.6 – Bước X: …`.

## v1.6 – Bước 1: Tái hiện lỗi "trưởng khoa thấy Chờ chốt trống" (mục 7.1) ✅

**Cách tái hiện:** `e2e/v16-01-tai-hien-cho-chot.spec.ts`, chạy trên code v1.4 **chưa sửa** (build từ commit `ce0bbe8`), DB test seed lại, mọi thao tác qua giao diện thật. 7/7 test xác nhận đúng như mô tả dưới đây.

**Kết luận: KHÔNG có lỗi thật. Nguyên nhân là task chưa được bấm "Gửi lên".**
- GV nộp → TBM bấm **Duyệt** → task ở `DA_DUYET`. Theo v1.4 (bảng 5.3, mục 6.2) người chốt chỉ thấy `CHO_CHOT`/`DA_CHOT`/`TRA_VE`, nên trang "Chốt task giáo viên" của `tk.levankhoa` hiện ô đếm **0** và "Không có task nào" — kể cả khi chọn lọc "Tất cả". Đây chính là hiện tượng người dùng báo.
- Cùng lúc đó mọi tín hiệu khác đều khiến người dùng tưởng task đã tới người chốt: GV thấy nhãn *"Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt"* (nhãn này dùng chung cho `DA_DUYET` và `CHO_CHOT`), còn TBM chỉ thấy task ở ô "Đã duyệt, chưa gửi lên" và phải mở lại từng task để bấm thêm nút **"Gửi lên trưởng khoa"**. Bước thứ hai này dễ bị bỏ qua.
- Ngay khi TBM bấm "Gửi lên trưởng khoa" (task → `CHO_CHOT`), TK thấy task ngay: ô đếm 1, đúng một dòng.
- Hai chuỗi còn lại cho kết quả y hệt: TBM → TK duyệt → **HP** trống cho tới khi TK bấm "Gửi lên hiệu phó"; TK → HP duyệt → **HT** trống cho tới khi HP bấm "Gửi lên hiệu trưởng".

**Các chỗ đã kiểm tra theo mục 7.1.2 (đều đúng, không sửa):**
- `nguoiChot(GV)` (`src/lib/co-cau.ts`): bộ môn của GV → `BoMon.khoaId` → user role TK có cùng `khoaId`. Seed: `tk.levankhoa.khoaId` = Khoa CNTT, `Bộ môn Khoa học máy tính.khoaId` = Khoa CNTT (đã tra thẳng DB dev). Test tích hợp `co-cau` sẵn có cũng phủ.
- Truy vấn trang Chốt (`src/app/(app)/chot/page.tsx`): người = `nguoiToiChot(m)` (lọc ngược bằng chính `nguoiChot`, nên luôn khớp), trạng thái mặc định `CHO_CHOT`, đúng kỳ đang chọn.
- Kỳ mặc định: trang Chốt, Duyệt, Trong kỳ dùng chung `layKyTheoUrl` → `chonKyHienTai`, nên người làm KPI và người chốt luôn mở cùng một kỳ mặc định. Test cuối của file tái hiện dựng thêm một kỳ thứ hai đã công bố, trùng ngày: GV và TK cùng mặc định sang kỳ mới, task (ở kỳ cũ) không hiện theo menu nhưng hiện đúng khi mở theo link trong thông báo (link luôn kèm `kyId`). Đây là hành vi đã chọn ở B7 (nhiều kỳ mở cùng lúc thì chọn kỳ bằng dropdown), không phải lỗi truy vấn; ghi lại để biết khi admin công bố hai kỳ chồng ngày.

**Hướng xử lý:** bỏ bước Gửi lên (mục 7.2, bước 3). Người duyệt bấm Duyệt là task sang `CHO_CHOT` ngay, nên hiện tượng này hết. Không có lỗi thật cần sửa thêm.

**Chưa kiểm tra:** dữ liệu trên Railway (production) — tái hiện làm bằng seed như spec yêu cầu.

## v1.6 – Bước 2: Schema + migration + seed + damBaoNhiemVuCaiTien ✅

**Đã làm**
- Schema (mục 9.1): `LoaiTask.CAI_TIEN`, enum `TrangThaiCaiTien`, `NhiemVu.laCaiTien`, `KetQuaKy.phanTramBatBuoc` / `tuDanhGia` / `trangThaiCaiTien`. Giữ `MO_RONG`, `GUI_CHOT`, bảng `YeuCauThemTask`. Migration `20260928144451_v16_cai_tien_sang_tao` chỉ thêm (không xóa, không đổi dữ liệu).
- `src/lib/cai-tien.ts`: `THUONG_CAI_TIEN = 10`, mẫu nhiệm vụ/task cải tiến, `damBaoNhiemVuCaiTien(tx, kyId)` — mỗi vị trí GV/TBM/TK/HP đúng 1 nhiệm vụ `laCaiTien` (0 điểm, "Đăng ký cải tiến sáng tạo") có đúng 1 task `CAI_TIEN` ("Sản phẩm cải tiến sáng tạo"). Khóa `pg_advisory_xact_lock` theo kỳ nên chạy song song/chạy lại không trùng; thiếu task thì bổ sung.
- Gọi ở: tạo kỳ (`taoKy`), sao chép kỳ (`saoChepKy` — không chép nhiệm vụ cải tiến và task Mở rộng của kỳ cũ, tạo lại bằng hàm này), seed.
- Seed: bỏ task Mở rộng (giữ nguyên tài khoản, khoa, bộ môn, 26 nhiệm vụ, điểm, bảng xếp loại); gọi `damBaoNhiemVuCaiTien` cho **mọi kỳ** — kể cả khi DB đã có dữ liệu (seed bỏ qua phần tạo mới). Nhờ vậy bước `npm run release` trên Railway tự bổ sung nhiệm vụ cải tiến cho các kỳ có sẵn mà không cần reset.
- Lọc `laCaiTien = false` ở các chỗ liệt kê/đếm nhiệm vụ thường: thẻ Đầu kỳ, admin Phân việc (danh sách + số nhiệm vụ mỗi vị trí + trang danh sách kỳ), Xem cấu hình tab Kỳ, điều kiện công bố (B13), `chonNhiemVu`.
- DB dev đã làm trống và seed lại (TRUNCATE + seed như `resetDb` của test, chỉ trên `localhost/crm_kpi_v14`); chạy seed lần hai không tạo thêm gì.
- Test: `tests/phan-viec.int.test.ts` thêm 3 test (seed đúng 1 cải tiến/vị trí + không còn task Mở rộng; chạy song song/chạy lại không trùng, thiếu task thì bổ sung; tạo kỳ mới có ngay 4 nhiệm vụ cải tiến nhưng vẫn chưa công bố được) và kiểm tra sao chép kỳ ra đúng 1 cải tiến/vị trí.

**Tự chọn**
- Nhiệm vụ cải tiến `thuTu = 100000` (luôn đứng cuối), mô tả nhiệm vụ ghi rõ là nhiệm vụ hệ thống.
- Nhiệm vụ cải tiến **không** tính là "có nhiệm vụ" khi xét điều kiện công bố kỳ.

**Test cũ sửa theo hành vi mới**
- `tests/phan-viec.int.test.ts` › "công bố cần ≥1 nhiệm vụ…": tra nhiệm vụ vừa thêm bằng `laCaiTien: false` (kỳ mới nay luôn có sẵn 4 nhiệm vụ cải tiến).
- `tests/phan-viec.int.test.ts` › "sao chép từ kỳ trước…": đếm nhiệm vụ thường bằng `laCaiTien: false`.

## v1.6 – Bước 3: Bỏ bước Gửi lên (mục 7.2) + test mục 7.3 ✅

**Đã làm**
- Máy trạng thái `src/lib/kpi/trang-thai.ts` (vẫn là nơi duy nhất quy định chuyển trạng thái):
  - task GV/TBM/TK: **Duyệt** `CHO_DUYET → CHO_CHOT`; **Duyệt lại** `TRA_VE → CHO_CHOT`; **Hủy duyệt** `CHO_CHOT → CHO_DUYET`; bỏ hẳn hành động `GUI_CHOT` (server action trả "Thao tác không hợp lệ.").
  - task HP giữ nguyên: Duyệt → `DA_DUYET` → Chốt; Hủy duyệt khi `DA_DUYET`.
  - lịch sử ghi `DUYET` (không ghi `GUI_CHOT` nữa), hủy ghi `HUY_DUYET`.
- `thucHienTask` (`src/lib/services/kpi-task.ts`): task vào Chờ chốt thì lưu `guiChotLuc` (dùng làm "Duyệt lúc" và sắp xếp màn hình Chốt), Hủy duyệt xóa `guiChotLuc`; kiểm tra thiếu người chốt (A3) chuyển từ nút Gửi lên sang lúc Duyệt / Duyệt lại; cập nhật có điều kiện theo trạng thái đã đọc (hủy duyệt và chốt bấm cùng lúc → người sau nhận lỗi 409; task đã chốt → "Task đã chốt, không ai sửa được."). Hủy duyệt → task rời Chờ chốt nên người chốt không còn thấy, không mở được file.
- Thông báo "…đã duyệt task … chờ chốt" gửi người chốt **ngay khi Duyệt / Duyệt lại**, link mở thẳng task trên màn hình Chốt (`/chot?kyId=…&task=…`).
- Màn hình Duyệt: bỏ ô và cột "Chưa gửi lên"; Hàng chờ chỉ còn `CHO_DUYET`, `TRA_VE`; tab Task bỏ bộ lọc "Đã duyệt" với task GV/TBM/TK. Nút: Duyệt ("Task lên <người chốt> chốt ngay…"), Hủy duyệt ("Rút task khỏi danh sách chờ chốt…"), Duyệt lại ("Task lên thẳng Chờ chốt…").
- Màn hình Chốt: cột "Gửi lên lúc" → "Duyệt lúc"; nhãn quản lý "Đã duyệt, chưa gửi lên" bỏ; lý do thiếu `DA_DUYET` chỉ còn "Đã duyệt nhưng chưa được chốt" (mục 6.2).
- Migration dữ liệu `20260928145208_v16_bo_gui_len`: task GV/TBM/TK đang `DA_DUYET` ở kỳ chưa chốt → `CHO_CHOT` (giữ `guiChotLuc` nếu có, không thì lấy `capNhatLuc`). Kỳ đã chốt không đổi.
- Test mục 7.3: `e2e/v16-03-duyet-len-cho-chot.spec.ts` (8/8, qua giao diện thật): GV→TBM duyệt→**TK thấy**, TBM→TK duyệt→**HP thấy**, TK→HP duyệt→**HT thấy**, HP→HT duyệt→HT thấy nút **Chốt** (và chốt được); không còn nút Gửi lên, không còn ô/cột "Chưa gửi lên", Hàng chờ trống sau khi duyệt; hủy duyệt → về Chờ duyệt và biến mất khỏi Chờ chốt, đã chốt → không còn nút; trả về → Duyệt lại → lên thẳng Chờ chốt.

**Tự chọn**
- Hàng chờ của **HT** vẫn gồm task HP `DA_DUYET` (HT tự chốt, mục 7.2 giữ nguyên task HP); ô "Đã duyệt, chưa chốt" (`data-o-dem="chua-chot"`) và cột "Chưa chốt" giữ cho HT.
- Hủy duyệt không gửi thông báo (như v1.4). Duyệt lại cũng báo người chốt (task lại vào Chờ chốt của họ).
- `nhanChoQuanLy` còn một tham số; `lyDoThieu` bỏ tham số vị trí (không còn khác nhau theo vị trí).

**Test cũ sửa theo hành vi mới (bỏ Gửi lên)**
- `src/lib/kpi/trang-thai.test.ts`: 4 test chuỗi GV/TBM/TK (nút của người duyệt, đích chuyển, hủy duyệt khi Chờ chốt), test task HP (không còn `GUI_CHOT`), nhãn quản lý.
- `src/lib/ket-qua.test.ts` › "treo đến hết kỳ": task GV không còn `DA_DUYET`, lý do theo mục 6.2.
- `tests/helpers.ts` › `lamTask`: bỏ bước `GUI_CHOT`; `"DA_DUYET"` chỉ dùng cho task HP.
- `tests/chot.int.test.ts`: vòng trả về (lịch sử không còn `GUI_CHOT`), Duyệt lại → `CHO_CHOT`, người chốt chốt được ngay sau khi duyệt, thiếu hiệu phó → chặn ở Duyệt thay vì Gửi lên.
- `tests/kpi-task.int.test.ts`: duyệt → `CHO_CHOT` + báo người chốt, hủy duyệt từ Chờ chốt, `GUI_CHOT` bị từ chối; quyền file của người chốt mở ngay sau duyệt, đóng lại sau hủy duyệt; task HP không còn thử `GUI_CHOT`.
- `tests/thong-bao.int.test.ts`: thông báo người chốt bắn khi Duyệt, link mở thẳng task.
- `e2e/v16-01-tai-hien-cho-chot.spec.ts` (bước 1) đổi thành `e2e/v16-03-duyet-len-cho-chot.spec.ts` theo hành vi mới.
- E2E cũ (bước 5–11, bộ nghiệm thu v1.4) sửa ở bước 11.

## v1.6 – Bước 4: Bỏ "xin thêm task mở rộng" (mục 3) ✅

**Đã làm**
- Ẩn giao diện: khối "Xin thêm task" ở Trong kỳ; tab "Xin thêm task", ô đếm và cột "Xin thêm chờ duyệt" ở màn hình Duyệt (xóa các component `xin-them-task.tsx`, `tab-xin-them.tsx`, `nut-duyet-yeu-cau.tsx`).
- Chặn ở server: `xinThemTask`, `duyetYeuCau`, `tuChoiYeuCau` vẫn kiểm tra vai trò rồi trả **"Chức năng không còn sử dụng"** (`src/lib/services/yeu-cau.ts` → `chanXinThemTask`). Không tạo yêu cầu, không giao task.
- Admin: form task **bỏ ô chọn loại**; task mới luôn Bắt buộc (server bỏ qua `loai` client gửi); sửa task chỉ sửa chữ/thứ tự, không đổi loại. Task Mở rộng cũ hiện nhãn *"Mở rộng – không còn sử dụng"*.
- Tính toán / hiển thị: `TASK_DANG_DUNG` (`src/lib/cai-tien.ts`, loại `BAT_BUOC` + `CAI_TIEN`) lọc mọi truy vấn `KpiTask`: Trong kỳ/Cuối kỳ, Duyệt (tổng quan, hàng chờ, tab task), Chốt, `tinhKetQua`, báo cáo, nhắc việc, Xem cấu hình. Task Mở rộng cũ không nộp, không duyệt/chốt được (404), trang chi tiết task → 404.
- Giữ nguyên dữ liệu: bảng `YeuCauThemTask`, giá trị `MO_RONG`, task Mở rộng cũ không bị xóa. Seed không tạo task Mở rộng (bước 2).

**Tự chọn**
- Mã lỗi 409 cho "Chức năng không còn sử dụng".
- Nút "Reset dữ liệu" của admin vẫn xóa `YeuCauThemTask` (dữ liệu người dùng, như v1.4).

**Test cũ sửa theo hành vi mới (bỏ xin thêm task)**
- `tests/kpi-task.int.test.ts` › "xin thêm task mở rộng": thành 2 test — gọi xin thêm / duyệt / từ chối yêu cầu → "Chức năng không còn sử dụng", dữ liệu cũ giữ nguyên; task Mở rộng cũ đã giao bị bỏ qua (không tính, không nộp, không duyệt).
- `tests/thong-bao.int.test.ts` › "xin thêm task → người duyệt…": thành "không còn thông báo xin thêm".
- `tests/phan-viec.int.test.ts` › "khóa sửa/xóa…": không còn đổi loại task (gửi tay `loai` bị bỏ qua), đăng ký đã duyệt thì không thêm task được; thêm test "task mới luôn Bắt buộc kể cả khi request gửi Mở rộng".
- `tests/kich-ban-15.int.test.ts` (kịch bản v1.4 có task Mở rộng) viết lại theo kịch bản mục 12.1 ở bước 6.

## v1.6 – Bước 5: Đầu kỳ mới + Phụ lục IV + admin Phân việc (mục 2) ✅

**Đã làm**
- **Server tự quyết danh sách** (`src/lib/services/dang-ky.ts`): bỏ `chonNhiemVu`; `luuDangKy` (tự lưu khi tick cải tiến) và `guiDangKy` chỉ nhận `{ kyId, caiTien }` (zod, trường thừa bị bỏ qua) và luôn ghi **toàn bộ** nhiệm vụ thường của vị trí vào `DangKyNhiemVu` (xóa nhiệm vụ lạ, kể cả nhiệm vụ vị trí khác) + nhiệm vụ cải tiến nếu có tick. Tick được khi Nháp (trước hạn đăng ký) hoặc Bị từ chối (trước deadline) — cùng luật `lyDoKhongSuaDangKy`. Vị trí không có nhiệm vụ → "Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin." và không gửi được. Xếp loại giữ cách tính (tổng điểm nhiệm vụ thường); cải tiến 0 điểm.
- **Duyệt danh sách** giao task Bắt buộc của nhiệm vụ thường + 1 task `CAI_TIEN` nếu có đăng ký; không giao task Mở rộng. Thông báo gửi đăng ký ghi thêm "có đăng ký cải tiến sáng tạo".
- **Trang Đầu kỳ** (`/dau-ky`): thẻ nhiệm vụ tick sẵn, khóa, nhãn "Bắt buộc" (icon khóa), chỉ hiện task Bắt buộc; khối **"Đăng ký cải tiến sáng tạo (không bắt buộc)"** dưới danh sách, trên nút Gửi: thẻ file Phụ lục IV + nút Tải về, ô tick "Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này", ghi chú +10% / tối đa 110% / không ảnh hưởng xếp loại. Thanh tổng kết: Số nhiệm vụ – Tổng điểm – Xếp loại dự kiến – **Cải tiến sáng tạo: Có/Không**. Đã gửi (Chờ duyệt/Đã duyệt) thì hiện đúng danh sách đã gửi.
- **Phụ lục IV**: `public/templates/` (có `.gitkeep`, **không** tạo file docx giả). `coPhuLucIV()` kiểm tra file ở server mỗi lần hiển thị; chưa có → "Mẫu Phụ lục IV đang được cập nhật", nút Tải về khóa, ô tick vẫn dùng được.
- **Màn hình Duyệt – tab Đăng ký nhiệm vụ**: dòng "Đăng ký cải tiến sáng tạo: Có/Không"; số nhiệm vụ và danh sách chỉ gồm nhiệm vụ thường, task Bắt buộc.
- **Admin Phân việc**: mỗi vị trí có dòng cố định **"Đăng ký cải tiến sáng tạo (hệ thống)"** (không có nút sửa/xóa); API chặn sửa/xóa nhiệm vụ cải tiến và thêm/sửa/xóa task của nó ("Nhiệm vụ cải tiến sáng tạo là nhiệm vụ hệ thống, không sửa hoặc xóa được."). Thêm nhiệm vụ khi kỳ đã công bố → cảnh báo "Người đã gửi đăng ký sẽ không tự có nhiệm vụ này. Nên hoàn tất nhiệm vụ trước khi công bố kỳ.". Xem cấu hình: số nhiệm vụ không tính nhiệm vụ cải tiến.
- Test: `tests/dang-ky.int.test.ts` viết lại (xem dưới); `tests/phan-viec.int.test.ts` thêm test chặn API nhiệm vụ cải tiến; E2E `e2e/v16-05-dau-ky.spec.ts` 5/5 (tick sẵn + khóa + nhãn; chưa có file → khóa Tải về nhưng tick được, tự lưu; chép file → tải được; gửi → khóa ô cải tiến, người duyệt thấy dòng "Có", không còn tab/ô xin thêm; admin: dòng hệ thống, form task không có ô Loại, cảnh báo kỳ đã công bố).

**Tự chọn**
- `next start` **không** phục vụ file thêm vào `public/` sau khi build (đã thử: 404). Để "chép file vào là tải được" đúng như mục 12.3 mà không phải build lại, thêm route `src/app/templates/phu-luc-iv.docx/route.ts` đọc file lúc request (đường dẫn vẫn là `/templates/phu-luc-iv.docx`). Đã thử build khi file thật có sẵn trong `public/templates/`: build vẫn thành công. Người chưa đăng nhập bị proxy chuyển về trang đăng nhập.
- Thông báo thành công khi gửi ghi điểm + xếp loại như cũ; hộp xác nhận ghi thêm "Cải tiến sáng tạo: Có/Không".
- Người duyệt duyệt đúng danh sách đã gửi (không tự bổ sung nhiệm vụ admin thêm sau) — đúng với cảnh báo mục 2.5.

**Test cũ sửa theo hành vi mới**
- `tests/dang-ky.int.test.ts`: viết lại theo v1.6 — 4 vị trí gửi (đủ nhiệm vụ, 100 điểm, A1, có/không cải tiến) → đúng người duyệt, giao task Bắt buộc + Cải tiến; server bỏ qua danh sách sửa tay; tick cải tiến khi Nháp, khóa khi Chờ duyệt/Đã duyệt; giá trị sai; vị trí chưa có nhiệm vụ; HT/Admin; hết hạn đăng ký; bị từ chối → sửa + gửi lại; kỳ đã chốt; A3. (Thay cho các test "tick từng nhiệm vụ", "phải chọn ≥1 nhiệm vụ", "chỉ tick nhiệm vụ đúng vị trí".)
- `tests/helpers.ts` › `dangKyVaDuyet(username, { caiTien })`: không còn tham số số nhiệm vụ; các file gọi (`bao-cao`, `chot`, `kpi-task`, `reset`, `kich-ban-15`) bỏ tham số này.
- `tests/thong-bao.int.test.ts` › gửi đăng ký: gọi `guiDangKy({ kyId, caiTien })`.
- `tests/chot.int.test.ts` › "% chỉ tăng khi chốt": % tính theo số task bắt buộc thực tế (đăng ký đủ 10 nhiệm vụ) thay vì 33,33.
- `tests/bao-cao.int.test.ts` › "nội dung Excel": dòng của GV nay là A1 (100 điểm), % theo số task thực tế.

## v1.6 – Bước 6: Cuối kỳ – task cải tiến + tinhKetQua mới (mục 2.6, 4) ✅

**Đã làm**
- `tinhKetQuaThuan` (`src/lib/ket-qua.ts`) viết lại theo mục 4.1 — vẫn là **một hàm** dùng chung (biểu đồ, chốt kỳ, báo cáo tạm tính, bảng Duyệt):
  - chưa có đăng ký được duyệt → Không đạt, bậc thấp nhất, mọi % = 0, `KHONG_DANG_KY`, ghi chú "Chưa có danh sách nhiệm vụ được duyệt"
  - `phanTramBatBuoc` = bắt buộc đã chốt / bắt buộc; `tuDanhGiaBatBuoc` = bắt buộc khác Chưa làm / bắt buộc; `phanTram` / `tuDanhGia` cộng +10 khi cải tiến **đã chốt** / **đã nộp** (tối đa 110); không có task bắt buộc → 0% + "Chưa có task bắt buộc"
  - kết quả **so sánh bằng số lượng task**: thiếu task bắt buộc (hoặc không có) → Không đạt (cải tiến không bù được); đủ + cải tiến đã chốt → Vượt (`taskVuot` = task cải tiến); còn lại → Đạt
  - `trangThaiCaiTien` KHONG_DANG_KY / CHUA_CHOT / DA_CHOT; `ghiChuCaiTien` = "Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – <lý do mục 6.2>"; task Mở rộng bỏ qua; lý do thiếu theo bảng 6.2
  - `hienPhanTram` làm tròn số nguyên (lưu 2 chữ số thập phân); `dongTachPhanTram` / `dongTach` cho dòng "Bắt buộc X% · Cải tiến +10%" / "Cải tiến: chưa chốt" / "Cải tiến: chưa nộp".
- Chốt kỳ lưu thêm `phanTramBatBuoc`, `tuDanhGia`, `trangThaiCaiTien` vào `KetQuaKy`; `phanTram` là tổng (đã cộng +10); ghi chú cải tiến chưa chốt nối vào `KetQuaKy.ghiChu`.
- Khối Kết quả sau chốt kỳ (mục 4.2): "Không đạt – A1" + task bắt buộc còn thiếu kèm lý do; "Đạt – A1"; "Vượt chỉ tiêu – A1 (110%)" + "Cải tiến sáng tạo đã được chốt"; dòng Đánh giá của cấp trên kèm dòng tách, Tự đánh giá (tham khảo); ghi chú cải tiến chưa chốt.
- Cuối kỳ / Trong kỳ (mục 2.6): người có đăng ký thấy khối **"Cải tiến sáng tạo"** bên dưới danh sách nhiệm vụ chứa task cải tiến (cùng giao diện, cùng vòng trạng thái nộp → duyệt → chốt; màn hình Duyệt/Chốt xử lý như task thường). Trang nộp minh chứng của task cải tiến có gợi ý "Nộp Phụ lục IV đã điền và file sản phẩm." dưới ô tải file. Không đăng ký → không có khối này.
- Test: unit `src/lib/ket-qua.test.ts` viết lại (14 test: 6 dòng mục 12.1, case 12.2 "30% / 60%", "90% + cải tiến = 100% nhưng Không đạt", so sánh bằng số lượng, lý do 6.2, bỏ qua Mở rộng, dòng tách); tích hợp `tests/kich-ban.int.test.ts` = kịch bản **mục 12.1 chạy qua action thật** (xem dưới). **Hồi quy: unit 60, tích hợp 91 – tất cả pass.**

**Tự chọn**
- `taskVuot` chỉ ghi task cải tiến khi kết quả là Vượt (đúng giả mã 4.1); trường hợp cải tiến đã chốt nhưng thiếu bắt buộc thể hiện qua `trangThaiCaiTien = DA_CHOT`.
- Ghi chú cải tiến chưa chốt lưu trong `KetQuaKy.ghiChu` (nối sau ghi chú kỳ, nếu có) – không thêm cột mới ngoài mục 9.1.
- Nhãn cảnh báo admin "Chưa có task bắt buộc (tiến độ sẽ tính 100%)" đổi thành "(không có gì để làm cho nhiệm vụ này)" vì v1.6 không còn tính 100% cho trường hợp này (B13 cũ).

**Test cũ sửa theo hành vi mới**
- `src/lib/ket-qua.test.ts`: viết lại theo công thức mục 4 (bỏ các test "task mở rộng đã chốt → Vượt", "không có task bắt buộc → 100%", hiển thị "14,3%").
- `tests/kich-ban-15.int.test.ts` → `tests/kich-ban.int.test.ts`: kịch bản mục 15 (v1.4, có task Mở rộng, xếp loại C/B) thay bằng kịch bản mục 12.1 (cả 6 người A1; Không đạt 50%/50%; Đạt 100%/100%; Vượt 110%/110% ×2; Đạt 100%/110% + ghi chú; Đạt 100%/100%), case treo (không còn "Đã duyệt nhưng chưa gửi lên"), sau chốt kỳ bị khóa (thử Duyệt thay cho Gửi lên), nhắc việc không còn "chưa gửi lên".

## v1.6 – Bước 7: Hai biểu đồ + vòng ngoài + dòng tách (mục 5) ✅

**Đã làm**
- `src/components/kpi/bieu-do-kpi.tsx`: **một component dùng chung** `BieuDoKpi` (Recharts, 2 lớp `Pie`: vòng trong + vòng ngoài) và `HaiBieuDoKpi` (2 biểu đồ cạnh nhau `md:grid-cols-2`, xếp dọc trên điện thoại):
  - trái **"Đánh giá của cấp trên"**: vòng trong giữ 5 phần (Đã chốt / Đang treo / Chờ duyệt / Bị từ chối / Chưa làm), giữa là `phanTram`, dòng "Đang treo: N task"
  - phải **"Tự đánh giá"**: 2 phần Đã nộp (mọi trạng thái khác Chưa làm) / Chưa nộp, giữa là `tuDanhGia`, ghi "Chỉ để tham khảo"
  - **vòng ngoài +10%** (đủ 360°) chỉ khi có đăng ký cải tiến: cấp trên tô vàng khi cải tiến đã chốt, tự đánh giá tô vàng khi đã nộp, còn lại xám nhạt; chú thích + tooltip "Cải tiến sáng tạo +10% – <đã chốt / chưa chốt / đã nộp / chưa nộp>"
  - **dòng tách** dưới mỗi biểu đồ: "Bắt buộc X% · Cải tiến +10%" / "· Cải tiến: chưa chốt" / "· Cải tiến: chưa nộp"; không đăng ký → "Bắt buộc X%"
  - bỏ nhãn "+N task vượt"
- Dùng ở: Trong kỳ và Cuối kỳ (thẻ "Tổng quan KPI"), **trang chi tiết một người ở màn hình Duyệt** (mới), trang tiến độ một người của admin (thay `bieu-do-tron.tsx` cũ, đã xóa).
- Test: E2E `e2e/v16-07-bieu-do.spec.ts` 7/7 — case mục 12.2 (10 task 3/2/1/4 → 30% / 60%; 90% + cải tiến đã chốt → 100% + dòng tách; không đăng ký → không vòng ngoài, không khối Cải tiến; cải tiến đã nộp chưa chốt → vòng Tự đánh giá tô màu, Cấp trên xám; cạnh nhau ở 1400px, xếp dọc ở 390px; người duyệt mở chi tiết thấy 2 biểu đồ) + kết quả sau chốt kỳ (Không đạt – A1 với 100% "(Bắt buộc 90% · Cải tiến +10%)", Vượt chỉ tiêu – A1 (110%), Đạt – A1, Đạt + ghi chú cải tiến chưa chốt). Đã chụp màn hình kiểm tra bằng mắt (máy tính + điện thoại).

**Tự chọn**
- Màu vòng ngoài vàng `#eab308` (cùng tông "Vượt chỉ tiêu"), màu "Đã nộp" xanh da trời `#0ea5e9` (không dùng xanh lá, theo quy ước giao diện).
- Tiêu đề thẻ tổng quan đổi "Tổng quan task bắt buộc" → "Tổng quan KPI" vì có thêm phần cải tiến.
