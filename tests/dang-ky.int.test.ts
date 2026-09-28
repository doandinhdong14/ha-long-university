// Đầu kỳ – đăng ký nhiệm vụ. v1.6 (docs/spec-v1.6.md mục 2, 12.3): mọi nhiệm vụ của vị trí đều bắt buộc, server tự
// quyết danh sách; client chỉ gửi có đăng ký cải tiến sáng tạo hay không.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { guiDangKy, luuDangKy } from "@/app/(app)/dau-ky/actions";
import { duyetDangKy, tuChoiDangKy } from "@/app/(app)/duyet/actions";
import type { DoiTuong } from "@/generated/prisma/enums";
import { damBaoNhiemVuCaiTien } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { chuoiThanhNgay, congNgay, homNayVN } from "@/lib/time";
import { dangNhapNhu, resetDb, user } from "./helpers";

let kyId: string;

async function nhiemVuThuong(doiTuong: DoiTuong) {
  return db.nhiemVu.findMany({ where: { kyId, doiTuong, laCaiTien: false }, orderBy: { thuTu: "asc" }, include: { tasks: true } });
}

async function dangKyCua(username: string) {
  const u = await user(username);
  return db.dangKy.findUniqueOrThrow({
    where: { kyId_userId: { kyId, userId: u.id } },
    include: { nhiemVus: { include: { nhiemVu: { select: { id: true, laCaiTien: true, doiTuong: true } } } } },
  });
}

/** Số nhiệm vụ thường + có cải tiến hay không trong đăng ký đã lưu. */
async function danhSachDaLuu(username: string) {
  const dk = await dangKyCua(username);
  return {
    soThuong: dk.nhiemVus.filter((x) => !x.nhiemVu.laCaiTien).length,
    caiTien: dk.nhiemVus.some((x) => x.nhiemVu.laCaiTien),
  };
}

async function datNgay(batDau: string, ketThuc: string) {
  await db.ky.update({ where: { id: kyId }, data: { ngayBatDau: chuoiThanhNgay(batDau), ngayKetThuc: chuoiThanhNgay(ketThuc) } });
}

beforeAll(async () => {
  await resetDb();
  kyId = (await db.ky.findFirstOrThrow()).id;
});

beforeEach(async () => {
  // Mỗi test bắt đầu với kỳ mở: bắt đầu hôm nay, kết thúc +30 ngày.
  await datNgay(homNayVN(), congNgay(homNayVN(), 30));
});

describe("cả 4 vị trí đăng ký và được đúng người duyệt (mục 3.2, 5.1, v1.6 mục 2)", () => {
  const BANG: [string, DoiTuong, number, boolean, string, string][] = [
    // người làm, vị trí, số nhiệm vụ của vị trí, cải tiến, người duyệt, người KHÔNG được duyệt
    ["gv.nguyenvanan", "GV", 10, true, "tbm.phamthibich", "tk.levankhoa"],
    ["tbm.phamthibich", "TBM", 6, false, "tk.levankhoa", "hp.tranthiphuong"],
    ["tk.levankhoa", "TK", 5, true, "hp.tranthiphuong", "ht.nguyenvanhieu"],
    ["hp.tranthiphuong", "HP", 5, false, "ht.nguyenvanhieu", "tbm.phamthibich"],
  ];

  for (const [lam, doiTuong, soNv, caiTien, duyet, khongDuoc] of BANG) {
    it(`${lam} (cải tiến: ${caiTien ? "Có" : "Không"}) → ${duyet} duyệt → giao task bắt buộc${caiTien ? " + 1 task cải tiến" : ""}`, async () => {
      await dangNhapNhu(lam);
      // Mọi vị trí đều có tổng 100 điểm → A1 (seed); cải tiến không cộng điểm.
      expect(await guiDangKy({ kyId, caiTien })).toEqual({
        ok: true,
        data: { tongDiem: 100, xepLoai: "A1", soNhiemVu: soNv, caiTien },
      });
      const dk = await dangKyCua(lam);
      expect(dk.trangThai).toBe("CHO_DUYET");
      expect(await danhSachDaLuu(lam)).toEqual({ soThuong: soNv, caiTien });

      // Người duyệt nhận thông báo, link tới trang chi tiết.
      const nguoiDuyet = await user(duyet);
      const tb = await db.thongBao.findFirstOrThrow({ where: { userId: nguoiDuyet.id }, orderBy: { taoLuc: "desc" } });
      expect(tb.noiDung).toMatch(/đã gửi danh sách đăng ký nhiệm vụ/);
      expect(tb.noiDung.includes("có đăng ký cải tiến sáng tạo")).toBe(caiTien);
      expect(tb.link).toBe(`/duyet/${dk.userId}?kyId=${kyId}&tab=dang-ky`);

      // Không phải người duyệt (kể cả người chốt) → không thấy.
      await dangNhapNhu(khongDuoc);
      expect(await duyetDangKy({ dangKyId: dk.id })).toMatchObject({ ok: false });
      expect((await dangKyCua(lam)).trangThai).toBe("CHO_DUYET");

      await dangNhapNhu(duyet);
      const r = await duyetDangKy({ dangKyId: dk.id, nhanXet: "Tốt" });
      expect(r.ok).toBe(true);
      const sau = await dangKyCua(lam);
      expect(sau).toMatchObject({ trangThai: "DA_DUYET", tongDiem: 100, xepLoai: "A1", nhanXet: "Tốt", nguoiDuyetId: nguoiDuyet.id });

      // Task: mọi task Bắt buộc của nhiệm vụ thường + 1 task Cải tiến nếu có đăng ký; không có task Mở rộng.
      const soBatBuoc = (await nhiemVuThuong(doiTuong)).flatMap((nv) => nv.tasks.filter((t) => t.loai === "BAT_BUOC")).length;
      const tasks = await db.kpiTask.findMany({ where: { userId: dk.userId, kyId }, include: { task: true } });
      expect(tasks.filter((t) => t.task.loai === "BAT_BUOC")).toHaveLength(soBatBuoc);
      expect(tasks.filter((t) => t.task.loai === "CAI_TIEN")).toHaveLength(caiTien ? 1 : 0);
      expect(tasks.filter((t) => t.task.loai === "MO_RONG")).toHaveLength(0);
      expect(tasks.every((t) => t.trangThai === "CHUA_LAM")).toBe(true);
      expect(r.ok && r.data.soTask).toBe(soBatBuoc + (caiTien ? 1 : 0));

      const tbLam = await db.thongBao.findFirstOrThrow({ where: { userId: dk.userId }, orderBy: { taoLuc: "desc" } });
      expect(tbLam.noiDung).toMatch(/đã được duyệt/);
    });
  }

  it("đã duyệt thì không đổi đăng ký được nữa (kể cả tick cải tiến)", async () => {
    await dangNhapNhu("gv.nguyenvanan");
    expect(await luuDangKy({ kyId, caiTien: false })).toEqual({
      ok: false,
      error: "Danh sách đã được duyệt, không thể thay đổi nhiệm vụ.",
    });
    expect(await danhSachDaLuu("gv.nguyenvanan")).toEqual({ soThuong: 10, caiTien: true });
  });
});

describe("luật đăng ký v1.6", () => {
  it("server tự quyết danh sách: đăng ký bị sửa tay (bớt nhiệm vụ, thêm nhiệm vụ vị trí khác, gửi kèm danh sách) → vẫn ghi đủ nhiệm vụ của vị trí", async () => {
    const binh = await user("gv.tranthibinh");
    const nvGv = await nhiemVuThuong("GV");
    const nvTbm = await nhiemVuThuong("TBM");
    // Dữ liệu nháp chỉ còn 1 nhiệm vụ GV + 1 nhiệm vụ TBM (vd client cũ / request sửa tay).
    await db.dangKy.create({
      data: { kyId, userId: binh.id, nhiemVus: { create: [{ nhiemVuId: nvGv[0].id }, { nhiemVuId: nvTbm[0].id }] } },
    });
    await dangNhapNhu("gv.tranthibinh");
    const suaTay = { kyId, caiTien: false, nhiemVuIds: [nvGv[0].id], chon: [nvTbm[1].id] } as Parameters<typeof guiDangKy>[0];
    expect(await guiDangKy(suaTay)).toEqual({ ok: true, data: { tongDiem: 100, xepLoai: "A1", soNhiemVu: 10, caiTien: false } });
    const dk = await dangKyCua("gv.tranthibinh");
    expect(dk.nhiemVus.map((x) => x.nhiemVu.id).sort()).toEqual(nvGv.map((x) => x.id).sort());
    expect(dk.nhiemVus.every((x) => x.nhiemVu.doiTuong === "GV")).toBe(true);
  });

  it("tick / bỏ tick cải tiến khi Nháp được (tự lưu, luôn kèm đủ nhiệm vụ); khi Chờ duyệt bị khóa", async () => {
    await dangNhapNhu("gv.levancuong");
    expect(await luuDangKy({ kyId, caiTien: true })).toEqual({ ok: true, data: undefined });
    expect(await danhSachDaLuu("gv.levancuong")).toEqual({ soThuong: 10, caiTien: true });
    expect((await dangKyCua("gv.levancuong")).trangThai).toBe("NHAP");
    expect((await luuDangKy({ kyId, caiTien: false })).ok).toBe(true);
    expect(await danhSachDaLuu("gv.levancuong")).toEqual({ soThuong: 10, caiTien: false });
    expect((await luuDangKy({ kyId, caiTien: true })).ok).toBe(true);

    expect((await guiDangKy({ kyId, caiTien: true })).ok).toBe(true);
    expect(await luuDangKy({ kyId, caiTien: false })).toEqual({ ok: false, error: "Danh sách đang chờ duyệt, chưa sửa được." });
    expect(await guiDangKy({ kyId, caiTien: false })).toEqual({ ok: false, error: "Danh sách đang chờ duyệt, chưa sửa được." });
    expect(await danhSachDaLuu("gv.levancuong")).toEqual({ soThuong: 10, caiTien: true });
  });

  it("giá trị cải tiến không hợp lệ → báo lỗi, không ghi gì", async () => {
    await dangNhapNhu("tbm.phamthibich");
    const sai = { kyId, caiTien: "co" } as unknown as Parameters<typeof luuDangKy>[0];
    expect(await luuDangKy(sai)).toEqual({ ok: false, error: "Giá trị đăng ký cải tiến không hợp lệ." });
  });

  it("vị trí chưa có nhiệm vụ nào → \"Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin\", không gửi được", async () => {
    const ky3 = await db.ky.create({
      data: {
        ten: "Kỳ 3 – 2026-2027",
        namHoc: "2026-2027",
        soKy: 3,
        ngayBatDau: chuoiThanhNgay(homNayVN()),
        ngayKetThuc: chuoiThanhNgay(congNgay(homNayVN(), 30)),
        daCongBo: true,
      },
    });
    await db.$transaction((tx) => damBaoNhiemVuCaiTien(tx, ky3.id)); // chỉ có nhiệm vụ cải tiến
    await dangNhapNhu("gv.tranthibinh");
    expect(await guiDangKy({ kyId: ky3.id, caiTien: true })).toEqual({
      ok: false,
      error: "Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin.",
    });
    await db.ky.delete({ where: { id: ky3.id } });
  });

  it("HT, Admin không làm KPI → bị chặn", async () => {
    for (const u of ["ht.nguyenvanhieu", "admin.quantri"]) {
      await dangNhapNhu(u);
      expect(await luuDangKy({ kyId, caiTien: true })).toEqual({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." });
      expect(await guiDangKy({ kyId, caiTien: true })).toEqual({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." });
    }
  });

  it("hết hạn đăng ký mà chưa gửi → không lưu, không gửi được (giữ luật cũ)", async () => {
    await datNgay(congNgay(homNayVN(), -1), congNgay(homNayVN(), 30));
    await dangNhapNhu("gv.tranthibinh");
    await db.dangKy.update({ where: { id: (await dangKyCua("gv.tranthibinh")).id }, data: { trangThai: "NHAP" } });
    expect(await guiDangKy({ kyId, caiTien: false })).toEqual({ ok: false, error: "Đã hết hạn đăng ký (23:59 ngày bắt đầu kỳ)." });
    expect(await luuDangKy({ kyId, caiTien: true })).toMatchObject({ ok: false });
  });

  it("bị từ chối sau ngày bắt đầu → vẫn sửa cải tiến và gửi lại được (trước deadline); từ chối bắt buộc nhận xét", async () => {
    const dk = await dangKyCua("gv.levancuong"); // Chờ duyệt, có cải tiến (test trên)
    await dangNhapNhu("tbm.phamthibich");
    expect(await tuChoiDangKy({ dangKyId: dk.id, nhanXet: "  " })).toEqual({ ok: false, error: "Vui lòng nhập nhận xét." });
    expect((await tuChoiDangKy({ dangKyId: dk.id, nhanXet: "Chưa rõ hướng cải tiến" })).ok).toBe(true);
    expect((await dangKyCua("gv.levancuong")).trangThai).toBe("TU_CHOI");

    await datNgay(congNgay(homNayVN(), -5), congNgay(homNayVN(), 30));
    await dangNhapNhu("gv.levancuong");
    expect((await luuDangKy({ kyId, caiTien: false })).ok).toBe(true);
    // Trong lúc sửa vẫn là Bị từ chối (B6).
    expect((await dangKyCua("gv.levancuong")).trangThai).toBe("TU_CHOI");
    expect(await guiDangKy({ kyId, caiTien: false })).toEqual({
      ok: true,
      data: { tongDiem: 100, xepLoai: "A1", soNhiemVu: 10, caiTien: false },
    });
    const sau = await dangKyCua("gv.levancuong");
    expect(sau.trangThai).toBe("CHO_DUYET");
    expect(sau.nhanXet).toBeNull();

    // Hết deadline → người duyệt không duyệt được nữa.
    await datNgay(congNgay(homNayVN(), -30), congNgay(homNayVN(), -1));
    await dangNhapNhu("tbm.phamthibich");
    expect(await duyetDangKy({ dangKyId: sau.id })).toEqual({
      ok: false,
      error: "Đã hết deadline của kỳ, mọi thao tác đã bị khóa.",
    });
  });

  it("kỳ đã chốt → chặn", async () => {
    const dk = await dangKyCua("gv.levancuong");
    await db.ky.update({ where: { id: kyId }, data: { daChot: true } });
    await dangNhapNhu("tbm.phamthibich");
    expect(await duyetDangKy({ dangKyId: dk.id })).toEqual({ ok: false, error: "Kỳ đã chốt, không thể thao tác." });
    await dangNhapNhu("gv.levancuong");
    expect(await luuDangKy({ kyId, caiTien: true })).toEqual({ ok: false, error: "Kỳ đã chốt, không thể thao tác." });
    await db.ky.update({ where: { id: kyId }, data: { daChot: false } });
  });
});

describe("A3: thiếu người duyệt / người chốt → chặn gửi", () => {
  it("khoa chưa có hiệu phó → TBM (thiếu người chốt) và TK (thiếu người duyệt) bị chặn", async () => {
    const khoa = await db.khoa.findFirstOrThrow();
    await db.khoa.update({ where: { id: khoa.id }, data: { hieuPhoId: null } });
    // Reset đăng ký của TBM, TK để thử gửi lại từ đầu.
    await db.dangKy.deleteMany({ where: { user: { username: { in: ["tbm.phamthibich", "tk.levankhoa"] } } } });
    await db.kpiTask.deleteMany({ where: { user: { username: { in: ["tbm.phamthibich", "tk.levankhoa"] } } } });

    const loi = { ok: false, error: "Chưa có hiệu phó phụ trách, vui lòng liên hệ admin." };
    await dangNhapNhu("tbm.phamthibich");
    expect(await guiDangKy({ kyId, caiTien: false })).toEqual(loi);
    await dangNhapNhu("tk.levankhoa");
    expect(await guiDangKy({ kyId, caiTien: true })).toEqual(loi);
    // Bị chặn thì không có gì được ghi (transaction hoàn tác, không để lại đăng ký Chờ duyệt).
    expect(await db.dangKy.count({ where: { user: { username: "tbm.phamthibich" }, trangThai: { not: "NHAP" } } })).toBe(0);

    await db.khoa.update({ where: { id: khoa.id }, data: { hieuPhoId: (await user("hp.tranthiphuong")).id } });
    await dangNhapNhu("tbm.phamthibich");
    expect((await guiDangKy({ kyId, caiTien: false })).ok).toBe(true);
  });
});
