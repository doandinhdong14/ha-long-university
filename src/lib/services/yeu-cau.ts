// Xin thêm task mở rộng để làm vượt (mục 5.2): người làm KPI xin → người duyệt duyệt → task
// thêm vào danh sách (Chưa làm), đi đúng vòng trạng thái, phải được chốt mới tính là vượt.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { NguoiDung, NguoiLamKpi } from "@/lib/auth/dal";
import { nguoiDuyet } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { chan, LoiNghiepVu } from "@/lib/loi";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { taiCoCau } from "@/lib/services/co-cau";
import { guiThongBao, LINK } from "@/lib/thong-bao";

type Tx = Prisma.TransactionClient;

/**
 * Xin làm một task mở rộng thuộc nhiệm vụ mình đã được duyệt.
 * Xin lại được sau khi bị từ chối; không được khi đang chờ hoặc đã được giao.
 */
export async function xinThemTask(u: NguoiLamKpi, taskId: string) {
  await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId }, include: { nhiemVu: { include: { ky: true } } } });
    if (!task || task.loai !== "MO_RONG" || task.nhiemVu.doiTuong !== u.role) {
      throw new LoiNghiepVu("Không tìm thấy task mở rộng.", 404);
    }
    const ky = task.nhiemVu.ky;
    chan(lyDoKhongThaoTacTask(ky));

    const dk = await tx.dangKy.findUnique({
      where: { kyId_userId: { kyId: ky.id, userId: u.id } },
      include: { nhiemVus: { where: { nhiemVuId: task.nhiemVuId } } },
    });
    if (!dk || dk.trangThai !== "DA_DUYET" || dk.nhiemVus.length === 0) {
      throw new LoiNghiepVu("Chỉ xin được task mở rộng thuộc nhiệm vụ bạn đã được duyệt.", 403);
    }
    if (await tx.kpiTask.findUnique({ where: { userId_taskId: { userId: u.id, taskId } } })) {
      throw new LoiNghiepVu("Task này đã có trong danh sách của bạn.", 409);
    }
    // Khóa theo người + task để hai lần bấm cùng lúc không tạo 2 yêu cầu chờ duyệt.
    await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext(${`xin-them:${u.id}:${taskId}`}))`;
    const dangCho = await tx.yeuCauThemTask.findFirst({ where: { userId: u.id, taskId, trangThai: "CHO_DUYET" } });
    if (dangCho) throw new LoiNghiepVu("Bạn đã xin task này, đang chờ duyệt.", 409);

    await tx.yeuCauThemTask.create({ data: { userId: u.id, kyId: ky.id, taskId } });
    const cc = await taiCoCau(tx);
    await guiThongBao(tx, [nguoiDuyet(u, cc)?.id], `${u.hoTen} xin làm thêm task mở rộng "${task.ten}".`, {
      link: LINK.duyetNguoi(u.id, ky.id, "xin-them"),
      tru: u.id,
    });
  });
}

/** Yêu cầu mà m là người duyệt; không phải → 404. */
async function layYeuCauDuocDuyet(tx: Tx, m: NguoiDung, yeuCauId: string) {
  const yc = await tx.yeuCauThemTask.findUnique({
    where: { id: yeuCauId },
    include: { ky: true, task: { select: { ten: true } }, user: { select: { id: true, role: true, boMonId: true, khoaId: true } } },
  });
  if (!yc) throw new LoiNghiepVu("Không tìm thấy yêu cầu.", 404);
  const cc = await taiCoCau(tx);
  if (nguoiDuyet(yc.user, cc)?.id !== m.id) throw new LoiNghiepVu("Không tìm thấy yêu cầu.", 404);
  return yc;
}

/** Duyệt yêu cầu xin thêm → giao task mở rộng (Chưa làm). */
export async function duyetYeuCau(m: NguoiDung, input: { yeuCauId: string; nhanXet: string | null }) {
  await db.$transaction(async (tx) => {
    const yc = await layYeuCauDuocDuyet(tx, m, input.yeuCauId);
    chan(lyDoKhongThaoTacTask(yc.ky));
    const { count } = await tx.yeuCauThemTask.updateMany({
      where: { id: yc.id, trangThai: "CHO_DUYET" },
      data: { trangThai: "DA_DUYET", nhanXet: input.nhanXet, nguoiDuyetId: m.id, duyetLuc: new Date() },
    });
    if (!count) throw new LoiNghiepVu("Yêu cầu không còn ở trạng thái Chờ duyệt.", 409);
    await tx.kpiTask.createMany({ data: [{ userId: yc.userId, kyId: yc.kyId, taskId: yc.taskId }], skipDuplicates: true });
    await guiThongBao(tx, [yc.userId], `Yêu cầu làm thêm task "${yc.task.ten}" đã được duyệt.`, {
      link: LINK.trongKy(yc.kyId),
      tru: m.id,
    });
  });
}

/** Từ chối yêu cầu xin thêm (bắt buộc nhận xét). */
export async function tuChoiYeuCau(m: NguoiDung, input: { yeuCauId: string; nhanXet: string }) {
  await db.$transaction(async (tx) => {
    const yc = await layYeuCauDuocDuyet(tx, m, input.yeuCauId);
    chan(lyDoKhongThaoTacTask(yc.ky));
    const { count } = await tx.yeuCauThemTask.updateMany({
      where: { id: yc.id, trangThai: "CHO_DUYET" },
      data: { trangThai: "TU_CHOI", nhanXet: input.nhanXet, nguoiDuyetId: m.id, duyetLuc: new Date() },
    });
    if (!count) throw new LoiNghiepVu("Yêu cầu không còn ở trạng thái Chờ duyệt.", 409);
    await guiThongBao(tx, [yc.userId], `Yêu cầu làm thêm task "${yc.task.ten}" bị từ chối. Nhận xét: ${input.nhanXet}`, {
      link: LINK.trongKy(yc.kyId),
      tru: m.id,
    });
  });
}
