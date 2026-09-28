// Bước 8: chốt kỳ + kết quả. v1.6: trạng thái cuối của kịch bản mục 12.1 (spec-v1.6, thay kịch bản mục 15 v1.4) được
// dựng nhanh bằng SQL (toàn bộ chuỗi thao tác qua action thật ở tests/kich-ban.int.test.ts; qua giao diện ở
// e2e/nghiem-thu/1-kich-ban-chinh.spec.ts). Ở đây kiểm tra: admin bấm "Chốt kỳ ngay" trên giao diện, rồi mỗi tài
// khoản thấy đúng kết quả.
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { dangNhap, resetDb, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

type TrangThai = "CHUA_LAM" | "CHO_DUYET" | "CHO_CHOT" | "DA_CHOT" | "TRA_VE";

/**
 * Đăng ký Đã duyệt đủ nhiệm vụ của vị trí (100 điểm, A1), có/không cải tiến; task bắt buộc lấy trạng thái theo hàm,
 * task cải tiến (nếu có) theo `caiTien`.
 */
async function dung(username: string, trangThai: (i: number) => TrangThai, caiTien: TrangThai | null) {
  const [u] = await sql<{ id: string; role: string }>(`SELECT id, role FROM "User" WHERE username = $1`, [username]);
  const [ky] = await sql<{ id: string }>(`SELECT id FROM "Ky" LIMIT 1`);
  const dkId = randomUUID();
  await sql(
    `INSERT INTO "DangKy" (id, "kyId", "userId", "trangThai", "tongDiem", "xepLoai", "nopLuc", "duyetLuc") VALUES ($1,$2,$3,'DA_DUYET',100,'A1',now(),now())`,
    [dkId, ky.id, u.id],
  );
  const nvs = await sql<{ id: string }>(
    `SELECT id FROM "NhiemVu" WHERE "kyId" = $1 AND "doiTuong" = $2 AND ("laCaiTien" = false OR $3) ORDER BY "thuTu"`,
    [ky.id, u.role, caiTien !== null],
  );
  for (const nv of nvs) await sql(`INSERT INTO "DangKyNhiemVu" ("dangKyId", "nhiemVuId") VALUES ($1,$2)`, [dkId, nv.id]);
  const tasks = await sql<{ id: string; loai: string }>(
    `SELECT t.id, t.loai::text AS loai FROM "Task" t JOIN "NhiemVu" nv ON nv.id = t."nhiemVuId"
     WHERE nv.id = ANY($1) AND t.loai IN ('BAT_BUOC', 'CAI_TIEN') ORDER BY nv."thuTu", t."thuTu"`,
    [nvs.map((x) => x.id)],
  );
  let i = 0;
  for (const t of tasks) {
    const tt = t.loai === "CAI_TIEN" ? caiTien! : trangThai(i++);
    await sql(`INSERT INTO "KpiTask" (id, "userId", "kyId", "taskId", "trangThai") VALUES ($1,$2,$3,$4,$5)`, [
      randomUUID(),
      u.id,
      ky.id,
      t.id,
      tt,
    ]);
  }
}

test.beforeAll(async () => {
  await resetDb();
  await dung("gv.nguyenvanan", (i) => (i < 11 ? "DA_CHOT" : "CHUA_LAM"), null);
  await dung("gv.tranthibinh", () => "DA_CHOT", null);
  await dung("gv.levancuong", () => "DA_CHOT", "DA_CHOT");
  await dung("tbm.phamthibich", () => "DA_CHOT", "DA_CHOT");
  await dung("tk.levankhoa", () => "DA_CHOT", "CHO_DUYET");
  await dung("hp.tranthiphuong", () => "DA_CHOT", null);
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

// Mục 12.1: [người, kết quả, cấp trên, tự đánh giá].
const MONG_DOI: [string, string, string, string][] = [
  ["gv.nguyenvanan", "Không đạt – A1", "50%", "50%"],
  ["gv.tranthibinh", "Đạt – A1", "100%", "100%"],
  ["gv.levancuong", "Vượt chỉ tiêu – A1 (110%)", "110%", "110%"],
  ["tbm.phamthibich", "Vượt chỉ tiêu – A1 (110%)", "110%", "110%"],
  ["tk.levankhoa", "Đạt – A1", "100%", "110%"],
  ["hp.tranthiphuong", "Đạt – A1", "100%", "100%"],
];

for (const [username, ketQua, capTren, tuDanhGia] of MONG_DOI) {
  test(`${username}: ${ketQua}`, async ({ page }) => {
    await dangNhap(page, username);
    await page.goto("/trong-ky");
    await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText(ketQua);
    await expect(page.getByTestId("ket-qua-cap-tren")).toHaveText(capTren);
    await expect(page.getByTestId("ket-qua-tu-danh-gia")).toHaveText(tuDanhGia);
    if (username === "gv.nguyenvanan") {
      await expect(page.getByTestId("task-thieu").locator("li")).toHaveCount(11);
      await expect(page.getByTestId("task-thieu").locator("[data-ly-do]").first()).toHaveText("(Chưa nộp minh chứng)");
    }
    if (username === "gv.levancuong") {
      await expect(page.getByTestId("cai-tien-da-chot")).toHaveText("Cải tiến sáng tạo đã được chốt");
    }
    if (username === "tk.levankhoa") {
      await expect(page.getByTestId("ket-qua-ghi-chu")).toHaveText(
        "Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – Chờ duyệt, chưa được duyệt kịp",
      );
    }
  });
}

test("màn hình Duyệt sau chốt kỳ có cột Kết quả; mọi thao tác bị khóa", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await expect(page.locator('tr[data-nguoi="gv.levancuong"] [data-cot="ket-qua"]')).toHaveText("Vượt chỉ tiêu – A1 (110%)");
  await expect(page.locator('tr[data-nguoi="gv.nguyenvanan"] [data-cot="ket-qua"]')).toHaveText("Không đạt – A1");

  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/trong-ky");
  await page.locator("[data-task]").filter({ hasText: "Chưa làm" }).first().getByRole("link").click();
  await expect(page.getByText("Kỳ đã chốt, không thể thao tác.")).toBeVisible();
});
