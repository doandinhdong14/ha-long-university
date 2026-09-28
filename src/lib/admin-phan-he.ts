import { PHU_LUC_IV } from "@/lib/templates";

export type TrangThaiPhanHe = "HOAT_DONG" | "MOT_PHAN" | "PHAT_TRIEN";
export type LienKetHienCo = "QUAN_LY_DANG_NHAP" | "PHAN_VIEC_DAU_KY" | "XEM_CAU_HINH";

export interface MucCon {
  so: string;
  slug: string;
  ten: string;
  moTa?: string;
  trangThai: TrangThaiPhanHe;
  lienKet?: LienKetHienCo;
  ghiChu?: string;
  chucNang?: string[]; // chỉ dùng cho phân hệ Hgt
}

export interface NhomPhanHe {
  so: string;
  slug: string;
  ten: string;
  moTa: string;
  icon: string;
  mucCon: MucCon[];
}

export const PHAN_HE_ADMIN: NhomPhanHe[] = [
  {
    so: "1",
    slug: "quan-tri-he-thong",
    ten: "Quản trị hệ thống",
    moTa: "Cơ cấu tổ chức, hồ sơ cán bộ, phân quyền, đăng nhập, đợt đánh giá và nhật ký hệ thống.",
    icon: "Settings",
    mucCon: [
      { so: "1.1", slug: "co-cau-to-chuc", ten: "Quản lý cơ cấu tổ chức (Khoa, Phòng, Ban, Bộ môn)", moTa: "Quản lý danh sách khoa, phòng, ban, bộ môn và quan hệ trực thuộc.", trangThai: "MOT_PHAN", lienKet: "XEM_CAU_HINH", ghiChu: "Hiện đã có khoa và bộ môn (chỉ xem). Phòng, Ban sẽ bổ sung ở giai đoạn sau." },
      { so: "1.2", slug: "ho-so-can-bo", ten: "Quản lý hồ sơ cán bộ / giảng viên / chuyên viên", moTa: "Thông tin cá nhân, đơn vị công tác, chức vụ của cán bộ, giảng viên, chuyên viên.", trangThai: "MOT_PHAN", lienKet: "QUAN_LY_DANG_NHAP", ghiChu: "Hiện đã có họ tên, chức vụ, đơn vị." },
      { so: "1.3", slug: "phan-quyen", ten: "Phân quyền người dùng & vai trò duyệt", moTa: "Gán chức vụ, lên/xuống chức, xác định người duyệt và người chốt.", trangThai: "HOAT_DONG", lienKet: "QUAN_LY_DANG_NHAP" },
      { so: "1.4", slug: "dang-nhap-tap-trung", ten: "Đăng nhập tập trung (SSO)", moTa: "Đăng nhập bằng tài khoản dùng chung của trường.", trangThai: "PHAT_TRIEN" },
      { so: "1.5", slug: "dot-danh-gia", ten: "Cấu hình đợt đánh giá (Quý / Năm / Mùa thi)", moTa: "Tạo và quản lý các đợt đánh giá, hạn đăng ký và hạn hoàn thành.", trangThai: "MOT_PHAN", lienKet: "PHAN_VIEC_DAU_KY", ghiChu: "Hiện đã có cấu hình kỳ (4 kỳ/năm)." },
      { so: "1.6", slug: "nhat-ky-he-thong", ten: "Nhật ký hệ thống (Audit log & Tracking)", moTa: "Ghi lại các thao tác quan trọng: ai làm gì, lúc nào.", trangThai: "PHAT_TRIEN" },
    ],
  },
  {
    so: "2",
    slug: "danh-muc-quy-tac",
    ten: "Danh mục & Quy tắc tính điểm",
    moTa: "Ngân hàng sản phẩm KPI, điểm chuẩn, quy đổi, vi phạm, tỷ trọng và làm tròn điểm.",
    icon: "ListChecks",
    mucCon: [
      { so: "2.1", slug: "ngan-hang-san-pham-kpi", ten: "Ngân hàng sản phẩm KPI (Giảng dạy, NCKH, Phục vụ cộng đồng…)", moTa: "Danh mục nhiệm vụ, sản phẩm KPI theo từng nhóm.", trangThai: "MOT_PHAN", lienKet: "PHAN_VIEC_DAU_KY", ghiChu: "Hiện đã có danh mục nhiệm vụ theo từng vị trí." },
      { so: "2.2", slug: "diem-chuan-minh-chung", ten: "Quy định điểm chuẩn & yêu cầu minh chứng", moTa: "Điểm của từng sản phẩm KPI và yêu cầu minh chứng đi kèm.", trangThai: "MOT_PHAN", lienKet: "PHAN_VIEC_DAU_KY", ghiChu: "Hiện đã có điểm nhiệm vụ và nộp minh chứng theo từng task." },
      { so: "2.3", slug: "quy-doi-sang-kien", ten: "Quy đổi sáng kiến / cải tiến / đề tài", moTa: "Bảng quy đổi sáng kiến, cải tiến, đề tài sang điểm KPI.", trangThai: "MOT_PHAN", ghiChu: `Hiện đã có Đăng ký cải tiến sáng tạo (+10%) theo mẫu ${PHU_LUC_IV.ten}. Quy đổi sang điểm sẽ bổ sung ở giai đoạn sau.` },
      { so: "2.4", slug: "vi-pham-thai-do", ten: "Danh mục vi phạm thái độ / kỷ luật", moTa: "Danh mục các lỗi thái độ, kỷ luật và mức độ.", trangThai: "PHAT_TRIEN" },
      { so: "2.5", slug: "ty-trong-diem", ten: "Cấu hình tỷ trọng điểm theo khối & chức vụ", moTa: "Tỷ trọng điểm khác nhau theo khối công tác và chức vụ.", trangThai: "PHAT_TRIEN" },
      { so: "2.6", slug: "lam-tron-diem", ten: "Quy tắc làm tròn điểm tự động", moTa: "Quy tắc làm tròn điểm khi tính kết quả.", trangThai: "PHAT_TRIEN" },
    ],
  },
  {
    so: "3",
    slug: "ke-khai-danh-gia",
    ten: "Kê khai & Đánh giá cá nhân",
    moTa: "Phiếu KPI cá nhân, minh chứng, tự chấm điểm, tiến trình duyệt và kết quả xếp loại.",
    icon: "ClipboardList",
    mucCon: [
      { so: "3.1", slug: "phieu-kpi-ca-nhan", ten: "Lập & chỉnh sửa phiếu KPI cá nhân", moTa: "Cán bộ đăng ký nhiệm vụ đầu kỳ. Admin theo dõi danh sách đăng ký.", trangThai: "HOAT_DONG", lienKet: "XEM_CAU_HINH" },
      { so: "3.2", slug: "file-minh-chung", ten: "Đính kèm & quản lý file minh chứng", moTa: "Nộp, sửa, xem minh chứng theo từng task.", trangThai: "HOAT_DONG", lienKet: "XEM_CAU_HINH" },
      { so: "3.3", slug: "tu-cham-diem-tho", ten: "Tự chấm điểm thô theo khung quy định", moTa: "Cán bộ tự chấm điểm theo khung trước khi trình duyệt.", trangThai: "PHAT_TRIEN" },
      { so: "3.4", slug: "tien-trinh-trinh-duyet", ten: "Theo dõi tiến trình & luồng trình duyệt", moTa: "Theo dõi trạng thái duyệt, chốt của từng task.", trangThai: "HOAT_DONG", lienKet: "XEM_CAU_HINH" },
      { so: "3.5", slug: "ket-qua-xep-loai", ten: "Tra cứu kết quả & mức xếp loại cá nhân", moTa: "Kết quả thực hiện và mức xếp loại theo từng kỳ.", trangThai: "HOAT_DONG", lienKet: "XEM_CAU_HINH" },
    ],
  },
  {
    so: "4",
    slug: "duyet-khong-che",
    ten: "Duyệt KPI & Xử lý khống chế",
    moTa: "Duyệt nhiều cấp, ghi nhận vi phạm, khóa trần xếp loại, phê duyệt toàn trường và khiếu nại.",
    icon: "ShieldCheck",
    mucCon: [
      { so: "4.1", slug: "duyet-cap-bo-mon", ten: "Duyệt phiếu cấp bộ phận / tổ bộ môn", moTa: "Trưởng bộ môn duyệt phiếu và minh chứng của giáo viên.", trangThai: "HOAT_DONG", lienKet: "XEM_CAU_HINH", ghiChu: "Thao tác duyệt thực hiện tại tài khoản trưởng bộ môn. Admin theo dõi." },
      { so: "4.2", slug: "duyet-cap-khoa-phong", ten: "Duyệt cấp khoa / phòng / trưởng đơn vị", moTa: "Trưởng đơn vị duyệt và chốt cho cấp dưới.", trangThai: "MOT_PHAN", lienKet: "XEM_CAU_HINH", ghiChu: "Hiện đã có cấp khoa. Cấp phòng sẽ bổ sung ở giai đoạn sau." },
      { so: "4.3", slug: "loi-thai-do", ten: "Ghi nhận lỗi thái độ & số lần vi phạm", moTa: "Ghi nhận lỗi thái độ và đếm số lần vi phạm của từng cán bộ.", trangThai: "PHAT_TRIEN" },
      { so: "4.4", slug: "khoa-tran-xep-loai", ten: "Tự động khóa trần mức xếp loại (B1, B2, B3, C/D theo số lỗi)", moTa: "Tự động giới hạn mức xếp loại cao nhất theo số lỗi vi phạm.", trangThai: "PHAT_TRIEN" },
      { so: "4.5", slug: "phe-duyet-toan-truong", ten: "Phê duyệt toàn trường (Ban Giám hiệu / Hội đồng)", moTa: "Ban Giám hiệu, Hội đồng phê duyệt kết quả toàn trường.", trangThai: "MOT_PHAN", lienKet: "XEM_CAU_HINH", ghiChu: "Hiện đã có luồng hiệu phó, hiệu trưởng. Hội đồng sẽ bổ sung ở giai đoạn sau." },
      { so: "4.6", slug: "khieu-nai", ten: "Tiếp nhận & giải quyết khiếu nại (mốc ngày 13–15)", moTa: "Tiếp nhận và giải quyết khiếu nại về kết quả trong thời hạn quy định.", trangThai: "PHAT_TRIEN" },
    ],
  },
  {
    so: "5",
    slug: "bao-cao-ky-so",
    ten: "Báo cáo & Ký số",
    moTa: "Phiếu KPI cá nhân, bảng tổng hợp, chi trả, ký số và thống kê toàn trường.",
    icon: "FileText",
    mucCon: [
      { so: "5.1", slug: "phieu-kpi-pdf", ten: "Xuất phiếu KPI cá nhân (PDF)", moTa: "Xuất phiếu kết quả KPI của từng cá nhân ra PDF.", trangThai: "MOT_PHAN", ghiChu: "Hiện đã có tại tài khoản trưởng bộ môn, trưởng khoa, hiệu phó, hiệu trưởng." },
      { so: "5.2", slug: "bang-tong-hop-excel", ten: "Xuất bảng tổng hợp đơn vị (Excel)", moTa: "Xuất bảng tổng hợp kết quả của đơn vị ra Excel.", trangThai: "MOT_PHAN", ghiChu: "Hiện đã có tại tài khoản trưởng bộ môn, trưởng khoa, hiệu phó, hiệu trưởng." },
      { so: "5.3", slug: "chi-tra-thu-nhap", ten: "Báo cáo chi trả thu nhập & quỹ thưởng", moTa: "Báo cáo chi trả thu nhập tăng thêm và quỹ thưởng theo kết quả.", trangThai: "PHAT_TRIEN" },
      { so: "5.4", slug: "ky-so", ten: "Ký số điện tử trưởng đơn vị", moTa: "Trưởng đơn vị ký số điện tử trên báo cáo, phiếu kết quả.", trangThai: "PHAT_TRIEN" },
      { so: "5.5", slug: "thong-ke-xep-loai", ten: "Báo cáo thống kê tỷ lệ xếp loại toàn trường", moTa: "Thống kê tỷ lệ các mức xếp loại theo đơn vị và toàn trường.", trangThai: "PHAT_TRIEN" },
    ],
  },
  {
    so: "6",
    slug: "hgt",
    ten: "Ghi nhận đóng góp gia tăng (Hgt)",
    moTa: "Hệ thống quản lý ghi nhận đóng góp gia tăng theo quy định của Trường Đại học Hạ Long.",
    icon: "BarChart3",
    mucCon: [
      { so: "1", slug: "danh-muc-cau-hinh", ten: "Quản lý danh mục và cấu hình hệ thống", trangThai: "PHAT_TRIEN", chucNang: ["1.1 Quản lý tiêu chí Hgt (20 tiêu chí)", "1.2 Cấu hình điểm số, định mức", "1.3 Cấu hình quy tắc không tính trùng", "1.4 Cấu hình giới hạn Hgt", "1.5 Cấu hình chu kỳ xét duyệt", "1.6 Tham số hệ thống"] },
      { so: "2", slug: "to-chuc-nhan-su", ten: "Quản lý tổ chức và nhân sự", trangThai: "PHAT_TRIEN", chucNang: ["2.1 Quản lý cơ cấu tổ chức", "2.2 Quản lý đơn vị (Phòng, Khoa, Trung tâm)", "2.3 Quản lý cán bộ, giảng viên, người lao động", "2.4 Quản lý vai trò, chức vụ", "2.5 Phân quyền người dùng"] },
      { so: "3", slug: "dang-ky-hgt", ten: "Đăng ký Hgt", trangThai: "PHAT_TRIEN", chucNang: ["3.1 Tạo phiếu đăng ký Hgt", "3.2 Chọn tiêu chí", "3.3 Nhập thông tin kết quả", "3.4 Tải minh chứng (file, link, ...)", "3.5 Đăng ký cá nhân hoặc nhóm", "3.6 Theo dõi trạng thái phiếu đăng ký"] },
      { so: "4", slug: "quan-ly-minh-chung", ten: "Quản lý minh chứng", trangThai: "PHAT_TRIEN", chucNang: ["4.1 Lưu trữ minh chứng", "4.2 Phân loại minh chứng", "4.3 Xác thực minh chứng", "4.4 Liên kết với tiêu chí Hgt", "4.5 Quản lý phiên bản, lịch sử"] },
      { so: "5", slug: "xet-duyet-phe-duyet", ten: "Xét duyệt và phê duyệt", trangThai: "PHAT_TRIEN", chucNang: ["5.1 Đơn vị rà soát, xác nhận", "5.2 Phòng TCHC-TTPC kiểm tra, tổng hợp", "5.3 Hội đồng cấp Trường xem xét", "5.4 Phê duyệt / Từ chối", "5.5 Thông báo kết quả", "5.6 Quản lý lịch họp Hội đồng"] },
      { so: "6", slug: "tinh-diem-phan-bo", ten: "Tính điểm Hgt và phân bổ", trangThai: "PHAT_TRIEN", chucNang: ["6.1 Tính điểm Hgt theo quy định", "6.2 Phân bổ điểm cho nhiều cá nhân (%)", "6.3 Kiểm tra không tính trùng", "6.4 Kiểm tra giới hạn 20 Hgt/năm", "6.5 Xử lý trường hợp đặc biệt (vượt trần)", "6.6 Điều chỉnh điểm Hgt"] },
      { so: "7", slug: "chi-tra-phuc-loi", ten: "Chi trả và phúc lợi", trangThai: "PHAT_TRIEN", chucNang: ["7.1 Lập danh sách chi trả (theo quý)", "7.2 Tính khoản khuyến khích (500.000đ/Hgt)", "7.3 Tích hợp với hệ thống kế toán/chi lương", "7.4 Cập nhật trạng thái chi trả", "7.5 Tra cứu lịch sử chi trả"] },
      { so: "8", slug: "bao-cao-thong-ke", ten: "Báo cáo và thống kê", trangThai: "PHAT_TRIEN", chucNang: ["8.1 Báo cáo theo cá nhân", "8.2 Báo cáo theo đơn vị", "8.3 Báo cáo theo tiêu chí", "8.4 Báo cáo tổng hợp Hgt", "8.5 Báo cáo phục vụ đánh giá thi đua, khen thưởng", "8.6 Xuất báo cáo (PDF, Excel)"] },
      { so: "9", slug: "danh-gia-xep-loai", ten: "Đánh giá và xếp loại", trangThai: "PHAT_TRIEN", chucNang: ["9.1 Tích hợp điểm Hgt vào đánh giá nhiệm vụ", "9.2 Hỗ trợ đánh giá thi đua", "9.3 Hỗ trợ xét khen thưởng", "9.4 Tra cứu kết quả đánh giá", "9.5 Lịch sử đánh giá các kỳ"] },
      { so: "10", slug: "tra-cuu-lich-su", ten: "Tra cứu và lịch sử", trangThai: "PHAT_TRIEN", chucNang: ["10.1 Tra cứu kết quả Hgt", "10.2 Tra cứu minh chứng", "10.3 Tra cứu lịch sử phiếu", "10.4 Tra cứu lịch sử chi trả", "10.5 Xem lịch sử thao tác (audit trail)"] },
      { so: "11", slug: "thong-bao-nhac-viec", ten: "Thông báo và nhắc việc", trangThai: "PHAT_TRIEN", chucNang: ["11.1 Thông báo trạng thái phiếu đăng ký", "11.2 Nhắc hạn đăng ký", "11.3 Thông báo lịch họp Hội đồng", "11.4 Thông báo kết quả phê duyệt", "11.5 Thông báo chi trả"] },
      { so: "12", slug: "quan-tri-he-thong-hgt", ten: "Quản trị hệ thống", trangThai: "PHAT_TRIEN", chucNang: ["12.1 Quản lý người dùng", "12.2 Quản lý vai trò, quyền hạn", "12.3 Nhật ký hệ thống", "12.4 Sao lưu và phục hồi", "12.5 Quản lý cấu hình bảo mật"] },
      { so: "13", slug: "tich-hop-he-thong", ten: "Tích hợp hệ thống", trangThai: "PHAT_TRIEN", chucNang: ["13.1 Tích hợp hệ thống nhân sự (HRM)", "13.2 Tích hợp kế toán/chi lương", "13.3 Tích hợp SSO (nếu có)", "13.4 Tích hợp email/SMS", "13.5 API mở rộng"] },
      { so: "14", slug: "cong-thong-tin-ho-tro", ten: "Cổng thông tin và hỗ trợ người dùng", trangThai: "PHAT_TRIEN", chucNang: ["14.1 Hướng dẫn sử dụng", "14.2 Câu hỏi thường gặp (FAQ)", "14.3 Hỗ trợ, phản hồi", "14.4 Tài liệu, biểu mẫu", "14.5 Tin tức, thông báo chung"] },
    ],
  },
];

// ---- Phần dưới không thuộc config của đặc tả (docs/spec-admin-menu.md mục 4) ----

export const GOC_PHAN_HE = "/admin/phan-he";

/** Mã liên kết → route Admin hiện có. */
export const ROUTE_LIEN_KET: Record<LienKetHienCo, { href: string; nhan: string }> = {
  QUAN_LY_DANG_NHAP: { href: "/admin/tai-khoan", nhan: "Quản lý đăng nhập" },
  PHAN_VIEC_DAU_KY: { href: "/admin/phan-viec", nhan: "Phân việc đầu kỳ" },
  XEM_CAU_HINH: { href: "/admin/cau-hinh", nhan: "Xem cấu hình" },
};

export const NHAN_TRANG_THAI_PHAN_HE: Record<TrangThaiPhanHe, string> = {
  HOAT_DONG: "Đang hoạt động",
  MOT_PHAN: "Hoạt động một phần",
  PHAT_TRIEN: "Đang phát triển",
};

export const hrefNhom = (nhom: NhomPhanHe) => `${GOC_PHAN_HE}/${nhom.slug}`;
export const hrefMuc = (nhom: NhomPhanHe, muc: MucCon) => `${GOC_PHAN_HE}/${nhom.slug}/${muc.slug}`;

export function timNhom(slug: string): NhomPhanHe | undefined {
  return PHAN_HE_ADMIN.find((n) => n.slug === slug);
}

export function timMuc(nhomSlug: string, mucSlug: string): { nhom: NhomPhanHe; muc: MucCon } | undefined {
  const nhom = timNhom(nhomSlug);
  const muc = nhom?.mucCon.find((m) => m.slug === mucSlug);
  return nhom && muc ? { nhom, muc } : undefined;
}

/** Nhóm 6 (Hgt): mục con là phân hệ, có danh sách chức năng. */
export const laNhomHgt = (nhom: NhomPhanHe) => nhom.slug === "hgt";
