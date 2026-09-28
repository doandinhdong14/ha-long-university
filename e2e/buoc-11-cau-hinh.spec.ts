import { test, expect } from "@playwright/test";
import { dangKyUi, dangNhap, duyetDangKyUi, nopUi, resetDb, sql } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

test("các tab Xem cấu hình hiện được, không có nút sửa/xóa/duyệt", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/cau-hinh");
  const tabs = ["Kỳ và bảng xếp loại", "Tài khoản và cơ cấu", "Đăng ký nhiệm vụ", "Tiến độ task và minh chứng", "Kết quả các kỳ", "Quy định đã ban hành"];
  await expect(page.getByRole("navigation", { name: "Các tab" }).getByRole("link")).toHaveText(tabs);
  await expect(page.getByTestId("bang-xep-loai").locator("[data-vi-tri]")).toHaveCount(4);
  for (const t of tabs) {
    await page.getByRole("link", { name: t }).click();
    await expect(page.getByRole("link", { name: t })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("main").getByRole("button", { name: /Sửa|Xóa|Duyệt|Chốt|Lưu/ })).toHaveCount(0);
  }
});

test("cảnh báo đơn vị thiếu người: khoa chưa có hiệu phó", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/cau-hinh?tab=tai-khoan");
  await expect(page.getByTestId("du-nguoi")).toBeVisible();
  await sql(`UPDATE "Khoa" SET "hieuPhoId" = NULL`);
  await page.reload();
  await expect(page.getByTestId("canh-bao-thieu-nguoi")).toContainText("Khoa Công nghệ thông tin chưa có hiệu phó phụ trách");
  await expect(page.locator('[data-khoa="Khoa Công nghệ thông tin"]')).toContainText("chưa có hiệu phó");
  // TBM, TK của khoa thấy thông báo thiếu người, nút Gửi bị chặn.
  await dangNhap(page, "tk.levankhoa");
  await page.goto("/dau-ky");
  await expect(page.getByTestId("thieu-nguoi")).toContainText("Chưa có hiệu phó phụ trách, vui lòng liên hệ admin.");
  // v1.6: nhiệm vụ đã tick sẵn (bắt buộc); nút Gửi vẫn bị chặn vì thiếu người.
  await expect(page.getByLabel("Chọn Quản lý đào tạo của khoa")).toBeChecked();
  await expect(page.getByRole("button", { name: "Gửi lên hiệu phó" })).toBeDisabled();
  await sql(`UPDATE "Khoa" SET "hieuPhoId" = (SELECT id FROM "User" WHERE username = 'hp.tranthiphuong')`);
});

test("chuông: số chưa đọc, bấm vào đi tới trang liên quan và đánh dấu đã đọc", async ({ page }) => {
  await dangKyUi(page, "gv.levancuong", "Gửi lên trưởng bộ môn");
  await dangNhap(page, "tbm.phamthibich");
  await expect(page.getByTestId("so-chua-doc")).toHaveText("1");
  await page.getByRole("button", { name: "Thông báo" }).click();
  await page.locator("[data-thong-bao]").first().click();
  await expect(page).toHaveURL(/\/duyet\/.+tab=dang-ky/);
  await expect(page.getByTestId("so-chua-doc")).toHaveCount(0);
});

test("tiến độ & minh chứng: admin mở xem file, không thao tác được", async ({ page }) => {
  await duyetDangKyUi(page, "tbm.phamthibich", "gv.levancuong");
  await nopUi(page, "gv.levancuong", "Họp lớp định kỳ", "bien-ban.png");
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/cau-hinh?tab=tien-do");
  await page.locator('tr[data-nguoi="gv.levancuong"]').getByRole("link", { name: "Xem minh chứng" }).click();
  await expect(page.locator('[data-task="Họp lớp định kỳ"]')).toContainText("Chờ duyệt");
  // Link mở ở tab mới: kiểm tra bằng request mang phiên admin.
  const href = await page.locator('[data-file="bien-ban.png"] a').first().getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("inline");
  await expect(page.getByTestId("nut-thao-tac")).toHaveCount(0);
});
