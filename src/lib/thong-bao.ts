import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Tạo thông báo trong web (mục 11) cho danh sách người nhận (bỏ qua null, trùng).
 * - tru: không gửi cho chính người thao tác (B12), vd HT chốt task HP thì chỉ báo HP.
 * - maSuKien: khóa chống trùng (vd nhắc việc) — cùng user + maSuKien chỉ tạo một lần.
 */
export async function guiThongBao(
  tx: Tx,
  nguoiNhan: (string | null | undefined)[],
  noiDung: string,
  opts: { link?: string; maSuKien?: string; tru?: string } = {},
): Promise<number> {
  const ids = [...new Set(nguoiNhan.filter((x): x is string => !!x && x !== opts.tru))];
  if (!ids.length) return 0;
  const { count } = await tx.thongBao.createMany({
    data: ids.map((userId) => ({ userId, noiDung, link: opts.link ?? null, maSuKien: opts.maSuKien ?? null })),
    skipDuplicates: true,
  });
  return count;
}

/** Đường dẫn trong thông báo (chuông bấm vào đi tới trang liên quan). */
export const LINK = {
  dauKy: (kyId: string) => `/dau-ky?kyId=${kyId}`,
  trongKy: (kyId: string) => `/trong-ky?kyId=${kyId}`,
  cuoiKy: (kyId: string) => `/cuoi-ky?kyId=${kyId}`,
  taskCuaToi: (kpiTaskId: string) => `/trong-ky/task/${kpiTaskId}`,
  duyetNguoi: (userId: string, kyId: string, tab: "dang-ky" | "task" | "xin-them") =>
    `/duyet/${userId}?kyId=${kyId}&tab=${tab}`,
  duyetTask: (userId: string, kyId: string, kpiTaskId: string) =>
    `/duyet/${userId}?kyId=${kyId}&tab=task&task=${kpiTaskId}`,
  duyetTongQuan: (kyId: string) => `/duyet?kyId=${kyId}`,
  chot: (kyId: string) => `/chot?kyId=${kyId}`,
};
