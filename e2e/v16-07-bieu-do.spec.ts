// v1.6 – Bước 6–7 (mục 2.6, 4, 5, 12.2): hai biểu đồ tròn "Đánh giá của cấp trên" / "Tự đánh giá", vòng ngoài +10%
// cải tiến, dòng tách, khối Cải tiến sáng tạo ở Trong kỳ / Cuối kỳ, kết quả sau chốt kỳ.
// Trạng thái KPI dựng bằng SQL (vòng chuyển trạng thái đã kiểm ở test tích hợp và e2e/v16-03); ở đây kiểm hiển thị.
import { test, expect, type Page } from "@playwright/test";
import { dangNhap, resetDb, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

type TT = "CHUA_LAM" | "CHO_DUYET" | "TU_CHOI" | "DA_DUYET" | "CHO_CHOT" | "DA_CHOT" | "TRA_VE";

/** Đăng ký đã duyệt (đủ nhiệm vụ của vị trí, có/không cải tiến) + task với trạng thái cho trước (theo thứ tự). */
async function dungKpi(username: string, batBuoc: TT[], caiTien: TT | null) {
  const [u] = await sql<{ id: string; role: string }>(`SELECT id, role::text AS role FROM "User" WHERE username = $1`, [username]);
  const [ky] = await sql<{ id: string }>(`SELECT id FROM "Ky" ORDER BY "createdAt" LIMIT 1`);
  const [dk] = await sql<{ id: string }>(
    `INSERT INTO "DangKy" (id, "kyId", "userId", "trangThai", "tongDiem", "xepLoai", "nopLuc", "duyetLuc")
     VALUES (gen_random_uuid()::text, $1, $2, 'DA_DUYET', 100, 'A1', now(), now()) RETURNING id`,
    [ky.id, u.id],
  );
  await sql(
    `INSERT INTO "DangKyNhiemVu" ("dangKyId", "nhiemVuId")
     SELECT $1, id FROM "NhiemVu" WHERE "kyId" = $2 AND "doiTuong"::text = $3 AND ("laCaiTien" = false OR $4)`,
    [dk.id, ky.id, u.role, caiTien !== null],
  );
  const tasks = await sql<{ id: string; loai: string }>(
    `SELECT t.id, t.loai::text AS loai FROM "Task" t JOIN "NhiemVu" nv ON nv.id = t."nhiemVuId"
     WHERE nv."kyId" = $1 AND nv."doiTuong"::text = $2 AND t.loai::text IN ('BAT_BUOC', 'CAI_TIEN') ORDER BY nv."thuTu", t."thuTu"`,
    [ky.id, u.role],
  );
  const bb = tasks.filter((t) => t.loai === "BAT_BUOC");
  expect(bb).toHaveLength(batBuoc.length);
  const ghi = async (taskId: string, tt: TT) =>
    sql(
      `INSERT INTO "KpiTask" (id, "userId", "kyId", "taskId", "trangThai", "guiChotLuc", "chotLuc")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::"TrangThaiTask", CASE WHEN $4 IN ('CHO_CHOT','DA_CHOT') THEN now() END, CASE WHEN $4 = 'DA_CHOT' THEN now() END)`,
      [u.id, ky.id, taskId, tt],
    );
  for (let i = 0; i < bb.length; i++) await ghi(bb[i].id, batBuoc[i]);
  if (caiTien) await ghi(tasks.find((t) => t.loai === "CAI_TIEN")!.id, caiTien);
}
const lap = (n: number, tt: TT): TT[] => Array.from({ length: n }, () => tt);

async function moTrongKy(page: Page, username: string) {
  await dangNhap(page, username);
  await page.goto("/trong-ky");
  await expect(page.getByTestId("hai-bieu-do")).toBeVisible();
}

test.beforeAll(async () => {
  await resetDb();
  // TK: 10 task bắt buộc – 3 chốt, 2 chờ duyệt, 1 bị từ chối, 4 chưa làm; không đăng ký cải tiến (đúng case mục 12.2).
  await dungKpi("tk.levankhoa", [...lap(3, "DA_CHOT"), ...lap(2, "CHO_DUYET"), "TU_CHOI", ...lap(4, "CHUA_LAM")], null);
  // TBM: 100% bắt buộc chốt, cải tiến đã nộp (chờ duyệt) chưa chốt.
  await dungKpi("tbm.phamthibich", lap(13, "DA_CHOT"), "CHO_DUYET");
  // HP: bắt buộc 90% (9/10 chốt, 1 chờ duyệt) + cải tiến đã chốt.
  await dungKpi("hp.tranthiphuong", [...lap(9, "DA_CHOT"), "CHO_DUYET"], "DA_CHOT");
  // GV không đăng ký cải tiến: 100% bắt buộc.
  await dungKpi("gv.tranthibinh", lap(22, "DA_CHOT"), null);
  // GV có cải tiến, tất cả được chốt → Vượt chỉ tiêu.
  await dungKpi("gv.levancuong", lap(22, "DA_CHOT"), "DA_CHOT");
});

test("10 task: 3 chốt, 2 chờ duyệt, 1 từ chối, 4 chưa làm → Cấp trên 30%, Tự đánh giá 60%; đúng tiêu đề", async ({ page }) => {
  await moTrongKy(page, "tk.levankhoa");
  const capTren = page.getByTestId("bieu-do-cap-tren");
  const tuDanhGia = page.getByTestId("bieu-do-tu-danh-gia");
  await expect(capTren.locator("figcaption")).toHaveText("Đánh giá của cấp trên");
  await expect(tuDanhGia.locator("figcaption")).toHaveText("Tự đánh giá");
  await expect(page.getByTestId("phan-tram")).toHaveText("30%");
  await expect(page.getByTestId("tu-danh-gia")).toHaveText("60%");
  await expect(page.getByTestId("dong-tach-cap-tren")).toHaveText("Bắt buộc 30%");
  await expect(page.getByTestId("dong-tach-tu-danh-gia")).toHaveText("Bắt buộc 60%");
  // Vòng trong cấp trên giữ 5 phần; tự đánh giá 2 phần (đã nộp gồm cả bị từ chối, đang chờ).
  await expect(capTren.locator("[data-phan]")).toHaveText([/Đã chốt[ ]*3/, /Đang treo[ ]*0/, /Chờ duyệt[ ]*2/, /Bị từ chối[ ]*1/, /Chưa làm[ ]*4/]);
  await expect(tuDanhGia.locator("[data-phan]")).toHaveText([/Đã nộp[ ]*6/, /Chưa nộp[ ]*4/]);
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 0 task");
  await expect(page.getByText(/[+][0-9]+ task vượt/)).toHaveCount(0);
});

test("cải tiến đã nộp chưa chốt → vòng ngoài Tự đánh giá tô màu, Cấp trên xám; có khối Cải tiến sáng tạo", async ({ page }) => {
  await moTrongKy(page, "tbm.phamthibich");
  await expect(page.getByTestId("phan-tram")).toHaveText("100%");
  await expect(page.getByTestId("tu-danh-gia")).toHaveText("110%");
  await expect(page.getByTestId("dong-tach-cap-tren")).toHaveText("Bắt buộc 100% · Cải tiến: chưa chốt");
  await expect(page.getByTestId("dong-tach-tu-danh-gia")).toHaveText("Bắt buộc 100% · Cải tiến +10%");
  await expect(page.getByTestId("vong-cai-tien-cap-tren")).toHaveAttribute("data-dat", "false");
  await expect(page.getByTestId("vong-cai-tien-cap-tren")).toHaveText("Cải tiến sáng tạo +10% – chưa chốt");
  await expect(page.getByTestId("vong-cai-tien-tu-danh-gia")).toHaveAttribute("data-dat", "true");
  await expect(page.getByTestId("vong-cai-tien-tu-danh-gia")).toHaveText("Cải tiến sáng tạo +10% – đã nộp");
  // Khối Cải tiến sáng tạo bên dưới nhiệm vụ, task cải tiến đi cùng vòng trạng thái.
  const khoi = page.getByTestId("khoi-cai-tien-task");
  await expect(khoi).toContainText("Sản phẩm cải tiến sáng tạo");
  await expect(khoi).toContainText("Chờ duyệt");
});

test("bắt buộc 90% + cải tiến đã chốt → hiện 100%, dòng tách \"Bắt buộc 90% · Cải tiến +10%\"", async ({ page }) => {
  await moTrongKy(page, "hp.tranthiphuong");
  await expect(page.getByTestId("phan-tram")).toHaveText("100%");
  await expect(page.getByTestId("dong-tach-cap-tren")).toHaveText("Bắt buộc 90% · Cải tiến +10%");
  await expect(page.getByTestId("vong-cai-tien-cap-tren")).toHaveAttribute("data-dat", "true");
  // Cuối kỳ (chỉ task đã chốt): khối cải tiến có vì cải tiến đã chốt.
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("khoi-cai-tien-task")).toContainText("Sản phẩm cải tiến sáng tạo");
});

test("không đăng ký cải tiến → không có vòng ngoài, không có khối Cải tiến ở Trong kỳ / Cuối kỳ", async ({ page }) => {
  await moTrongKy(page, "gv.tranthibinh");
  await expect(page.getByTestId("phan-tram")).toHaveText("100%");
  await expect(page.getByTestId("dong-tach-cap-tren")).toHaveText("Bắt buộc 100%");
  await expect(page.locator('[data-testid^="vong-cai-tien-"]')).toHaveCount(0);
  await expect(page.getByTestId("khoi-cai-tien-task")).toHaveCount(0);
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("hai-bieu-do")).toBeVisible();
  await expect(page.getByTestId("khoi-cai-tien-task")).toHaveCount(0);
});

test("hai biểu đồ cạnh nhau trên máy tính, xếp dọc trên điện thoại", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await moTrongKy(page, "tk.levankhoa");
  let a = (await page.getByTestId("bieu-do-cap-tren").boundingBox())!;
  let b = (await page.getByTestId("bieu-do-tu-danh-gia").boundingBox())!;
  expect(Math.abs(a.y - b.y)).toBeLessThan(5);
  expect(a.x).toBeLessThan(b.x); // cấp trên bên trái

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  a = (await page.getByTestId("bieu-do-cap-tren").boundingBox())!;
  b = (await page.getByTestId("bieu-do-tu-danh-gia").boundingBox())!;
  expect(b.y).toBeGreaterThan(a.y + a.height - 1); // tự đánh giá nằm dưới
});

test("người duyệt mở chi tiết 1 người thấy đủ 2 biểu đồ", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong"); // HP duyệt TK
  await page.goto("/duyet");
  await page.locator('tr[data-nguoi="tk.levankhoa"]').getByRole("link", { name: "Xem" }).click();
  await expect(page.getByTestId("bieu-do-cap-tren")).toBeVisible();
  await expect(page.getByTestId("bieu-do-tu-danh-gia")).toBeVisible();
  await expect(page.getByTestId("phan-tram")).toHaveText("30%");
  await expect(page.getByTestId("tu-danh-gia")).toHaveText("60%");
});

test("sau chốt kỳ: Không đạt (90% + cải tiến = 100%), Vượt chỉ tiêu – A1 (110%), Đạt, Đạt + ghi chú cải tiến chưa chốt", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  const [ky] = await sql<{ id: string }>(`SELECT id FROM "Ky" ORDER BY "createdAt" LIMIT 1`);
  await page.goto(`/admin/phan-viec/${ky.id}`);
  await page.getByRole("button", { name: "Chốt kỳ ngay" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Chốt kỳ", exact: true }).click();
  await expect(page.getByText("Đã chốt", { exact: true }).first()).toBeVisible();

  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Không đạt – A1");
  await expect(page.getByTestId("ket-qua-cap-tren")).toHaveText("100%");
  await expect(page.getByTestId("ket-qua-dong-tach")).toHaveText("(Bắt buộc 90% · Cải tiến +10%)");
  await expect(page.getByTestId("task-thieu").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("task-thieu")).not.toContainText("cải tiến");

  await dangNhap(page, "gv.levancuong");
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Vượt chỉ tiêu – A1 (110%)");
  await expect(page.getByTestId("cai-tien-da-chot")).toHaveText("Cải tiến sáng tạo đã được chốt");

  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Đạt – A1");

  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Đạt – A1");
  await expect(page.getByTestId("ket-qua-tu-danh-gia")).toHaveText("110%");
  await expect(page.getByTestId("ket-qua-ghi-chu")).toHaveText(
    "Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – Chờ duyệt, chưa được duyệt kịp",
  );
});
