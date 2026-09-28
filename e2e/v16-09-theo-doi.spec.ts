// v1.6 – Bước 9 (mục 8, 12.5): "Theo dõi kết quả đã chốt" cho Hiệu phó và Hiệu trưởng – chỉ xem.
import { test, expect } from "@playwright/test";
import { dangKyChoDuyetSql, dangNhap, duyetDangKyUi, menu, nopUi, resetDb, sql, thaoTacChotUi, thaoTacDuyetUi } from "./helpers";

test.describe.configure({ mode: "serial" });

const T_GV = "Biên soạn đề cương chi tiết học phần";
const T_GV_CHO = "Soạn slide bài giảng";
const T_TBM = "Rà soát đề cương các học phần";
const T_TK = "Lập kế hoạch đào tạo năm học";

test("chuẩn bị qua giao diện: GV (TK chốt), TBM (HP chốt), TK (HT chốt) mỗi người 1 task đã chốt; GV thêm 1 task chờ chốt", async ({ page }) => {
  await resetDb();
  for (const [lam, duyet] of [
    ["gv.nguyenvanan", "tbm.phamthibich"],
    ["tbm.phamthibich", "tk.levankhoa"],
    ["tk.levankhoa", "hp.tranthiphuong"],
  ]) {
    await dangKyChoDuyetSql(lam, lam === "gv.nguyenvanan");
    await duyetDangKyUi(page, duyet, lam);
  }
  for (const [lam, duyet, chot, task] of [
    ["gv.nguyenvanan", "tbm.phamthibich", "tk.levankhoa", T_GV],
    ["tbm.phamthibich", "tk.levankhoa", "hp.tranthiphuong", T_TBM],
    ["tk.levankhoa", "hp.tranthiphuong", "ht.nguyenvanhieu", T_TK],
  ]) {
    await nopUi(page, lam, task);
    await thaoTacDuyetUi(page, duyet, lam, task, "Duyệt");
    await thaoTacChotUi(page, chot, task, "Chốt");
  }
  await nopUi(page, "gv.nguyenvanan", T_GV_CHO);
  await thaoTacDuyetUi(page, "tbm.phamthibich", "gv.nguyenvanan", T_GV_CHO, "Duyệt");
});

test("menu: HP có mục ngay sau \"Chốt task trưởng bộ môn\", HT ngay sau \"Duyệt & chốt hiệu phó\"", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  const hp = await menu(page);
  expect(hp[hp.indexOf("Chốt task trưởng bộ môn") + 1]).toBe("Theo dõi kết quả đã chốt");
  await dangNhap(page, "ht.nguyenvanhieu");
  const ht = await menu(page);
  expect(ht[ht.indexOf("Duyệt & chốt hiệu phó") + 1]).toBe("Theo dõi kết quả đã chốt");
});

test("HP thấy task đã chốt của GV và TBM khoa mình; không thấy TK, task chưa chốt", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  await page.getByRole("link", { name: "Theo dõi kết quả đã chốt" }).click();
  await expect(page).toHaveURL(/\/theo-doi/);
  await expect(page.locator('[data-o-dem="GV"] .text-2xl')).toHaveText("1");
  await expect(page.locator('[data-o-dem="TBM"] .text-2xl')).toHaveText("1");
  await expect(page.locator('[data-o-dem="TK"]')).toHaveCount(0);
  const dong = page.locator("tr[data-task]");
  await expect(dong).toHaveCount(2);
  await expect(page.locator(`tr[data-task="${T_TK}"]`)).toHaveCount(0);
  await expect(page.locator(`tr[data-task="${T_GV_CHO}"]`)).toHaveCount(0);
  const gv = page.locator(`tr[data-task="${T_GV}"]`);
  await expect(gv).toContainText("Nguyễn Văn An");
  await expect(gv).toContainText("Giáo viên");
  await expect(gv).toContainText("Phạm Thị Bích"); // người duyệt
  await expect(gv).toContainText("Lê Văn Khoa"); // người chốt
  // Không có nút thay đổi nào trên trang (chỉ có bộ lọc, chọn kỳ, phân trang).
  await expect(page.getByRole("button", { name: /Chốt|Hủy|Trả về|Sửa|Xóa/ })).toHaveCount(0);
});

test("HT thấy task đã chốt của cả 4 chức vụ; lọc theo chức vụ, loại chạy đúng", async ({ page }) => {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/theo-doi");
  for (const v of ["GV", "TBM", "TK", "HP"]) await expect(page.locator(`[data-o-dem="${v}"]`)).toBeVisible();
  await expect(page.locator("tr[data-task]")).toHaveCount(3);
  await page.getByLabel("Lọc theo chức vụ").click();
  await page.getByRole("option", { name: "Trưởng khoa" }).click();
  await expect(page).toHaveURL(/viTri=TK/);
  await expect(page.locator("tr[data-task]")).toHaveCount(1);
  await expect(page.locator(`tr[data-task="${T_TK}"]`)).toBeVisible();
  await page.getByLabel("Lọc theo chức vụ").click();
  await page.getByRole("option", { name: "Tất cả chức vụ" }).click();
  await page.getByLabel("Lọc theo loại").click();
  await page.getByRole("option", { name: "Cải tiến sáng tạo" }).click();
  await expect(page.getByText("Không có task đã chốt nào.")).toBeVisible();
  await expect(page.getByTestId("phan-trang")).toContainText("0 task đã chốt · Trang 1/1");
});

test("Xem → chi tiết chỉ đọc: minh chứng xem được, lịch sử duyệt/chốt, không có nút thay đổi", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/theo-doi");
  await page.locator(`tr[data-task="${T_GV}"]`).getByRole("link", { name: "Xem" }).click();
  const ct = page.getByTestId("chi-tiet-theo-doi");
  await expect(ct).toHaveAttribute("data-task", T_GV);
  await expect(ct.getByTestId("nguoi-duyet")).toHaveText("Phạm Thị Bích");
  await expect(ct.getByTestId("nguoi-chot")).toHaveText("Lê Văn Khoa");
  await expect(ct).toContainText("Lịch sử xử lý");
  await expect(page.getByTestId("nut-thao-tac")).toHaveCount(0);
  await expect(ct.getByRole("button")).toHaveCount(0);
  // Minh chứng mở được (quyền file mở thêm cho HP).
  const link = ct.locator('a[href^="/api/files/"]').first();
  const href = await link.getAttribute("href");
  expect((await page.request.get(href!)).status()).toBe(200);

  // Task chưa chốt: gõ thẳng đường dẫn → 404.
  const [cho] = await sql<{ id: string }>(
    `SELECT k.id FROM "KpiTask" k JOIN "Task" t ON t.id = k."taskId" WHERE t.ten = $1 AND k."trangThai" = 'CHO_CHOT'`,
    [T_GV_CHO],
  );
  const res = await page.goto(`/theo-doi/task/${cho.id}`);
  expect(res?.status()).toBe(404);
});

test("GV, TBM, TK gõ thẳng đường dẫn → bị chặn", async ({ page }) => {
  for (const u of ["gv.nguyenvanan", "tbm.phamthibich", "tk.levankhoa"]) {
    await dangNhap(page, u);
    await page.goto("/theo-doi");
    await expect(page, u).toHaveURL(/\/khong-co-quyen/);
    await expect(await menu(page)).not.toContain("Theo dõi kết quả đã chốt");
  }
});
