// Nghiệm thu mục 15 – CASE PHỤ: CHUNG.
import { test, expect, type Browser, type Page } from "@playwright/test";
import { resetDb } from "../helpers";
import {
  bamNut,
  chotKyNgay,
  dangKyVaGui,
  dangNhap,
  duyetDangKy,
  idKy,
  idNguoi,
  moTaskChot,
  moTaskDuyet,
  ngayVN,
  nop,
  sql,
  suaNgayKy,
  taskCua,
  tenNhiemVu,
  trangThaiTask,
} from "./tien-ich";

test.describe.configure({ mode: "serial" });
let kyId: string;

async function trangMoi(browser: Browser, username?: string): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  const p = await ctx.newPage();
  if (username) await dangNhap(p, username);
  return p;
}

async function baiNopDau(kpiTaskId: string) {
  const [b] = await sql<{ id: string }>(`SELECT id FROM "BaiNop" WHERE "kpiTaskId" = $1 ORDER BY "nopLuc" LIMIT 1`, [kpiTaskId]);
  return b.id;
}

const FILE = (ten: string, kichThuoc = 100) => ({ name: ten, mimeType: "application/octet-stream", buffer: Buffer.alloc(kichThuoc, 1) });

test.beforeAll(async () => {
  await resetDb();
  kyId = await idKy();
});

test("chuẩn bị (hôm nay là ngày bắt đầu kỳ): Bình gửi rồi bị từ chối; Cường được duyệt; An tick nhưng chưa gửi", async ({ page }) => {
  await dangKyVaGui(page, "gv.tranthibinh", "GV", 1, /^Gửi lên trưởng bộ môn$/);
  await dangNhap(page, "tbm.phamthibich");
  await page.goto("/duyet");
  await page.locator('tr[data-nguoi="gv.tranthibinh"]').getByRole("link", { name: "Xem" }).click();
  await page.getByRole("button", { name: "Từ chối" }).click();
  await page.getByLabel("Nhận xét").fill("Cần chọn thêm nhiệm vụ.");
  await page.getByRole("button", { name: "Xác nhận từ chối" }).click();
  await expect(page.getByText("Đã từ chối danh sách.")).toBeVisible();

  await dangKyVaGui(page, "gv.levancuong", "GV", 1, /^Gửi lên trưởng bộ môn$/);
  await duyetDangKy(page, "tbm.phamthibich", "gv.levancuong");

  await dangNhap(page, "gv.nguyenvanan");
  await page.goto("/dau-ky");
  const [nv] = await tenNhiemVu("GV", 1);
  await page.getByLabel(`Chọn ${nv}`, { exact: true }).check();
  await expect(page.getByTestId("so-nhiem-vu")).toHaveText("1");
});

test("sửa ngày bắt đầu kỳ về hôm qua → người chưa gửi đăng ký không gửi được nữa (chặn ở server)", async ({ page, browser }) => {
  // Trang của An đang mở từ trước, vẫn còn nút Gửi.
  const an = await trangMoi(browser, "gv.nguyenvanan");
  await an.goto("/dau-ky");
  await expect(an.getByRole("button", { name: "Gửi lên trưởng bộ môn" })).toBeEnabled();

  await suaNgayKy(page, ngayVN(-1), ngayVN(29));

  await an.getByRole("button", { name: "Gửi lên trưởng bộ môn" }).click();
  await an.getByRole("alertdialog").getByRole("button", { name: "Gửi" }).click();
  await expect(an.getByText("Đã hết hạn đăng ký (23:59 ngày bắt đầu kỳ).")).toBeVisible();
  await an.reload();
  await expect(an.getByTestId("banner-trang-thai")).toContainText("Đã hết hạn đăng ký");
  await expect(an.getByRole("button", { name: "Gửi lên trưởng bộ môn" })).toHaveCount(0);
  await expect(an.getByRole("checkbox").first()).toBeDisabled();
  const [dk] = await sql<{ trangThai: string }>(
    `SELECT "trangThai"::text AS "trangThai" FROM "DangKy" WHERE "userId" = $1`,
    [await idNguoi("gv.nguyenvanan")],
  );
  expect(dk.trangThai).toBe("NHAP");
  await an.context().close();
});

test("bị từ chối danh sách sau ngày bắt đầu → vẫn sửa và gửi lại được (trước deadline)", async ({ page }) => {
  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/dau-ky");
  await expect(page.getByTestId("nhan-xet")).toHaveText("Cần chọn thêm nhiệm vụ.");
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Bạn có thể sửa danh sách và gửi lại đến hết deadline");
  const [, nv2] = await tenNhiemVu("GV", 2);
  await page.getByLabel(`Chọn ${nv2}`, { exact: true }).check();
  await expect(page.getByTestId("so-nhiem-vu")).toHaveText("2");
  await page.getByRole("button", { name: "Gửi lên trưởng bộ môn" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Chờ duyệt");
  await duyetDangKy(page, "tbm.phamthibich", "gv.tranthibinh", ["27", "D"]);
});

test("sửa minh chứng khi Chờ duyệt → được; khi đã duyệt/chốt → bị chặn (cả ở API)", async ({ page }) => {
  const [t1] = await taskCua("gv.levancuong", "BAT_BUOC");
  await dangNhap(page, "gv.levancuong");
  await nop(page, t1.id);
  // Chờ trang làm mới xong, form chuyển sang chế độ sửa (form mới dựng lại sẽ xóa chữ đã gõ vào form cũ).
  await expect(page.getByRole("button", { name: "Lưu thay đổi" })).toBeVisible();
  await page.getByLabel("Ghi chú (không bắt buộc)").fill("Đã bổ sung bản scan");
  await page.getByLabel("Thêm file").setInputFiles({ name: "bo-sung.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã cập nhật minh chứng.")).toBeVisible();
  await expect(page.getByTestId("lich-su-nop")).toContainText("Đã bổ sung bản scan");
  await expect(page.locator('[data-lan-nop="1"] [data-file]')).toHaveCount(2);

  const bn = await baiNopDau(t1.id);
  const sua = () => page.request.patch(`/api/bai-nop/${bn}`, { multipart: { ghiChu: "sửa lén" } });

  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, await idNguoi("gv.levancuong"), kyId, t1.id);
  await bamNut(page, "Duyệt");
  await dangNhap(page, "gv.levancuong");
  await page.goto(`/trong-ky/task/${t1.id}`);
  await expect(page.getByTestId("da-khoa")).toContainText("Không sửa được minh chứng");
  await expect(page.getByRole("button", { name: "Lưu thay đổi" })).toHaveCount(0);
  let r = await sua();
  expect(r.status()).toBe(409);
  expect((await r.json()).error).toMatch(/không thể sửa bài nộp/);

  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, await idNguoi("gv.levancuong"), kyId, t1.id);
  await bamNut(page, "Gửi lên trưởng khoa");
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, t1.id);
  await bamNut(page, "Chốt");
  await dangNhap(page, "gv.levancuong");
  r = await sua();
  expect(r.status()).toBe(409);
  expect((await r.json()).error).toBe("Task đã chốt, không ai sửa được.");
  const nopMoi = await page.request.post(`/api/kpi-task/${t1.id}/bai-nop`, {
    multipart: { files: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") } },
  });
  expect(nopMoi.status()).toBe(409);
  const [b] = await sql<{ ghiChu: string }>(`SELECT "ghiChu" FROM "BaiNop" WHERE id = $1`, [bn]);
  expect(b.ghiChu).toBe("Đã bổ sung bản scan");
});

test("admin không sửa được minh chứng của ai", async ({ page }) => {
  const [t1, t2] = await taskCua("gv.levancuong", "BAT_BUOC");
  await dangNhap(page, "gv.levancuong");
  await nop(page, t2.id); // bài đang Chờ duyệt: chính GV còn sửa được, admin thì không
  const bn = await baiNopDau(t2.id);

  await dangNhap(page, "admin.quantri");
  await page.goto(`/admin/cau-hinh/nguoi/${await idNguoi("gv.levancuong")}?kyId=${kyId}`);
  await expect(page.locator(`[data-task="${t2.ten}"]`)).toContainText("Chờ duyệt");
  await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  await expect(page.locator("main input[type=file]")).toHaveCount(0);

  const r1 = await page.request.patch(`/api/bai-nop/${bn}`, { multipart: { ghiChu: "admin sửa" } });
  expect(r1.status()).toBe(403);
  const r2 = await page.request.post(`/api/kpi-task/${t1.id}/bai-nop`, {
    multipart: { files: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") } },
  });
  expect(r2.status()).toBe(403);
  expect(await trangThaiTask(t2.id)).toBe("CHO_DUYET");
});

test("file > 20MB hoặc sai định dạng → báo lỗi (giao diện và server)", async ({ page }) => {
  const t3 = (await taskCua("gv.levancuong", "BAT_BUOC"))[2];
  await dangNhap(page, "gv.levancuong");
  await page.goto(`/trong-ky/task/${t3.id}`);

  await page.getByLabel("File minh chứng").setInputFiles(FILE("virus.exe"));
  await expect(page.locator('[data-file-moi="virus.exe"]')).toContainText("sai định dạng");
  await page.getByRole("button", { name: "Gửi minh chứng" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText('File "virus.exe" sai định dạng. Chỉ nhận PDF, JPG, PNG, DOC/DOCX, XLS/XLSX.');
  await page.getByRole("button", { name: "Bỏ chọn virus.exe" }).click();

  await page.getByLabel("File minh chứng").setInputFiles(FILE("qua-lon.pdf", 21 * 1024 * 1024));
  await expect(page.locator('[data-file-moi="qua-lon.pdf"]')).toContainText("vượt quá 20MB");
  await page.getByRole("button", { name: "Gửi minh chứng" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText('File "qua-lon.pdf" vượt quá 20MB.');

  // Server kiểm tra lại (gọi thẳng API, bỏ qua kiểm tra ở trình duyệt).
  const api = (f: { name: string; mimeType: string; buffer: Buffer }) =>
    page.request.post(`/api/kpi-task/${t3.id}/bai-nop`, { multipart: { files: f } });
  const r1 = await api(FILE("virus.exe"));
  expect(r1.status()).toBe(400);
  expect((await r1.json()).error).toMatch(/sai định dạng/);
  const r2 = await api(FILE("qua-lon.pdf", 21 * 1024 * 1024));
  expect(r2.status()).toBe(400);
  expect((await r2.json()).error).toBe('File "qua-lon.pdf" vượt quá 20MB.');
  expect(await trangThaiTask(t3.id)).toBe("CHUA_LAM");
});

test("người không có quyền mở link /api/files/[id] → bị chặn", async ({ page, browser }) => {
  const [t1] = await taskCua("gv.levancuong", "BAT_BUOC");
  const [f] = await sql<{ id: string }>(
    `SELECT f.id FROM "FileDinhKem" f JOIN "BaiNop" b ON b.id = f."baiNopId" WHERE b."kpiTaskId" = $1 LIMIT 1`,
    [t1.id],
  );
  const thu = async (u: string) => {
    await dangNhap(page, u);
    return (await page.request.get(`/api/files/${f.id}`)).status();
  };
  expect(await thu("gv.levancuong")).toBe(200); // chủ minh chứng
  expect(await thu("tbm.phamthibich")).toBe(200); // người duyệt
  expect(await thu("tk.levankhoa")).toBe(200); // người chốt (task đã chốt)
  expect(await thu("admin.quantri")).toBe(200);
  expect(await thu("gv.nguyenvanan")).toBe(403); // GV khác
  expect(await thu("hp.tranthiphuong")).toBe(403);
  expect(await thu("ht.nguyenvanhieu")).toBe(403);
  const khach = await trangMoi(browser);
  expect((await khach.request.get(`/api/files/${f.id}`)).status()).toBe(401);
  const res = await khach.goto(`/api/files/${f.id}`);
  expect(res?.status()).toBe(401);
  await khach.context().close();
});

test("không đăng ký → chốt kỳ ra Không đạt – F, ghi chú \"Chưa có danh sách nhiệm vụ được duyệt\"", async ({ page }) => {
  await chotKyNgay(page, 6);
  // An chỉ tick (Nháp, chưa gửi); TBM không đăng ký gì.
  for (const u of ["gv.nguyenvanan", "tbm.phamthibich"]) {
    await dangNhap(page, u);
    await page.goto("/trong-ky");
    await expect(page.getByTestId("ket-qua-tieu-de"), u).toHaveText("Không đạt – F");
    await expect(page.getByTestId("ket-qua-ghi-chu"), u).toHaveText("Chưa có danh sách nhiệm vụ được duyệt");
  }
});
