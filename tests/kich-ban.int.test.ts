// Kịch bản nghiệm thu v1.6 (docs/spec-v1.6.md mục 12.1; thay kịch bản mục 15 của v1.4 – file cũ
// tests/kich-ban-15.int.test.ts), chạy toàn bộ qua server action / API thật (cùng code với giao diện).
// Mọi người đăng ký đủ nhiệm vụ của vị trí (100 điểm) → xếp loại A1.
import { beforeAll, describe, expect, it } from "vitest";
import { chotKyNgay, congBoKy, taoKy } from "@/app/(app)/admin/phan-viec/actions";
import { taoTaiKhoan } from "@/app/(app)/admin/tai-khoan/actions";
import { guiDangKy } from "@/app/(app)/dau-ky/actions";
import { POST as cronChotKy } from "@/app/api/cron/chot-ky/route";
import type { MucThieu, MucVuot } from "@/lib/ket-qua";
import { db } from "@/lib/db";
import { chotCacKyQuaHan } from "@/lib/services/chot-ky";
import { guiNhacViec } from "@/lib/services/nhac-viec";
import { chuoiThanhNgay, congNgay, homNayVN } from "@/lib/time";
import { dangKyVaDuyet, dangNhapNhu, kyDau, lamTask, nop, resetDb, taskCua, thaoTac, user } from "./helpers";

let kyId: string;

async function ketQua(username: string) {
  const u = await user(username);
  return db.ketQuaKy.findUniqueOrThrow({ where: { kyId_userId: { kyId, userId: u.id } } });
}

async function lamHet(username: string, ids: string[]) {
  for (const id of ids) await lamTask(username, id, "DA_CHOT");
}

const batBuoc = async (username: string) => (await taskCua(username)).filter((t) => t.task.loai === "BAT_BUOC");
const caiTien = async (username: string) => (await taskCua(username)).find((t) => t.task.loai === "CAI_TIEN")!;

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
});

describe("kịch bản chính mục 12.1", () => {
  it("gv.nguyenvanan (không cải tiến): ~50% task bắt buộc được chốt, còn lại chưa nộp", async () => {
    await dangKyVaDuyet("gv.nguyenvanan");
    const tasks = await taskCua("gv.nguyenvanan");
    expect(tasks).toHaveLength(22);
    await lamHet("gv.nguyenvanan", tasks.slice(0, 11).map((t) => t.id));
  });

  it("gv.tranthibinh (không cải tiến): 100% bắt buộc được chốt", async () => {
    await dangKyVaDuyet("gv.tranthibinh");
    await lamHet("gv.tranthibinh", (await taskCua("gv.tranthibinh")).map((t) => t.id));
  });

  it("gv.levancuong (có cải tiến): 100% bắt buộc + cải tiến được chốt", async () => {
    await dangKyVaDuyet("gv.levancuong", { caiTien: true });
    const tasks = await taskCua("gv.levancuong");
    expect(tasks).toHaveLength(23);
    expect(tasks.filter((t) => t.task.loai === "CAI_TIEN")).toHaveLength(1);
    await lamHet("gv.levancuong", tasks.map((t) => t.id));
  });

  it("tbm.phamthibich (có cải tiến): 100% bắt buộc (TK duyệt → HP chốt) + cải tiến được chốt", async () => {
    await dangKyVaDuyet("tbm.phamthibich", { caiTien: true });
    await lamHet("tbm.phamthibich", (await taskCua("tbm.phamthibich")).map((t) => t.id));
  });

  it("tk.levankhoa (có cải tiến): 100% bắt buộc (HP duyệt → HT chốt), cải tiến đã nộp chưa chốt", async () => {
    await dangKyVaDuyet("tk.levankhoa", { caiTien: true });
    await lamHet("tk.levankhoa", (await batBuoc("tk.levankhoa")).map((t) => t.id));
    const ct = await caiTien("tk.levankhoa");
    await dangNhapNhu("tk.levankhoa");
    expect((await nop(ct.id)).status).toBe(201);
  });

  it("hp.tranthiphuong (không cải tiến): 100% bắt buộc (HT duyệt → HT chốt)", async () => {
    await dangKyVaDuyet("hp.tranthiphuong");
    await lamHet("hp.tranthiphuong", (await taskCua("hp.tranthiphuong")).map((t) => t.id));
  });

  it("case phụ chuẩn bị: GV treo đến hết kỳ (chờ chốt / bị trả về / chờ duyệt) và GV không đăng ký", async () => {
    await dangNhapNhu("admin.quantri");
    expect((await taoTaiKhoan({ hoTen: "Người Treo", role: "GV" })).ok).toBe(true);
    expect((await taoTaiKhoan({ hoTen: "Không Đăng Ký", role: "GV" })).ok).toBe(true);
    await dangKyVaDuyet("gv.nguoitreo", { caiTien: true });
    const [a, b, c, d] = await batBuoc("gv.nguoitreo");
    await lamTask("gv.nguoitreo", a.id, "CHO_CHOT");
    await lamTask("gv.nguoitreo", b.id, "CHO_CHOT");
    await lamTask("gv.nguoitreo", c.id, "CHO_CHOT");
    await dangNhapNhu("tk.levankhoa");
    expect((await thaoTac(c.id, "TRA_VE", "Xem lại")).ok).toBe(true);
    await dangNhapNhu("gv.nguoitreo");
    expect((await nop(d.id)).status).toBe(201);
  });

  it("admin bấm Chốt kỳ ngay → kết quả đúng như mục 12.1", async () => {
    await dangNhapNhu("gv.nguyenvanan");
    expect(await chotKyNgay(kyId)).toEqual({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." });
    await dangNhapNhu("admin.quantri");
    expect(await chotKyNgay(kyId)).toEqual({ ok: true, data: { soNguoi: 8 } });
    expect(await chotKyNgay(kyId)).toEqual({ ok: false, error: "Kỳ đã chốt." });

    const an = await ketQua("gv.nguyenvanan");
    expect(an).toMatchObject({
      ketQua: "KHONG_DAT",
      xepLoai: "A1",
      phanTram: 50,
      phanTramBatBuoc: 50,
      tuDanhGia: 50,
      trangThaiCaiTien: "KHONG_DANG_KY",
      doiTuong: "GV",
    });
    const thieu = an.taskThieu as MucThieu[];
    expect(thieu).toHaveLength(11);
    expect(thieu.every((t) => t.lyDo === "Chưa nộp minh chứng")).toBe(true);

    expect(await ketQua("gv.tranthibinh")).toMatchObject({ ketQua: "DAT", xepLoai: "A1", phanTram: 100, tuDanhGia: 100 });

    const cuong = await ketQua("gv.levancuong");
    expect(cuong).toMatchObject({
      ketQua: "VUOT",
      xepLoai: "A1",
      phanTram: 110,
      phanTramBatBuoc: 100,
      tuDanhGia: 110,
      trangThaiCaiTien: "DA_CHOT",
      soTreo: 0,
    });
    expect((cuong.taskVuot as MucVuot[]).map((t) => t.ten)).toEqual(["Sản phẩm cải tiến sáng tạo"]);

    expect(await ketQua("tbm.phamthibich")).toMatchObject({
      ketQua: "VUOT",
      xepLoai: "A1",
      phanTram: 110,
      tuDanhGia: 110,
      trangThaiCaiTien: "DA_CHOT",
      doiTuong: "TBM",
    });
    const khoa = await ketQua("tk.levankhoa");
    expect(khoa).toMatchObject({
      ketQua: "DAT",
      xepLoai: "A1",
      phanTram: 100,
      tuDanhGia: 110,
      trangThaiCaiTien: "CHUA_CHOT",
      taskThieu: [],
      doiTuong: "TK",
    });
    expect(khoa.ghiChu).toBe("Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – Chờ duyệt, chưa được duyệt kịp");
    expect(await ketQua("hp.tranthiphuong")).toMatchObject({
      ketQua: "DAT",
      xepLoai: "A1",
      phanTram: 100,
      tuDanhGia: 100,
      trangThaiCaiTien: "KHONG_DANG_KY",
      doiTuong: "HP",
    });
  });

  it("case phụ: treo đến hết kỳ → Không đạt với lý do mục 6.2 (cải tiến không nằm trong task thiếu); không đăng ký → Không đạt – F", async () => {
    const treo = await ketQua("gv.nguoitreo");
    expect(treo).toMatchObject({ ketQua: "KHONG_DAT", phanTram: 0, soTreo: 2, trangThaiCaiTien: "CHUA_CHOT" });
    const lyDo = (treo.taskThieu as MucThieu[]).map((t) => t.lyDo);
    expect(lyDo.slice(0, 4)).toEqual([
      "Chờ chốt, chưa được chốt kịp",
      "Chờ chốt, chưa được chốt kịp",
      "Bị cấp chốt trả về, chưa xử lý xong",
      "Chờ duyệt, chưa được duyệt kịp",
    ]);
    expect(lyDo).toHaveLength(22);
    expect((treo.taskThieu as MucThieu[]).some((t) => t.ten === "Sản phẩm cải tiến sáng tạo")).toBe(false);
    expect(treo.ghiChu).toBe("Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – Chưa nộp minh chứng");
    expect(await ketQua("gv.khongdangky")).toMatchObject({
      ketQua: "KHONG_DAT",
      xepLoai: "F",
      phanTram: 0,
      tuDanhGia: 0,
      trangThaiCaiTien: "KHONG_DANG_KY",
      ghiChu: "Chưa có danh sách nhiệm vụ được duyệt",
    });
  });

  it("sau khi chốt kỳ: mọi thao tác bị khóa; mọi người làm KPI và hiệu trưởng nhận thông báo", async () => {
    const [t] = (await taskCua("gv.nguyenvanan")).filter((x) => x.trangThai === "CHUA_LAM");
    await dangNhapNhu("gv.nguyenvanan");
    expect((await (await nop(t.id)).json()).error).toBe("Kỳ đã chốt, không thể thao tác.");
    expect(await guiDangKy({ kyId, caiTien: false })).toMatchObject({ ok: false });
    const choDuyet = (await taskCua("gv.nguoitreo")).find((x) => x.trangThai === "CHO_DUYET")!;
    await dangNhapNhu("tbm.phamthibich");
    expect(await thaoTac(choDuyet.id, "DUYET")).toEqual({ ok: false, error: "Kỳ đã chốt, không thể thao tác." });

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

describe("nhắc việc (mục 11; spec-v1.6 mục 6.4)", () => {
  it("người làm KPI, HT (task HP đã duyệt chưa chốt), người chốt (chờ chốt); không còn \"chưa gửi lên\"; mỗi mốc 1 lần", async () => {
    const ky3 = await db.ky.findFirstOrThrow({ where: { ten: "Kỳ 3" } });
    // Đưa Kỳ 3 lên đầu để helper dùng: dùng lại dangKyVaDuyet với kỳ đầu tiên → đổi ngày tạo.
    await db.ky.update({ where: { id: kyId }, data: { createdAt: new Date("2020-01-01") } });
    await db.ky.update({ where: { id: ky3.id }, data: { createdAt: new Date("2019-01-01") } });

    await dangKyVaDuyet("gv.tranthibinh");
    const [g1, g2] = await db.kpiTask.findMany({ where: { kyId: ky3.id, user: { username: "gv.tranthibinh" } }, orderBy: { id: "asc" } });
    await lamTask("gv.tranthibinh", g1.id, "CHO_CHOT");
    await dangNhapNhu("gv.tranthibinh");
    await nop(g2.id);
    await dangKyVaDuyet("hp.tranthiphuong");
    const [h1] = await db.kpiTask.findMany({ where: { kyId: ky3.id, user: { username: "hp.tranthiphuong" } } });
    await lamTask("hp.tranthiphuong", h1.id, "DA_DUYET");

    // Còn 5 ngày đến deadline → mốc 7 ngày.
    const r = await guiNhacViec();
    expect(r).toMatchObject({ nguoiDuyet: 1, nguoiChot: 1 });
    const tin = async (u: string) =>
      (await db.thongBao.findMany({ where: { userId: (await user(u)).id, maSuKien: { not: null } } })).map((t) => t.noiDung);
    expect((await tin("tbm.phamthibich")).join("|")).not.toMatch(/chưa gửi lên/);
    expect((await tin("ht.nguyenvanhieu")).join("|")).toMatch(/Còn 1 task đã duyệt chưa chốt/);
    expect((await tin("tk.levankhoa")).join("|")).toMatch(/Còn 1 task chờ chốt/);
    expect((await tin("gv.tranthibinh")).join("|")).toMatch(/Bạn còn 22 task bắt buộc chưa được chốt/);
    // Hạn đăng ký hôm nay → người chưa gửi đăng ký được nhắc.
    expect((await tin("gv.nguyenvanan")).join("|")).toMatch(/Hôm nay là ngày cuối đến hạn đăng ký/);

    // Chạy lại cùng ngày → không nhắc trùng.
    expect(await guiNhacViec()).toEqual({ hanDangKy: 0, deadline: 0, nguoiDuyet: 0, nguoiChot: 0 });

    // Còn 2 ngày → mốc 2 ngày gửi thêm một lần.
    await db.ky.update({ where: { id: ky3.id }, data: { ngayKetThuc: chuoiThanhNgay(congNgay(homNayVN(), 2)) } });
    expect(await guiNhacViec()).toMatchObject({ nguoiDuyet: 1, nguoiChot: 1, deadline: 0 });
  });
});
