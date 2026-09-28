// Bước 6 – Trong kỳ (nộp, biểu đồ) + màn hình Duyệt đầy đủ. v1.6: Duyệt là task lên Chờ chốt ngay (không còn Gửi
// lên), hủy duyệt khi còn Chờ chốt; bỏ xin thêm task; hai biểu đồ (chi tiết ở e2e/v16-07-bieu-do.spec.ts).
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

test("GV nộp → TBM duyệt (lên Chờ chốt ngay): GV thấy treo, % không tăng; TBM hủy duyệt, duyệt lại", async ({ page }) => {
  await dangKyUi(page, "gv.nguyenvanan", "Gửi lên trưởng bộ môn");
  await duyetDangKyUi(page, "tbm.phamthibich", "gv.nguyenvanan");

  await nopUi(page, "gv.nguyenvanan", T1);
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T1}"]`)).toContainText("Chờ duyệt");
  await expect(page.getByTestId("bieu-do-cap-tren").locator('[data-phan="choDuyet"]')).toContainText("1");

  await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.nguyenvanan", T1, "Duyệt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Chờ chốt");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt"]);
  // Minh chứng PDF xem ngay trên trang.
  await expect(page.locator('[data-xem-truoc="minh-chung.pdf"]')).toBeVisible();

  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T1}"]`)).toContainText("Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 1 task");
  await expect(page.getByTestId("bieu-do-cap-tren").locator('[data-phan="dangTreo"]')).toContainText("1");

  await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.nguyenvanan", T1, "Hủy duyệt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Chờ duyệt");
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Duyệt" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Chờ chốt");
  // Không còn nút Gửi lên; người chốt chưa chốt nên vẫn hủy duyệt được.
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt"]);
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

test("Hàng chờ: chỉ task Chờ duyệt / Bị trả về (task đã duyệt nằm ở người chốt), cũ nhất lên trước", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet?tab=hang-cho");
  const dong = page.getByTestId("hang-cho").locator("tbody tr");
  await expect(dong).toHaveCount(1);
  await expect(dong.first()).toHaveAttribute("data-task", T2);
  await dong.first().getByRole("link", { name: "Xử lý" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toHaveAttribute("data-task", T2);
});

test("v1.6: không còn xin thêm task mở rộng – Trong kỳ không có khối xin thêm, màn hình Duyệt không có tab/ô xin thêm", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.locator("[data-xin-them]")).toHaveCount(0);
  await expect(page.getByText("Xin thêm task")).toHaveCount(0);

  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="xin-them"]')).toHaveCount(0);
  await page.locator('tr[data-nguoi="gv.nguyenvanan"]').getByRole("link", { name: "Xem" }).click();
  await expect(page.getByRole("link", { name: "Xin thêm task" })).toHaveCount(0);
});

test("HP nộp → HT Duyệt (vẫn treo) → HT Chốt → % tăng", async ({ page }) => {
  await dangKyUi(page, "hp.tranthiphuong", "Gửi lên hiệu trưởng");
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
  // v1.6: HP đăng ký đủ 5 nhiệm vụ (10 task bắt buộc) → 1/10.
  await expect(page.getByTestId("phan-tram")).toHaveText("10%");
});

test("màn hình Duyệt của TBM: cột Đánh giá cấp trên % và số liệu", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  const dong = page.locator('tr[data-nguoi="gv.nguyenvanan"]');
  await expect(dong.locator('[data-cot="phan-tram"] div').first()).toHaveText("0%");
  await expect(dong.locator('[data-cot="tu-danh-gia"]')).toHaveText("9%"); // 2/22 đã nộp
  await expect(page.locator('[data-o-dem="cho-chot"]')).toContainText("1");
  await expect(page.locator('[data-o-dem="cho-duyet"]')).toContainText("1");
});
