// Xin thêm task mở rộng: v1.6 (docs/spec-v1.6.md mục 3) bỏ chức năng. Giao diện đã ẩn; server từ chối mọi
// yêu cầu tạo / duyệt / từ chối. Bảng YeuCauThemTask và dữ liệu cũ giữ nguyên, không xóa.
import "server-only";
import { LoiNghiepVu } from "@/lib/loi";

export const LOI_KHONG_CON_DUNG = "Chức năng không còn sử dụng";

/** Mọi thao tác xin thêm task (tạo yêu cầu, duyệt, từ chối yêu cầu) đều bị chặn. */
export function chanXinThemTask(): never {
  throw new LoiNghiepVu(LOI_KHONG_CON_DUNG, 409);
}
