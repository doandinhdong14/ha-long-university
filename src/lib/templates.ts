// File mẫu chính thức của trường (Phụ lục IV, V): đường dẫn, tên file khi tải về, tiêu đề đúng như ghi trong file.
// Mọi chỗ trong code dùng phụ lục lấy từ đây. File nằm ở public/templates/ (bản gốc giữ trong docs/), không sửa nội
// dung. Dùng được ở cả client lẫn server (không đọc ổ đĩa; kiểm tra file có hay chưa ở src/lib/phu-luc.ts).
// Import tương đối (không alias "@/") vì src/lib/cai-tien.ts dùng file này và seed (tsx) import cai-tien.ts.
import type { DoiTuong } from "../generated/prisma/enums";
import { duoiFile, lyDoFileKhongHopLe } from "./files";

export type MauPhuLuc = {
  /** Tên ngắn dùng trong câu chữ, vd "Nộp Phụ lục IV đã điền…". */
  ten: string;
  /** Tiêu đề ghi trong file. */
  tieuDe: string;
  /** Đường dẫn tải (file tĩnh trong public/). */
  url: string;
  /** Vị trí file, tính từ thư mục public/. */
  tepPublic: string;
  /** Tên file khi tải về. */
  tenTai: string;
};

/** Phụ lục IV – phiếu đăng ký cải tiến, sáng tạo (khối "Đăng ký cải tiến sáng tạo" ở Đầu kỳ, spec-v1.6 mục 2.2). */
export const PHU_LUC_IV: MauPhuLuc = {
  ten: "Phụ lục IV",
  tieuDe: "PHỤ LỤC IV. MẪU PHIẾU ĐĂNG KÝ CẢI TIẾN, SÁNG TẠO",
  url: "/templates/phu-luc-iv.docx",
  tepPublic: "templates/phu-luc-iv.docx",
  tenTai: "Phu_luc_IV.docx",
};

/** Phụ lục V – phiếu tự đánh giá và xếp loại của hiệu phó, hiệu phó điền rồi gửi hiệu trưởng ở Cuối kỳ. */
export const PHU_LUC_V: MauPhuLuc & { viTri: DoiTuong; duoiNhan: string[] } = {
  ten: "Phụ lục V",
  tieuDe: "PHỤ LỤC V. MẪU PHIẾU TỰ ĐÁNH GIÁ VÀ XẾP LOẠI PHÓ HIỆU TRƯỞNG",
  url: "/templates/phu-luc-v.docx",
  tepPublic: "templates/phu-luc-v.docx",
  tenTai: "Phu_luc_V.docx",
  /** Chỉ vị trí này gửi Phụ lục V (người nhận: người duyệt của vị trí – hiệu trưởng). */
  viTri: "HP",
  /** Định dạng file đã điền được nhận (tối đa 20MB, như minh chứng). */
  duoiNhan: [".pdf", ".doc", ".docx"],
};

/** Lý do file Phụ lục V đã điền không hợp lệ (chỉ PDF, DOC, DOCX; tối đa 20MB), hoặc null. Server kiểm tra lại. */
export function lyDoFilePhuLucV(f: { name: string; size: number }): string | null {
  if (!PHU_LUC_V.duoiNhan.includes(duoiFile(f.name))) return `File "${f.name}" sai định dạng. Chỉ nhận PDF, DOC, DOCX.`;
  return lyDoFileKhongHopLe(f);
}
