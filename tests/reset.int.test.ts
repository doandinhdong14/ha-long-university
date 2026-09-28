import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { chotKyNgay, resetDuLieuHeThong } from "@/app/(app)/admin/phan-viec/actions";
import { POST as apiQuyDinh } from "@/app/api/quy-dinh/route";
import { db } from "@/lib/db";
import { dangKyVaDuyet, dangNhapNhu, fileMau, kyDau, lamTask, resetDb, taskCua } from "./helpers";

let kyId: string;

async function demDuLieu() {
  const [dangKy, kpiTask, baiNop, file, yeuCau, ketQua, vanBan, thongBao] = await Promise.all([
    db.dangKy.count(),
    db.kpiTask.count(),
    db.baiNop.count(),
    db.fileDinhKem.count(),
    db.yeuCauThemTask.count(),
    db.ketQuaKy.count(),
    db.vanBan.count(),
    db.thongBao.count(),
  ]);
  return { dangKy, kpiTask, baiNop, file, yeuCau, ketQua, vanBan, thongBao };
}

async function demCauHinh() {
  const [user, khoa, boMon, ky, nhiemVu, task, bac] = await Promise.all([
    db.user.count(),
    db.khoa.count(),
    db.boMon.count(),
    db.ky.count(),
    db.nhiemVu.count(),
    db.task.count(),
    db.bacXepLoai.count(),
  ]);
  return { user, khoa, boMon, ky, nhiemVu, task, bac };
}

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
  await dangKyVaDuyet("gv.nguyenvanan");
  const [t1] = await taskCua("gv.nguyenvanan");
  await lamTask("gv.nguyenvanan", t1.id, "DA_CHOT");

  await dangNhapNhu("ht.nguyenvanhieu");
  const fd = new FormData();
  fd.append("tieuDe", "Quy định chấm KPI");
  fd.append("noiDung", "Nội dung quy định.");
  fd.append("viTriNhan", "GV");
  fd.append("files", fileMau("quy-dinh.pdf"));
  const res = await apiQuyDinh(new Request("http://localhost/api/quy-dinh", { method: "POST", body: fd }));
  expect(res.status).toBe(201);

  await dangNhapNhu("admin.quantri");
  expect((await chotKyNgay(kyId)).ok).toBe(true);
});

describe("Admin reset dữ liệu", () => {
  it("chỉ admin được reset", async () => {
    for (const u of ["gv.nguyenvanan", "tbm.phamthibich", "ht.nguyenvanhieu"]) {
      await dangNhapNhu(u);
      expect(await resetDuLieuHeThong(), u).toEqual({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." });
    }
    expect((await demDuLieu()).baiNop).toBeGreaterThan(0);
  });

  it("xóa minh chứng, tài liệu, file trên ổ đĩa và dữ liệu KPI; giữ tài khoản, kỳ, phân việc; mở lại kỳ đã chốt", async () => {
    const truoc = await demDuLieu();
    expect(truoc).toMatchObject({ dangKy: 1, baiNop: 1, file: 2, vanBan: 1 });
    expect(truoc.ketQua).toBeGreaterThan(0);
    expect(truoc.thongBao).toBeGreaterThan(0);
    const cauHinh = await demCauHinh();
    const duongDans = (await db.fileDinhKem.findMany()).map((f) => resolve(process.env.UPLOAD_DIR!, f.duongDan));
    expect(duongDans.every((p) => existsSync(p))).toBe(true);

    await dangNhapNhu("admin.quantri");
    expect(await resetDuLieuHeThong()).toEqual({ ok: true, data: { soMinhChung: 1, soTaiLieu: 1, soFile: 2 } });

    expect(await demDuLieu()).toEqual({ dangKy: 0, kpiTask: 0, baiNop: 0, file: 0, yeuCau: 0, ketQua: 0, vanBan: 0, thongBao: 0 });
    expect(await demCauHinh()).toEqual(cauHinh);
    expect(duongDans.some((p) => existsSync(p))).toBe(false);
    expect(await db.ky.findUniqueOrThrow({ where: { id: kyId } })).toMatchObject({ daCongBo: true, daChot: false });
  });

  it("sau reset làm lại KPI được ngay; tài khoản vẫn đăng nhập như cũ", async () => {
    await dangKyVaDuyet("gv.nguyenvanan");
    const [t1] = await taskCua("gv.nguyenvanan");
    await lamTask("gv.nguyenvanan", t1.id, "DA_CHOT");
    expect(await db.kpiTask.findUniqueOrThrow({ where: { id: t1.id } })).toMatchObject({ trangThai: "DA_CHOT" });
  });
});
