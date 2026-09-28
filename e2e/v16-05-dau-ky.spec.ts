// v1.6 – Bước 5 (mục 2, 3, 12.3): Đầu kỳ mọi nhiệm vụ bắt buộc (tick sẵn, khóa), khối Đăng ký cải tiến sáng tạo +
// Phụ lục IV, người duyệt thấy dòng cải tiến, admin Phân việc có nhiệm vụ hệ thống, không còn giao diện xin thêm task.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { dangNhap, duyetDangKyUi, resetDb, sql } from "./helpers";

const FILE_PHU_LUC = path.join(process.cwd(), "public", "templates", "phu-luc-iv.docx");
// Chỉ xóa file nếu chính test này tạo ra (không đụng file thật chủ dự án đã chép vào).
let taoFileTam = false;

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());
test.afterAll(() => {
  if (taoFileTam) rmSync(FILE_PHU_LUC, { force: true });
});

test("GV: mọi nhiệm vụ tick sẵn + khóa + nhãn Bắt buộc; thanh tổng kết có Cải tiến sáng tạo", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  const the = page.locator("[data-nhiem-vu]");
  await expect(the).toHaveCount(10);
  const hopTick = page.getByRole("checkbox", { name: /^Chọn / });
  await expect(hopTick).toHaveCount(10);
  for (const cb of await hopTick.all()) {
    await expect(cb).toBeChecked();
    await expect(cb).toBeDisabled();
  }
  await expect(page.getByTestId("nhan-bat-buoc")).toHaveCount(10);
  // Thẻ chỉ hiện task Bắt buộc.
  await expect(page.locator("[data-nhiem-vu] li", { hasText: "Mở rộng" })).toHaveCount(0);
  await expect(page.getByTestId("so-nhiem-vu")).toHaveText("10");
  await expect(page.getByTestId("tong-diem")).toHaveText("100");
  await expect(page.getByTestId("xep-loai")).toHaveText("A1");
  await expect(page.getByTestId("cai-tien")).toHaveText("Không");
});

test("chưa có file Phụ lục IV → \"đang được cập nhật\", nút Tải về khóa; vẫn tick cải tiến được (tự lưu)", async ({ page }) => {
  test.skip(existsSync(FILE_PHU_LUC) && !taoFileTam, "Máy đã có file Phụ lục IV thật – bỏ qua case chưa có file.");
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  const khoi = page.getByTestId("khoi-cai-tien");
  await expect(khoi.getByTestId("phu-luc-iv")).toContainText("Mẫu Phụ lục IV đang được cập nhật");
  await expect(khoi.getByRole("button", { name: "Tải về" })).toBeDisabled();

  const hop = page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này");
  await hop.check();
  await expect(page.getByTestId("cai-tien")).toHaveText("Có");
  // Tự lưu: tải lại trang vẫn giữ.
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này")).toBeChecked();
  await page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này").uncheck();
  await expect(page.getByTestId("cai-tien")).toHaveText("Không");
  await page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này").check();
  await expect(page.getByTestId("cai-tien")).toHaveText("Có");
});

test("chép file vào public/templates/phu-luc-iv.docx → nút Tải về mở, tải được", async ({ page }) => {
  if (!existsSync(FILE_PHU_LUC)) {
    mkdirSync(path.dirname(FILE_PHU_LUC), { recursive: true });
    writeFileSync(FILE_PHU_LUC, "PK-tam-cho-test"); // file tạm, xóa ở afterAll
    taoFileTam = true;
  }
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  const link = page.getByTestId("khoi-cai-tien").getByRole("link", { name: "Tải về" });
  await expect(link).toHaveAttribute("href", "/templates/phu-luc-iv.docx");
  await expect(page.getByTestId("phu-luc-iv")).not.toContainText("đang được cập nhật");
  const res = await page.request.get("/templates/phu-luc-iv.docx");
  expect(res.status()).toBe(200);
});

test("gửi → Chờ duyệt: ô cải tiến bị khóa; người duyệt thấy \"Đăng ký cải tiến sáng tạo: Có\"; duyệt xong vẫn khóa", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  await page.getByRole("button", { name: "Gửi lên trưởng bộ môn" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Cải tiến sáng tạo: Có");
  await page.getByRole("alertdialog").getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Chờ duyệt");
  await expect(page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này")).toBeDisabled();

  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await page.locator('tr[data-nguoi="gv.nguyenvanan"]').getByRole("link", { name: "Xem" }).click();
  await expect(page.getByTestId("dang-ky-cai-tien")).toHaveText("Đăng ký cải tiến sáng tạo: Có");
  await expect(page.locator("[data-nhiem-vu]")).toHaveCount(10);
  // Không còn tab Xin thêm task.
  await expect(page.getByRole("link", { name: "Xin thêm task" })).toHaveCount(0);

  await duyetDangKyUi(page, "tbm.phamthibich", "gv.nguyenvanan");
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Đã duyệt");
  await expect(page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này")).toBeDisabled();
  await expect(page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này")).toBeChecked();

  // Trong kỳ: không còn khối Xin thêm task; màn hình Duyệt không còn ô/cột xin thêm.
  await page.goto("/trong-ky");
  await expect(page.getByText("Xin thêm task")).toHaveCount(0);
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="xin-them"]')).toHaveCount(0);
  await expect(page.getByText("Xin thêm chờ duyệt")).toHaveCount(0);
});

test("admin Phân việc: dòng cố định nhiệm vụ cải tiến (không sửa/xóa), form task không có ô Loại, cảnh báo khi kỳ đã công bố", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  const [ky] = await sql<{ id: string }>(`SELECT id FROM "Ky" ORDER BY "createdAt" LIMIT 1`);
  await page.goto(`/admin/phan-viec/${ky.id}`);
  const heThong = page.locator('[data-nhiem-vu-he-thong="cai-tien"]');
  await expect(heThong).toContainText("Đăng ký cải tiến sáng tạo (hệ thống)");
  await expect(heThong).toContainText("Sản phẩm cải tiến sáng tạo");
  await expect(heThong.getByRole("button")).toHaveCount(0);
  await expect(page.getByText("Giáo viên (10)")).toBeVisible();

  // Form thêm task: không có ô Loại.
  await page.locator("[data-nhiem-vu]").first().getByRole("button", { name: "Thêm task" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Loại", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Task mới luôn là task bắt buộc.");
  await page.keyboard.press("Escape");

  // Kỳ đã công bố: thêm nhiệm vụ → cảnh báo.
  await page.getByRole("button", { name: "Thêm nhiệm vụ" }).click();
  await expect(page.getByTestId("canh-bao-da-cong-bo")).toHaveText(
    "Người đã gửi đăng ký sẽ không tự có nhiệm vụ này. Nên hoàn tất nhiệm vụ trước khi công bố kỳ.",
  );
});
