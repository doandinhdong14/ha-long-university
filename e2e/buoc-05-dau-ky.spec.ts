// Bước 5 – Đầu kỳ + màn hình Duyệt tab Đăng ký. v1.6 (spec-v1.6 mục 2): mọi nhiệm vụ của vị trí đều bắt buộc (tick
// sẵn, khóa), người làm KPI chỉ chọn có đăng ký cải tiến sáng tạo hay không. Chi tiết khối cải tiến / Phụ lục IV ở
// e2e/v16-05-dau-ky.spec.ts.
import { test, expect, type Page } from "@playwright/test";
import { dangKyUi, dangNhap, resetDb } from "./helpers";

test.beforeAll(async () => resetDb());

async function duyet(page: Page, username: string, nguoiLam: string, tongDiem: string, xepLoai: string, caiTien: "Có" | "Không") {
  await dangNhap(page, username);
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="dang-ky"]')).toContainText("1");
  await page.locator(`tr[data-nguoi="${nguoiLam}"]`).getByRole("link", { name: "Xem" }).click();
  await expect(page.getByTestId("tong-diem")).toHaveText(tongDiem);
  await expect(page.getByTestId("xep-loai")).toHaveText(xepLoai);
  await expect(page.getByTestId("dang-ky-cai-tien")).toHaveText(`Đăng ký cải tiến sáng tạo: ${caiTien}`);
  await page.getByRole("button", { name: "Duyệt" }).click();
  await page.getByRole("button", { name: "Xác nhận duyệt" }).click();
  await expect(page.getByText("Đã duyệt danh sách. Các task bắt buộc đã được giao.")).toBeVisible();
}

test("GV: chỉ thấy nhiệm vụ GV, tất cả tick sẵn và khóa; thanh tổng kết đủ nhiệm vụ", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  await expect(page.locator("[data-nhiem-vu]")).toHaveCount(10);
  await expect(page.locator('[data-nhiem-vu="Quản lý đào tạo của khoa"]')).toHaveCount(0);
  await expect(page.getByLabel("Chọn Biên soạn bài giảng")).toBeChecked();
  await expect(page.getByLabel("Chọn Biên soạn bài giảng")).toBeDisabled();
  await expect(page.getByTestId("so-nhiem-vu")).toHaveText("10");
  await expect(page.getByTestId("tong-diem")).toHaveText("100");
  await expect(page.getByTestId("xep-loai")).toHaveText("A1");
  await expect(page.getByTestId("cai-tien")).toHaveText("Không");
  await expect(page.getByRole("button", { name: "Gửi lên trưởng bộ môn" })).toBeEnabled();
});

test("GV đăng ký → TBM duyệt", async ({ page }) => {
  await dangKyUi(page, "gv.tranthibinh", "Gửi lên trưởng bộ môn");
  await duyet(page, "tbm.phamthibich", "gv.tranthibinh", "100", "A1", "Không");
  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/dau-ky");
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Đã duyệt");
});

test("TBM đăng ký (có cải tiến) → TK duyệt (TK chỉ thấy TBM trong màn hình Duyệt)", async ({ page }) => {
  await dangKyUi(page, "tbm.phamthibich", "Gửi lên trưởng khoa", true);
  await dangNhap(page, "tk.levankhoa");
  await page.goto("/duyet");
  await expect(page.getByRole("heading", { name: "Duyệt trưởng bộ môn" })).toBeVisible();
  await expect(page.locator("tr[data-nguoi]")).toHaveCount(1);
  await duyet(page, "tk.levankhoa", "tbm.phamthibich", "100", "A1", "Có");
});

test("TK đăng ký → HP duyệt; HP đăng ký → HT duyệt", async ({ page }) => {
  await dangKyUi(page, "tk.levankhoa", "Gửi lên hiệu phó");
  await duyet(page, "hp.tranthiphuong", "tk.levankhoa", "100", "A1", "Không");

  await dangKyUi(page, "hp.tranthiphuong", "Gửi lên hiệu trưởng", true);
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/duyet");
  await expect(page.getByRole("heading", { name: "Duyệt & chốt hiệu phó" })).toBeVisible();
  await duyet(page, "ht.nguyenvanhieu", "hp.tranthiphuong", "100", "A1", "Có");
});

test("từ chối bắt buộc nhận xét; người làm KPI thấy nhận xét, sửa đăng ký cải tiến và gửi lại được", async ({ page }) => {
  await dangKyUi(page, "gv.levancuong", "Gửi lên trưởng bộ môn");
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await page.locator('tr[data-nguoi="gv.levancuong"]').getByRole("link", { name: "Xem" }).click();
  await page.getByRole("button", { name: "Từ chối" }).click();
  await expect(page.getByRole("button", { name: "Xác nhận từ chối" })).toBeDisabled();
  await page.getByLabel("Nhận xét").fill("Nên đăng ký cải tiến sáng tạo.");
  await page.getByRole("button", { name: "Xác nhận từ chối" }).click();
  await expect(page.getByText("Đã từ chối danh sách.")).toBeVisible();

  await dangNhap(page, "gv.levancuong");
  await page.goto("/dau-ky");
  await expect(page.getByTestId("nhan-xet")).toHaveText("Nên đăng ký cải tiến sáng tạo.");
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Nhận xét của trưởng bộ môn");
  await page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này").check();
  await expect(page.getByTestId("cai-tien")).toHaveText("Có");
  await page.getByRole("button", { name: "Gửi lên trưởng bộ môn" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Chờ duyệt");
});

test("người không phải người duyệt mở trang chi tiết → 404", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  const href = await page.locator('tr[data-nguoi="gv.nguyenvanan"]').getByRole("link", { name: "Xem" }).getAttribute("href");
  await dangNhap(page, "tk.levankhoa");
  const res = await page.goto(href!);
  expect(res?.status()).toBe(404);
});
