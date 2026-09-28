// Tiện ích cho bộ nghiệm thu mục 15. Mọi thao tác nghiệp vụ đi qua giao diện (hoặc gọi API như trình
// duyệt, để kiểm tra chặn ở server); SQL chỉ dùng để tra id / đọc trạng thái kiểm tra.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, type Page } from "@playwright/test";
import { dangNhap, sql } from "../helpers";

export { dangNhap, sql };

export const PDF_MAU = { name: "minh-chung.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 minh chung") };

export async function idNguoi(username: string) {
  const [u] = await sql<{ id: string }>(`SELECT id FROM "User" WHERE username = $1`, [username]);
  if (!u) throw new Error(`Không có tài khoản ${username}`);
  return u.id;
}

export async function idKy(ten = "Kỳ 1 – 2026-2027") {
  const [k] = await sql<{ id: string }>(`SELECT id FROM "Ky" WHERE ten = $1`, [ten]);
  return k.id;
}

/** Tên n nhiệm vụ đầu (theo thứ tự) của một vị trí trong kỳ seed. */
export async function tenNhiemVu(doiTuong: string, n: number) {
  const ds = await sql<{ ten: string }>(
    `SELECT nv.ten FROM "NhiemVu" nv JOIN "Ky" k ON k.id = nv."kyId" WHERE k.ten = 'Kỳ 1 – 2026-2027' AND nv."doiTuong" = $1 AND NOT nv."laCaiTien" ORDER BY nv."thuTu" LIMIT $2`,
    [doiTuong, n],
  );
  return ds.map((x) => x.ten);
}

export type TaskCuaNguoi = { id: string; ten: string; loai: "BAT_BUOC" | "MO_RONG" | "CAI_TIEN"; trangThai: string };

/** Task của một người: theo thứ tự nhiệm vụ, bắt buộc trước, rồi thứ tự task. */
export async function taskCua(username: string, loai?: TaskCuaNguoi["loai"]) {
  return sql<TaskCuaNguoi>(
    `SELECT k.id, t.ten, t.loai::text AS loai, k."trangThai"::text AS "trangThai"
     FROM "KpiTask" k JOIN "Task" t ON t.id = k."taskId" JOIN "NhiemVu" nv ON nv.id = t."nhiemVuId"
     JOIN "User" u ON u.id = k."userId"
     WHERE u.username = $1 ${loai ? `AND t.loai = '${loai}'` : ""}
     ORDER BY nv."thuTu", t.loai, t."thuTu"`,
    [username],
  );
}

export async function trangThaiTask(id: string) {
  const [k] = await sql<{ trangThai: string }>(`SELECT "trangThai"::text AS "trangThai" FROM "KpiTask" WHERE id = $1`, [id]);
  return k.trangThai;
}

/**
 * Người làm KPI gửi danh sách lên người duyệt. v1.6: mọi nhiệm vụ của vị trí đã tick sẵn (khóa) – kiểm tra số nhiệm
 * vụ, điểm, xếp loại dự kiến; chỉ chọn có đăng ký cải tiến sáng tạo hay không.
 */
export async function dangKyVaGui(
  page: Page,
  username: string,
  nutGui: RegExp,
  p: { soNhiemVu: number; diem: [string, string]; caiTien?: boolean },
) {
  await dangNhap(page, username);
  await page.goto("/dau-ky");
  await expect(page.getByTestId("so-nhiem-vu")).toHaveText(String(p.soNhiemVu));
  await expect(page.getByTestId("tong-diem")).toHaveText(p.diem[0]);
  await expect(page.getByTestId("xep-loai")).toHaveText(p.diem[1]);
  if (p.caiTien) await page.getByLabel("Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này").check();
  await expect(page.getByTestId("cai-tien")).toHaveText(p.caiTien ? "Có" : "Không");
  await page.getByRole("button", { name: nutGui }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByTestId("banner-trang-thai")).toContainText("Chờ duyệt");
}

/** Người duyệt mở danh sách đăng ký của người làm KPI trên màn hình Duyệt, kiểm tra điểm/xếp loại/cải tiến, bấm Duyệt. */
export async function duyetDangKy(page: Page, nguoiDuyet: string, nguoiLam: string, diem?: [string, string], caiTien?: boolean) {
  await dangNhap(page, nguoiDuyet);
  await page.goto("/duyet");
  await page.locator(`tr[data-nguoi="${nguoiLam}"]`).getByRole("link", { name: "Xem" }).click();
  if (diem) {
    await expect(page.getByTestId("tong-diem")).toHaveText(diem[0]);
    await expect(page.getByTestId("xep-loai")).toHaveText(diem[1]);
  }
  if (caiTien !== undefined) {
    await expect(page.getByTestId("dang-ky-cai-tien")).toHaveText(`Đăng ký cải tiến sáng tạo: ${caiTien ? "Có" : "Không"}`);
  }
  await page.getByRole("button", { name: "Duyệt", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận duyệt" }).click();
  await expect(page.getByText("Đã duyệt danh sách. Các task bắt buộc đã được giao.")).toBeVisible();
}

/** Người làm KPI nộp minh chứng cho một task (trang chi tiết task). */
export async function nop(page: Page, kpiTaskId: string, file = PDF_MAU) {
  await page.goto(`/trong-ky/task/${kpiTaskId}`);
  await page.getByLabel("File minh chứng").setInputFiles(file);
  await page.getByRole("button", { name: "Gửi minh chứng" }).click();
  await expect(page.getByText(/Đã nộp minh chứng, chờ .* duyệt\./)).toBeVisible();
}

/** Bấm một nút thao tác trên task (màn hình Duyệt/Chốt), nhập nhận xét nếu có, xác nhận, chờ hộp thoại đóng. */
export async function bamNut(page: Page, nut: string | RegExp, nhanXet?: string) {
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: nut, exact: typeof nut === "string" }).click();
  if (nhanXet !== undefined) await page.getByRole("dialog").getByRole("textbox").fill(nhanXet);
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function moTaskDuyet(page: Page, nguoiLamId: string, kyId: string, kpiTaskId: string) {
  await page.goto(`/duyet/${nguoiLamId}?kyId=${kyId}&tab=task&task=${kpiTaskId}`);
  await expect(page.getByTestId("chi-tiet-task")).toBeVisible();
}

export async function moTaskChot(page: Page, kyId: string, kpiTaskId: string) {
  await page.goto(`/chot?kyId=${kyId}&loc=tat-ca&task=${kpiTaskId}`);
  await expect(page.getByTestId("chi-tiet-task")).toBeVisible();
}

/**
 * Chạy chuỗi cho danh sách task: người làm nộp → người duyệt Duyệt (v1.6: task GV/TBM/TK lên Chờ chốt ngay; task HP
 * ở Đã duyệt, HT Chốt ngay) → người chốt Chốt. `den` là trạng thái đích ("DA_DUYET" chỉ dùng cho task HP).
 */
export async function lamChuoi(
  page: Page,
  p: { lam: string; duyet: string; chot: string; ids: string[]; den: "DA_DUYET" | "CHO_CHOT" | "DA_CHOT"; kyId: string },
) {
  if (!p.ids.length) return;
  const lamId = await idNguoi(p.lam);
  await dangNhap(page, p.lam);
  for (const id of p.ids) await nop(page, id);

  const gop = p.duyet === p.chot;
  await dangNhap(page, p.duyet);
  for (const id of p.ids) {
    await moTaskDuyet(page, lamId, p.kyId, id);
    await bamNut(page, "Duyệt");
    if (gop && p.den === "DA_CHOT") await bamNut(page, "Chốt");
  }
  if (p.den !== "DA_CHOT" || gop) return;
  await dangNhap(page, p.chot);
  for (const id of p.ids) {
    await moTaskChot(page, p.kyId, id);
    await bamNut(page, "Chốt");
  }
}

/** Admin sửa ngày bắt đầu / kết thúc của kỳ trên trang Phân việc đầu kỳ. */
export async function suaNgayKy(page: Page, batDau: string, ketThuc: string) {
  await dangNhap(page, "admin.quantri");
  await page.goto(`/admin/phan-viec/${await idKy()}`);
  await page.getByLabel("Ngày bắt đầu").fill(batDau);
  await page.getByLabel("Ngày kết thúc").fill(ketThuc);
  await page.getByRole("button", { name: "Lưu ngày" }).click();
  await expect(page.getByText("Đã lưu ngày của kỳ.")).toBeVisible();
}

/** "YYYY-MM-DD" giờ Việt Nam, lệch n ngày so với hôm nay. */
export function ngayVN(n = 0) {
  const d = new Date(Date.now() + 7 * 3600_000 + n * 86400_000);
  return d.toISOString().slice(0, 10);
}

/** Admin bấm Chốt kỳ ngay. */
export async function chotKyNgay(page: Page, soNguoi: number) {
  await dangNhap(page, "admin.quantri");
  await page.goto(`/admin/phan-viec/${await idKy()}`);
  await page.getByRole("button", { name: "Chốt kỳ ngay" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Chốt kỳ" }).click();
  await expect(page.getByText(`Đã chốt kỳ, tính kết quả cho ${soNguoi} người.`)).toBeVisible();
}

/** Tải báo cáo từ trang Xuất báo cáo, lưu vào test-results/nghiem-thu/. */
export async function taiBaoCao(page: Page, nut: "Xuất Excel" | "Xuất PDF", luuThanh: string) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: nut }).click()]);
  const duongDan = `test-results/nghiem-thu/${luuThanh}`;
  mkdirSync(dirname(duongDan), { recursive: true });
  await dl.saveAs(duongDan);
  return { duongDan, tenFile: dl.suggestedFilename() };
}

/** Trích toàn bộ chữ trong PDF bằng pdf.js (kiểm tra tiếng Việt đọc đúng, không lỗi font). */
export async function chuTrongPdf(duongDan: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(duongDan)) }).promise;
  let s = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    s += tc.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  }
  return s;
}

/** Đọc số chưa đọc + nội dung thông báo của người đang đăng nhập (như chuông gọi). */
export async function thongBaoCuaToi(page: Page): Promise<string[]> {
  const res = await page.request.get("/api/thong-bao");
  const body = (await res.json()) as { items: { noiDung: string }[] };
  return body.items.map((x) => x.noiDung);
}
