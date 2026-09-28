import { test, expect, type Page } from "@playwright/test";
import { dangNhap, resetDb } from "./helpers";

test.beforeAll(async () => resetDb());

async function taoKy(page: Page, ten: string, soKy: string, batDau: string, ketThuc: string, saoChep: string | null) {
  await page.goto("/admin/phan-viec");
  await page.getByRole("button", { name: "Tạo kỳ" }).click();
  await page.getByLabel("Tên kỳ").fill(ten);
  await page.getByLabel("Năm học").fill("2026-2027");
  await page.getByLabel("Kỳ số").click();
  await page.getByRole("option", { name: `Kỳ ${soKy}` }).click();
  await page.getByLabel("Ngày bắt đầu").fill(batDau);
  await page.getByLabel("Ngày kết thúc").fill(ketThuc);
  await page.getByLabel("Sao chép từ kỳ trước").click();
  await page.getByRole("option", { name: saoChep ?? "Không sao chép (kỳ trống)" }).click();
  await page.getByRole("button", { name: "Tạo kỳ" }).last().click();
  await expect(page.getByText("Đã tạo kỳ.")).toBeVisible();
  await expect(page.getByRole("heading", { name: ten })).toBeVisible();
}

test("danh sách kỳ: số nhiệm vụ theo 4 vị trí", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/phan-viec");
  const dong = page.locator('tr[data-ky="Kỳ 1 – 2026-2027"]');
  await expect(dong).toContainText("10 · 6 · 5 · 5");
  await expect(dong).toContainText("Đã công bố");
});

test("chi tiết kỳ: 4 tab vị trí, mỗi tab đúng nhiệm vụ của vị trí đó", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/phan-viec");
  await page.getByRole("link", { name: "Kỳ 1 – 2026-2027" }).click();
  const tabs = page.getByRole("navigation", { name: "Vị trí" }).getByRole("link");
  await expect(tabs).toHaveText(["Giáo viên (10)", "Trưởng bộ môn (6)", "Trưởng khoa (5)", "Hiệu phó (5)"]);
  await expect(page.locator("[data-nhiem-vu]")).toHaveCount(10);
  await tabs.nth(2).click();
  await expect(page).toHaveURL(/viTri=tk/);
  await expect(page.locator("[data-nhiem-vu]")).toHaveCount(5);
  await expect(page.locator('[data-nhiem-vu="Quản lý đào tạo của khoa"]')).toBeVisible();
  await page.getByRole("tab", { name: /Bảng xếp loại/ }).click();
  await expect(page.getByLabel("Tên bậc 1")).toHaveValue("A1");
});

test("tạo kỳ sao chép từ kỳ trước → thêm nhiệm vụ cho trưởng khoa → công bố", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await taoKy(page, "Kỳ 2 – 2026-2027", "2", "2026-12-01", "2027-02-28", "Kỳ 1 – 2026-2027");
  const tabs = page.getByRole("navigation", { name: "Vị trí" }).getByRole("link");
  await expect(tabs).toHaveText(["Giáo viên (10)", "Trưởng bộ môn (6)", "Trưởng khoa (5)", "Hiệu phó (5)"]);

  await tabs.nth(2).click();
  await page.getByRole("button", { name: "Thêm nhiệm vụ" }).click();
  await page.getByLabel("Tên nhiệm vụ").fill("Chuyển đổi số của khoa");
  await page.getByLabel("Điểm", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Đã thêm nhiệm vụ.")).toBeVisible();
  await expect(tabs.nth(2)).toHaveText("Trưởng khoa (6)");
  await expect(page.locator('[data-nhiem-vu="Chuyển đổi số của khoa"]')).toContainText("Chưa có task bắt buộc");

  await page.getByRole("button", { name: "Công bố", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Công bố", exact: true }).click();
  await expect(page.getByText("Đã công bố kỳ.")).toBeVisible();
  await expect(page.getByText("Đã công bố", { exact: true })).toBeVisible();
});

test("kỳ trống: báo chưa công bố được, tab thiếu bảng xếp loại có cảnh báo", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await taoKy(page, "Kỳ 3 – 2026-2027", "3", "2027-03-01", "2027-05-31", null);
  await expect(page.getByTestId("ly-do-chua-cong-bo")).toHaveText("Chưa công bố được: Cần có ít nhất 1 nhiệm vụ trước khi công bố.");
  await expect(page.getByLabel("Chưa có bảng xếp loại")).toHaveCount(4);

  await page.getByRole("tab", { name: /Bảng xếp loại/ }).click();
  await page.getByRole("button", { name: "Thêm bậc" }).click();
  await page.getByLabel("Tên bậc 1").fill("A");
  await page.getByLabel("Điểm tối thiểu 1").fill("0");
  await page.getByRole("button", { name: "Lưu bảng xếp loại" }).click();
  await expect(page.getByText("Đã lưu bảng xếp loại.")).toBeVisible();
  await expect(page.getByLabel("Chưa có bảng xếp loại")).toHaveCount(3);
});
