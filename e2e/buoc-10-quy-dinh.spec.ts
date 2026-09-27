import { test, expect } from "@playwright/test";
import { dangNhap, resetDb } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

const TIEU_DE = "Quy định về nộp minh chứng";

test("HT ban hành quy định tick Giáo viên + Admin, có file đính kèm", async ({ page }) => {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/quy-dinh");
  await page.getByRole("link", { name: "Ban hành quy định mới" }).click();
  await page.getByLabel("Tiêu đề").fill(TIEU_DE);
  await page.getByLabel("Nội dung").fill("Minh chứng phải có chữ ký và đóng dấu của đơn vị.");
  await page.getByLabel("File đính kèm (không bắt buộc)").setInputFiles({
    name: "quy-dinh.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 quy dinh"),
  });
  await page.getByRole("button", { name: "Ban hành" }).click();
  await expect(page.getByText("Vui lòng tick ít nhất 1 vị trí nhận.")).toBeVisible();
  await page.getByLabel("Giáo viên").check();
  await page.getByLabel("Admin").check();
  await page.getByRole("button", { name: "Ban hành" }).click();
  await expect(page.getByText("Đã ban hành quy định cho 4 người.")).toBeVisible();
  await expect(page.getByTestId("tong-da-xem")).toHaveText("0/4 đã xem");
});

test("3 GV thấy ở Nhận giấy tờ (nhãn Mới), admin thấy ở Nhận chỉ thị; TBM, TK, HP không thấy", async ({ page }) => {
  for (const u of ["gv.nguyenvanan", "gv.tranthibinh", "gv.levancuong"]) {
    await dangNhap(page, u);
    await page.goto("/giay-to");
    await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`)).toContainText("Mới");
  }
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/chi-thi");
  await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`)).toBeVisible();
  for (const u of ["tbm.phamthibich", "tk.levankhoa", "hp.tranthiphuong"]) {
    await dangNhap(page, u);
    await page.goto("/giay-to");
    await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`)).toHaveCount(0);
  }
});

test("1 GV mở → HT thấy 1/4 đã xem; nhãn Mới biến mất", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/giay-to");
  await page.getByRole("link", { name: TIEU_DE }).click();
  await expect(page.getByTestId("noi-dung")).toContainText("chữ ký và đóng dấu");
  await expect(page.locator('[data-file="quy-dinh.pdf"]')).toBeVisible();
  await expect.poll(async () => {
    await page.goto("/giay-to");
    return page.locator(`[data-giay-to="${TIEU_DE}"]`).innerText();
  }).not.toContain("Mới");

  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/quy-dinh");
  await expect(page.locator(`[data-quy-dinh="${TIEU_DE}"] [data-testid="da-xem"]`)).toHaveText("1/4 đã xem");
  await page.getByRole("link", { name: TIEU_DE }).click();
  await expect(page.locator('[data-nguoi-nhan="gv.nguyenvanan"]')).toContainText("Đã xem");
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page.locator("[data-nguoi-nhan]")).toHaveCount(1);
});

test("admin tạo GV mới → GV mới thấy quy định; HT thấy 1/5", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Họ tên").fill("Đặng Văn Mới");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Đã tạo tài khoản gv.dangvanmoi (mật khẩu 123456).")).toBeVisible();

  await dangNhap(page, "gv.dangvanmoi");
  await page.goto("/giay-to");
  await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`)).toBeVisible();

  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/quy-dinh");
  await expect(page.locator(`[data-quy-dinh="${TIEU_DE}"] [data-testid="da-xem"]`)).toHaveText("1/5 đã xem");
});

test("hiệu phó không có mục ban hành, mở /quy-dinh bị chặn", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  await expect(page.locator("aside nav")).not.toContainText("Ban hành quy định");
  await page.goto("/quy-dinh");
  await expect(page).toHaveURL(/\/khong-co-quyen$/);
});
