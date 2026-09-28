import { beforeAll, describe, expect, it } from "vitest";
import {
  congBoKy,
  luuBangXepLoai,
  suaNgayKy,
  suaNhiemVu,
  suaTask,
  taoKy,
  themNhiemVu,
  themTask,
  xoaNhiemVu,
  xoaTask,
} from "@/app/(app)/admin/phan-viec/actions";
import { db } from "@/lib/db";
import { dangNhapNhu, resetDb, user } from "./helpers";

const BAC = [
  { ten: "A", diemToiThieu: 50 },
  { ten: "F", diemToiThieu: 0 },
];

let kySeedId: string;

beforeAll(async () => {
  await resetDb();
  kySeedId = (await db.ky.findFirstOrThrow()).id;
});

describe("Phân việc đầu kỳ – quyền", () => {
  it("chỉ ADMIN", async () => {
    await dangNhapNhu("tbm.phamthibich");
    const loi = { ok: false, error: "Bạn không có quyền thực hiện thao tác này." };
    expect(await taoKy({ ten: "X", namHoc: "2026-2027", soKy: 2, ngayBatDau: "2026-12-01", ngayKetThuc: "2026-12-31" })).toEqual(loi);
    expect(await themNhiemVu({ kyId: kySeedId, doiTuong: "TBM", ten: "X", diem: 5 })).toEqual(loi);
    expect(await congBoKy(kySeedId)).toEqual(loi);
  });
});

/** Số nhiệm vụ cải tiến (và task CAI_TIEN của chúng) theo vị trí trong một kỳ. */
async function demCaiTien(kyId: string) {
  const nvs = await db.nhiemVu.findMany({ where: { kyId, laCaiTien: true }, include: { tasks: true } });
  const kq: Record<string, string> = {};
  for (const nv of nvs) {
    kq[nv.doiTuong] = kq[nv.doiTuong] ? "TRÙNG" : `${nv.diem} điểm, ${nv.tasks.map((t) => t.loai).join(",")}`;
  }
  return kq;
}
const MOT_CAI_TIEN_MOI_VI_TRI = { GV: "0 điểm, CAI_TIEN", TBM: "0 điểm, CAI_TIEN", TK: "0 điểm, CAI_TIEN", HP: "0 điểm, CAI_TIEN" };

describe("v1.6 – nhiệm vụ cải tiến sáng tạo (damBaoNhiemVuCaiTien)", () => {
  it("seed: mỗi vị trí đúng 1 nhiệm vụ cải tiến 0 điểm có 1 task CAI_TIEN; không có task Mở rộng", async () => {
    expect(await demCaiTien(kySeedId)).toEqual(MOT_CAI_TIEN_MOI_VI_TRI);
    expect(await db.task.count({ where: { loai: "MO_RONG" } })).toBe(0);
  });

  it("chạy lại nhiều lần không tạo trùng (kể cả chạy song song); thiếu task thì bổ sung", async () => {
    const { damBaoNhiemVuCaiTien } = await import("@/lib/cai-tien");
    const lan = await Promise.all([1, 2, 3].map(() => db.$transaction((tx) => damBaoNhiemVuCaiTien(tx, kySeedId))));
    expect(lan).toEqual([0, 0, 0]);
    const nv = await db.nhiemVu.findFirstOrThrow({ where: { kyId: kySeedId, laCaiTien: true, doiTuong: "TK" } });
    await db.task.deleteMany({ where: { nhiemVuId: nv.id } });
    expect(await db.$transaction((tx) => damBaoNhiemVuCaiTien(tx, kySeedId))).toBe(1);
    expect(await demCaiTien(kySeedId)).toEqual(MOT_CAI_TIEN_MOI_VI_TRI);
  });

  it("tạo kỳ mới (không sao chép) → có ngay 4 nhiệm vụ cải tiến; không tính là nhiệm vụ để công bố", async () => {
    await dangNhapNhu("admin.quantri");
    const r = await taoKy({ ten: "Kỳ 4 – 2026-2027", namHoc: "2026-2027", soKy: 4, ngayBatDau: "2027-06-01", ngayKetThuc: "2027-08-31" });
    expect(r.ok).toBe(true);
    const kyId = r.ok ? r.data.id : "";
    expect(await demCaiTien(kyId)).toEqual(MOT_CAI_TIEN_MOI_VI_TRI);
    for (const d of ["GV", "TBM", "TK", "HP"]) await luuBangXepLoai({ kyId, doiTuong: d, bacs: BAC });
    expect(await congBoKy(kyId)).toEqual({ ok: false, error: "Cần có ít nhất 1 nhiệm vụ trước khi công bố." });
    await db.ky.delete({ where: { id: kyId } });
  });
});

describe("v1.6 – admin không sửa / xóa được nhiệm vụ cải tiến (mục 2.5, chặn ở API)", () => {
  it("sửa, xóa nhiệm vụ; thêm, sửa, xóa task của nhiệm vụ cải tiến → bị chặn", async () => {
    await dangNhapNhu("admin.quantri");
    const nv = await db.nhiemVu.findFirstOrThrow({ where: { kyId: kySeedId, doiTuong: "GV", laCaiTien: true }, include: { tasks: true } });
    const loi = { ok: false, error: "Nhiệm vụ cải tiến sáng tạo là nhiệm vụ hệ thống, không sửa hoặc xóa được." };
    expect(await suaNhiemVu({ id: nv.id, ten: "Đổi tên", diem: 5 })).toEqual(loi);
    expect(await xoaNhiemVu(nv.id)).toEqual(loi);
    expect(await themTask({ nhiemVuId: nv.id, ten: "Task thêm" })).toEqual(loi);
    expect(await suaTask({ id: nv.tasks[0].id, ten: "Đổi tên task" })).toEqual(loi);
    expect(await xoaTask(nv.tasks[0].id)).toEqual(loi);
    expect(await demCaiTien(kySeedId)).toEqual(MOT_CAI_TIEN_MOI_VI_TRI);
    expect((await db.nhiemVu.findUniqueOrThrow({ where: { id: nv.id } })).ten).toBe("Đăng ký cải tiến sáng tạo");
  });
});

describe("tạo, sao chép, công bố kỳ", () => {
  it("sao chép từ kỳ trước: đủ nhiệm vụ, task, bảng xếp loại cả 4 vị trí; kỳ mới chưa công bố", async () => {
    await dangNhapNhu("admin.quantri");
    const r = await taoKy({
      ten: "Kỳ 2 – 2026-2027",
      namHoc: "2026-2027",
      soKy: 2,
      ngayBatDau: "2026-12-01",
      ngayKetThuc: "2027-02-28",
      saoChepTuKyId: kySeedId,
    });
    expect(r.ok).toBe(true);
    const kyId = r.ok ? r.data.id : "";
    const ky = await db.ky.findUniqueOrThrow({ where: { id: kyId } });
    expect(ky.daCongBo).toBe(false);
    const dem = await db.nhiemVu.groupBy({ by: ["doiTuong"], where: { kyId, laCaiTien: false }, _count: true, orderBy: { doiTuong: "asc" } });
    expect(Object.fromEntries(dem.map((d) => [d.doiTuong, d._count]))).toEqual({ GV: 10, TBM: 6, TK: 5, HP: 5 });
    // v1.6: nhiệm vụ cải tiến của kỳ cũ không bị chép; kỳ mới có đúng 1 cải tiến mỗi vị trí (tạo lại).
    expect(await demCaiTien(kyId)).toEqual(MOT_CAI_TIEN_MOI_VI_TRI);
    expect(await db.task.count({ where: { nhiemVu: { kyId } } })).toBe(await db.task.count({ where: { nhiemVu: { kyId: kySeedId } } }));
    expect(await db.bacXepLoai.count({ where: { kyId } })).toBe(24);
    expect(await db.bacXepLoai.count({ where: { kyId, doiTuong: "HP" } })).toBe(6);
  });

  it("trùng (năm học, kỳ số) → chặn; ngày kết thúc trước ngày bắt đầu → chặn", async () => {
    await dangNhapNhu("admin.quantri");
    expect(await taoKy({ ten: "Trùng", namHoc: "2026-2027", soKy: 1, ngayBatDau: "2026-10-01", ngayKetThuc: "2026-10-30" })).toEqual({
      ok: false,
      error: "Đã có kỳ 1 của năm học 2026-2027.",
    });
    expect(await taoKy({ ten: "Sai", namHoc: "2027-2028", soKy: 1, ngayBatDau: "2027-10-01", ngayKetThuc: "2027-09-30" })).toEqual({
      ok: false,
      error: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.",
    });
  });

  it("công bố cần ≥1 nhiệm vụ và đủ 4 bảng xếp loại (B13)", async () => {
    await dangNhapNhu("admin.quantri");
    const r = await taoKy({ ten: "Kỳ 3", namHoc: "2026-2027", soKy: 3, ngayBatDau: "2027-03-01", ngayKetThuc: "2027-05-31" });
    const kyId = r.ok ? r.data.id : "";
    expect(await congBoKy(kyId)).toEqual({ ok: false, error: "Cần có ít nhất 1 nhiệm vụ trước khi công bố." });

    expect((await themNhiemVu({ kyId, doiTuong: "TBM", ten: "Nhiệm vụ TBM", diem: 20 })).ok).toBe(true);
    const nv = await db.nhiemVu.findFirstOrThrow({ where: { kyId, laCaiTien: false } });
    expect(nv.doiTuong).toBe("TBM");
    expect(await congBoKy(kyId)).toEqual({
      ok: false,
      error: "Chưa có bảng xếp loại cho: giáo viên, trưởng bộ môn, trưởng khoa, hiệu phó.",
    });
    for (const doiTuong of ["GV", "TBM", "TK"]) {
      expect((await luuBangXepLoai({ kyId, doiTuong, bacs: BAC })).ok).toBe(true);
    }
    expect(await congBoKy(kyId)).toEqual({ ok: false, error: "Chưa có bảng xếp loại cho: hiệu phó." });
    expect((await luuBangXepLoai({ kyId, doiTuong: "HP", bacs: BAC })).ok).toBe(true);
    expect(await congBoKy(kyId)).toEqual({ ok: true, data: undefined });
    expect(await congBoKy(kyId)).toEqual({ ok: false, error: "Kỳ đã được công bố." });
    // Đã công bố thì không xóa hết bậc của một vị trí.
    expect(await luuBangXepLoai({ kyId, doiTuong: "HP", bacs: [] })).toEqual({
      ok: false,
      error: "Kỳ đã công bố phải có ít nhất 1 bậc xếp loại.",
    });
  });

  it("bảng xếp loại: kiểm tra trùng; lưu vị trí này không đụng vị trí khác", async () => {
    await dangNhapNhu("admin.quantri");
    expect(await luuBangXepLoai({ kyId: kySeedId, doiTuong: "TK", bacs: [...BAC, { ten: "a", diemToiThieu: 10 }] })).toEqual({
      ok: false,
      error: "Tên bậc bị trùng.",
    });
    expect((await luuBangXepLoai({ kyId: kySeedId, doiTuong: "TK", bacs: BAC })).ok).toBe(true);
    expect(await db.bacXepLoai.count({ where: { kyId: kySeedId, doiTuong: "TK" } })).toBe(2);
    expect(await db.bacXepLoai.count({ where: { kyId: kySeedId, doiTuong: "GV" } })).toBe(6);
  });
});

describe("khóa sửa/xóa khi đã có người đăng ký / làm (mục 8.2, B13)", () => {
  it("nhiệm vụ đã có đăng ký: không xóa, không sửa điểm; sửa chữ được. Task đã có người làm: không xóa; không còn đổi loại (v1.6)", async () => {
    await dangNhapNhu("admin.quantri");
    const tk = await user("tk.levankhoa");
    const nv = await db.nhiemVu.findFirstOrThrow({
      where: { kyId: kySeedId, doiTuong: "TK", laCaiTien: false },
      orderBy: { thuTu: "asc" },
      include: { tasks: { orderBy: { thuTu: "asc" } } },
    });
    await db.dangKy.create({
      data: { kyId: kySeedId, userId: tk.id, trangThai: "DA_DUYET", nhiemVus: { create: [{ nhiemVuId: nv.id }] } },
    });
    const taskBb = nv.tasks[0];
    await db.kpiTask.create({ data: { userId: tk.id, kyId: kySeedId, taskId: taskBb.id } });

    expect(await xoaNhiemVu(nv.id)).toEqual({ ok: false, error: "Nhiệm vụ đã có người đăng ký, không thể xóa." });
    expect(await suaNhiemVu({ id: nv.id, ten: nv.ten, diem: nv.diem + 1 })).toEqual({
      ok: false,
      error: "Nhiệm vụ đã có người đăng ký, không thể sửa điểm (chỉ sửa được chữ).",
    });
    expect((await suaNhiemVu({ id: nv.id, ten: `${nv.ten} (sửa)`, diem: nv.diem })).ok).toBe(true);

    expect(await xoaTask(taskBb.id)).toEqual({ ok: false, error: "Task đã có người làm hoặc xin làm, không thể xóa." });
    // v1.6: form không còn ô Loại; request sửa tay gửi loai thì server bỏ qua, loại giữ nguyên.
    const suaTay = { id: taskBb.id, ten: `${taskBb.ten} (sửa)`, loai: "MO_RONG" } as Parameters<typeof suaTask>[0];
    expect((await suaTask(suaTay)).ok).toBe(true);
    expect((await db.task.findUniqueOrThrow({ where: { id: taskBb.id } })).loai).toBe("BAT_BUOC");

    // Đăng ký đã duyệt → không thêm task được nữa (không còn task mở rộng).
    expect(await themTask({ nhiemVuId: nv.id, ten: "Mới" })).toEqual({
      ok: false,
      error: "Nhiệm vụ đã có danh sách đăng ký được duyệt, không thể thêm task bắt buộc.",
    });
  });

  it("v1.6: task mới luôn là Bắt buộc, kể cả khi request gửi loai Mở rộng", async () => {
    await dangNhapNhu("admin.quantri");
    const nv = await db.nhiemVu.findFirstOrThrow({ where: { kyId: kySeedId, doiTuong: "HP", laCaiTien: false }, orderBy: { thuTu: "asc" } });
    const guiTay = { nhiemVuId: nv.id, ten: "Task gửi tay", loai: "MO_RONG" } as Parameters<typeof themTask>[0];
    expect((await themTask(guiTay)).ok).toBe(true);
    const t = await db.task.findFirstOrThrow({ where: { nhiemVuId: nv.id, ten: "Task gửi tay" } });
    expect(t.loai).toBe("BAT_BUOC");
    await db.task.delete({ where: { id: t.id } });
  });

  it("kỳ đã chốt → khóa mọi thay đổi, kể cả sửa ngày", async () => {
    await dangNhapNhu("admin.quantri");
    const r = await taoKy({ ten: "Kỳ 4", namHoc: "2026-2027", soKy: 4, ngayBatDau: "2027-06-01", ngayKetThuc: "2027-08-31" });
    const kyId = r.ok ? r.data.id : "";
    await db.ky.update({ where: { id: kyId }, data: { daChot: true } });
    const loi = { ok: false, error: "Kỳ đã chốt, không thể thay đổi." };
    expect(await suaNgayKy({ kyId, ngayBatDau: "2027-06-02", ngayKetThuc: "2027-08-31" })).toEqual(loi);
    expect(await themNhiemVu({ kyId, doiTuong: "GV", ten: "X", diem: 1 })).toEqual(loi);
    expect(await luuBangXepLoai({ kyId, doiTuong: "GV", bacs: BAC })).toEqual(loi);
  });

  it("vị trí không hợp lệ → chặn", async () => {
    await dangNhapNhu("admin.quantri");
    expect(await themNhiemVu({ kyId: kySeedId, doiTuong: "HT", ten: "X", diem: 1 })).toEqual({
      ok: false,
      error: "Vị trí không hợp lệ.",
    });
  });
});
