// Kịch bản nghiệm thu mục 15, chạy toàn bộ qua server action / API thật (cùng code với giao diện).
import { beforeAll, describe, expect, it } from "vitest";
import { chotKyNgay, congBoKy, taoKy } from "@/app/(app)/admin/phan-viec/actions";
import { taoTaiKhoan } from "@/app/(app)/admin/tai-khoan/actions";
import { xinThemTask } from "@/app/(app)/trong-ky/actions";
import { guiDangKy } from "@/app/(app)/dau-ky/actions";
import { duyetYeuCau } from "@/app/(app)/duyet/actions";
import { POST as cronChotKy } from "@/app/api/cron/chot-ky/route";
import type { MucThieu, MucVuot } from "@/lib/ket-qua";
import { db } from "@/lib/db";
import { chotCacKyQuaHan } from "@/lib/services/chot-ky";
import { guiNhacViec } from "@/lib/services/nhac-viec";
import { chuoiThanhNgay, congNgay, homNayVN } from "@/lib/time";
import {
  dangKyVaDuyet,
  dangNhapNhu,
  kyDau,
  lamTask,
  nguoiDuyetCua,
  nop,
  resetDb,
  taskCua,
  thaoTac,
  user,
} from "./helpers";

let kyId: string;

async function ketQua(username: string) {
  const u = await user(username);
  return db.ketQuaKy.findUniqueOrThrow({ where: { kyId_userId: { kyId, userId: u.id } } });
}

async function lamHet(username: string, ids: string[]) {
  for (const id of ids) await lamTask(username, id, "DA_CHOT");
}

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
});

describe("kịch bản chính mục 15", () => {
  it("gv.nguyenvanan: 10 nhiệm vụ (100 điểm), ~50% task bắt buộc được chốt, còn lại chưa nộp", async () => {
    await dangKyVaDuyet("gv.nguyenvanan");
    const tasks = await taskCua("gv.nguyenvanan");
    expect(tasks).toHaveLength(22);
    await lamHet("gv.nguyenvanan", tasks.slice(0, 11).map((t) => t.id));
  });

  it("gv.tranthibinh: nhiệm vụ 1–3 (39 điểm), 100% bắt buộc được chốt", async () => {
    await dangKyVaDuyet("gv.tranthibinh");
    await lamHet("gv.tranthibinh", (await taskCua("gv.tranthibinh")).map((t) => t.id));
  });

  it("gv.levancuong: nhiệm vụ 1–5 (59 điểm), 100% bắt buộc + 2 mở rộng được chốt (mở rộng thứ 3 chỉ duyệt)", async () => {
    await dangKyVaDuyet("gv.levancuong");
    await lamHet("gv.levancuong", (await taskCua("gv.levancuong")).map((t) => t.id));
    const moRongs = await db.task.findMany({
      where: { loai: "MO_RONG", nhiemVu: { kyId, doiTuong: "GV", thuTu: { in: [1, 2, 3] } } },
      orderBy: { nhiemVu: { thuTu: "asc" } },
    });
    for (const t of moRongs) {
      await dangNhapNhu("gv.levancuong");
      expect((await xinThemTask(t.id)).ok).toBe(true);
    }
    await dangNhapNhu(await nguoiDuyetCua("gv.levancuong"));
    for (const yc of await db.yeuCauThemTask.findMany({ where: { kyId } })) {
      expect((await duyetYeuCau({ yeuCauId: yc.id })).ok).toBe(true);
    }
    const u = await user("gv.levancuong");
    const kts = await db.kpiTask.findMany({ where: { userId: u.id, task: { loai: "MO_RONG" } }, include: { task: true } });
    const theoTen = (i: number) => kts.find((k) => k.taskId === moRongs[i].id)!.id;
    await lamTask("gv.levancuong", theoTen(0), "DA_CHOT");
    await lamTask("gv.levancuong", theoTen(1), "DA_CHOT");
    await lamTask("gv.levancuong", theoTen(2), "DA_DUYET");
  });

  it("tbm.phamthibich: nhiệm vụ TBM 1–3 (55 điểm): TK duyệt → gửi → HP chốt", async () => {
    await dangKyVaDuyet("tbm.phamthibich");
    await lamHet("tbm.phamthibich", (await taskCua("tbm.phamthibich")).map((t) => t.id));
  });

  it("tk.levankhoa: nhiệm vụ TK 1–4 (80 điểm): HP duyệt → gửi → HT chốt", async () => {
    await dangKyVaDuyet("tk.levankhoa");
    await lamHet("tk.levankhoa", (await taskCua("tk.levankhoa")).map((t) => t.id));
  });

  it("hp.tranthiphuong: nhiệm vụ HP 1–3 (60 điểm): HT duyệt → HT chốt (2 nút)", async () => {
    await dangKyVaDuyet("hp.tranthiphuong");
    await lamHet("hp.tranthiphuong", (await taskCua("hp.tranthiphuong")).map((t) => t.id));
  });

  it("case phụ chuẩn bị: GV treo đến hết kỳ (đã duyệt / chờ chốt / bị trả về) và GV không đăng ký", async () => {
    await dangNhapNhu("admin.quantri");
    expect((await taoTaiKhoan({ hoTen: "Người Treo", role: "GV" })).ok).toBe(true);
    expect((await taoTaiKhoan({ hoTen: "Không Đăng Ký", role: "GV" })).ok).toBe(true);
    await dangKyVaDuyet("gv.nguoitreo");
    const [a, b, c] = await taskCua("gv.nguoitreo");
    await lamTask("gv.nguoitreo", a.id, "DA_DUYET");
    await lamTask("gv.nguoitreo", b.id, "CHO_CHOT");
    await lamTask("gv.nguoitreo", c.id, "CHO_CHOT");
    await dangNhapNhu("tk.levankhoa");
    expect((await thaoTac(c.id, "TRA_VE", "Xem lại")).ok).toBe(true);
  });

  it("admin bấm Chốt kỳ ngay → kết quả đúng như mục 15", async () => {
    await dangNhapNhu("gv.nguyenvanan");
    expect(await chotKyNgay(kyId)).toEqual({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." });
    await dangNhapNhu("admin.quantri");
    expect(await chotKyNgay(kyId)).toEqual({ ok: true, data: { soNguoi: 8 } });
    expect(await chotKyNgay(kyId)).toEqual({ ok: false, error: "Kỳ đã chốt." });

    const an = await ketQua("gv.nguyenvanan");
    expect(an).toMatchObject({ ketQua: "KHONG_DAT", xepLoai: "A1", phanTram: 50, doiTuong: "GV" });
    const thieu = an.taskThieu as MucThieu[];
    expect(thieu).toHaveLength(11);
    expect(thieu.every((t) => t.lyDo === "Chưa nộp minh chứng")).toBe(true);

    expect(await ketQua("gv.tranthibinh")).toMatchObject({ ketQua: "DAT", xepLoai: "C", phanTram: 100 });

    const cuong = await ketQua("gv.levancuong");
    expect(cuong).toMatchObject({ ketQua: "VUOT", xepLoai: "B", phanTram: 100, soTreo: 1 });
    expect((cuong.taskVuot as MucVuot[]).map((t) => t.ten)).toEqual([
      "Số hóa bài giảng lên hệ thống LMS",
      "Nhóm sinh viên đạt giải cấp trường",
    ]);

    expect(await ketQua("tbm.phamthibich")).toMatchObject({ ketQua: "DAT", xepLoai: "B", phanTram: 100, doiTuong: "TBM" });
    expect(await ketQua("tk.levankhoa")).toMatchObject({ ketQua: "DAT", xepLoai: "A1", phanTram: 100, doiTuong: "TK" });
    expect(await ketQua("hp.tranthiphuong")).toMatchObject({ ketQua: "DAT", xepLoai: "B", phanTram: 100, doiTuong: "HP" });
  });

  it("case phụ: treo đến hết kỳ → Không đạt với lý do treo; không đăng ký → Không đạt – F", async () => {
    const treo = await ketQua("gv.nguoitreo");
    expect(treo).toMatchObject({ ketQua: "KHONG_DAT", phanTram: 0, soTreo: 2 });
    expect((treo.taskThieu as MucThieu[]).map((t) => t.lyDo)).toEqual([
      "Đã duyệt nhưng chưa gửi lên / chưa được chốt",
      "Chờ chốt, chưa được chốt kịp",
      "Bị cấp chốt trả về, chưa xử lý xong",
    ]);
    expect(await ketQua("gv.khongdangky")).toMatchObject({
      ketQua: "KHONG_DAT",
      xepLoai: "F",
      phanTram: 0,
      ghiChu: "Chưa có danh sách nhiệm vụ được duyệt",
    });
  });

  it("sau khi chốt kỳ: mọi thao tác bị khóa; mọi người làm KPI và hiệu trưởng nhận thông báo", async () => {
    const [t] = (await taskCua("gv.nguyenvanan")).filter((x) => x.trangThai === "CHUA_LAM");
    await dangNhapNhu("gv.nguyenvanan");
    expect((await (await nop(t.id)).json()).error).toBe("Kỳ đã chốt, không thể thao tác.");
    expect(await guiDangKy({ kyId, caiTien: false })).toMatchObject({ ok: false });
    const [c] = await taskCua("gv.nguoitreo");
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(c.id, "GUI_CHOT")).toEqual({ ok: false, error: "Kỳ đã chốt, không thể thao tác." });

    for (const u of ["gv.nguyenvanan", "tbm.phamthibich", "tk.levankhoa", "hp.tranthiphuong"]) {
      const tb = await db.thongBao.findFirstOrThrow({ where: { userId: (await user(u)).id }, orderBy: { taoLuc: "desc" } });
      expect(tb.noiDung, u).toMatch(/đã chốt\. Kết quả của bạn/);
    }
    const ht = await user("ht.nguyenvanhieu");
    expect((await db.thongBao.findFirstOrThrow({ where: { userId: ht.id }, orderBy: { taoLuc: "desc" } })).noiDung).toMatch(/đã chốt/);
  });
});

describe("cron chốt kỳ", () => {
  it("sai CRON_SECRET → 401; đúng → chỉ chốt kỳ đã công bố và quá deadline", async () => {
    const sai = await cronChotKy(new Request("http://localhost/api/cron/chot-ky", { method: "POST", headers: { authorization: "Bearer sai" } }));
    expect(sai.status).toBe(401);

    await dangNhapNhu("admin.quantri");
    const r1 = await taoKy({ ten: "Kỳ 2", namHoc: "2026-2027", soKy: 2, ngayBatDau: congNgay(homNayVN(), -40), ngayKetThuc: congNgay(homNayVN(), -1), saoChepTuKyId: kyId });
    const r2 = await taoKy({ ten: "Kỳ 3", namHoc: "2026-2027", soKy: 3, ngayBatDau: homNayVN(), ngayKetThuc: congNgay(homNayVN(), 5), saoChepTuKyId: kyId });
    const ky2 = r1.ok ? r1.data.id : "";
    const ky3 = r2.ok ? r2.data.id : "";
    expect((await congBoKy(ky2)).ok).toBe(true);
    expect((await congBoKy(ky3)).ok).toBe(true);

    const ok = await cronChotKy(
      new Request("http://localhost/api/cron/chot-ky", { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
    );
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.daChot.map((k: { ten: string }) => k.ten)).toEqual(["Kỳ 2"]);
    expect((await db.ky.findUniqueOrThrow({ where: { id: ky3 } })).daChot).toBe(false);
    // Chạy lại không chốt lại.
    expect(await chotCacKyQuaHan()).toEqual([]);
  });
});

describe("nhắc việc (mục 11)", () => {
  it("người làm KPI, người duyệt (chưa gửi lên / HT: chưa chốt), người chốt; mỗi mốc 1 lần", async () => {
    const ky3 = await db.ky.findFirstOrThrow({ where: { ten: "Kỳ 3" } });
    // Đưa Kỳ 3 lên đầu để helper dùng: dùng lại dangKyVaDuyet với kỳ đầu tiên → đổi ngày tạo.
    await db.ky.update({ where: { id: kyId }, data: { createdAt: new Date("2020-01-01") } });
    await db.ky.update({ where: { id: ky3.id }, data: { createdAt: new Date("2019-01-01") } });

    await dangKyVaDuyet("gv.tranthibinh");
    const [g1, g2] = await db.kpiTask.findMany({ where: { kyId: ky3.id, user: { username: "gv.tranthibinh" } }, orderBy: { id: "asc" } });
    await lamTask("gv.tranthibinh", g1.id, "DA_DUYET");
    await lamTask("gv.tranthibinh", g2.id, "CHO_CHOT");
    await dangKyVaDuyet("hp.tranthiphuong");
    const [h1] = await db.kpiTask.findMany({ where: { kyId: ky3.id, user: { username: "hp.tranthiphuong" } } });
    await lamTask("hp.tranthiphuong", h1.id, "DA_DUYET");

    // Còn 5 ngày đến deadline → mốc 7 ngày.
    const r = await guiNhacViec();
    expect(r).toMatchObject({ nguoiDuyet: 2, nguoiChot: 1 });
    const tin = async (u: string) =>
      (await db.thongBao.findMany({ where: { userId: (await user(u)).id, maSuKien: { not: null } } })).map((t) => t.noiDung);
    expect((await tin("tbm.phamthibich")).join("|")).toMatch(/Còn 1 task đã duyệt chưa gửi lên/);
    expect((await tin("ht.nguyenvanhieu")).join("|")).toMatch(/Còn 1 task đã duyệt chưa chốt/);
    expect((await tin("tk.levankhoa")).join("|")).toMatch(/Còn 1 task chờ chốt/);
    expect((await tin("gv.tranthibinh")).join("|")).toMatch(/Bạn còn 3 task bắt buộc chưa được chốt/);
    // Hạn đăng ký hôm nay → người chưa gửi đăng ký được nhắc.
    expect((await tin("gv.nguyenvanan")).join("|")).toMatch(/Hôm nay là ngày cuối đến hạn đăng ký/);

    // Chạy lại cùng ngày → không nhắc trùng.
    expect(await guiNhacViec()).toEqual({ hanDangKy: 0, deadline: 0, nguoiDuyet: 0, nguoiChot: 0 });

    // Còn 2 ngày → mốc 2 ngày gửi thêm một lần.
    await db.ky.update({ where: { id: ky3.id }, data: { ngayKetThuc: chuoiThanhNgay(congNgay(homNayVN(), 2)) } });
    expect(await guiNhacViec()).toMatchObject({ nguoiDuyet: 2, nguoiChot: 1, deadline: 0 });
  });
});
