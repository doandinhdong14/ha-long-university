import { beforeAll, describe, expect, it } from "vitest";
import { suaTaiKhoan, taoTaiKhoan } from "@/app/(app)/admin/tai-khoan/actions";
import { POST as apiQuyDinh } from "@/app/api/quy-dinh/route";
import { danhDauDaXem } from "@/components/giay-to/actions";
import { db } from "@/lib/db";
import { dsGiayToCuaToi, layGiayToCuaToi, nguoiNhanHienTai } from "@/lib/services/van-ban";
import { dangNhapNhu, fileMau, moFile, resetDb, user } from "./helpers";

let vanBanId: string;

async function banHanh(tieuDe: string, viTri: string[], files: File[] = []) {
  const fd = new FormData();
  fd.append("tieuDe", tieuDe);
  fd.append("noiDung", "Nội dung quy định: thực hiện nghiêm túc.");
  viTri.forEach((v) => fd.append("viTriNhan", v));
  files.forEach((f) => fd.append("files", f));
  return apiQuyDinh(new Request("http://localhost/api/quy-dinh", { method: "POST", body: fd }));
}

async function thay(username: string) {
  const u = await dangNhapNhu(username);
  return (await dsGiayToCuaToi({ ...u })).map((v) => v.tieuDe);
}

async function daXem() {
  const n = (await nguoiNhanHienTai([vanBanId])).get(vanBanId)!;
  return `${n.soDaXem}/${n.nhan.length}`;
}

beforeAll(async () => {
  await resetDb();
});

describe("ban hành quy định (mục 9, case phụ mục 15)", () => {
  it("chỉ hiệu trưởng được ban hành (API cũng chặn); kiểm tra dữ liệu", async () => {
    for (const u of ["hp.tranthiphuong", "admin.quantri", "gv.nguyenvanan"]) {
      await dangNhapNhu(u);
      expect((await banHanh("X", ["GV"])).status, u).toBe(403);
    }
    await dangNhapNhu("ht.nguyenvanhieu");
    expect((await (await banHanh("X", [])).json()).error).toBe("Vui lòng tick ít nhất 1 vị trí nhận.");
    expect((await (await banHanh("X", ["HT"])).json()).error).toBe("Vị trí nhận không hợp lệ.");
  });

  it("tick Giáo viên + Admin → 3 GV và admin thấy; TBM, TK, HP không thấy; thông báo đúng người", async () => {
    await dangNhapNhu("ht.nguyenvanhieu");
    const res = await banHanh("Quy định chấm KPI", ["GV", "ADMIN"], [fileMau("quy-dinh.pdf")]);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.soNguoiNhan).toBe(4);
    vanBanId = body.vanBanId;

    for (const u of ["gv.nguyenvanan", "gv.tranthibinh", "gv.levancuong", "admin.quantri"]) {
      expect(await thay(u), u).toEqual(["Quy định chấm KPI"]);
    }
    for (const u of ["tbm.phamthibich", "tk.levankhoa", "hp.tranthiphuong"]) {
      expect(await thay(u), u).toEqual([]);
      expect(await layGiayToCuaToi(await dangNhapNhu(u), vanBanId), u).toBeNull();
    }
    const admin = await user("admin.quantri");
    expect((await db.thongBao.findFirstOrThrow({ where: { userId: admin.id } })).link).toBe(`/admin/chi-thi/${vanBanId}`);
    const gv = await user("gv.nguyenvanan");
    expect((await db.thongBao.findFirstOrThrow({ where: { userId: gv.id } })).link).toBe(`/giay-to/${vanBanId}`);
    expect(await db.thongBao.count({ where: { user: { role: { in: ["TBM", "TK", "HP"] } } } })).toBe(0);
  });

  it("1 GV mở → 1/4 đã xem; mở lại không đếm thêm; người không nhận mở → không tính", async () => {
    expect(await daXem()).toBe("0/4");
    await dangNhapNhu("gv.nguyenvanan");
    expect(await danhDauDaXem(vanBanId)).toEqual({ ok: true, data: { moiXem: true } });
    expect(await danhDauDaXem(vanBanId)).toEqual({ ok: true, data: { moiXem: false } });
    await dangNhapNhu("tbm.phamthibich");
    expect(await danhDauDaXem(vanBanId)).toEqual({ ok: true, data: { moiXem: false } });
    expect(await daXem()).toBe("1/4");
    const ds = await dsGiayToCuaToi(await dangNhapNhu("gv.nguyenvanan"));
    expect(ds[0].daXem).toBe(true);
  });

  it("admin tạo thêm 1 GV mới → GV mới thấy quy định; HT thấy 1/5", async () => {
    await dangNhapNhu("admin.quantri");
    expect((await taoTaiKhoan({ hoTen: "Giáo Viên Mới", role: "GV" })).ok).toBe(true);
    expect(await thay("gv.giaovienmoi")).toEqual(["Quy định chấm KPI"]);
    expect(await daXem()).toBe("1/5");
  });

  it("đổi chức vụ: thấy quy định của vị trí mới, không còn thấy của vị trí cũ; x chỉ đếm người đang ở vị trí nhận", async () => {
    await dangNhapNhu("admin.quantri");
    const an = await user("gv.nguyenvanan");
    const bich = await user("tbm.phamthibich");
    // Hạ TBM trước để gv.nguyenvanan lên TBM được.
    await suaTaiKhoan({ id: bich.id, hoTen: bich.hoTen, role: "GV" });
    expect((await suaTaiKhoan({ id: an.id, hoTen: an.hoTen, role: "TBM" })).ok).toBe(true);
    expect(await thay("tbm.nguyenvanan")).toEqual([]);
    expect(await thay("gv.phamthibich")).toEqual(["Quy định chấm KPI"]);
    // Người đã xem (An) không còn ở vị trí nhận → 0/5 (không phải 1/5 hay 1/4 vượt số người).
    expect(await daXem()).toBe("0/5");
  });

  it("quyền mở file quy định: người nhận, HT, Admin; người khác bị chặn", async () => {
    const f = await db.fileDinhKem.findFirstOrThrow({ where: { vanBanId } });
    const thu = async (u: string) => {
      await dangNhapNhu(u);
      return (await moFile(f.id)).status;
    };
    expect(await thu("gv.tranthibinh")).toBe(200);
    expect(await thu("ht.nguyenvanhieu")).toBe(200);
    expect(await thu("admin.quantri")).toBe(200);
    expect(await thu("tk.levankhoa")).toBe(403);
    expect(await thu("tbm.nguyenvanan")).toBe(403);
  });
});
