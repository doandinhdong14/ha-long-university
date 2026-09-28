// Luật thời gian/trạng thái (bảng 10.1 + quyết định B5, B6 trong NOTES.md). Nguồn luật duy nhất.
// Mỗi hàm trả về lý do bị chặn (tiếng Việt) hoặc null nếu được phép.
// Dùng ở server để chặn (qua chan()) và ở trang để ẩn/khóa nút.
import type { TrangThaiDangKy } from "@/generated/prisma/enums";
import { deadline, hanDangKy } from "@/lib/time";

export type KyLuat = { ngayBatDau: Date; ngayKetThuc: Date; daCongBo: boolean; daChot: boolean };

/** B5: mọi thao tác ghi yêu cầu kỳ đã công bố và chưa chốt. */
export function lyDoKyKhongMo(ky: KyLuat): string | null {
  if (!ky.daCongBo) return "Kỳ chưa được công bố.";
  if (ky.daChot) return "Kỳ đã chốt, không thể thao tác.";
  return null;
}

/** Hết deadline là mọi người đều bị khóa (mục 3.4). */
function lyDoHetDeadline(ky: KyLuat, now: Date): string | null {
  return now <= deadline(ky) ? null : "Đã hết deadline của kỳ, mọi thao tác đã bị khóa.";
}

/**
 * Người làm KPI sửa (tick/bỏ tick) hoặc gửi danh sách đăng ký.
 * - Nháp (hoặc chưa có): đến hết hạn đăng ký.
 * - Bị từ chối: sửa và gửi lại đến hết deadline (B6: vẫn giữ trạng thái Bị từ chối khi sửa).
 */
export function lyDoKhongSuaDangKy(ky: KyLuat, trangThai: TrangThaiDangKy | null, now: Date = new Date()): string | null {
  const k = lyDoKyKhongMo(ky);
  if (k) return k;
  switch (trangThai ?? "NHAP") {
    case "NHAP":
      return now <= hanDangKy(ky) ? null : "Đã hết hạn đăng ký (23:59 ngày bắt đầu kỳ).";
    case "TU_CHOI":
      return lyDoHetDeadline(ky, now);
    case "CHO_DUYET":
      return "Danh sách đang chờ duyệt, chưa sửa được.";
    case "DA_DUYET":
      return "Danh sách đã được duyệt, không thể thay đổi nhiệm vụ.";
  }
}

/** Người duyệt duyệt / từ chối danh sách đăng ký: đến hết deadline, kỳ chưa chốt. */
export function lyDoKhongDuyetDangKy(ky: KyLuat, now: Date = new Date()): string | null {
  return lyDoKyKhongMo(ky) ?? lyDoHetDeadline(ky, now);
}

/**
 * Mọi hành động khác trong kỳ (bảng 10.1): nộp/sửa minh chứng, xin thêm, duyệt/từ chối,
 * hủy duyệt, chốt, trả về. Đến hết deadline, kỳ chưa chốt.
 */
export function lyDoKhongThaoTacTask(ky: KyLuat, now: Date = new Date()): string | null {
  return lyDoKyKhongMo(ky) ?? lyDoHetDeadline(ky, now);
}
