// Thông báo trong web (mục 11): đúng người nhận cho từng sự kiện; chuông chỉ thấy thông báo của mình.
import { beforeAll, describe, expect, it } from "vitest";
import { xinThemTask } from "@/app/(app)/trong-ky/actions";
import { chonNhiemVu, guiDangKy } from "@/app/(app)/dau-ky/actions";
import { duyetDangKy, duyetYeuCau } from "@/app/(app)/duyet/actions";
import { GET as apiThongBao } from "@/app/api/thong-bao/route";
import { docTatCaThongBao, docThongBao } from "@/components/layout/thong-bao-actions";
import { db } from "@/lib/db";
import { dangNhapNhu, kyDau, nop, phien, resetDb, taskCua, thaoTac, user } from "./helpers";

let kyId: string;

/** Thông báo mới nhất của một người. */
async function tinMoiNhat(username: string) {
  const u = await user(username);
  return db.thongBao.findFirst({ where: { userId: u.id }, orderBy: { taoLuc: "desc" } });
}

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
});

describe("bảng sự kiện mục 11 – chuỗi GV → TBM → TK", () => {
  it("gửi đăng ký → người duyệt; đăng ký được duyệt → người làm KPI", async () => {
    await dangNhapNhu("gv.tranthibinh");
    const nv = await db.nhiemVu.findFirstOrThrow({ where: { kyId, doiTuong: "GV", thuTu: 1 } });
    await chonNhiemVu({ kyId, nhiemVuId: nv.id, chon: true });
    await guiDangKy(kyId);
    expect((await tinMoiNhat("tbm.phamthibich"))?.noiDung).toMatch(/Trần Thị Bình đã gửi danh sách đăng ký/);
    expect(await tinMoiNhat("tk.levankhoa")).toBeNull(); // danh sách chỉ lên người duyệt

    await dangNhapNhu("tbm.phamthibich");
    const dk = await db.dangKy.findFirstOrThrow({ where: { kyId } });
    await duyetDangKy({ dangKyId: dk.id });
    expect((await tinMoiNhat("gv.tranthibinh"))?.noiDung).toMatch(/đã được duyệt/);
  });

  it("nộp task → người duyệt; duyệt → người làm; gửi lên → người chốt; chốt → người làm + người duyệt; trả về → người duyệt", async () => {
    const [t1, t2] = await taskCua("gv.tranthibinh");
    await dangNhapNhu("gv.tranthibinh");
    await nop(t1.id);
    await nop(t2.id);
    expect((await tinMoiNhat("tbm.phamthibich"))?.noiDung).toMatch(/đã nộp minh chứng task/);

    await dangNhapNhu("tbm.phamthibich");
    await thaoTac(t1.id, "DUYET");
    expect((await tinMoiNhat("gv.tranthibinh"))?.noiDung).toMatch(/đã được duyệt/);
    await thaoTac(t1.id, "GUI_CHOT");
    const tk = await tinMoiNhat("tk.levankhoa");
    expect(tk?.noiDung).toMatch(/gửi lên task .* chờ chốt/);
    expect(tk?.link).toBe(`/chot?kyId=${kyId}`);

    await dangNhapNhu("tk.levankhoa");
    await thaoTac(t1.id, "CHOT");
    expect((await tinMoiNhat("gv.tranthibinh"))?.noiDung).toMatch(/đã được chốt – hoàn thành/);
    expect((await tinMoiNhat("tbm.phamthibich"))?.noiDung).toMatch(/đã được chốt/);
    expect((await tinMoiNhat("tk.levankhoa"))?.noiDung).not.toMatch(/đã được chốt/); // không báo cho chính người thao tác

    await dangNhapNhu("tbm.phamthibich");
    await thaoTac(t2.id, "DUYET");
    await thaoTac(t2.id, "GUI_CHOT");
    await dangNhapNhu("tk.levankhoa");
    await thaoTac(t2.id, "TRA_VE", "Thiếu dấu");
    expect((await tinMoiNhat("tbm.phamthibich"))?.noiDung).toMatch(/trả về task .*Thiếu dấu/);
    // Người làm KPI không nhận thông báo trả về (chỉ thấy trạng thái).
    expect((await tinMoiNhat("gv.tranthibinh"))?.noiDung).not.toMatch(/Thiếu dấu/);
  });

  it("xin thêm task → người duyệt; yêu cầu được duyệt → người làm", async () => {
    const mr = await db.task.findFirstOrThrow({ where: { loai: "MO_RONG", nhiemVu: { kyId, doiTuong: "GV", thuTu: 1 } } });
    await dangNhapNhu("gv.tranthibinh");
    await xinThemTask(mr.id);
    expect((await tinMoiNhat("tbm.phamthibich"))?.noiDung).toMatch(/xin làm thêm task mở rộng/);
    await dangNhapNhu("tbm.phamthibich");
    const yc = await db.yeuCauThemTask.findFirstOrThrow();
    await duyetYeuCau({ yeuCauId: yc.id });
    expect((await tinMoiNhat("gv.tranthibinh"))?.noiDung).toMatch(/Yêu cầu làm thêm task .* đã được duyệt/);
  });
});

describe("chuông thông báo", () => {
  it("GET /api/thong-bao chỉ trả thông báo của mình + số chưa đọc; chưa đăng nhập → 401", async () => {
    await dangNhapNhu("gv.tranthibinh");
    const res = await apiThongBao();
    const body = await res.json();
    const u = await user("gv.tranthibinh");
    expect(body.chuaDoc).toBe(await db.thongBao.count({ where: { userId: u.id, daDoc: false } }));
    expect(body.items.length).toBeGreaterThan(0);
    const ids = body.items.map((x: { id: string }) => x.id);
    expect(await db.thongBao.count({ where: { id: { in: ids }, userId: { not: u.id } } })).toBe(0);

    phien.userId = null;
    expect((await apiThongBao()).status).toBe(401);
  });

  it("đánh dấu đã đọc chỉ tác động thông báo của mình", async () => {
    const tbm = await user("tbm.phamthibich");
    const cuaTbm = await db.thongBao.findFirstOrThrow({ where: { userId: tbm.id, daDoc: false } });
    await dangNhapNhu("gv.tranthibinh");
    await docThongBao(cuaTbm.id);
    expect((await db.thongBao.findUniqueOrThrow({ where: { id: cuaTbm.id } })).daDoc).toBe(false);
    await docTatCaThongBao();
    const gv = await user("gv.tranthibinh");
    expect(await db.thongBao.count({ where: { userId: gv.id, daDoc: false } })).toBe(0);
    expect(await db.thongBao.count({ where: { userId: tbm.id, daDoc: false } })).toBeGreaterThan(0);
  });
});
