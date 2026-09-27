// Nghiệm thu mục 15 – CASE PHỤ: BAN HÀNH QUY ĐỊNH.
import { test, expect, type Page } from "@playwright/test";
import { resetDb } from "../helpers";
import { dangNhap, sql } from "./tien-ich";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => resetDb());

const TIEU_DE = "Quy định về minh chứng KPI kỳ 1";

async function daXem(page: Page) {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/quy-dinh");
  return page.locator(`[data-quy-dinh="${TIEU_DE}"] [data-testid="da-xem"]`);
}

test("HT ban hành quy định tick \"Giáo viên\" + \"Admin\" → 3 GV thấy ở \"Nhận giấy tờ\", admin thấy ở \"Nhận chỉ thị\"; TBM, TK, HP không thấy", async ({ page }) => {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/quy-dinh/moi");
  await page.getByLabel("Tiêu đề").fill(TIEU_DE);
  await page.getByLabel("Nội dung").fill("Mọi minh chứng phải có xác nhận của đơn vị.");
  await page.getByLabel("File đính kèm (không bắt buộc)").setInputFiles({ name: "quy-dinh.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await page.getByLabel("Giáo viên", { exact: true }).check();
  await page.getByLabel("Admin", { exact: true }).check();
  await page.getByRole("button", { name: "Ban hành" }).click();
  await expect(page.getByText("Đã ban hành quy định cho 4 người.")).toBeVisible();

  for (const u of ["gv.nguyenvanan", "gv.tranthibinh", "gv.levancuong"]) {
    await dangNhap(page, u);
    await page.goto("/giay-to");
    await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`), u).toContainText("Mới");
  }
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/chi-thi");
  await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`)).toContainText("Mới");
  const [vb] = await sql<{ id: string }>(`SELECT id FROM "VanBan" WHERE "tieuDe" = $1`, [TIEU_DE]);
  const [f] = await sql<{ id: string }>(`SELECT id FROM "FileDinhKem" WHERE "vanBanId" = $1`, [vb.id]);
  for (const u of ["tbm.phamthibich", "tk.levankhoa", "hp.tranthiphuong"]) {
    await dangNhap(page, u);
    await page.goto("/giay-to");
    await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`), u).toHaveCount(0);
    expect((await page.goto(`/giay-to/${vb.id}`))?.status(), u).toBe(404);
    expect((await page.request.get(`/api/files/${f.id}`)).status(), u).toBe(403);
  }
});

test("1 GV mở → HT thấy \"1/4 đã xem\"", async ({ page }) => {
  await expect(await daXem(page)).toHaveText("0/4 đã xem");
  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/giay-to");
  await page.getByRole("link", { name: TIEU_DE }).click();
  await expect(page.getByTestId("noi-dung")).toContainText("xác nhận của đơn vị");
  await expect(page.locator('[data-file="quy-dinh.pdf"]')).toBeVisible();
  await expect
    .poll(async () => (await sql<{ n: string }>(`SELECT count(*)::text AS n FROM "VanBanDaXem"`))[0].n)
    .toBe("1");
  await expect(await daXem(page)).toHaveText("1/4 đã xem");
  await page.getByRole("link", { name: TIEU_DE }).click();
  await expect(page.locator('[data-nguoi-nhan="gv.nguyenvanan"]')).toContainText("Đã xem");
  await expect(page.locator('[data-nguoi-nhan="admin.quantri"]')).toContainText("Chưa xem");
});

test("admin tạo thêm 1 GV mới → GV mới thấy quy định đó; HT thấy \"1/5 đã xem\"", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Họ tên").fill("Phan Thanh Mới");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Đã tạo tài khoản gv.phanthanhmoi (mật khẩu 123456).")).toBeVisible();

  await dangNhap(page, "gv.phanthanhmoi");
  await page.goto("/giay-to");
  await expect(page.locator(`[data-giay-to="${TIEU_DE}"]`)).toContainText("Mới");
  await expect(await daXem(page)).toHaveText("1/5 đã xem");
});

test("hiệu phó không có mục ban hành (API cũng chặn)", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  await expect(page.locator("aside nav")).not.toContainText("Ban hành quy định");
  await page.goto("/quy-dinh");
  await expect(page).toHaveURL(/\/khong-co-quyen$/);
  await page.goto("/quy-dinh/moi");
  await expect(page).toHaveURL(/\/khong-co-quyen$/);
  const res = await page.request.post("/api/quy-dinh", {
    multipart: { tieuDe: "Lén ban hành", noiDung: "x", viTriNhan: "GV" },
  });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe("Bạn không có quyền thực hiện thao tác này.");
  const [n] = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM "VanBan"`);
  expect(n.n).toBe("1");
});
