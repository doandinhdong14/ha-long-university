// v1.6 – "Theo dõi kết quả đã chốt" (docs/spec-v1.6.md mục 8, 12.5): phạm vi HP / HT, chỉ task DA_CHOT, bộ lọc,
// phân trang 50 dòng, chỉ xem (thao tác ghi bị chặn), quyền xem file minh chứng.
import { beforeAll, describe, expect, it } from "vitest";
import type { DoiTuong } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { layTaskTheoDoi, layTheoDoi, SO_DONG_MOI_TRANG } from "@/lib/services/theo-doi";
import { dangKyVaDuyet, dangNhapNhu, kyDau, lamTask, moFile, resetDb, taskCua, thaoTac, user } from "./helpers";

let kyId: string;

/** Người dùng hiện tại (đủ trường cho service). */
async function nguoiDung(username: string) {
  const u = await user(username);
  return { id: u.id, username: u.username, hoTen: u.hoTen, role: u.role, boMonId: u.boMonId, khoaId: u.khoaId };
}

/** Đánh dấu n task bắt buộc đầu tiên (chưa có) của người này là DA_CHOT, ngày chốt lùi dần. */
async function taoTaskDaChot(username: string, n: number) {
  const u = await user(username);
  await db.dangKy.upsert({
    where: { kyId_userId: { kyId, userId: u.id } },
    create: { kyId, userId: u.id, trangThai: "DA_DUYET" },
    update: {},
  });
  const tasks = await db.task.findMany({
    where: { loai: "BAT_BUOC", nhiemVu: { kyId, doiTuong: u.role as DoiTuong }, kpiTasks: { none: { userId: u.id } } },
    orderBy: [{ nhiemVu: { thuTu: "asc" } }, { thuTu: "asc" }],
    take: n,
  });
  const goc = Date.now();
  await db.kpiTask.createMany({
    data: tasks.map((t, i) => ({ userId: u.id, kyId, taskId: t.id, trangThai: "DA_CHOT" as const, chotLuc: new Date(goc - (i + 1) * 60_000) })),
  });
}

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
  // Khoa thứ hai (chưa có hiệu phó) + 1 GV của khoa đó.
  const khoa2 = await db.khoa.create({ data: { ten: "Khoa Kinh tế" } });
  const bm2 = await db.boMon.create({ data: { ten: "Bộ môn Kế toán", khoaId: khoa2.id } });
  await db.user.create({ data: { username: "gv.khoakhac", hoTen: "Giáo Viên Khoa Khác", role: "GV", passwordHash: "x", boMonId: bm2.id } });

  // Qua luồng thật (có file minh chứng): 1 task GV đã chốt, 1 task GV đang chờ chốt.
  await dangKyVaDuyet("gv.nguyenvanan", { caiTien: true });
  const [t1, t2] = await taskCua("gv.nguyenvanan");
  await lamTask("gv.nguyenvanan", t1.id, "DA_CHOT");
  await lamTask("gv.nguyenvanan", t2.id, "CHO_CHOT");
  const ct = (await taskCua("gv.nguyenvanan")).find((t) => t.task.loai === "CAI_TIEN")!;
  await lamTask("gv.nguyenvanan", ct.id, "DA_CHOT");

  // Số lượng lớn (dựng thẳng DB): đủ > 50 dòng cho HT.
  await taoTaskDaChot("gv.tranthibinh", 22);
  await taoTaskDaChot("gv.levancuong", 20);
  await taoTaskDaChot("tbm.phamthibich", 5);
  await taoTaskDaChot("tk.levankhoa", 4);
  await taoTaskDaChot("hp.tranthiphuong", 3);
  await taoTaskDaChot("gv.khoakhac", 2);
});

describe("phạm vi (mục 8.2)", () => {
  it("HP: task đã chốt của GV và TBM thuộc khoa mình; không thấy TK, HP, khoa khác, task chưa chốt", async () => {
    const d = await layTheoDoi(await nguoiDung("hp.tranthiphuong"), kyId, { trang: 1 });
    expect(d.viTris).toEqual(["GV", "TBM"]);
    // GV: an 2 (1 bắt buộc + 1 cải tiến) + bình 22 + cường 20; TBM 5.
    expect(d.dem).toEqual({ GV: 44, TBM: 5 });
    expect(d.tong).toBe(49);
    const nguoi = new Set(d.dong.map((x) => x.username));
    expect(nguoi).toEqual(new Set(["gv.nguyenvanan", "gv.tranthibinh", "gv.levancuong", "tbm.phamthibich"]));
    // Mới chốt nhất lên trước.
    const luc = d.dong.map((x) => x.chotLuc!.getTime());
    expect([...luc].sort((a, b) => b - a)).toEqual(luc);
    // Người duyệt lấy từ bài nộp đã duyệt gần nhất; người chốt từ task.
    const an = d.dong.find((x) => x.username === "gv.nguyenvanan" && !x.laCaiTien)!;
    expect(an).toMatchObject({ nguoiDuyet: "Phạm Thị Bích", nguoiChot: "Lê Văn Khoa", chucVu: "GV", donVi: "Bộ môn Khoa học máy tính" });
  });

  it("HT: task đã chốt của cả 4 chức vụ toàn trường (kể cả khoa khác)", async () => {
    const d = await layTheoDoi(await nguoiDung("ht.nguyenvanhieu"), kyId, { trang: 1 });
    expect(d.viTris).toEqual(["GV", "TBM", "TK", "HP"]);
    expect(d.dem).toEqual({ GV: 46, TBM: 5, TK: 4, HP: 3 });
    expect(d.tong).toBe(58);
    expect(d.luaChon.khoas.map((k) => k.ten).sort()).toEqual(["Khoa Công nghệ thông tin", "Khoa Kinh tế"]);
  });
});

describe("bộ lọc, phân trang (mục 8.3)", () => {
  it("50 dòng/trang; trang 2 là phần còn lại", async () => {
    const ht = await nguoiDung("ht.nguyenvanhieu");
    const t1 = await layTheoDoi(ht, kyId, { trang: 1 });
    const t2 = await layTheoDoi(ht, kyId, { trang: 2 });
    expect(SO_DONG_MOI_TRANG).toBe(50);
    expect(t1.dong).toHaveLength(50);
    expect(t2.dong).toHaveLength(8);
    expect(t1.soTrang).toBe(2);
    expect(new Set([...t1.dong, ...t2.dong].map((x) => x.id)).size).toBe(58);
  });

  it("lọc theo khoa, bộ môn, chức vụ, người, loại", async () => {
    const ht = await nguoiDung("ht.nguyenvanhieu");
    const khoa2 = await db.khoa.findFirstOrThrow({ where: { ten: "Khoa Kinh tế" } });
    expect((await layTheoDoi(ht, kyId, { trang: 1, khoa: khoa2.id })).tong).toBe(2);
    const bm1 = await db.boMon.findFirstOrThrow({ where: { ten: "Bộ môn Khoa học máy tính" } });
    // Bộ môn: GV + TBM của bộ môn (TK, HP không thuộc bộ môn nào).
    expect((await layTheoDoi(ht, kyId, { trang: 1, boMon: bm1.id })).tong).toBe(49);
    expect((await layTheoDoi(ht, kyId, { trang: 1, viTri: "TK" })).tong).toBe(4);
    const an = await user("gv.nguyenvanan");
    expect((await layTheoDoi(ht, kyId, { trang: 1, nguoi: an.id })).tong).toBe(2);
    const caiTien = await layTheoDoi(ht, kyId, { trang: 1, loai: "cai-tien" });
    expect(caiTien.dong.map((x) => [x.username, x.task])).toEqual([["gv.nguyenvanan", "Sản phẩm cải tiến sáng tạo"]]);
    expect((await layTheoDoi(ht, kyId, { trang: 1, loai: "nhiem-vu" })).tong).toBe(57);
    // HP lọc người ngoài phạm vi → không có gì.
    const tk = await user("tk.levankhoa");
    expect((await layTheoDoi(await nguoiDung("hp.tranthiphuong"), kyId, { trang: 1, nguoi: tk.id })).tong).toBe(0);
  });
});

describe("chỉ xem, quyền file (mục 8.4)", () => {
  it("chi tiết task: trong phạm vi và đã chốt mới mở được", async () => {
    const [t1, t2] = await taskCua("gv.nguyenvanan");
    const hp = await nguoiDung("hp.tranthiphuong");
    expect((await layTaskTheoDoi(hp, t1.id))?.nguoiDuyet).toBe("Phạm Thị Bích");
    expect(await layTaskTheoDoi(hp, t2.id)).toBeNull(); // chưa chốt
    const [tkTask] = await taskCua("tk.levankhoa");
    expect(await layTaskTheoDoi(hp, tkTask.id)).toBeNull(); // TK ngoài phạm vi HP
    expect(await layTaskTheoDoi(await nguoiDung("ht.nguyenvanhieu"), tkTask.id)).not.toBeNull();
    expect(await layTaskTheoDoi(await nguoiDung("tk.levankhoa"), t1.id)).toBeNull(); // vai trò khác
  });

  it("HP/HT không thay đổi được task đã chốt (không hủy chốt, không trả về)", async () => {
    const [t1] = await taskCua("gv.nguyenvanan");
    for (const u of ["hp.tranthiphuong", "ht.nguyenvanhieu"]) {
      await dangNhapNhu(u);
      for (const hd of ["HUY_DUYET", "TRA_VE", "CHOT"]) {
        expect((await thaoTac(t1.id, hd, "x")).ok, `${u} ${hd}`).toBe(false);
      }
    }
    expect((await db.kpiTask.findUniqueOrThrow({ where: { id: t1.id } })).trangThai).toBe("DA_CHOT");
  });

  it("minh chứng task đã chốt: HP (GV khoa mình) và HT xem được; task chưa chốt thì HT vẫn bị chặn", async () => {
    const [t1, t2] = await taskCua("gv.nguyenvanan");
    const f1 = await db.fileDinhKem.findFirstOrThrow({ where: { baiNop: { kpiTaskId: t1.id } } });
    const f2 = await db.fileDinhKem.findFirstOrThrow({ where: { baiNop: { kpiTaskId: t2.id } } });
    await dangNhapNhu("ht.nguyenvanhieu");
    expect((await moFile(f1.id)).status).toBe(200);
    expect((await moFile(f2.id)).status).toBe(403);
    await dangNhapNhu("hp.tranthiphuong");
    expect((await moFile(f1.id)).status).toBe(200);
    expect((await moFile(f2.id)).status).toBe(403);
    // Người ngoài chuỗi vẫn bị chặn.
    await dangNhapNhu("gv.tranthibinh");
    expect((await moFile(f1.id)).status).toBe(403);
  });
});
