import { test, expect, type Page } from "@playwright/test";
import { dangKyUi, dangNhap, duyetDangKyUi, nopUi, resetDb, thaoTacDuyetUi } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

const T1 = "Biên soạn đề cương chi tiết học phần";
const T2 = "Soạn slide bài giảng";
const T3 = "Nộp giáo án lên bộ môn";

async function thaoTacChotUi(page: Page, nguoiChot: string, task: string, nut: string, nhanXet?: string) {
  await dangNhap(page, nguoiChot);
  await page.goto("/chot");
  await page.locator(`tr[data-task="${task}"]`).getByRole("link").click();
  await expect(page.getByTestId("chi-tiet-task")).toHaveAttribute("data-task", task);
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: nut }).click();
  if (nhanXet !== undefined) await page.getByRole("dialog").getByRole("textbox").fill(nhanXet);
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("chuẩn bị: GV đăng ký, nộp 3 task; TBM duyệt 3, gửi lên 2", async ({ page }) => {
  await dangKyUi(page, "gv.tranthibinh", ["Biên soạn bài giảng"], "Gửi lên trưởng bộ môn");
  await duyetDangKyUi(page, "tbm.phamthibich", "gv.tranthibinh");
  for (const t of [T1, T2, T3]) await nopUi(page, "gv.tranthibinh", t);
  for (const t of [T1, T2, T3]) await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.tranthibinh", t, "Duyệt");
  for (const t of [T1, T2]) await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.tranthibinh", t, "Gửi lên trưởng khoa");
});

test("TK: màn hình Chốt chỉ thấy task đã gửi lên, mặc định Chờ chốt", async ({ page }) => {
  await dangNhap(page, "tk.levankhoa");
  await page.goto("/chot");
  await expect(page.getByRole("heading", { name: "Chốt task giáo viên" })).toBeVisible();
  await expect(page.locator('[data-o-dem="cho-chot"]')).toContainText("2");
  await expect(page.locator("tr[data-task]")).toHaveCount(2);
  await expect(page.locator(`tr[data-task="${T3}"]`)).toHaveCount(0);
  // Lọc theo người, theo đơn vị có sẵn.
  await expect(page.getByLabel("Lọc theo người")).toBeVisible();
  await expect(page.getByLabel("Lọc theo đơn vị")).toBeVisible();
});

test("TK chốt → GV thấy Đã chốt, % tăng", async ({ page }) => {
  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 3 task");
  // Cuối kỳ chưa có gì vì chưa task nào được chốt.
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("danh-sach-trong")).toBeVisible();
  await expect(page.locator("[data-task]")).toHaveCount(0);

  await thaoTacChotUi(page, "tk.levankhoa", T1, "Chốt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Đã chốt");

  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T1}"]`)).toContainText("Đã chốt – hoàn thành");
  await expect(page.getByTestId("phan-tram")).toHaveText("33,3%");
});

test("Cuối kỳ: chỉ hiện task đã chốt; chi tiết quay lại Cuối kỳ; link cũ /cuoi-ky/task chuyển sang Trong kỳ", async ({ page }) => {
  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/cuoi-ky");
  await expect(page.getByRole("heading", { name: "Cuối kỳ" })).toBeVisible();
  await expect(page.getByTestId("so-da-chot")).toContainText("Đã chốt: 1 task");
  await expect(page.getByTestId("phan-tram")).toHaveText("33,3%");
  await expect(page.locator("[data-task]")).toHaveCount(1);
  await expect(page.locator(`[data-task="${T1}"]`)).toContainText("Đã chốt – hoàn thành");

  await page.locator(`[data-task="${T1}"]`).getByRole("link", { name: "Chi tiết" }).click();
  await expect(page.getByTestId("da-khoa")).toBeVisible();
  const kpiTaskId = new URL(page.url()).pathname.split("/").pop();
  await page.locator("main").getByRole("link", { name: "Cuối kỳ" }).click();
  await expect(page).toHaveURL(/\/cuoi-ky\?kyId=/);

  await page.goto(`/cuoi-ky/task/${kpiTaskId}`);
  await expect(page).toHaveURL(new RegExp(`/trong-ky/task/${kpiTaskId}$`));
  await expect(page.locator("main").getByRole("link", { name: "Trong kỳ" })).toBeVisible();
});

test("TK trả về → TBM thấy nhận xét, GV chỉ thấy trạng thái → TBM trả làm lại → GV nộp lại", async ({ page }) => {
  await thaoTacChotUi(page, "tk.levankhoa", T2, "Trả về", "Slide thiếu trang bìa");

  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T2}"]`)).toContainText("Trưởng khoa trả về – chờ trưởng bộ môn xử lý");
  await page.locator(`[data-task="${T2}"]`).getByRole("link").click();
  await expect(page.getByText("Slide thiếu trang bìa")).toHaveCount(0);

  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="tra-ve"]')).toContainText("1");
  await page.goto("/duyet?tab=hang-cho");
  await page.locator(`[data-testid="hang-cho"] tr[data-task="${T2}"]`).getByRole("link", { name: "Xử lý" }).click();
  await expect(page.getByTestId("nhan-xet-chot")).toContainText("Slide thiếu trang bìa");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Trả giáo viên làm lại", "Duyệt lại"]);
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Trả giáo viên làm lại" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Bổ sung trang bìa rồi nộp lại");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Bị từ chối");

  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T2}"]`)).toContainText("Bị từ chối");
  await page.locator(`[data-task="${T2}"]`).getByRole("link", { name: "Nộp minh chứng" }).click();
  await expect(page.getByTestId("lich-su-nop")).toContainText("Bổ sung trang bìa rồi nộp lại");
});

test("người chốt mở link task chưa gửi lên → không thấy", async ({ page }) => {
  await dangNhap(page, "tk.levankhoa");
  await page.goto("/chot?loc=tat-ca");
  await expect(page.locator(`tr[data-task="${T3}"]`)).toHaveCount(0);
});
