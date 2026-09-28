// v1.6 – mục 7.3 (test bắt buộc) + 12.4: bỏ bước "Gửi lên". Người duyệt bấm Duyệt là người chốt thấy task
// ngay trong Chờ chốt, cho cả 4 chuỗi. Bản tái hiện lỗi trên code v1.4 (bước 1) nằm trong lịch sử git của file
// này (e2e/v16-01-tai-hien-cho-chot.spec.ts, commit "v1.6 – Bước 1").
// Đăng ký nhiệm vụ dựng bằng SQL (trạng thái Chờ duyệt) để test không phụ thuộc giao diện Đầu kỳ; từ bước
// duyệt danh sách trở đi mọi thao tác đi qua giao diện thật.
import { test, expect, type Page } from "@playwright/test";
import { dangNhap, duyetDangKyUi, nopUi, resetDb, sql, thaoTacDuyetUi } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

/** Người làm KPI có danh sách đăng ký Chờ duyệt gồm nhiệm vụ thường đầu tiên của vị trí mình. */
async function dangKyChoDuyet(username: string) {
  await sql(
    `WITH u AS (SELECT id, role::text AS role FROM "User" WHERE username = $1),
          k AS (SELECT id FROM "Ky" ORDER BY "createdAt" LIMIT 1),
          nv AS (SELECT nv.id, nv.diem FROM "NhiemVu" nv, k, u
                 WHERE nv."kyId" = k.id AND nv."doiTuong"::text = u.role AND NOT nv."laCaiTien" ORDER BY nv."thuTu" LIMIT 1),
          dk AS (INSERT INTO "DangKy" (id, "kyId", "userId", "trangThai", "tongDiem", "xepLoai", "nopLuc")
                 SELECT gen_random_uuid()::text, k.id, u.id, 'CHO_DUYET', nv.diem, 'F', now() FROM k, u, nv RETURNING id)
     INSERT INTO "DangKyNhiemVu" ("dangKyId", "nhiemVuId") SELECT dk.id, nv.id FROM dk, nv`,
    [username],
  );
}

/** Màn hình Chốt của người chốt: số ở ô "Task chờ chốt" và các task đang hiện (mặc định lọc Chờ chốt). */
async function manHinhChot(page: Page, nguoiChot: string) {
  await dangNhap(page, nguoiChot);
  await page.goto("/chot");
  const soChoChot = (await page.locator('[data-o-dem="cho-chot"] .text-2xl').innerText()).trim();
  const tasks = await page.locator("tr[data-task]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-task")));
  return { soChoChot, tasks };
}

async function trangThai(username: string, task: string) {
  const [kt] = await sql<{ trangThai: string }>(
    `SELECT k."trangThai"::text AS "trangThai" FROM "KpiTask" k JOIN "Task" t ON t.id = k."taskId" JOIN "User" u ON u.id = k."userId"
     WHERE u.username = $1 AND t.ten = $2`,
    [username, task],
  );
  return kt.trangThai;
}

const CHUOI = [
  { lam: "gv.nguyenvanan", duyet: "tbm.phamthibich", chot: "tk.levankhoa", task: "Biên soạn đề cương chi tiết học phần", task2: "Soạn slide bài giảng" },
  { lam: "tbm.phamthibich", duyet: "tk.levankhoa", chot: "hp.tranthiphuong", task: "Rà soát đề cương các học phần", task2: "Tổng hợp đề xuất cập nhật chương trình" },
  { lam: "tk.levankhoa", duyet: "hp.tranthiphuong", chot: "ht.nguyenvanhieu", task: "Lập kế hoạch đào tạo năm học", task2: "Báo cáo tiến độ đào tạo" },
];

test("chuẩn bị: 4 người làm KPI có danh sách được duyệt (qua màn hình Duyệt)", async ({ page }) => {
  for (const [lam, duyet] of [
    ["gv.nguyenvanan", "tbm.phamthibich"],
    ["tbm.phamthibich", "tk.levankhoa"],
    ["tk.levankhoa", "hp.tranthiphuong"],
    ["hp.tranthiphuong", "ht.nguyenvanhieu"],
  ]) {
    await dangKyChoDuyet(lam);
    await duyetDangKyUi(page, duyet, lam);
  }
});

for (const c of CHUOI) {
  test(`${c.lam} nộp → ${c.duyet} bấm Duyệt → ${c.chot} thấy ngay trong Chờ chốt`, async ({ page }) => {
    await nopUi(page, c.lam, c.task);
    await thaoTacDuyetUi(page, c.duyet, c.lam, c.task, "Duyệt");
    expect(await trangThai(c.lam, c.task)).toBe("CHO_CHOT");
    // Sau khi duyệt, người duyệt chỉ còn nút Hủy duyệt – không có nút Gửi lên.
    await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt"]);

    expect(await manHinhChot(page, c.chot)).toEqual({ soChoChot: "1", tasks: [c.task] });
    // Người làm KPI vẫn thấy nhãn cũ.
    await dangNhap(page, c.lam);
    await page.goto("/trong-ky");
    await expect(page.locator(`[data-task="${c.task}"]`)).toContainText("đã duyệt – chờ");
  });
}

test("hiệu phó → hiệu trưởng Duyệt → hiệu trưởng thấy nút Chốt (task HP giữ 2 nút)", async ({ page }) => {
  const task = "Ban hành kế hoạch đào tạo";
  await nopUi(page, "hp.tranthiphuong", task);
  await thaoTacDuyetUi(page, "ht.nguyenvanhieu", "hp.tranthiphuong", task, "Duyệt");
  expect(await trangThai("hp.tranthiphuong", task)).toBe("DA_DUYET");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt", "Chốt"]);
  // Tổng quan của HT vẫn có ô "Đã duyệt, chưa chốt"; Hàng chờ vẫn có task này.
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="chua-chot"] .text-2xl')).toHaveText("1");
  await page.goto("/duyet?tab=hang-cho");
  await expect(page.locator(`[data-testid="hang-cho"] tr[data-task="${task}"]`)).toHaveCount(1);
  await thaoTacDuyetUi(page, "ht.nguyenvanhieu", "hp.tranthiphuong", task, "Chốt");
  expect(await trangThai("hp.tranthiphuong", task)).toBe("DA_CHOT");
});

test("không còn cột/ô \"Chưa gửi lên\"; Hàng chờ của người duyệt không còn task đã duyệt", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('[data-o-dem="chua-gui"]')).toHaveCount(0);
  await expect(page.getByText("Chưa gửi lên")).toHaveCount(0);
  await expect(page.locator('[data-o-dem="cho-chot"] .text-2xl')).toHaveText("1");
  await page.goto("/duyet?tab=hang-cho");
  await expect(page.locator('[data-testid="hang-cho"] tr[data-task]')).toHaveCount(0);
});

test("hủy duyệt khi người chốt chưa chốt → về Chờ duyệt, biến mất khỏi Chờ chốt; đã chốt → không còn nút Hủy duyệt", async ({ page }) => {
  const c = CHUOI[0];
  await thaoTacDuyetUi(page, c.duyet, c.lam, c.task, "Hủy duyệt");
  expect(await trangThai(c.lam, c.task)).toBe("CHO_DUYET");
  expect(await manHinhChot(page, c.chot)).toEqual({ soChoChot: "0", tasks: [] });

  // Duyệt lại từ đầu → người chốt chốt → người duyệt mở task: không còn nút nào.
  await thaoTacDuyetUi(page, c.duyet, c.lam, c.task, "Duyệt");
  await dangNhap(page, c.chot);
  await page.goto("/chot");
  await page.locator(`tr[data-task="${c.task}"]`).getByRole("link").click();
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Chốt" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await trangThai(c.lam, c.task)).toBe("DA_CHOT");
  await dangNhap(page, c.duyet);
  await page.goto("/duyet");
  await page.locator(`tr[data-nguoi="${c.lam}"]`).getByRole("link", { name: "Xem" }).click();
  await page.getByRole("link", { name: "Task và minh chứng" }).click();
  await page.locator(`tr[data-task="${c.task}"]`).getByRole("link", { name: "Mở" }).click();
  await expect(page.getByTestId("chi-tiet-task")).toHaveAttribute("data-task", c.task);
  await expect(page.getByTestId("nut-thao-tac")).toHaveCount(0);
});

test("người chốt trả về → người duyệt Duyệt lại → task lên thẳng Chờ chốt", async ({ page }) => {
  const c = CHUOI[0];
  await nopUi(page, c.lam, c.task2);
  await thaoTacDuyetUi(page, c.duyet, c.lam, c.task2, "Duyệt");
  await dangNhap(page, c.chot);
  await page.goto("/chot");
  await page.locator(`tr[data-task="${c.task2}"]`).getByRole("link").click();
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Trả về" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Thiếu dấu");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await trangThai(c.lam, c.task2)).toBe("TRA_VE");

  await thaoTacDuyetUi(page, c.duyet, c.lam, c.task2, "Duyệt lại");
  expect(await trangThai(c.lam, c.task2)).toBe("CHO_CHOT");
  expect(await manHinhChot(page, c.chot)).toEqual({ soChoChot: "1", tasks: [c.task2] });
});
