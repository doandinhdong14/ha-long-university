import { test, expect } from "@playwright/test";
import { dangNhap, menu, resetDb } from "./helpers";

test.beforeAll(async () => resetDb());

// Bảng 2.1: mỗi vai trò đúng các mục menu, trang chủ = mục đầu tiên.
const TAI_KHOAN: [string, string, string[]][] = [
  ["admin.quantri", "/admin/tai-khoan", ["Quản lý đăng nhập", "Phân việc đầu kỳ", "Nhận chỉ thị của hiệu trưởng", "Xem cấu hình"]],
  ["ht.nguyenvanhieu", "/chot", ["Chốt task trưởng khoa", "Duyệt & chốt hiệu phó", "Ban hành quy định", "Xuất báo cáo"]],
  ["hp.tranthiphuong", "/dau-ky", ["Đầu kỳ", "Trong kỳ", "Cuối kỳ", "Duyệt trưởng khoa", "Chốt task trưởng bộ môn", "Xuất báo cáo", "Nhận giấy tờ"]],
  ["tk.levankhoa", "/dau-ky", ["Đầu kỳ", "Trong kỳ", "Cuối kỳ", "Duyệt trưởng bộ môn", "Chốt task giáo viên", "Xuất báo cáo", "Nhận giấy tờ"]],
  ["tbm.phamthibich", "/dau-ky", ["Đầu kỳ", "Trong kỳ", "Cuối kỳ", "Duyệt giáo viên", "Xuất báo cáo", "Nhận giấy tờ"]],
  ["gv.nguyenvanan", "/dau-ky", ["Đầu kỳ", "Trong kỳ", "Cuối kỳ", "Nhận giấy tờ"]],
  ["gv.tranthibinh", "/dau-ky", ["Đầu kỳ", "Trong kỳ", "Cuối kỳ", "Nhận giấy tờ"]],
  ["gv.levancuong", "/dau-ky", ["Đầu kỳ", "Trong kỳ", "Cuối kỳ", "Nhận giấy tờ"]],
];

for (const [username, home, items] of TAI_KHOAN) {
  test(`${username} đăng nhập, thấy đúng menu`, async ({ page }) => {
    await dangNhap(page, username);
    await expect(page).toHaveURL(home);
    expect(await menu(page)).toEqual(items);
    await expect(page.locator("header")).toContainText(username);
  });
}

test("chưa đăng nhập → chuyển về trang đăng nhập", async ({ page }) => {
  await page.goto("/admin/tai-khoan");
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("sai mật khẩu → báo lỗi tiếng Việt", async ({ page }) => {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("gv.nguyenvanan");
  await page.getByLabel("Mật khẩu").fill("sai");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Tên đăng nhập hoặc mật khẩu không đúng.")).toBeVisible();
});

// Chặn route theo vai trò (ở server, trong page).
const CHAN: [string, string[]][] = [
  ["gv.nguyenvanan", ["/admin/tai-khoan", "/duyet", "/chot", "/bao-cao", "/quy-dinh"]],
  ["tbm.phamthibich", ["/chot", "/quy-dinh", "/admin/phan-viec"]],
  ["hp.tranthiphuong", ["/quy-dinh", "/admin/cau-hinh"]],
  ["ht.nguyenvanhieu", ["/dau-ky", "/trong-ky", "/cuoi-ky", "/giay-to", "/admin/tai-khoan"]],
  ["admin.quantri", ["/dau-ky", "/duyet", "/chot", "/bao-cao", "/giay-to", "/quy-dinh"]],
];

for (const [username, urls] of CHAN) {
  test(`${username} mở trang không thuộc vai trò → bị chặn`, async ({ page }) => {
    await dangNhap(page, username);
    for (const url of urls) {
      await page.goto(url);
      await expect(page, url).toHaveURL(/\/khong-co-quyen$/);
    }
  });
}

test("đăng xuất", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/dang-nhap$/);
  await page.goto("/duyet");
  await expect(page).toHaveURL(/\/dang-nhap$/);
});
