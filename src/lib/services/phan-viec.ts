import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { damBaoNhiemVuCaiTien } from "@/lib/cai-tien";
import { LoiNghiepVu } from "@/lib/loi";
import { DOI_TUONGS, TEN_VAI_TRO } from "@/lib/roles";

type Tx = Prisma.TransactionClient;

/** Lấy kỳ, chặn nếu không tồn tại hoặc đã chốt (kỳ đã chốt khóa toàn bộ, B19). */
export async function layKyChuaChot(tx: Tx, kyId: string) {
  const ky = await tx.ky.findUnique({ where: { id: kyId } });
  if (!ky) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);
  if (ky.daChot) throw new LoiNghiepVu("Kỳ đã chốt, không thể thay đổi.", 409);
  return ky;
}

/**
 * Sao chép nhiệm vụ, task, bảng xếp loại (cả 4 vị trí) từ kỳ nguồn sang kỳ đích; không chép đăng ký.
 * v1.6: không chép nhiệm vụ cải tiến và task Mở rộng của kỳ cũ; nhiệm vụ cải tiến của kỳ đích do
 * damBaoNhiemVuCaiTien tạo lại.
 */
export async function saoChepKy(tx: Tx, tuKyId: string, sangKyId: string) {
  const nguon = await tx.ky.findUnique({
    where: { id: tuKyId },
    include: { nhiemVus: { where: { laCaiTien: false }, include: { tasks: { where: { loai: "BAT_BUOC" } } } }, bacXepLoais: true },
  });
  if (!nguon) throw new LoiNghiepVu("Kỳ nguồn để sao chép không tồn tại.", 404);

  if (nguon.bacXepLoais.length) {
    await tx.bacXepLoai.createMany({
      data: nguon.bacXepLoais.map((b) => ({
        kyId: sangKyId,
        doiTuong: b.doiTuong,
        ten: b.ten,
        diemToiThieu: b.diemToiThieu,
      })),
    });
  }
  for (const nv of nguon.nhiemVus) {
    await tx.nhiemVu.create({
      data: {
        kyId: sangKyId,
        doiTuong: nv.doiTuong,
        ten: nv.ten,
        moTa: nv.moTa,
        diem: nv.diem,
        thuTu: nv.thuTu,
        tasks: { create: nv.tasks.map((t) => ({ ten: t.ten, moTa: t.moTa, loai: t.loai, thuTu: t.thuTu })) },
      },
    });
  }
  await damBaoNhiemVuCaiTien(tx, sangKyId);
}

/**
 * Điều kiện công bố (B13): có ít nhất 1 nhiệm vụ, và đủ 4 bảng xếp loại (mỗi vị trí ≥1 bậc)
 * vì chốt kỳ xếp loại cho cả 4 vị trí, kể cả người không đăng ký.
 */
export async function lyDoChuaCongBoDuoc(tx: Tx, kyId: string): Promise<string | null> {
  const soNv = await tx.nhiemVu.count({ where: { kyId, laCaiTien: false } });
  if (!soNv) return "Cần có ít nhất 1 nhiệm vụ trước khi công bố.";
  const bacs = await tx.bacXepLoai.groupBy({ by: ["doiTuong"], where: { kyId }, _count: true });
  const thieu = DOI_TUONGS.filter((d) => !bacs.some((b) => b.doiTuong === d));
  if (thieu.length) {
    return `Chưa có bảng xếp loại cho: ${thieu.map((d) => TEN_VAI_TRO[d].toLowerCase()).join(", ")}.`;
  }
  return null;
}

/** Số đăng ký (mọi trạng thái, kể cả Nháp) đã chọn nhiệm vụ này. */
export function soDangKyCuaNhiemVu(tx: Tx, nhiemVuId: string) {
  return tx.dangKyNhiemVu.count({ where: { nhiemVuId } });
}

/** Nhiệm vụ đã có đăng ký Đã duyệt → task bắt buộc đã được giao. */
export async function nhiemVuDaCoDangKyDuyet(tx: Tx, nhiemVuId: string) {
  const n = await tx.dangKyNhiemVu.count({ where: { nhiemVuId, dangKy: { trangThai: "DA_DUYET" } } });
  return n > 0;
}

/** Task đã có người làm hoặc xin làm. */
export async function taskDaCoNguoiLam(tx: Tx, taskId: string) {
  const lam = await tx.kpiTask.count({ where: { taskId } });
  const xin = await tx.yeuCauThemTask.count({ where: { taskId } });
  return lam + xin > 0;
}
