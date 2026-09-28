import { describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import {
  canhBaoThieuNguoi,
  lyDoKhongGuiDangKy,
  lyDoThieuNguoi,
  nguoiChot,
  nguoiDuyet,
  nguoiToiChot,
  nguoiToiDuyet,
  phamViBaoCao,
  phamViTheoDoi,
  tenDonVi,
  type CoCau,
  type NguoiCoCau,
} from "./co-cau";

function nguoi(id: string, role: Role, donVi: { boMonId?: string; khoaId?: string } = {}): NguoiCoCau {
  return { id, role, hoTen: id, username: id, boMonId: donVi.boMonId ?? null, khoaId: donVi.khoaId ?? null };
}

/** Giống seed: 1 khoa (HP phụ trách), 1 bộ môn, đủ 6 vai trò. */
function coCauSeed(): CoCau {
  return {
    boMons: [{ id: "bm1", ten: "Bộ môn Khoa học máy tính", khoaId: "k1" }],
    khoas: [{ id: "k1", ten: "Khoa Công nghệ thông tin", hieuPhoId: "hp" }],
    users: [
      nguoi("admin", "ADMIN"),
      nguoi("ht", "HT"),
      nguoi("hp", "HP"),
      nguoi("tk", "TK", { khoaId: "k1" }),
      nguoi("tbm", "TBM", { boMonId: "bm1" }),
      nguoi("gv1", "GV", { boMonId: "bm1" }),
      nguoi("gv2", "GV", { boMonId: "bm1" }),
    ],
  };
}

/** 2 khoa, mỗi khoa 1 bộ môn; hp1 phụ trách cả 2 khoa, hp2 chưa phụ trách khoa nào. */
function coCauHaiKhoa(): CoCau {
  return {
    boMons: [
      { id: "bm1", ten: "Bộ môn 1", khoaId: "k1" },
      { id: "bm2", ten: "Bộ môn 2", khoaId: "k2" },
    ],
    khoas: [
      { id: "k1", ten: "Khoa 1", hieuPhoId: "hp1" },
      { id: "k2", ten: "Khoa 2", hieuPhoId: "hp1" },
    ],
    users: [
      nguoi("ht", "HT"),
      nguoi("hp1", "HP"),
      nguoi("hp2", "HP"),
      nguoi("tk1", "TK", { khoaId: "k1" }),
      nguoi("tk2", "TK", { khoaId: "k2" }),
      nguoi("tbm1", "TBM", { boMonId: "bm1" }),
      nguoi("tbm2", "TBM", { boMonId: "bm2" }),
      nguoi("gv1", "GV", { boMonId: "bm1" }),
      nguoi("gv2", "GV", { boMonId: "bm2" }),
    ],
  };
}

const u = (cc: CoCau, id: string) => cc.users.find((x) => x.id === id)!;
const ids = (ds: { id: string }[]) => ds.map((x) => x.id).sort();

describe("nguoiDuyet / nguoiChot – đủ 4 vị trí (mục 3.2)", () => {
  const cc = coCauSeed();
  it.each([
    ["gv1", "tbm", "tk"],
    ["tbm", "tk", "hp"],
    ["tk", "hp", "ht"],
    ["hp", "ht", "ht"],
  ])("%s → duyệt %s, chốt %s", (nguoiLam, duyet, chot) => {
    expect(nguoiDuyet(u(cc, nguoiLam), cc)?.id).toBe(duyet);
    expect(nguoiChot(u(cc, nguoiLam), cc)?.id).toBe(chot);
  });

  it("HT, Admin không làm KPI → không có người duyệt/chốt", () => {
    for (const id of ["ht", "admin"]) {
      expect(nguoiDuyet(u(cc, id), cc)).toBeNull();
      expect(nguoiChot(u(cc, id), cc)).toBeNull();
      expect(lyDoThieuNguoi(u(cc, id), cc, "duyet")).toBeNull();
    }
  });

  it("đủ người → không chặn gửi", () => {
    for (const id of ["gv1", "tbm", "tk", "hp"]) expect(lyDoKhongGuiDangKy(u(cc, id), cc)).toBeNull();
  });
});

describe("báo thiếu người", () => {
  it("thiếu TBM → GV không có người duyệt", () => {
    const cc = coCauSeed();
    cc.users = cc.users.filter((x) => x.role !== "TBM");
    expect(nguoiDuyet(u(cc, "gv1"), cc)).toBeNull();
    expect(nguoiChot(u(cc, "gv1"), cc)?.id).toBe("tk");
    expect(lyDoThieuNguoi(u(cc, "gv1"), cc, "duyet")).toBe("Chưa có trưởng bộ môn phụ trách, vui lòng liên hệ admin.");
    expect(lyDoKhongGuiDangKy(u(cc, "gv1"), cc)).toBe("Chưa có trưởng bộ môn phụ trách, vui lòng liên hệ admin.");
  });

  it("thiếu TK → GV thiếu người chốt, TBM thiếu người duyệt", () => {
    const cc = coCauSeed();
    cc.users = cc.users.filter((x) => x.role !== "TK");
    expect(nguoiChot(u(cc, "gv1"), cc)).toBeNull();
    expect(lyDoThieuNguoi(u(cc, "gv1"), cc, "chot")).toBe("Chưa có trưởng khoa phụ trách, vui lòng liên hệ admin.");
    expect(nguoiDuyet(u(cc, "tbm"), cc)).toBeNull();
    expect(lyDoKhongGuiDangKy(u(cc, "gv1"), cc)).toMatch(/trưởng khoa/);
  });

  it("xóa hiệu phó (khoa chưa có HP) → TBM thiếu người chốt, TK thiếu người duyệt, cả hai bị chặn gửi", () => {
    const cc = coCauSeed();
    cc.users = cc.users.filter((x) => x.role !== "HP");
    cc.khoas[0].hieuPhoId = null;
    expect(nguoiDuyet(u(cc, "tbm"), cc)?.id).toBe("tk");
    expect(nguoiChot(u(cc, "tbm"), cc)).toBeNull();
    expect(nguoiDuyet(u(cc, "tk"), cc)).toBeNull();
    const loi = "Chưa có hiệu phó phụ trách, vui lòng liên hệ admin.";
    expect(lyDoKhongGuiDangKy(u(cc, "tbm"), cc)).toBe(loi);
    expect(lyDoKhongGuiDangKy(u(cc, "tk"), cc)).toBe(loi);
    // GV không bị ảnh hưởng.
    expect(lyDoKhongGuiDangKy(u(cc, "gv1"), cc)).toBeNull();
  });

  it("hieuPhoId trỏ tới người không còn là HP → coi như thiếu", () => {
    const cc = coCauSeed();
    u(cc, "hp").role = "GV";
    expect(nguoiChot(u(cc, "tbm"), cc)).toBeNull();
  });

  it("thiếu HT → TK thiếu người chốt, HP thiếu người duyệt và chốt", () => {
    const cc = coCauSeed();
    cc.users = cc.users.filter((x) => x.role !== "HT");
    expect(nguoiChot(u(cc, "tk"), cc)).toBeNull();
    expect(nguoiDuyet(u(cc, "hp"), cc)).toBeNull();
    expect(nguoiChot(u(cc, "hp"), cc)).toBeNull();
    expect(lyDoKhongGuiDangKy(u(cc, "hp"), cc)).toBe("Chưa có hiệu trưởng phụ trách, vui lòng liên hệ admin.");
  });

  it("cảnh báo đơn vị thiếu người cho admin", () => {
    expect(canhBaoThieuNguoi(coCauSeed())).toEqual([]);
    const cc = coCauSeed();
    cc.users = cc.users.filter((x) => x.role !== "HP" && x.role !== "TBM");
    cc.khoas[0].hieuPhoId = null;
    const ds = canhBaoThieuNguoi(cc);
    expect(ds).toHaveLength(2);
    expect(ds[0]).toMatch(/Bộ môn Khoa học máy tính chưa có trưởng bộ môn/);
    expect(ds[1]).toMatch(/Khoa Công nghệ thông tin chưa có hiệu phó phụ trách/);
  });
});

describe("lọc theo đơn vị (nhiều khoa/bộ môn)", () => {
  const cc = coCauHaiKhoa();

  it("người duyệt/chốt đúng đơn vị", () => {
    expect(nguoiDuyet(u(cc, "gv2"), cc)?.id).toBe("tbm2");
    expect(nguoiChot(u(cc, "gv2"), cc)?.id).toBe("tk2");
    expect(nguoiDuyet(u(cc, "tbm2"), cc)?.id).toBe("tk2");
    expect(nguoiChot(u(cc, "tbm2"), cc)?.id).toBe("hp1");
    expect(nguoiDuyet(u(cc, "tk2"), cc)?.id).toBe("hp1");
  });

  it("những người mình duyệt / chốt", () => {
    expect(ids(nguoiToiDuyet(u(cc, "tbm1"), cc))).toEqual(["gv1"]);
    expect(ids(nguoiToiDuyet(u(cc, "tk1"), cc))).toEqual(["tbm1"]);
    expect(ids(nguoiToiChot(u(cc, "tk1"), cc))).toEqual(["gv1"]);
    expect(ids(nguoiToiDuyet(u(cc, "hp1"), cc))).toEqual(["tk1", "tk2"]);
    expect(ids(nguoiToiChot(u(cc, "hp1"), cc))).toEqual(["tbm1", "tbm2"]);
    expect(nguoiToiDuyet(u(cc, "hp2"), cc)).toEqual([]);
    expect(nguoiToiChot(u(cc, "hp2"), cc)).toEqual([]);
    expect(ids(nguoiToiDuyet(u(cc, "ht"), cc))).toEqual(["hp1", "hp2"]);
    // HT chốt task HP ngay ở màn hình Duyệt → màn hình Chốt chỉ có TK.
    expect(ids(nguoiToiChot(u(cc, "ht"), cc))).toEqual(["tk1", "tk2"]);
    // GV không duyệt/chốt ai; TBM không chốt ai.
    expect(nguoiToiDuyet(u(cc, "gv1"), cc)).toEqual([]);
    expect(nguoiToiChot(u(cc, "tbm1"), cc)).toEqual([]);
  });

  it("phạm vi báo cáo (mục 6.3)", () => {
    expect(phamViBaoCao(u(cc, "tbm1"), cc)).toMatchObject({ viTris: ["GV"] });
    expect(ids(phamViBaoCao(u(cc, "tbm1"), cc).nguoi)).toEqual(["gv1"]);
    expect(phamViBaoCao(u(cc, "tk2"), cc).viTris).toEqual(["GV", "TBM"]);
    expect(ids(phamViBaoCao(u(cc, "tk2"), cc).nguoi)).toEqual(["gv2", "tbm2"]);
    expect(phamViBaoCao(u(cc, "hp1"), cc).viTris).toEqual(["GV", "TBM", "TK"]);
    expect(ids(phamViBaoCao(u(cc, "hp1"), cc).nguoi)).toEqual(["gv1", "gv2", "tbm1", "tbm2", "tk1", "tk2"]);
    expect(phamViBaoCao(u(cc, "hp2"), cc).nguoi).toEqual([]);
    expect(phamViBaoCao(u(cc, "ht"), cc).viTris).toEqual(["GV", "TBM", "TK", "HP"]);
    expect(ids(phamViBaoCao(u(cc, "ht"), cc).nguoi)).toEqual(
      ["gv1", "gv2", "hp1", "hp2", "tbm1", "tbm2", "tk1", "tk2"].sort(),
    );
    expect(phamViBaoCao(u(cc, "gv1"), cc)).toEqual({ viTris: [], nguoi: [] });
  });

  it("tên đơn vị", () => {
    expect(tenDonVi(u(cc, "gv2"), cc)).toBe("Bộ môn 2");
    expect(tenDonVi(u(cc, "tk1"), cc)).toBe("Khoa 1");
    expect(tenDonVi(u(cc, "hp1"), cc)).toBe("Khoa 1, Khoa 2");
    expect(tenDonVi(u(cc, "hp2"), cc)).toBe("Chưa phụ trách khoa nào");
    expect(tenDonVi(u(cc, "ht"), cc)).toBe("Toàn trường");
  });
});

describe("phạm vi Theo dõi kết quả đã chốt (spec-v1.6 mục 8.2)", () => {
  // Mỗi khoa một hiệu phó: hp1 → Khoa 1, hp2 → Khoa 2.
  const cc: CoCau = {
    ...coCauHaiKhoa(),
    khoas: [
      { id: "k1", ten: "Khoa 1", hieuPhoId: "hp1" },
      { id: "k2", ten: "Khoa 2", hieuPhoId: "hp2" },
    ],
  };

  it("HP: chỉ GV và TBM thuộc khoa mình phụ trách; không thấy TK, HP, khoa khác", () => {
    expect(phamViTheoDoi(u(cc, "hp1"), cc).viTris).toEqual(["GV", "TBM"]);
    expect(ids(phamViTheoDoi(u(cc, "hp1"), cc).nguoi)).toEqual(["gv1", "tbm1"]);
    expect(ids(phamViTheoDoi(u(cc, "hp2"), cc).nguoi)).toEqual(["gv2", "tbm2"]);
  });

  it("HT: GV, TBM, TK, HP toàn trường", () => {
    expect(phamViTheoDoi(u(cc, "ht"), cc).viTris).toEqual(["GV", "TBM", "TK", "HP"]);
    expect(ids(phamViTheoDoi(u(cc, "ht"), cc).nguoi)).toEqual(["gv1", "gv2", "hp1", "hp2", "tbm1", "tbm2", "tk1", "tk2"]);
  });

  it("vai trò khác không có phạm vi", () => {
    for (const id of ["gv1", "tbm1", "tk1"]) expect(phamViTheoDoi(u(cc, id), cc)).toEqual({ viTris: [], nguoi: [] });
  });
});
