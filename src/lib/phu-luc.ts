// File mẫu Phụ lục IV (spec-v1.6 mục 2.2): file tĩnh, đường dẫn cố định public/templates/phu-luc-iv.docx, dùng
// chung cho 4 vị trí và mọi kỳ. Chủ dự án tự chép file thật vào; chưa có thì giao diện báo "đang được cập nhật".
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

export const FILE_PHU_LUC_IV = path.join(process.cwd(), "public", "templates", "phu-luc-iv.docx");

/** Máy chủ đã có file mẫu Phụ lục IV chưa (kiểm tra mỗi lần hiển thị). */
export function coPhuLucIV(): boolean {
  return existsSync(FILE_PHU_LUC_IV);
}
