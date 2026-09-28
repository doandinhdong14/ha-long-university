// Dữ liệu KPI của chính người làm trong một kỳ, dùng chung cho trang Trong kỳ và Cuối kỳ.
import "server-only";
import type { Ky } from "@/generated/prisma/client";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { taiKetQua } from "@/lib/services/ket-qua";

export async function taiKpiCuaToi(ky: Ky, u: { id: string; role: string }) {
  const [dk, kpiTasks, ketQuas, ketQuaKy] = await Promise.all([
    db.dangKy.findUnique({
      where: { kyId_userId: { kyId: ky.id, userId: u.id } },
      include: {
        nhiemVus: { include: { nhiemVu: true }, orderBy: { nhiemVu: { thuTu: "asc" } } },
      },
    }),
    db.kpiTask.findMany({
      where: { userId: u.id, kyId: ky.id, task: TASK_DANG_DUNG },
      include: { task: { select: { ten: true, loai: true, thuTu: true, nhiemVuId: true } } },
    }),
    taiKetQua(ky.id, [u]),
    // Kết quả cuối cùng (chỉ có sau khi chốt kỳ).
    ky.daChot ? db.ketQuaKy.findUnique({ where: { kyId_userId: { kyId: ky.id, userId: u.id } } }) : null,
  ]);
  return { dk, kpiTasks, kq: ketQuas.get(u.id)!, ketQuaKy };
}
