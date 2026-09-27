// Nghiệm thu mục 15 – CASE PHỤ: CƠ CẤU VÀ TÀI KHOẢN.
import { test, expect, type Page } from "@playwright/test";
import { resetDb } from "../helpers";
import { dangKyVaGui, dangNhap, duyetDangKy, sql } from "./tien-ich";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

function dong(page: Page, username: string) {
  return page.locator(`tr[data-username="${username}"]`);
}

async function suaChucVu(page: Page, username: string, chucVu: string) {
  await page.goto("/admin/tai-khoan");
  await dong(page, username).getByRole("button", { name: "Sửa" }).click();
  await page.getByLabel("Chức vụ", { exact: true }).click();
  await page.getByRole("option", { name: chucVu, exact: true }).click();
  await page.getByRole("button", { name: "Lưu" }).click();
}

test("đổi gv.tranthibinh lên TBM khi bộ môn đã có TBM → bị chặn; hạ tbm.phamthibich xuống GV trước → lên được, tên đăng nhập thành tbm.tranthibinh", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await suaChucVu(page, "gv.tranthibinh", "Trưởng bộ môn");
  await expect(page.getByText("Bộ môn này đã có trưởng bộ môn (tbm.phamthibich). Hãy đổi chức vụ người đó trước.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dong(page, "gv.tranthibinh")).toBeVisible();

  await suaChucVu(page, "tbm.phamthibich", "Giáo viên");
  await expect(page.getByText("Đã lưu. Tên đăng nhập mới: gv.phamthibich")).toBeVisible();
  await suaChucVu(page, "gv.tranthibinh", "Trưởng bộ môn");
  await expect(page.getByText("Đã lưu. Tên đăng nhập mới: tbm.tranthibinh")).toBeVisible();
  await expect(dong(page, "tbm.tranthibinh")).toContainText("Trưởng bộ môn");
  await expect(dong(page, "gv.phamthibich")).toContainText("Giáo viên");

  // Tài khoản mới đăng nhập được, đúng menu trưởng bộ môn và thấy GV trong màn hình Duyệt.
  await dangNhap(page, "tbm.tranthibinh");
  await page.goto("/duyet");
  await expect(page.getByRole("heading", { name: "Duyệt giáo viên" })).toBeVisible();
  await expect(page.locator('tr[data-nguoi="gv.phamthibich"]')).toHaveCount(1);
});

test("xóa hiệu phó → khoa thành \"chưa có hiệu phó\"; TBM và TK của khoa thấy thông báo thiếu người, nút Gửi bị chặn; admin thấy cảnh báo", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/tai-khoan");
  await dong(page, "hp.tranthiphuong").getByRole("button", { name: "Xóa" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Xóa sẽ mất toàn bộ dữ liệu KPI của tài khoản này");
  await page.getByRole("button", { name: "Xóa hẳn" }).click();
  await expect(page.getByText("Đã xóa tài khoản hp.tranthiphuong.")).toBeVisible();

  await page.goto("/admin/cau-hinh?tab=tai-khoan");
  await expect(page.locator('[data-khoa="Khoa Công nghệ thông tin"]')).toContainText("chưa có hiệu phó");
  await expect(page.getByTestId("canh-bao-thieu-nguoi")).toContainText("Khoa Công nghệ thông tin chưa có hiệu phó phụ trách");

  for (const [u, nhiemVu, nut] of [
    ["tbm.tranthibinh", "Quản lý chương trình đào tạo của bộ môn", "Gửi lên trưởng khoa"],
    ["tk.levankhoa", "Quản lý đào tạo của khoa", "Gửi lên hiệu phó"],
  ]) {
    await dangNhap(page, u);
    await page.goto("/dau-ky");
    await expect(page.getByTestId("thieu-nguoi"), u).toHaveText("Chưa có hiệu phó phụ trách, vui lòng liên hệ admin.");
    await page.getByLabel(`Chọn ${nhiemVu}`, { exact: true }).check();
    await expect(page.getByRole("button", { name: nut }), u).toBeDisabled();
  }
  // GV không bị ảnh hưởng (người duyệt, người chốt của GV vẫn đủ).
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  await expect(page.getByTestId("thieu-nguoi")).toHaveCount(0);
});

test("tạo hiệu phó mới, gán khoa → luồng chạy lại bình thường", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Họ tên").fill("Hoàng Minh Tuấn");
  await page.getByLabel("Chức vụ", { exact: true }).click();
  await page.getByRole("option", { name: "Hiệu phó", exact: true }).click();
  await page.getByLabel("Phụ trách Khoa Công nghệ thông tin").check();
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Đã tạo tài khoản hp.hoangminhtuan (mật khẩu 123456).")).toBeVisible();
  await page.goto("/admin/cau-hinh?tab=tai-khoan");
  await expect(page.getByTestId("du-nguoi")).toBeVisible();

  // TK gửi đăng ký → hiệu phó mới duyệt; TBM gửi → TK duyệt (người chốt của TBM là hiệu phó mới).
  await dangKyVaGui(page, "tk.levankhoa", "TK", 1, /^Gửi lên hiệu phó$/);
  await duyetDangKy(page, "hp.hoangminhtuan", "tk.levankhoa");
  await dangKyVaGui(page, "tbm.tranthibinh", "TBM", 1, /^Gửi lên trưởng khoa$/);
  await duyetDangKy(page, "tk.levankhoa", "tbm.tranthibinh");
  await dangNhap(page, "hp.hoangminhtuan");
  await page.goto("/chot");
  await expect(page.getByRole("heading", { name: "Chốt task trưởng bộ môn" })).toBeVisible();
  await page.getByLabel("Lọc theo người").click();
  await expect(page.getByRole("option", { name: /tbm\.tranthibinh/ })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("tạo GV trùng tên → tên đăng nhập có số 2", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Họ tên").fill("Nguyễn Văn An");
  await expect(page.getByTestId("xem-truoc-username")).toHaveText("gv.nguyenvanan2");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Đã tạo tài khoản gv.nguyenvanan2 (mật khẩu 123456).")).toBeVisible();
  await expect(dong(page, "gv.nguyenvanan2")).toContainText("123456");
  const [u] = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM "User" WHERE username LIKE 'gv.nguyenvanan%'`);
  expect(u.n).toBe("2");
});
