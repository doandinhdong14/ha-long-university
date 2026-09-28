import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { nhanChoNguoiLam } from "@/lib/kpi/trang-thai";
import { tinhKetQua } from "@/lib/services/ket-qua";
import { dangKyVaDuyet, dangNhapNhu, kyDau, lamTask, nop, resetDb, taskCua, thaoTac, user } from "./helpers";

let kyId: string;

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
  await dangKyVaDuyet("gv.tranthibinh", 1); // 3 task bắt buộc
  await dangKyVaDuyet("tbm.phamthibich", 1);
  await dangKyVaDuyet("tk.levankhoa", 1);
});

async function kt(id: string) {
  return db.kpiTask.findUniqueOrThrow({ where: { id } });
}
async function phanTram(username: string) {
  return (await tinhKetQua(kyId, (await user(username)).id))!.phanTram;
}

describe("vòng trạng thái đầy đủ task GV (mục 5.3)", () => {
  it("duyệt (lên Chờ chốt) → TK trả về (bắt buộc nhận xét) → TBM trả làm lại → nộp lại → duyệt → TK chốt; % chỉ tăng khi chốt", async () => {
    const [t1] = await taskCua("gv.tranthibinh");
    await lamTask("gv.tranthibinh", t1.id, "CHO_CHOT");
    expect(await phanTram("gv.tranthibinh")).toBe(0);

    await dangNhapNhu("tk.levankhoa");
    expect(await thaoTac(t1.id, "TRA_VE")).toEqual({ ok: false, error: "Vui lòng nhập nhận xét." });
    expect(await thaoTac(t1.id, "TRA_VE", "Minh chứng chưa có dấu")).toEqual({ ok: true, data: { trangThai: "TRA_VE" } });
    const sauTraVe = await kt(t1.id);
    expect(sauTraVe.nhanXetChot).toBe("Minh chứng chưa có dấu");
    // Người làm KPI chỉ thấy trạng thái; bài nộp (người làm KPI xem được) không chứa nhận xét của người chốt.
    expect(nhanChoNguoiLam(sauTraVe.trangThai, "GV")).toBe("Trưởng khoa trả về – chờ trưởng bộ môn xử lý");
    const bn = await db.baiNop.findFirstOrThrow({ where: { kpiTaskId: t1.id } });
    expect(bn.nhanXet).not.toBe("Minh chứng chưa có dấu");
    // Người duyệt được thông báo trả về.
    const tbm = await user("tbm.phamthibich");
    const tb = await db.thongBao.findFirstOrThrow({ where: { userId: tbm.id }, orderBy: { taoLuc: "desc" } });
    expect(tb.noiDung).toMatch(/trả về task .*Minh chứng chưa có dấu/);
    // Người chốt không làm được gì thêm khi task đang ở người duyệt.
    expect((await thaoTac(t1.id, "CHOT")).ok).toBe(false);

    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t1.id, "TRA_LAM_LAI")).toEqual({ ok: false, error: "Vui lòng nhập nhận xét." });
    expect(await thaoTac(t1.id, "TRA_LAM_LAI", "Đóng dấu rồi nộp lại")).toEqual({ ok: true, data: { trangThai: "TU_CHOI" } });
    expect((await db.baiNop.findUniqueOrThrow({ where: { id: bn.id } })).nhanXet).toBe("Đóng dấu rồi nộp lại");

    await dangNhapNhu("gv.tranthibinh");
    expect((await nop(t1.id)).status).toBe(201);
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t1.id, "DUYET")).toEqual({ ok: true, data: { trangThai: "CHO_CHOT" } });
    expect(await phanTram("gv.tranthibinh")).toBe(0);

    await dangNhapNhu("tk.levankhoa");
    expect(await thaoTac(t1.id, "CHOT")).toEqual({ ok: true, data: { trangThai: "DA_CHOT" } });
    const sau = await kt(t1.id);
    expect(sau.nguoiChotId).toBe((await user("tk.levankhoa")).id);
    expect(sau.chotLuc).not.toBeNull();
    expect(await phanTram("gv.tranthibinh")).toBe(33.33);

    // Chốt → thông báo người làm KPI và người duyệt.
    const gv = await user("gv.tranthibinh");
    expect((await db.thongBao.findFirstOrThrow({ where: { userId: gv.id }, orderBy: { taoLuc: "desc" } })).noiDung).toMatch(
      /đã được chốt – hoàn thành/,
    );
    expect((await db.thongBao.findFirstOrThrow({ where: { userId: tbm.id }, orderBy: { taoLuc: "desc" } })).noiDung).toMatch(
      /đã được chốt/,
    );
    const lichSu = await db.lichSuTask.findMany({ where: { kpiTaskId: t1.id }, orderBy: { luc: "asc" } });
    expect(lichSu.map((l) => l.hanhDong)).toEqual(["NOP", "DUYET", "TRA_VE", "TU_CHOI", "NOP", "DUYET", "CHOT"]);
  });

  it("trả về → người duyệt Duyệt lại → task lên thẳng Chờ chốt → chốt (v1.6)", async () => {
    const [, t2] = await taskCua("gv.tranthibinh");
    await lamTask("gv.tranthibinh", t2.id, "CHO_CHOT");
    await dangNhapNhu("tk.levankhoa");
    await thaoTac(t2.id, "TRA_VE", "Xem lại");
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t2.id, "DUYET_LAI")).toEqual({ ok: true, data: { trangThai: "CHO_CHOT" } });
    expect((await kt(t2.id)).guiChotLuc).not.toBeNull();
    await dangNhapNhu("tk.levankhoa");
    expect((await thaoTac(t2.id, "CHOT")).ok).toBe(true);
  });

  it("người chốt không chốt được task chưa được duyệt; duyệt xong chốt được ngay; đã chốt thì không ai sửa được", async () => {
    const [t1, , t3] = await taskCua("gv.tranthibinh");
    await dangNhapNhu("gv.tranthibinh");
    await nop(t3.id);
    await dangNhapNhu("tk.levankhoa");
    expect(await thaoTac(t3.id, "CHOT")).toEqual({ ok: false, error: "Không tìm thấy task." });
    await dangNhapNhu("tbm.phamthibich");
    await thaoTac(t3.id, "DUYET");
    await dangNhapNhu("tk.levankhoa");
    expect(await thaoTac(t3.id, "CHOT")).toEqual({ ok: true, data: { trangThai: "DA_CHOT" } });
    expect(await thaoTac(t1.id, "TRA_VE", "x")).toEqual({ ok: false, error: "Task đã chốt, không ai sửa được." });
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t1.id, "HUY_DUYET")).toEqual({ ok: false, error: "Task đã chốt, không ai sửa được." });
  });
});

describe("người chốt đúng cấp", () => {
  it("task TBM: TK duyệt → HP chốt; task TK: HP duyệt → HT chốt; cấp khác không chốt được", async () => {
    const [tb] = await taskCua("tbm.phamthibich");
    await lamTask("tbm.phamthibich", tb.id, "CHO_CHOT");
    for (const u of ["tk.levankhoa", "ht.nguyenvanhieu"]) {
      await dangNhapNhu(u);
      expect((await thaoTac(tb.id, "CHOT")).ok, u).toBe(false);
    }
    await dangNhapNhu("hp.tranthiphuong");
    expect((await thaoTac(tb.id, "CHOT")).ok).toBe(true);

    const [tk] = await taskCua("tk.levankhoa");
    await lamTask("tk.levankhoa", tk.id, "CHO_CHOT");
    await dangNhapNhu("hp.tranthiphuong");
    expect((await thaoTac(tk.id, "CHOT")).ok).toBe(false);
    await dangNhapNhu("ht.nguyenvanhieu");
    expect((await thaoTac(tk.id, "CHOT")).ok).toBe(true);
    expect((await kt(tk.id)).trangThai).toBe("DA_CHOT");
  });

  it("thiếu người chốt (khoa chưa có hiệu phó) → TK không duyệt được task TBM lên Chờ chốt (A3, v1.6)", async () => {
    const [, tb2] = await taskCua("tbm.phamthibich");
    await dangNhapNhu("tbm.phamthibich");
    expect((await nop(tb2.id)).status).toBe(201);
    const khoa = await db.khoa.findFirstOrThrow();
    await db.khoa.update({ where: { id: khoa.id }, data: { hieuPhoId: null } });
    await dangNhapNhu("tk.levankhoa");
    expect(await thaoTac(tb2.id, "DUYET")).toEqual({
      ok: false,
      error: "Chưa có hiệu phó phụ trách, vui lòng liên hệ admin.",
    });
    expect((await kt(tb2.id)).trangThai).toBe("CHO_DUYET");
    await db.khoa.update({ where: { id: khoa.id }, data: { hieuPhoId: (await user("hp.tranthiphuong")).id } });
    expect(await thaoTac(tb2.id, "DUYET")).toEqual({ ok: true, data: { trangThai: "CHO_CHOT" } });
  });
});
