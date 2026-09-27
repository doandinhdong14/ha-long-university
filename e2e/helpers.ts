import { execSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import "dotenv/config";
import pg from "pg";

/** Chạy SQL trực tiếp (chỉnh dữ liệu cho kịch bản test). */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Dọn sạch DB test (chỉ localhost, tên kết thúc _test), áp migration, seed lại. */
export async function resetDb() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
    throw new Error('resetDb chỉ chạy trên DB test cục bộ: ' + url.hostname + url.pathname);
  }
  execSync('npx prisma migrate deploy', { stdio: 'ignore' });
  const bang = await sql<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  await sql('TRUNCATE ' + bang.map((b) => '"' + b.tablename + '"').join(', ') + ' CASCADE');
  execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
}

export async function dangNhap(page: Page, username: string, matKhau = "123456") {
  await page.context().clearCookies();
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(matKhau);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/dang-nhap/);
}

/** Danh sách nhãn menu bên trái. */
export async function menu(page: Page): Promise<string[]> {
  return page.locator("aside nav a").allInnerTexts();
}

/** Người làm KPI tick nhiệm vụ và gửi (qua giao diện Đầu kỳ). */
export async function dangKyUi(page: Page, username: string, nhiemVus: string[], nutGui: string) {
  await dangNhap(page, username);
  await page.goto("/dau-ky");
  for (const nv of nhiemVus) await page.getByLabel(`Chọn ${nv}`).check();
  await expect(page.getByTestId("so-nhiem-vu")).toHaveText(String(nhiemVus.length));
  await page.getByRole("button", { name: nutGui }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Chờ duyệt");
}

/** Người duyệt duyệt danh sách đăng ký của nguoiLam (qua màn hình Duyệt). */
export async function duyetDangKyUi(page: Page, nguoiDuyet: string, nguoiLam: string) {
  await dangNhap(page, nguoiDuyet);
  await page.goto("/duyet");
  await page.locator(`tr[data-nguoi="${nguoiLam}"]`).getByRole("link", { name: "Xem" }).click();
  await page.getByRole("button", { name: "Duyệt", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận duyệt" }).click();
  await expect(page.getByText("Đã duyệt danh sách. Các task bắt buộc đã được giao.")).toBeVisible();
}

/** Người làm KPI nộp minh chứng cho một task (qua trang Trong kỳ). */
export async function nopUi(page: Page, username: string, task: string, tenFile = "minh-chung.pdf") {
  await dangNhap(page, username);
  await page.goto("/trong-ky");
  await page.locator(`[data-task="${task}"]`).getByRole("link").click();
  await page.getByLabel("File minh chứng").setInputFiles({
    name: tenFile,
    mimeType: tenFile.endsWith(".png") ? "image/png" : "application/pdf",
    buffer: Buffer.from("%PDF-1.4 minh chung"),
  });
  await page.getByRole("button", { name: "Gửi minh chứng" }).click();
  await expect(page.getByText(/Đã nộp minh chứng, chờ .* duyệt\./)).toBeVisible();
}

/** Mở task trên màn hình Duyệt (trang chi tiết người → tab Task) và bấm một thao tác. */
export async function thaoTacDuyetUi(page: Page, nguoiDuyet: string, nguoiLam: string, task: string, nut: string, nhanXet?: string) {
  await dangNhap(page, nguoiDuyet);
  await page.goto("/duyet");
  await page.locator(`tr[data-nguoi="${nguoiLam}"]`).getByRole("link", { name: "Xem" }).click();
  await page.getByRole("link", { name: "Task và minh chứng" }).click();
  await page.locator(`tr[data-task="${task}"]`).getByRole("link", { name: "Mở" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toHaveAttribute("data-task", task);
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: nut }).click();
  if (nhanXet !== undefined) await page.getByRole("dialog").getByRole("textbox").fill(nhanXet);
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
