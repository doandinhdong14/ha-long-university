import { beforeAll, describe, expect, it } from "vitest";
import { xinThemTask } from "@/app/(app)/trong-ky/actions";
import { duyetYeuCau, tuChoiYeuCau } from "@/app/(app)/duyet/actions";
import { db } from "@/lib/db";
import { tinhKetQua } from "@/lib/services/ket-qua";
import { chuoiThanhNgay, congNgay, homNayVN } from "@/lib/time";
import {
  dangKyVaDuyet,
  dangNhapNhu,
  fileMau,
  kyDau,
  lamTask,
  moFile,
  nop,
  resetDb,
  suaBai,
  taskCua,
  thaoTac,
  user,
} from "./helpers";

let kyId: string;

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
  await dangKyVaDuyet("gv.nguyenvanan", 3);
  await dangKyVaDuyet("tbm.phamthibich", 3);
  await dangKyVaDuyet("tk.levankhoa", 4);
  await dangKyVaDuyet("hp.tranthiphuong", 3);
});

async function trangThai(kpiTaskId: string) {
  return (await db.kpiTask.findUniqueOrThrow({ where: { id: kpiTaskId } })).trangThai;
}

describe("nộp / sửa minh chứng (người làm KPI)", () => {
  it("nộp → Chờ duyệt, người duyệt nhận thông báo; không nộp mới khi đang Chờ duyệt; sửa lần nộp hiện tại được", async () => {
    const [t1] = await taskCua("gv.nguyenvanan");
    await dangNhapNhu("gv.nguyenvanan");
    expect((await nop(t1.id, [fileMau("a.pdf"), fileMau("b.png")], "ghi chú")).status).toBe(201);
    expect(await trangThai(t1.id)).toBe("CHO_DUYET");
    const tbm = await user("tbm.phamthibich");
    const tb = await db.thongBao.findFirstOrThrow({ where: { userId: tbm.id }, orderBy: { taoLuc: "desc" } });
    expect(tb.noiDung).toMatch(/đã nộp minh chứng task/);
    expect(tb.link).toContain(`tab=task&task=${t1.id}`);

    const r = await nop(t1.id);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe("Task đang chờ duyệt – hãy sửa lần nộp hiện tại thay vì nộp mới.");

    const bn = await db.baiNop.findFirstOrThrow({ where: { kpiTaskId: t1.id } });
    expect((await suaBai(bn.id, "đã sửa")).status).toBe(200);
    expect((await db.baiNop.findUniqueOrThrow({ where: { id: bn.id } })).ghiChu).toBe("đã sửa");
  });

  it("file sai định dạng / không có file → báo lỗi", async () => {
    const [, t2] = await taskCua("gv.nguyenvanan");
    await dangNhapNhu("gv.nguyenvanan");
    const sai = await nop(t2.id, [new File(["x"], "virus.exe")]);
    expect(sai.status).toBe(400);
    expect((await sai.json()).error).toMatch(/sai định dạng/);
    const khong = await nop(t2.id, []);
    expect((await khong.json()).error).toBe("Phải tải lên ít nhất 1 file minh chứng.");
  });

  it("người khác, Admin không nộp/sửa được bài của người khác", async () => {
    const [t1] = await taskCua("gv.nguyenvanan");
    const bn = await db.baiNop.findFirstOrThrow({ where: { kpiTaskId: t1.id } });
    await dangNhapNhu("gv.tranthibinh");
    expect((await nop(t1.id)).status).toBe(404);
    expect((await suaBai(bn.id, "x")).status).toBe(404);
    await dangNhapNhu("admin.quantri");
    expect((await suaBai(bn.id, "x")).status).toBe(403);
    // TBM cũng là người làm KPI: qua được kiểm tra vai trò nhưng không phải chủ bài → 404.
    await dangNhapNhu("tbm.phamthibich");
    expect((await suaBai(bn.id, "x")).status).toBe(404);
  });
});

describe("người duyệt: duyệt, từ chối, hủy duyệt, gửi lên (GV/TBM/TK)", () => {
  it("duyệt → Đã duyệt (treo), % không tăng; hủy duyệt → Chờ duyệt; gửi lên → Chờ chốt; đã gửi thì không hủy duyệt", async () => {
    const [t1] = await taskCua("gv.nguyenvanan");
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t1.id, "DUYET", "Tốt")).toEqual({ ok: true, data: { trangThai: "DA_DUYET" } });
    const kq = (await tinhKetQua(kyId, (await user("gv.nguyenvanan")).id))!;
    expect(kq.phanTram).toBe(0);
    expect(kq.thongKe.dangTreo).toBe(1);

    // Người làm KPI không sửa được bài đã duyệt.
    const bn = await db.baiNop.findFirstOrThrow({ where: { kpiTaskId: t1.id } });
    expect(bn.trangThai).toBe("DA_DUYET");
    await dangNhapNhu("gv.nguyenvanan");
    expect((await suaBai(bn.id, "sửa lén")).status).toBe(409);

    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t1.id, "HUY_DUYET")).toEqual({ ok: true, data: { trangThai: "CHO_DUYET" } });
    expect((await db.baiNop.findUniqueOrThrow({ where: { id: bn.id } })).trangThai).toBe("CHO_DUYET");

    await thaoTac(t1.id, "DUYET");
    expect(await thaoTac(t1.id, "GUI_CHOT")).toEqual({ ok: true, data: { trangThai: "CHO_CHOT" } });
    const kt = await db.kpiTask.findUniqueOrThrow({ where: { id: t1.id } });
    expect(kt.guiChotLuc).not.toBeNull();
    expect(await thaoTac(t1.id, "HUY_DUYET")).toEqual({ ok: false, error: "Task đã gửi lên người chốt, không thể hủy duyệt." });

    const tk = await user("tk.levankhoa");
    const tb = await db.thongBao.findFirstOrThrow({ where: { userId: tk.id }, orderBy: { taoLuc: "desc" } });
    expect(tb.noiDung).toMatch(/gửi lên task .* chờ chốt/);
    const lichSu = await db.lichSuTask.findMany({ where: { kpiTaskId: t1.id }, orderBy: { luc: "asc" } });
    expect(lichSu.map((l) => l.hanhDong)).toEqual(["NOP", "SUA_BAI_NOP", "DUYET", "HUY_DUYET", "DUYET", "GUI_CHOT"]);
  });

  it("từ chối bắt buộc nhận xét → nộp lại tạo lần nộp mới", async () => {
    const [, , t3] = await taskCua("gv.nguyenvanan");
    await dangNhapNhu("gv.nguyenvanan");
    await nop(t3.id);
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(t3.id, "TU_CHOI")).toEqual({ ok: false, error: "Vui lòng nhập nhận xét." });
    expect((await thaoTac(t3.id, "TU_CHOI", "Thiếu chữ ký")).ok).toBe(true);
    await dangNhapNhu("gv.nguyenvanan");
    expect((await nop(t3.id)).status).toBe(201);
    expect(await db.baiNop.count({ where: { kpiTaskId: t3.id } })).toBe(2);
    expect(await trangThai(t3.id)).toBe("CHO_DUYET");
  });

  it("không phải người duyệt (người chốt, cấp khác) → không thao tác được", async () => {
    const [, , t3] = await taskCua("gv.nguyenvanan");
    for (const u of ["tk.levankhoa", "hp.tranthiphuong", "ht.nguyenvanhieu", "gv.tranthibinh"]) {
      await dangNhapNhu(u);
      const r = await thaoTac(t3.id, "DUYET");
      expect(r.ok, u).toBe(false);
    }
    expect(await trangThai(t3.id)).toBe("CHO_DUYET");
  });

  it("TBM (TK duyệt, gửi lên HP) và TK (HP duyệt, gửi lên HT) tới Chờ chốt", async () => {
    const [tb] = await taskCua("tbm.phamthibich");
    await lamTask("tbm.phamthibich", tb.id, "CHO_CHOT");
    expect(await trangThai(tb.id)).toBe("CHO_CHOT");
    const [tk] = await taskCua("tk.levankhoa");
    await lamTask("tk.levankhoa", tk.id, "CHO_CHOT");
    expect(await trangThai(tk.id)).toBe("CHO_CHOT");
  });
});

describe("HT với task HP: Duyệt rồi Chốt (2 nút, không gửi lên)", () => {
  it("duyệt xong vẫn treo; hủy duyệt được trước khi chốt; chốt mới tính", async () => {
    const [h1, h2] = await taskCua("hp.tranthiphuong");
    const hp = await user("hp.tranthiphuong");
    await dangNhapNhu("hp.tranthiphuong");
    await nop(h1.id);
    await dangNhapNhu("ht.nguyenvanhieu");
    expect((await thaoTac(h1.id, "DUYET")).ok).toBe(true);
    expect((await tinhKetQua(kyId, hp.id))!.phanTram).toBe(0);
    expect(await thaoTac(h1.id, "GUI_CHOT")).toEqual({ ok: false, error: "Thao tác này không áp dụng cho task của hiệu phó." });
    expect(await thaoTac(h1.id, "HUY_DUYET")).toMatchObject({ ok: true, data: { trangThai: "CHO_DUYET" } });
    await thaoTac(h1.id, "DUYET");
    expect(await thaoTac(h1.id, "CHOT")).toEqual({ ok: true, data: { trangThai: "DA_CHOT" } });
    const kt = await db.kpiTask.findUniqueOrThrow({ where: { id: h1.id } });
    expect(kt.nguoiChotId).toBe((await user("ht.nguyenvanhieu")).id);
    const kq = (await tinhKetQua(kyId, hp.id))!;
    expect(kq.thongKe.daChot).toBe(1);
    expect(kq.phanTram).toBeGreaterThan(0);
    // Đã chốt thì không ai sửa được.
    expect(await thaoTac(h1.id, "HUY_DUYET")).toEqual({ ok: false, error: "Task đã chốt, không ai sửa được." });
    // Thông báo chốt: chỉ HP (HT là người thao tác).
    const tb = await db.thongBao.findFirstOrThrow({ where: { userId: hp.id }, orderBy: { taoLuc: "desc" } });
    expect(tb.noiDung).toMatch(/đã được chốt – hoàn thành/);

    await lamTask("hp.tranthiphuong", h2.id, "DA_CHOT");
    expect(await trangThai(h2.id)).toBe("DA_CHOT");
  });
});

describe("xin thêm task mở rộng", () => {
  it("xin → người duyệt duyệt → task Chưa làm; không xin trùng; không xin task của nhiệm vụ chưa đăng ký", async () => {
    const an = await user("gv.nguyenvanan");
    const nv1 = await db.nhiemVu.findFirstOrThrow({ where: { kyId, doiTuong: "GV", thuTu: 1 }, include: { tasks: true } });
    const moRong = nv1.tasks.find((t) => t.loai === "MO_RONG")!;
    await dangNhapNhu("gv.nguyenvanan");
    expect((await xinThemTask(moRong.id)).ok).toBe(true);
    expect(await xinThemTask(moRong.id)).toEqual({ ok: false, error: "Bạn đã xin task này, đang chờ duyệt." });
    const nv9 = await db.nhiemVu.findFirstOrThrow({ where: { kyId, doiTuong: "GV", thuTu: 9 }, include: { tasks: true } });
    expect(await xinThemTask(nv9.tasks.find((t) => t.loai === "MO_RONG")!.id)).toEqual({
      ok: false,
      error: "Chỉ xin được task mở rộng thuộc nhiệm vụ bạn đã được duyệt.",
    });

    const yc = await db.yeuCauThemTask.findFirstOrThrow({ where: { userId: an.id } });
    await dangNhapNhu("tk.levankhoa");
    expect((await duyetYeuCau({ yeuCauId: yc.id })).ok).toBe(false);
    await dangNhapNhu("tbm.phamthibich");
    expect(await tuChoiYeuCau({ yeuCauId: yc.id, nhanXet: "" })).toEqual({ ok: false, error: "Vui lòng nhập nhận xét." });
    expect((await duyetYeuCau({ yeuCauId: yc.id })).ok).toBe(true);
    const kt = await db.kpiTask.findUniqueOrThrow({ where: { userId_taskId: { userId: an.id, taskId: moRong.id } } });
    expect(kt.trangThai).toBe("CHUA_LAM");
    await dangNhapNhu("gv.nguyenvanan");
    expect(await xinThemTask(moRong.id)).toEqual({ ok: false, error: "Task này đã có trong danh sách của bạn." });
  });
});

describe("quyền xem file minh chứng (12.2)", () => {
  it("người làm, người duyệt, admin xem được; người chốt chỉ sau khi gửi lên; người khác bị chặn", async () => {
    const [, , t3] = await taskCua("gv.nguyenvanan"); // đang Chờ duyệt
    const f = await db.fileDinhKem.findFirstOrThrow({ where: { baiNop: { kpiTaskId: t3.id } } });
    const thu = async (u: string) => {
      await dangNhapNhu(u);
      return (await moFile(f.id)).status;
    };
    expect(await thu("gv.nguyenvanan")).toBe(200);
    expect(await thu("tbm.phamthibich")).toBe(200);
    expect(await thu("admin.quantri")).toBe(200);
    expect(await thu("tk.levankhoa")).toBe(403);
    expect(await thu("hp.tranthiphuong")).toBe(403);
    expect(await thu("ht.nguyenvanhieu")).toBe(403);
    expect(await thu("gv.tranthibinh")).toBe(403);

    await dangNhapNhu("tbm.phamthibich");
    await thaoTac(t3.id, "DUYET");
    expect(await thu("tk.levankhoa")).toBe(403);
    await dangNhapNhu("tbm.phamthibich");
    await thaoTac(t3.id, "GUI_CHOT");
    expect(await thu("tk.levankhoa")).toBe(200);
    // HT luôn xem được minh chứng của HP.
    const [h1] = await taskCua("hp.tranthiphuong");
    const fh = await db.fileDinhKem.findFirstOrThrow({ where: { baiNop: { kpiTaskId: h1.id } } });
    await dangNhapNhu("ht.nguyenvanhieu");
    expect((await moFile(fh.id)).status).toBe(200);
  });

  it("chưa đăng nhập → 401", async () => {
    const f = await db.fileDinhKem.findFirstOrThrow();
    await dangNhapNhu("gv.nguyenvanan");
    const { phien } = await import("./helpers");
    phien.userId = null;
    expect((await moFile(f.id)).status).toBe(401);
  });
});

describe("hết deadline / kỳ đã chốt → khóa mọi thao tác", () => {
  it("sau deadline không ai nộp, duyệt, gửi, chốt được", async () => {
    const tasks = await taskCua("gv.nguyenvanan");
    const chuaLam = tasks.find((t) => t.trangThai === "CHUA_LAM")!;
    await db.ky.update({
      where: { id: kyId },
      data: { ngayBatDau: chuoiThanhNgay(congNgay(homNayVN(), -30)), ngayKetThuc: chuoiThanhNgay(congNgay(homNayVN(), -1)) },
    });
    await dangNhapNhu("gv.nguyenvanan");
    const r = await nop(chuaLam.id);
    expect((await r.json()).error).toBe("Đã hết deadline của kỳ, mọi thao tác đã bị khóa.");
    await dangNhapNhu("tk.levankhoa");
    const choChot = tasks.find((t) => t.trangThai === "CHO_CHOT")!;
    expect(await thaoTac(choChot.id, "CHOT")).toEqual({ ok: false, error: "Đã hết deadline của kỳ, mọi thao tác đã bị khóa." });
    await db.ky.update({
      where: { id: kyId },
      data: { ngayBatDau: chuoiThanhNgay(homNayVN()), ngayKetThuc: chuoiThanhNgay(congNgay(homNayVN(), 30)), daChot: true },
    });
    expect(await thaoTac(choChot.id, "CHOT")).toEqual({ ok: false, error: "Kỳ đã chốt, không thể thao tác." });
    await db.ky.update({ where: { id: kyId }, data: { daChot: false } });
  });
});
