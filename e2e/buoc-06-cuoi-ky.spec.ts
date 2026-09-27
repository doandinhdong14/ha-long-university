import { test, expect } from "@playwright/test";
import { dangKyUi, dangNhap, duyetDangKyUi, nopUi, resetDb, thaoTacDuyetUi } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

const T1 = "Biên soạn đề cương chi tiết học phần";
const T2 = "Soạn slide bài giảng";

test("chưa được duyệt danh sách → Trong kỳ báo chưa duyệt", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("chua-duyet")).toContainText("Danh sách nhiệm vụ chưa được duyệt");
});

test("GV nộp → TBM duyệt: GV thấy treo, % không tăng; TBM hủy duyệt, duyệt lại, gửi lên", async ({ page }) => {
  await dangKyUi(page, "gv.nguyenvanan", ["Biên soạn bài giảng", "Hướng dẫn sinh viên NCKH"], "Gửi lên trưởng bộ môn");
  await duyetDangKyUi(page, "tbm.phamthibich", "gv.nguyenvanan");

  await nopUi(page, "gv.nguyenvanan", T1);
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T1}"]`)).toContainText("Chờ duyệt");
  await expect(page.locator('[data-phan="choDuyet"]')).toContainText("1");

  await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.nguyenvanan", T1, "Duyệt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Đã duyệt, chưa gửi lên");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt", "Gửi lên trưởng khoa"]);
  // Minh chứng PDF xem ngay trên trang.
  await expect(page.locator('[data-xem-truoc="minh-chung.pdf"]')).toBeVisible();

  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T1}"]`)).toContainText("Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 1 task");
  await expect(page.locator('[data-phan="dangTreo"]')).toContainText("1");

  await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.nguyenvanan", T1, "Hủy duyệt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Chờ duyệt");
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Duyệt" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByTestId("nut-thao-tac").getByRole("button", { name: "Gửi lên trưởng khoa" })).toBeVisible();
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Gửi lên trưởng khoa" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Chờ chốt");
  // Đã gửi lên thì không còn nút Hủy duyệt.
  await expect(page.getByTestId("nut-thao-tac")).toHaveCount(0);
});

test("từ chối có nhận xét → GV thấy nhận xét, nộp lại", async ({ page }) => {
  await nopUi(page, "gv.nguyenvanan", T2);
  await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.nguyenvanan", T2, "Từ chối", "Thiếu slide chương 3");
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T2}"]`)).toContainText("Bị từ chối");
  await page.locator(`[data-task="${T2}"]`).getByRole("link", { name: "Nộp minh chứng" }).click();
  await expect(page.getByTestId("nhan-xet-duyet")).toContainText("Thiếu slide chương 3");
  await page.getByLabel("File minh chứng").setInputFiles({ name: "slide.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await page.getByRole("button", { name: "Gửi minh chứng" }).click();
  await expect(page.locator("[data-lan-nop]")).toHaveCount(2);
});

test("Hàng chờ: task Chờ duyệt / Đã duyệt / Bị trả về, cũ nhất lên trước", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet?tab=hang-cho");
  const dong = page.getByTestId("hang-cho").locator("tbody tr");
  await expect(dong).toHaveCount(1);
  await expect(dong.first()).toHaveAttribute("data-task", T2);
  await dong.first().getByRole("link", { name: "Xử lý" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toHaveAttribute("data-task", T2);
});

test("xin thêm task mở rộng → TBM duyệt → task được giao", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await page.locator('[data-xin-them="Số hóa bài giảng lên hệ thống LMS"]').getByRole("button", { name: "Xin làm" }).click();
  await expect(page.locator('[data-xin-them="Số hóa bài giảng lên hệ thống LMS"]')).toContainText("Đang chờ duyệt");

  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="xin-them"]')).toContainText("1");
  await page.locator('tr[data-nguoi="gv.nguyenvanan"]').getByRole("link", { name: "Xem" }).click();
  await page.getByRole("link", { name: "Xin thêm task" }).click();
  await page.getByRole("button", { name: "Duyệt" }).click();
  await page.getByRole("button", { name: "Xác nhận duyệt" }).click();
  await expect(page.getByText("Đã duyệt. Task mở rộng đã được giao.")).toBeVisible();

  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.locator('[data-task="Số hóa bài giảng lên hệ thống LMS"]')).toContainText("Chưa làm");
});

test("HP nộp → HT Duyệt (vẫn treo) → HT Chốt → % tăng", async ({ page }) => {
  await dangKyUi(page, "hp.tranthiphuong", ["Chỉ đạo công tác đào tạo"], "Gửi lên hiệu trưởng");
  await duyetDangKyUi(page, "ht.nguyenvanhieu", "hp.tranthiphuong");
  await nopUi(page, "hp.tranthiphuong", "Ban hành kế hoạch đào tạo");

  await thaoTacDuyetUi(page, "ht.nguyenvanhieu", "hp.tranthiphuong", "Ban hành kế hoạch đào tạo", "Duyệt");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt", "Chốt"]);
  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/trong-ky");
  await expect(page.locator('[data-task="Ban hành kế hoạch đào tạo"]')).toContainText("Hiệu trưởng đã duyệt – chờ chốt");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");

  await thaoTacDuyetUi(page, "ht.nguyenvanhieu", "hp.tranthiphuong", "Ban hành kế hoạch đào tạo", "Chốt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Đã chốt");
  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/trong-ky");
  await expect(page.locator('[data-task="Ban hành kế hoạch đào tạo"]')).toContainText("Đã chốt – hoàn thành");
  await expect(page.getByTestId("phan-tram")).toHaveText("50%");
});

test("màn hình Duyệt của TBM: cột % và số liệu", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  const dong = page.locator('tr[data-nguoi="gv.nguyenvanan"]');
  await expect(dong.locator('[data-cot="phan-tram"]')).toHaveText("0%");
  await expect(page.locator('[data-o-dem="cho-chot"]')).toContainText("1");
  await expect(page.locator('[data-o-dem="cho-duyet"]')).toContainText("1");
});
