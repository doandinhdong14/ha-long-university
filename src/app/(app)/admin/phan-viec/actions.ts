"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { kiemTraVaiTro } from "@/lib/auth/dal";
import { chan, hanhDong, LoiNghiepVu } from "@/lib/loi";
import { DOI_TUONGS } from "@/lib/roles";
import { docDuLieu } from "@/lib/validate";
import {
  layKyChuaChot,
  lyDoChuaCongBoDuoc,
  nhiemVuDaCoDangKyDuyet,
  saoChepKy,
  soDangKyCuaNhiemVu,
  taskDaCoNguoiLam,
} from "@/lib/services/phan-viec";
import { chotKy } from "@/lib/services/chot-ky";
import { resetDuLieu } from "@/lib/services/reset-du-lieu";
import { chuoiThanhNgay } from "@/lib/time";

const Ngay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.")
  .refine((s) => {
    try {
      chuoiThanhNgay(s);
      return true;
    } catch {
      return false;
    }
  }, "Ngày không hợp lệ.");

const KhoangNgay = z
  .object({ ngayBatDau: Ngay, ngayKetThuc: Ngay })
  .refine((v) => v.ngayKetThuc >= v.ngayBatDau, "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");

const TaoKy = z
  .object({
    ten: z.string().trim().min(1, "Vui lòng nhập tên kỳ.").max(100),
    namHoc: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Năm học có dạng 2026-2027.")
      .refine((s) => Number(s.slice(5)) === Number(s.slice(0, 4)) + 1, "Năm học có dạng 2026-2027."),
    soKy: z.coerce.number().int().min(1, "Kỳ số từ 1 đến 4.").max(4, "Kỳ số từ 1 đến 4."),
    saoChepTuKyId: z.string().optional(),
  })
  .and(KhoangNgay);

const ViTri = z.enum(DOI_TUONGS, { message: "Vị trí không hợp lệ." });

// ───────────────────────── Kỳ ─────────────────────────

export async function taoKy(input: z.input<typeof TaoKy>) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const d = docDuLieu(TaoKy, input);
    const trung = await db.ky.findUnique({ where: { namHoc_soKy: { namHoc: d.namHoc, soKy: d.soKy } } });
    if (trung) throw new LoiNghiepVu(`Đã có kỳ ${d.soKy} của năm học ${d.namHoc}.`, 409);

    return db.$transaction(async (tx) => {
      const ky = await tx.ky.create({
        data: {
          ten: d.ten,
          namHoc: d.namHoc,
          soKy: d.soKy,
          ngayBatDau: chuoiThanhNgay(d.ngayBatDau),
          ngayKetThuc: chuoiThanhNgay(d.ngayKetThuc),
        },
      });
      if (d.saoChepTuKyId) await saoChepKy(tx, d.saoChepTuKyId, ky.id);
      return { id: ky.id };
    });
  });
}

/** Sửa ngày bắt đầu/kết thúc (để demo mô phỏng hết hạn). Kỳ đã chốt thì khóa. */
export async function suaNgayKy(input: { kyId: string; ngayBatDau: string; ngayKetThuc: string }) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const d = docDuLieu(KhoangNgay, input);
    await db.$transaction(async (tx) => {
      await layKyChuaChot(tx, input.kyId);
      await tx.ky.update({
        where: { id: input.kyId },
        data: { ngayBatDau: chuoiThanhNgay(d.ngayBatDau), ngayKetThuc: chuoiThanhNgay(d.ngayKetThuc) },
      });
    });
  });
}

/** Công bố (một chiều): người làm KPI bắt đầu thấy kỳ. */
export async function congBoKy(kyId: string) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    await db.$transaction(async (tx) => {
      const ky = await layKyChuaChot(tx, kyId);
      if (ky.daCongBo) throw new LoiNghiepVu("Kỳ đã được công bố.", 409);
      chan(await lyDoChuaCongBoDuoc(tx, kyId));
      await tx.ky.update({ where: { id: kyId }, data: { daCongBo: true } });
    });
  });
}

// ───────────────────────── Nhiệm vụ ─────────────────────────

const NhiemVu = z.object({
  ten: z.string().trim().min(1, "Vui lòng nhập tên nhiệm vụ.").max(200),
  moTa: z.string().trim().max(2000).optional().transform((s) => s || null),
  diem: z.coerce.number({ message: "Điểm phải là số nguyên." }).int("Điểm phải là số nguyên.").min(0, "Điểm không được âm.").max(1000),
  thuTu: z.coerce.number().int().min(0).max(10000).default(0),
});

export async function themNhiemVu(input: { kyId: string; doiTuong: string } & z.input<typeof NhiemVu>) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const doiTuong = docDuLieu(ViTri, input.doiTuong);
    const d = docDuLieu(NhiemVu, input);
    await db.$transaction(async (tx) => {
      await layKyChuaChot(tx, input.kyId);
      await tx.nhiemVu.create({ data: { ...d, doiTuong, kyId: input.kyId } });
    });
  });
}

export async function suaNhiemVu(input: { id: string } & z.input<typeof NhiemVu>) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const d = docDuLieu(NhiemVu, input);
    await db.$transaction(async (tx) => {
      const nv = await tx.nhiemVu.findUnique({ where: { id: input.id } });
      if (!nv) throw new LoiNghiepVu("Nhiệm vụ không tồn tại.", 404);
      await layKyChuaChot(tx, nv.kyId);
      if (nv.diem !== d.diem && (await soDangKyCuaNhiemVu(tx, nv.id)) > 0) {
        throw new LoiNghiepVu("Nhiệm vụ đã có người đăng ký, không thể sửa điểm (chỉ sửa được chữ).", 409);
      }
      await tx.nhiemVu.update({ where: { id: nv.id }, data: d });
    });
  });
}

export async function xoaNhiemVu(id: string) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    await db.$transaction(async (tx) => {
      const nv = await tx.nhiemVu.findUnique({ where: { id }, include: { tasks: { select: { id: true } } } });
      if (!nv) throw new LoiNghiepVu("Nhiệm vụ không tồn tại.", 404);
      await layKyChuaChot(tx, nv.kyId);
      if ((await soDangKyCuaNhiemVu(tx, nv.id)) > 0) {
        throw new LoiNghiepVu("Nhiệm vụ đã có người đăng ký, không thể xóa.", 409);
      }
      for (const t of nv.tasks) {
        if (await taskDaCoNguoiLam(tx, t.id)) throw new LoiNghiepVu("Nhiệm vụ có task đang được làm, không thể xóa.", 409);
      }
      await tx.nhiemVu.delete({ where: { id: nv.id } });
    });
  });
}

// ───────────────────────── Task ─────────────────────────

const Task = z.object({
  ten: z.string().trim().min(1, "Vui lòng nhập tên task.").max(200),
  moTa: z.string().trim().max(2000).optional().transform((s) => s || null),
  loai: z.enum(["BAT_BUOC", "MO_RONG"], { message: "Loại task không hợp lệ." }),
  thuTu: z.coerce.number().int().min(0).max(10000).default(0),
});

const LOI_THEM_BAT_BUOC =
  "Nhiệm vụ đã có danh sách đăng ký được duyệt, không thể thêm task bắt buộc (task mở rộng vẫn thêm được).";

export async function themTask(input: { nhiemVuId: string } & z.input<typeof Task>) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const d = docDuLieu(Task, input);
    await db.$transaction(async (tx) => {
      const nv = await tx.nhiemVu.findUnique({ where: { id: input.nhiemVuId } });
      if (!nv) throw new LoiNghiepVu("Nhiệm vụ không tồn tại.", 404);
      await layKyChuaChot(tx, nv.kyId);
      if (d.loai === "BAT_BUOC" && (await nhiemVuDaCoDangKyDuyet(tx, nv.id))) throw new LoiNghiepVu(LOI_THEM_BAT_BUOC, 409);
      await tx.task.create({ data: { ...d, nhiemVuId: nv.id } });
    });
  });
}

export async function suaTask(input: { id: string } & z.input<typeof Task>) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const d = docDuLieu(Task, input);
    await db.$transaction(async (tx) => {
      const t = await tx.task.findUnique({ where: { id: input.id }, include: { nhiemVu: true } });
      if (!t) throw new LoiNghiepVu("Task không tồn tại.", 404);
      await layKyChuaChot(tx, t.nhiemVu.kyId);
      if (t.loai !== d.loai) {
        if (await taskDaCoNguoiLam(tx, t.id)) {
          throw new LoiNghiepVu("Task đã có người làm hoặc xin làm, không thể đổi loại (chỉ sửa được chữ).", 409);
        }
        if (d.loai === "BAT_BUOC" && (await nhiemVuDaCoDangKyDuyet(tx, t.nhiemVuId))) {
          throw new LoiNghiepVu(LOI_THEM_BAT_BUOC, 409);
        }
      }
      await tx.task.update({ where: { id: t.id }, data: d });
    });
  });
}

export async function xoaTask(id: string) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    await db.$transaction(async (tx) => {
      const t = await tx.task.findUnique({ where: { id }, include: { nhiemVu: true } });
      if (!t) throw new LoiNghiepVu("Task không tồn tại.", 404);
      await layKyChuaChot(tx, t.nhiemVu.kyId);
      if (await taskDaCoNguoiLam(tx, t.id)) throw new LoiNghiepVu("Task đã có người làm hoặc xin làm, không thể xóa.", 409);
      await tx.task.delete({ where: { id: t.id } });
    });
  });
}

// ───────────────────────── Bảng xếp loại ─────────────────────────

const BangXepLoai = z
  .array(
    z.object({
      ten: z.string().trim().min(1, "Tên bậc không được trống.").max(20, "Tên bậc tối đa 20 ký tự."),
      diemToiThieu: z.coerce
        .number({ message: "Điểm tối thiểu phải là số nguyên." })
        .int("Điểm tối thiểu phải là số nguyên.")
        .min(0, "Điểm tối thiểu không được âm.")
        .max(100000),
    }),
  )
  .max(50)
  .refine((ds) => new Set(ds.map((d) => d.ten.toUpperCase())).size === ds.length, "Tên bậc bị trùng.")
  .refine((ds) => new Set(ds.map((d) => d.diemToiThieu)).size === ds.length, "Điểm tối thiểu của các bậc bị trùng.");

/** Lưu toàn bộ bảng xếp loại của một vị trí trong kỳ (thay thế danh sách cũ). */
export async function luuBangXepLoai(input: {
  kyId: string;
  doiTuong: string;
  bacs: { ten: string; diemToiThieu: number | string }[];
}) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const doiTuong = docDuLieu(ViTri, input.doiTuong);
    const bacs = docDuLieu(BangXepLoai, input.bacs);
    await db.$transaction(async (tx) => {
      const ky = await layKyChuaChot(tx, input.kyId);
      if (ky.daCongBo && bacs.length === 0) throw new LoiNghiepVu("Kỳ đã công bố phải có ít nhất 1 bậc xếp loại.");
      await tx.bacXepLoai.deleteMany({ where: { kyId: ky.id, doiTuong } });
      await tx.bacXepLoai.createMany({ data: bacs.map((b) => ({ ...b, kyId: ky.id, doiTuong })) });
    });
  });
}

// ───────────────────────── Chốt kỳ ─────────────────────────

/** Nút "Chốt kỳ ngay" (demo, mục 8.2): chạy chốt kỳ không cần chờ deadline. */
export async function chotKyNgay(kyId: string) {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    const ky = await db.ky.findUnique({ where: { id: kyId } });
    if (!ky) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);
    if (!ky.daCongBo) throw new LoiNghiepVu("Kỳ chưa công bố, không thể chốt.");
    if (ky.daChot) throw new LoiNghiepVu("Kỳ đã chốt.", 409);
    const r = await chotKy(kyId);
    if (!r) throw new LoiNghiepVu("Kỳ vừa được chốt bởi tiến trình khác.", 409);
    return r;
  });
}

// ───────────────────────── Reset dữ liệu ─────────────────────────

/** Nút đỏ "Reset dữ liệu": xóa minh chứng, tài liệu và mọi dữ liệu KPI; giữ tài khoản, kỳ, phân việc. */
export async function resetDuLieuHeThong() {
  return hanhDong(async () => {
    await kiemTraVaiTro("ADMIN");
    return resetDuLieu();
  });
}
