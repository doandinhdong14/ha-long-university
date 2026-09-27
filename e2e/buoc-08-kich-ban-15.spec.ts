// Bước 8: chốt kỳ + kết quả. Trạng thái cuối của kịch bản mục 15 được dựng nhanh bằng SQL (toàn bộ chuỗi
// thao tác qua action thật đã có ở tests/kich-ban-15.int.test.ts; từng thao tác giao diện đã có ở E2E bước 5–7).
// Ở đây kiểm tra: admin bấm "Chốt kỳ ngay" trên giao diện, rồi mỗi tài khoản thấy đúng kết quả.
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { dangNhap, resetDb, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

type TrangThai = "CHUA_LAM" | "DA_DUYET" | "CHO_CHOT" | "DA_CHOT" | "TRA_VE";

/** Đăng ký Đã duyệt các nhiệm vụ thuTu 1..n của vị trí; task bắt buộc lấy trạng thái theo hàm. */
async function dung(username: string, n: number, tongDiem: number, xepLoai: string, trangThai: (i: number) => TrangThai) {
  const [u] = await sql<{ id: string; role: string }>(`SELECT id, role FROM "User" WHERE username = $1`, [username]);
  const [ky] = await sql<{ id: string }>(`SELECT id FROM "Ky" LIMIT 1`);
  const dkId = randomUUID();
  await sql(
    `INSERT INTO "DangKy" (id, "kyId", "userId", "trangThai", "tongDiem", "xepLoai", "nopLuc", "duyetLuc") VALUES ($1,$2,$3,'DA_DUYET',$4,$5,now(),now())`,
    [dkId, ky.id, u.id, tongDiem, xepLoai],
  );
  const nvs = await sql<{ id: string }>(
    `SELECT id FROM "NhiemVu" WHERE "kyId" = $1 AND "doiTuong" = $2 AND "thuTu" <= $3 ORDER BY "thuTu"`,
    [ky.id, u.role, n],
  );
  for (const nv of nvs) await sql(`INSERT INTO "DangKyNhiemVu" ("dangKyId", "nhiemVuId") VALUES ($1,$2)`, [dkId, nv.id]);
  const tasks = await sql<{ id: string }>(
    `SELECT t.id FROM "Task" t JOIN "NhiemVu" nv ON nv.id = t."nhiemVuId"
     WHERE nv.id = ANY($1) AND t.loai = 'BAT_BUOC' ORDER BY nv."thuTu", t."thuTu"`,
    [nvs.map((x) => x.id)],
  );
  let i = 0;
  for (const t of tasks) {
    await sql(`INSERT INTO "KpiTask" (id, "userId", "kyId", "taskId", "trangThai") VALUES ($1,$2,$3,$4,$5)`, [
      randomUUID(),
      u.id,
      ky.id,
      t.id,
      trangThai(i++),
    ]);
  }
  return { userId: u.id, kyId: ky.id };
}

test.beforeAll(async () => {
  await resetDb();
  await dung("gv.nguyenvanan", 10, 100, "A1", (i) => (i < 11 ? "DA_CHOT" : "CHUA_LAM"));
  await dung("gv.tranthibinh", 3, 39, "C", () => "DA_CHOT");
  const cuong = await dung("gv.levancuong", 5, 59, "B", () => "DA_CHOT");
  // 2 task mở rộng đã chốt + 1 đã duyệt chưa chốt (không tính là vượt).
  const moRong = await sql<{ id: string }>(
    `SELECT t.id FROM "Task" t JOIN "NhiemVu" nv ON nv.id = t."nhiemVuId"
     WHERE nv."kyId" = $1 AND nv."doiTuong" = 'GV' AND nv."thuTu" <= 3 AND t.loai = 'MO_RONG' ORDER BY nv."thuTu"`,
    [cuong.kyId],
  );
  for (const [i, t] of moRong.entries()) {
    await sql(`INSERT INTO "KpiTask" (id, "userId", "kyId", "taskId", "trangThai") VALUES ($1,$2,$3,$4,$5)`, [
      randomUUID(),
      cuong.userId,
      cuong.kyId,
      t.id,
      i < 2 ? "DA_CHOT" : "DA_DUYET",
    ]);
  }
  await dung("tbm.phamthibich", 3, 55, "B", () => "DA_CHOT");
  await dung("tk.levankhoa", 4, 80, "A1", () => "DA_CHOT");
  await dung("hp.tranthiphuong", 3, 60, "B", () => "DA_CHOT");
});

test("trước khi chốt: người làm KPI chưa thấy khối Kết quả (chỉ thấy kết quả cuối cùng)", async ({ page }) => {
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("phan-tram")).toHaveText("50%");
  await expect(page.getByTestId("ket-qua")).toHaveCount(0);
});

test("admin bấm Chốt kỳ ngay", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/phan-viec");
  await page.getByRole("link", { name: "Kỳ 1 – 2026-2027" }).click();
  await page.getByRole("button", { name: "Chốt kỳ ngay" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Chốt kỳ" }).click();
  await expect(page.getByText("Đã chốt kỳ, tính kết quả cho 6 người.")).toBeVisible();
  await expect(page.getByText("Đã chốt", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chốt kỳ ngay" })).toHaveCount(0);
});

const MONG_DOI: [string, string][] = [
  ["gv.nguyenvanan", "Không đạt – A1"],
  ["gv.tranthibinh", "Đạt – C"],
  ["gv.levancuong", "Vượt chỉ tiêu – B"],
  ["tbm.phamthibich", "Đạt – B"],
  ["tk.levankhoa", "Đạt – A1"],
  ["hp.tranthiphuong", "Đạt – B"],
];

for (const [username, ketQua] of MONG_DOI) {
  test(`${username}: ${ketQua}`, async ({ page }) => {
    await dangNhap(page, username);
    await page.goto("/trong-ky");
    await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText(ketQua);
    if (username === "gv.nguyenvanan") {
      await expect(page.getByTestId("task-thieu").locator("li")).toHaveCount(11);
      await expect(page.getByTestId("task-thieu").locator("[data-ly-do]").first()).toHaveText("(Chưa nộp minh chứng)");
    }
    if (username === "gv.levancuong") {
      await expect(page.getByTestId("task-vuot-list").locator("li")).toHaveCount(2);
    }
  });
}

test("màn hình Duyệt sau chốt kỳ có cột Kết quả; mọi thao tác bị khóa", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('tr[data-nguoi="gv.levancuong"] [data-cot="ket-qua"]')).toHaveText("Vượt chỉ tiêu – B");
  await expect(page.locator('tr[data-nguoi="gv.nguyenvanan"] [data-cot="ket-qua"]')).toHaveText("Không đạt – A1");

  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await page.locator("[data-task]").filter({ hasText: "Chưa làm" }).first().getByRole("link").click();
  await expect(page.getByText("Kỳ đã chốt, không thể thao tác.")).toBeVisible();
});
