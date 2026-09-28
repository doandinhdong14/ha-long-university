// Phụ lục IV, V qua giao diện: tải 2 file mẫu của trường; hiệu phó gửi Phụ lục V ở Cuối kỳ → hiệu trưởng thấy
// "Đã gửi", mở được file; giáo viên không mở được file đó.
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { dangNhap, resetDb, sql } from "./helpers";

const PDF = { name: "phieu-tu-danh-gia.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 phu luc v") };
let fileId: string;

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

test("tải được 2 file mẫu, đúng tên file và nội dung gốc", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  const khoi = page.getByTestId("khoi-cai-tien");
  await expect(khoi.getByTestId("tieu-de-phu-luc")).toHaveText("PHỤ LỤC IV. MẪU PHIẾU ĐĂNG KÝ CẢI TIẾN, SÁNG TẠO");
  const [dl] = await Promise.all([page.waitForEvent("download"), khoi.getByRole("link", { name: "Tải về" }).click()]);
  expect(dl.suggestedFilename()).toBe("Phu_luc_IV.docx");
  expect(readFileSync(await dl.path())).toEqual(readFileSync("public/templates/phu-luc-iv.docx"));

  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/cuoi-ky");
  const khoiV = page.getByTestId("khoi-phu-luc-v");
  await expect(khoiV).toContainText("PHỤ LỤC V. MẪU PHIẾU TỰ ĐÁNH GIÁ VÀ XẾP LOẠI PHÓ HIỆU TRƯỞNG");
  const [dlV] = await Promise.all([page.waitForEvent("download"), khoiV.getByRole("link", { name: "Tải mẫu" }).click()]);
  expect(dlV.suggestedFilename()).toBe("Phu_luc_V.docx");
  expect(readFileSync(await dlV.path())).toEqual(readFileSync("public/templates/phu-luc-v.docx"));
});

test("chỉ hiệu phó có khối Phụ lục V ở Cuối kỳ", async ({ page }) => {
  for (const u of ["gv.nguyenvanan", "tbm.phamthibich", "tk.levankhoa"]) {
    await dangNhap(page, u);
    await page.goto("/cuoi-ky");
    await expect(page.getByRole("heading", { name: "Cuối kỳ" })).toBeVisible();
    await expect(page.getByTestId("khoi-phu-luc-v"), u).toHaveCount(0);
  }
});

test("hiệu trưởng: trước khi gửi, cột Phụ lục V ghi \"Chưa gửi\"", async ({ page }) => {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/duyet");
  await expect(page.locator('tr[data-nguoi="hp.tranthiphuong"] [data-cot="phu-luc-v"]')).toHaveText("Chưa gửi");
});

test("hiệu phó gửi Phụ lục V → hiện tên file, thời gian gửi, \"Đã gửi hiệu trưởng\"", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/cuoi-ky");
  const khoi = page.getByTestId("khoi-phu-luc-v");
  await expect(khoi.getByTestId("phu-luc-v-trang-thai")).toHaveText("Chưa gửi");
  await khoi.getByLabel("File Phụ lục V đã điền").setInputFiles(PDF);
  await khoi.getByRole("button", { name: "Gửi hiệu trưởng" }).click();
  await expect(page.getByText("Đã gửi Phụ lục V cho hiệu trưởng.")).toBeVisible();
  await expect(khoi.getByTestId("phu-luc-v-trang-thai")).toHaveText("Đã gửi hiệu trưởng");
  await expect(khoi.locator(`[data-file="${PDF.name}"]`)).toBeVisible();
  await expect(khoi.getByTestId("phu-luc-v-gui-luc")).toHaveText(/^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
  // Gửi lại được (thay bản cũ) đến hết deadline.
  await expect(khoi.getByLabel("Gửi lại Phụ lục V (thay bản đã gửi)")).toBeVisible();
  [{ id: fileId }] = await sql<{ id: string }>(`SELECT "fileId" AS id FROM "PhuLucV"`);
});

test("hiệu trưởng thấy \"Đã gửi\", nhận thông báo, mở được file (PDF xem ngay)", async ({ page }) => {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.getByRole("button", { name: "Thông báo" }).click();
  await expect(page.getByText("Hiệu phó Trần Thị Phương đã gửi Phụ lục V – Kỳ 1 – 2026-2027")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/duyet");
  const dong = page.locator('tr[data-nguoi="hp.tranthiphuong"]');
  await expect(dong.locator('[data-cot="phu-luc-v"]')).toHaveText(/^Đã gửi \d{2}\/\d{2}\/\d{4}$/);
  await dong.getByRole("link", { name: "Xem" }).click();
  const khoi = page.getByTestId("khoi-phu-luc-v");
  await expect(khoi.locator(`[data-file="${PDF.name}"]`)).toBeVisible();
  await expect(khoi.locator(`[data-xem-truoc="${PDF.name}"]`)).toBeVisible();
  // Chỉ nhận và xem: không có nút duyệt / từ chối trong khối.
  await expect(khoi.getByRole("button")).toHaveCount(0);
  expect((await page.request.get(`/api/files/${fileId}`)).status()).toBe(200);
});

test("giáo viên (và trưởng khoa) không mở được file Phụ lục V; gọi API gửi → bị chặn", async ({ page }) => {
  for (const u of ["gv.nguyenvanan", "tk.levankhoa"]) {
    await dangNhap(page, u);
    expect((await page.request.get(`/api/files/${fileId}`)).status(), u).toBe(403);
    const r = await page.request.post("/api/phu-luc-v", { multipart: { kyId: "x", file: PDF } });
    expect(r.status(), u).toBe(403);
  }
});
