// v1.6 – Bước 1: tái hiện lỗi "trưởng khoa thấy Chờ chốt trống" (spec-v1.6 mục 7.1) trên code v1.4,
// CHƯA SỬA. Mọi thao tác đi qua giao diện thật. Kết luận ghi ở NOTES.md, mục v1.6 – Bước 1.
import { test, expect, type Page } from "@playwright/test";
import { dangKyUi, dangNhap, duyetDangKyUi, nopUi, resetDb, sql, thaoTacDuyetUi } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

/** Màn hình Chốt của người chốt: số ở ô đếm "Task chờ chốt" và các task đang hiện (mặc định lọc Chờ chốt). */
async function manHinhChot(page: Page, nguoiChot: string, url = "/chot") {
  await dangNhap(page, nguoiChot);
  await page.goto(url);
  const soChoChot = (await page.locator('[data-o-dem="cho-chot"] .text-2xl').innerText()).trim();
  const tasks = await page.locator("tr[data-task]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-task")));
  return { soChoChot, tasks };
}

// Ba chuỗi có bước "Gửi lên" (task HP không có, HT chốt ngay trên màn hình Duyệt).
const CHUOI = [
  { lam: "gv.nguyenvanan", nv: "Biên soạn bài giảng", guiDk: "Gửi lên trưởng bộ môn", duyet: "tbm.phamthibich", chot: "tk.levankhoa",
    task: "Biên soạn đề cương chi tiết học phần", guiLen: "Gửi lên trưởng khoa" },
  { lam: "tbm.phamthibich", nv: "Quản lý chương trình đào tạo của bộ môn", guiDk: "Gửi lên trưởng khoa", duyet: "tk.levankhoa", chot: "hp.tranthiphuong",
    task: "Rà soát đề cương các học phần", guiLen: "Gửi lên hiệu phó" },
  { lam: "tk.levankhoa", nv: "Quản lý đào tạo của khoa", guiDk: "Gửi lên hiệu phó", duyet: "hp.tranthiphuong", chot: "ht.nguyenvanhieu",
    task: "Lập kế hoạch đào tạo năm học", guiLen: "Gửi lên hiệu trưởng" },
];

for (const c of CHUOI) {
  test(`${c.lam}: nộp → ${c.duyet} DUYỆT (chưa gửi lên) → ${c.chot} thấy Chờ chốt TRỐNG`, async ({ page }) => {
    await dangKyUi(page, c.lam, [c.nv], c.guiDk);
    await duyetDangKyUi(page, c.duyet, c.lam);
    await nopUi(page, c.lam, c.task);
    await thaoTacDuyetUi(page, c.duyet, c.lam, c.task, "Duyệt");

    const [kt] = await sql<{ trangThai: string }>(
      `SELECT k."trangThai"::text AS "trangThai" FROM "KpiTask" k JOIN "Task" t ON t.id = k."taskId" JOIN "User" u ON u.id = k."userId"
       WHERE u.username = $1 AND t.ten = $2`,
      [c.lam, c.task],
    );
    expect(kt.trangThai).toBe("DA_DUYET");

    // Đúng hiện tượng người dùng báo: ô đếm 0, bảng trống; lọc "Tất cả" cũng không có (DA_DUYET không thuộc phạm vi người chốt).
    const chot = await manHinhChot(page, c.chot);
    expect(chot).toEqual({ soChoChot: "0", tasks: [] });
    await page.getByRole("link", { name: "Tất cả", exact: true }).click();
    await expect(page.getByText("Không có task nào.")).toBeVisible();

    // Người làm KPI thấy nhãn "… đã duyệt – chờ … chốt" nên tưởng task đã ở chỗ người chốt.
    await dangNhap(page, c.lam);
    await page.goto("/trong-ky");
    await expect(page.locator(`[data-task="${c.task}"]`)).toContainText("đã duyệt – chờ");

    // Người duyệt thấy task ở ô "Đã duyệt, chưa gửi lên" và vẫn còn nút Gửi lên.
    await dangNhap(page, c.duyet);
    await page.goto("/duyet");
    await expect(page.locator('[data-o-dem="chua-gui"] .text-2xl')).toHaveText("1");
  });

  test(`${c.lam}: ${c.duyet} bấm "${c.guiLen}" → ${c.chot} THẤY ngay`, async ({ page }) => {
    await thaoTacDuyetUi(page, c.duyet, c.lam, c.task, c.guiLen);
    const chot = await manHinhChot(page, c.chot);
    expect(chot).toEqual({ soChoChot: "1", tasks: [c.task] });
  });
}

test("kỳ mặc định: có kỳ thứ hai đã công bố bắt đầu muộn hơn → trang Chốt mở theo menu sang kỳ đó", async ({ page }) => {
  // Task CHO_CHOT của gv.nguyenvanan nằm ở Kỳ 1 (seed). Admin công bố thêm Kỳ 2 bắt đầu hôm nay (≥ ngày bắt đầu Kỳ 1).
  await sql(
    `INSERT INTO "Ky" (id, ten, "namHoc", "soKy", "ngayBatDau", "ngayKetThuc", "daCongBo", "daChot")
     SELECT 'ky2-tai-hien', 'Kỳ 2 – 2026-2027', '2026-2027', 2, "ngayBatDau", "ngayKetThuc", true, false FROM "Ky" WHERE ten = 'Kỳ 1 – 2026-2027'`,
  );
  const [{ id: ky1 }] = await sql<{ id: string }>(`SELECT id FROM "Ky" WHERE ten = 'Kỳ 1 – 2026-2027'`);
  // Cùng ngày bắt đầu: chonKyHienTai giữ kỳ đứng trước trong danh sách (sắp theo ngày bắt đầu, rồi createdAt mới nhất).
  const macDinh = await manHinhChot(page, "tk.levankhoa");
  const theoLink = await manHinhChot(page, "tk.levankhoa", `/chot?kyId=${ky1}`);
  // Ghi lại để đọc trong báo cáo: với kỳ mặc định khác kỳ của task thì bảng trống; link trong thông báo có kyId nên luôn đúng.
  console.log("[tai-hien] mac dinh:", JSON.stringify(macDinh), "| theo link thong bao:", JSON.stringify(theoLink));
  expect(theoLink.tasks).toEqual(["Biên soạn đề cương chi tiết học phần"]);
  // GV cũng mở Trong kỳ theo cùng một kỳ mặc định → cùng một kỳ với người chốt.
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  const kyGv = await page.getByRole("combobox").first().innerText();
  await dangNhap(page, "tk.levankhoa");
  await page.goto("/chot");
  const kyTk = await page.getByRole("combobox").first().innerText();
  console.log("[tai-hien] ky mac dinh GV:", kyGv, "| TK:", kyTk);
  expect(kyGv).toBe(kyTk);
  await sql(`DELETE FROM "Ky" WHERE id = 'ky2-tai-hien'`);
});
