// Bảng cấu hình chuỗi duyệt – chốt (mục 3.2). Mọi khác biệt giữa các cấp của luồng KPI,
// màn hình Duyệt, màn hình Chốt, Xuất báo cáo đều lấy từ đây; không rải if (role === ...) trong component.
// Hàm thuần, dùng được cả ở client.
import type { DoiTuong, Role } from "@/generated/prisma/enums";
import { DOI_TUONGS } from "@/lib/roles";

type Chuoi = {
  /** Vai trò của người duyệt. */
  duyet: Role;
  /** Vai trò của người chốt. */
  chot: Role;
  /** Người duyệt cũng là người chốt: 2 nút Duyệt rồi Chốt, không có bước gửi lên (task HP). */
  gopDuyetChot: boolean;
};

export const CHUOI: Record<DoiTuong, Chuoi> = {
  GV: { duyet: "TBM", chot: "TK", gopDuyetChot: false },
  TBM: { duyet: "TK", chot: "HP", gopDuyetChot: false },
  TK: { duyet: "HP", chot: "HT", gopDuyetChot: false },
  HP: { duyet: "HT", chot: "HT", gopDuyetChot: true },
};

/** Vị trí mà vai trò này duyệt (màn hình Duyệt): TBM → GV, TK → TBM, HP → TK, HT → HP. */
export function viTriDuocDuyet(role: Role): DoiTuong | null {
  return DOI_TUONGS.find((d) => CHUOI[d].duyet === role) ?? null;
}

/**
 * Vị trí mà vai trò này chốt trên màn hình Chốt: TK → GV, HP → TBM, HT → TK.
 * Task HP (gộp duyệt – chốt) được HT chốt ngay trên màn hình Duyệt nên không tính ở đây.
 */
export function viTriDuocChot(role: Role): DoiTuong | null {
  return DOI_TUONGS.find((d) => CHUOI[d].chot === role && !CHUOI[d].gopDuyetChot) ?? null;
}

/** Các vị trí trong phạm vi Xuất báo cáo của vai trò (mục 6.3). */
export const PHAM_VI_BAO_CAO: Partial<Record<Role, DoiTuong[]>> = {
  TBM: ["GV"],
  TK: ["GV", "TBM"],
  HP: ["GV", "TBM", "TK"],
  HT: ["GV", "TBM", "TK", "HP"],
};


