import { execSync } from "node:child_process";
import { db } from "@/lib/db";
import { guiDangKy } from "@/app/(app)/dau-ky/actions";
import { duyetDangKy } from "@/app/(app)/duyet/actions";
import { thaoTacTask } from "@/components/kpi/actions";
import { POST as apiNop } from "@/app/api/kpi-task/[id]/bai-nop/route";
import { PATCH as apiSua } from "@/app/api/bai-nop/[id]/route";
import { GET as apiFile } from "@/app/api/files/[id]/route";
import { nguoiChot, nguoiDuyet } from "@/lib/co-cau";
import { taiCoCau } from "@/lib/services/co-cau";

export const phien: { userId: string | null } = { userId: null };

/** Dọn sạch DB test (chỉ localhost + tên đuôi _test), áp migration, seed lại. */
export async function resetDb() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
    throw new Error(`resetDb chỉ chạy trên DB test cục bộ: ${url.hostname}${url.pathname}`);
  }
  execSync("npx prisma migrate deploy", { stdio: "ignore", env: process.env });
  const bang = await db.$queryRawUnsafe<{ tablename: string }[]>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  await db.$executeRawUnsafe(`TRUNCATE ${bang.map((b) => `"${b.tablename}"`).join(", ")} CASCADE`);
  execSync("npx tsx prisma/seed.ts", { stdio: "ignore", env: process.env });
}

/** Đăng nhập giả lập bằng username. */
export async function dangNhapNhu(username: string) {
  const u = await db.user.findUniqueOrThrow({ where: { username } });
  phien.userId = u.id;
  return u;
}

export async function user(username: string) {
  return db.user.findUniqueOrThrow({ where: { username } });
}

// ───────────── Tiện ích cho luồng KPI ─────────────

export async function kyDau() {
  return db.ky.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
}

/** Người duyệt / người chốt hiện tại của một người làm KPI. */
export async function nguoiDuyetCua(username: string) {
  const cc = await taiCoCau();
  return nguoiDuyet(cc.users.find((x) => x.username === username)!, cc)!.username;
}
export async function nguoiChotCua(username: string) {
  const cc = await taiCoCau();
  return nguoiChot(cc.users.find((x) => x.username === username)!, cc)!.username;
}

/**
 * Người làm KPI gửi đăng ký (v1.6: mọi nhiệm vụ của vị trí đều bắt buộc, chỉ chọn có cải tiến hay không);
 * người duyệt duyệt.
 */
export async function dangKyVaDuyet(username: string, opts: { caiTien?: boolean } = {}) {
  const ky = await kyDau();
  const u = await dangNhapNhu(username);
  const g = await guiDangKy({ kyId: ky.id, caiTien: opts.caiTien ?? false });
  if (!g.ok) throw new Error(g.error);
  const dk = await db.dangKy.findUniqueOrThrow({ where: { kyId_userId: { kyId: ky.id, userId: u.id } } });
  await dangNhapNhu(await nguoiDuyetCua(username));
  const d = await duyetDangKy({ dangKyId: dk.id });
  if (!d.ok) throw new Error(d.error);
  return u;
}

export function fileMau(ten = "minh-chung.pdf", noiDung = "%PDF-1.4 minh chung") {
  return new File([noiDung], ten, { type: "application/pdf" });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) } as never;
}

/** Gọi API nộp minh chứng như trình duyệt (phiên hiện tại). */
export async function nop(kpiTaskId: string, files: File[] = [fileMau()], ghiChu = "") {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  fd.append("ghiChu", ghiChu);
  return apiNop(new Request("http://localhost/api", { method: "POST", body: fd }), ctx(kpiTaskId));
}

export async function suaBai(baiNopId: string, ghiChu: string, files: File[] = []) {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  fd.append("ghiChu", ghiChu);
  return apiSua(new Request("http://localhost/api", { method: "PATCH", body: fd }), ctx(baiNopId));
}

export async function moFile(fileId: string) {
  return apiFile(new Request(`http://localhost/api/files/${fileId}`), ctx(fileId));
}

/** Thao tác của người duyệt/người chốt với phiên hiện tại. */
export async function thaoTac(kpiTaskId: string, hanhDong: string, nhanXet?: string) {
  return thaoTacTask({ kpiTaskId, hanhDong, nhanXet });
}

export async function taskCua(username: string) {
  const u = await user(username);
  return db.kpiTask.findMany({
    where: { userId: u.id },
    include: { task: { select: { ten: true, loai: true, thuTu: true, nhiemVu: { select: { thuTu: true } } } } },
    orderBy: [{ task: { nhiemVu: { thuTu: "asc" } } }, { task: { thuTu: "asc" } }],
  });
}

/**
 * Người làm KPI nộp; người duyệt duyệt; (tuỳ chọn) người chốt chốt.
 * v1.6: task GV/TBM/TK được duyệt là sang Chờ chốt ngay (không còn Gửi lên); "DA_DUYET" chỉ còn cho task HP.
 */
export async function lamTask(username: string, kpiTaskId: string, den: "DA_DUYET" | "CHO_CHOT" | "DA_CHOT") {
  await dangNhapNhu(username);
  const r = await nop(kpiTaskId);
  if (r.status !== 201) throw new Error(await r.text());
  const duyet = await nguoiDuyetCua(username);
  const chot = await nguoiChotCua(username);
  await dangNhapNhu(duyet);
  const d = await thaoTac(kpiTaskId, "DUYET");
  if (!d.ok) throw new Error(d.error);
  if (duyet === chot) {
    // Task HP: HT duyệt (DA_DUYET) rồi chốt.
    if (den === "DA_DUYET") return;
    const c = await thaoTac(kpiTaskId, "CHOT");
    if (!c.ok) throw new Error(c.error);
    return;
  }
  if (den === "DA_DUYET") throw new Error("v1.6: task GV/TBM/TK duyệt xong là Chờ chốt, không dừng ở Đã duyệt.");
  if (den === "CHO_CHOT") return;
  await dangNhapNhu(chot);
  const c = await thaoTac(kpiTaskId, "CHOT");
  if (!c.ok) throw new Error(c.error);
}
