// Tải dữ liệu và gọi hàm tính kết quả dùng chung (mục 10.3; spec-v1.6 mục 4) cho một hoặc nhiều người trong kỳ.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { DoiTuong } from "@/generated/prisma/enums";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { tinhKetQuaThuan, type KetQuaTinh, type TaskKetQua } from "@/lib/ket-qua";
import { laDoiTuong } from "@/lib/roles";

type Tx = Prisma.TransactionClient;

/** Tính kết quả cho nhiều người (theo vị trí hiện tại của từng người) trong một kỳ. */
export async function taiKetQua(
  kyId: string,
  nguois: { id: string; role: string }[],
  tx: Tx = db,
): Promise<Map<string, KetQuaTinh>> {
  const ds = nguois.filter((u): u is { id: string; role: DoiTuong } => laDoiTuong(u.role as never));
  const ids = ds.map((u) => u.id);
  // Trong transaction: chạy tuần tự (một connection).
  const bacs = await tx.bacXepLoai.findMany({ where: { kyId } });
  const dangKys = await tx.dangKy.findMany({
    where: { kyId, userId: { in: ids } },
    select: { userId: true, trangThai: true, xepLoai: true },
  });
  const kpiTasks = await tx.kpiTask.findMany({
    where: { kyId, userId: { in: ids }, task: TASK_DANG_DUNG },
    select: {
      userId: true,
      trangThai: true,
      task: { select: { ten: true, loai: true, thuTu: true, nhiemVu: { select: { ten: true, thuTu: true } } } },
    },
  });
  kpiTasks.sort((a, b) => a.task.nhiemVu.thuTu - b.task.nhiemVu.thuTu || a.task.thuTu - b.task.thuTu);

  const kq = new Map<string, KetQuaTinh>();
  for (const u of ds) {
    const tasks: TaskKetQua[] = kpiTasks
      .filter((k) => k.userId === u.id)
      .map((k) => ({ ten: k.task.ten, nhiemVu: k.task.nhiemVu.ten, loai: k.task.loai, trangThai: k.trangThai }));
    kq.set(
      u.id,
      tinhKetQuaThuan({
        dangKy: dangKys.find((d) => d.userId === u.id) ?? null,
        tasks,
        bacs: bacs.filter((b) => b.doiTuong === u.role),
      }),
    );
  }
  return kq;
}

/** `tinhKetQua(kyId, userId)` của đặc tả: kết quả một người (null nếu người đó không làm KPI). */
export async function tinhKetQua(kyId: string, userId: string, tx: Tx = db): Promise<KetQuaTinh | null> {
  const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!u) return null;
  return (await taiKetQua(kyId, [u], tx)).get(u.id) ?? null;
}
