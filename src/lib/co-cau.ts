// Cơ cấu tổ chức (mục 2.4, 3.2, 6.3): người duyệt, người chốt, những người mình duyệt/chốt,
// phạm vi báo cáo, cảnh báo thiếu người. Hàm thuần trên một "ảnh chụp" cơ cấu (tải ở
// src/lib/services/co-cau.ts), nên unit test được. Luôn tính theo cơ cấu hiện tại, không lưu cứng.
import type { DoiTuong, Role } from "@/generated/prisma/enums";
import { CHUOI, PHAM_VI_BAO_CAO, PHAM_VI_THEO_DOI, viTriDuocChot, viTriDuocDuyet } from "@/lib/kpi/chuoi";
import { chucDanh, laDoiTuong } from "@/lib/roles";

/** Tối thiểu cần để xác định đơn vị của một người. */
export type NguoiDonVi = { id: string; role: Role; boMonId: string | null; khoaId: string | null };
export type NguoiCoCau = NguoiDonVi & { hoTen: string; username: string };

export type CoCau = {
  users: NguoiCoCau[];
  boMons: { id: string; ten: string; khoaId: string }[];
  khoas: { id: string; ten: string; hieuPhoId: string | null }[];
};

/** Khoa của người làm KPI: GV, TBM theo bộ môn; TK theo khoaId. */
export function khoaCua(u: NguoiDonVi, cc: CoCau): string | null {
  if (u.role === "GV" || u.role === "TBM") return cc.boMons.find((b) => b.id === u.boMonId)?.khoaId ?? null;
  if (u.role === "TK") return u.khoaId;
  return null;
}

/** Các khoa hiệu phó này phụ trách. */
export function khoaPhuTrach(hpId: string, cc: CoCau): string[] {
  return cc.khoas.filter((k) => k.hieuPhoId === hpId).map((k) => k.id);
}

/** Người giữ vai trò `role` phụ trách người làm KPI `u` (TBM cùng bộ môn, TK cùng khoa, HP của khoa, HT). */
function nguoiPhuTrach(role: Role, u: NguoiDonVi, cc: CoCau): NguoiCoCau | null {
  switch (role) {
    case "TBM":
      return u.boMonId ? (cc.users.find((x) => x.role === "TBM" && x.boMonId === u.boMonId) ?? null) : null;
    case "TK": {
      const khoaId = khoaCua(u, cc);
      return khoaId ? (cc.users.find((x) => x.role === "TK" && x.khoaId === khoaId) ?? null) : null;
    }
    case "HP": {
      const hpId = cc.khoas.find((k) => k.id === khoaCua(u, cc))?.hieuPhoId;
      return hpId ? (cc.users.find((x) => x.id === hpId && x.role === "HP") ?? null) : null;
    }
    case "HT":
      return cc.users.find((x) => x.role === "HT") ?? null;
    default:
      return null;
  }
}

/** Người duyệt của u (mục 3.2). u không làm KPI hoặc không tìm thấy → null. */
export function nguoiDuyet(u: NguoiDonVi, cc: CoCau): NguoiCoCau | null {
  return laDoiTuong(u.role) ? nguoiPhuTrach(CHUOI[u.role].duyet, u, cc) : null;
}

/** Người chốt của u (mục 3.2). u không làm KPI hoặc không tìm thấy → null. */
export function nguoiChot(u: NguoiDonVi, cc: CoCau): NguoiCoCau | null {
  return laDoiTuong(u.role) ? nguoiPhuTrach(CHUOI[u.role].chot, u, cc) : null;
}

/** "Chưa có <chức danh> phụ trách, vui lòng liên hệ admin" nếu u thiếu người duyệt / người chốt. */
export function lyDoThieuNguoi(u: NguoiDonVi, cc: CoCau, loai: "duyet" | "chot"): string | null {
  if (!laDoiTuong(u.role)) return null;
  const nguoi = loai === "duyet" ? nguoiDuyet(u, cc) : nguoiChot(u, cc);
  if (nguoi) return null;
  const role = loai === "duyet" ? CHUOI[u.role].duyet : CHUOI[u.role].chot;
  return `Chưa có ${chucDanh(role)} phụ trách, vui lòng liên hệ admin.`;
}

/** Thiếu người duyệt hoặc người chốt → chặn Gửi đăng ký (A3). */
export function lyDoKhongGuiDangKy(u: NguoiDonVi, cc: CoCau): string | null {
  return lyDoThieuNguoi(u, cc, "duyet") ?? lyDoThieuNguoi(u, cc, "chot");
}

/** Những người mà m là người duyệt (màn hình Duyệt). */
export function nguoiToiDuyet(m: NguoiDonVi, cc: CoCau): NguoiCoCau[] {
  const viTri = viTriDuocDuyet(m.role);
  if (!viTri) return [];
  return cc.users.filter((u) => u.role === viTri && nguoiDuyet(u, cc)?.id === m.id);
}

/** Những người mà m là người chốt trên màn hình Chốt (không gồm HP: HT chốt HP ở màn hình Duyệt). */
export function nguoiToiChot(m: NguoiDonVi, cc: CoCau): NguoiCoCau[] {
  const viTri = viTriDuocChot(m.role);
  if (!viTri) return [];
  return cc.users.filter((u) => u.role === viTri && nguoiChot(u, cc)?.id === m.id);
}

/** Phạm vi Xuất báo cáo (mục 6.3): các vị trí và những người trong đơn vị của m. Không gồm chính m. */
export function phamViBaoCao(m: NguoiDonVi, cc: CoCau): { viTris: DoiTuong[]; nguoi: NguoiCoCau[] } {
  const viTris = PHAM_VI_BAO_CAO[m.role] ?? [];
  const trongDonVi = (u: NguoiCoCau): boolean => {
    switch (m.role) {
      case "TBM":
        return !!m.boMonId && u.boMonId === m.boMonId;
      case "TK":
        return !!m.khoaId && khoaCua(u, cc) === m.khoaId;
      case "HP": {
        const khoa = khoaCua(u, cc);
        return !!khoa && khoaPhuTrach(m.id, cc).includes(khoa);
      }
      case "HT":
        return true;
      default:
        return false;
    }
  };
  const nguoi = cc.users.filter(
    (u) => u.id !== m.id && (viTris as readonly Role[]).includes(u.role) && trongDonVi(u),
  );
  return { viTris, nguoi };
}

/**
 * Phạm vi "Theo dõi kết quả đã chốt" (spec-v1.6 mục 8.2): HP → GV, TBM thuộc các khoa mình phụ trách; HT → GV, TBM,
 * TK, HP toàn trường. Vai trò khác → rỗng. Dùng chung cho trang Theo dõi và quyền xem file.
 */
export function phamViTheoDoi(m: NguoiDonVi, cc: CoCau): { viTris: DoiTuong[]; nguoi: NguoiCoCau[] } {
  const viTris = PHAM_VI_THEO_DOI[m.role] ?? [];
  const khoas = m.role === "HP" ? khoaPhuTrach(m.id, cc) : null;
  const nguoi = cc.users.filter((u) => {
    if (u.id === m.id || !(viTris as readonly Role[]).includes(u.role)) return false;
    if (!khoas) return true;
    const khoa = khoaCua(u, cc);
    return !!khoa && khoas.includes(khoa);
  });
  return { viTris, nguoi };
}

/** Tên đơn vị của một người (cột "Đơn vị"): bộ môn, khoa, các khoa phụ trách, hoặc "Toàn trường". */
export function tenDonVi(u: NguoiDonVi, cc: CoCau): string {
  switch (u.role) {
    case "GV":
    case "TBM":
      return cc.boMons.find((b) => b.id === u.boMonId)?.ten ?? "—";
    case "TK":
      return cc.khoas.find((k) => k.id === u.khoaId)?.ten ?? "—";
    case "HP": {
      const ten = cc.khoas.filter((k) => k.hieuPhoId === u.id).map((k) => k.ten);
      return ten.length ? ten.join(", ") : "Chưa phụ trách khoa nào";
    }
    default:
      return "Toàn trường";
  }
}

/** Cảnh báo đơn vị đang thiếu người duyệt/chốt (trang Xem cấu hình của admin). */
export function canhBaoThieuNguoi(cc: CoCau): string[] {
  const ds: string[] = [];
  for (const b of cc.boMons) {
    if (!cc.users.some((u) => u.role === "TBM" && u.boMonId === b.id)) {
      ds.push(`${b.ten} chưa có trưởng bộ môn: giáo viên của bộ môn không có người duyệt.`);
    }
  }
  for (const k of cc.khoas) {
    if (!cc.users.some((u) => u.role === "TK" && u.khoaId === k.id)) {
      ds.push(`${k.ten} chưa có trưởng khoa: giáo viên thiếu người chốt, trưởng bộ môn thiếu người duyệt.`);
    }
    if (!k.hieuPhoId || !cc.users.some((u) => u.id === k.hieuPhoId && u.role === "HP")) {
      ds.push(`${k.ten} chưa có hiệu phó phụ trách: trưởng bộ môn thiếu người chốt, trưởng khoa thiếu người duyệt.`);
    }
  }
  if (!cc.users.some((u) => u.role === "HT")) {
    ds.push("Trường chưa có hiệu trưởng: trưởng khoa thiếu người chốt, hiệu phó thiếu người duyệt và chốt.");
  }
  return ds;
}
