// Nghiệm thu mục 15 – CASE PHỤ: XUẤT BÁO CÁO. File được tải qua giao diện /bao-cao rồi đọc nội dung.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { test, expect, type Page } from "@playwright/test";
import { resetDb } from "../helpers";
import {
  chotKyNgay,
  chuTrongPdf,
  dangKyVaGui,
  dangNhap,
  duyetDangKy,
  idKy,
  idNguoi,
  lamChuoi,
  moTaskChot,
  sql,
  taiBaoCao,
  taskCua,
} from "./tien-ich";

test.describe.configure({ mode: "serial" });

async function docExcel(duongDan: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(duongDan);
  return wb;
}

/** Các dòng dữ liệu của sheet (dòng 4 là tiêu đề cột). */
function dongDuLieu(ws: ExcelJS.Worksheet) {
  const ds: unknown[][] = [];
  ws.eachRow((row, i) => {
    if (i > 4) ds.push((row.values as unknown[]).slice(1));
  });
  return ds;
}

async function moBaoCao(page: Page, username: string) {
  await dangNhap(page, username);
  await page.goto("/bao-cao");
}

test.beforeAll(async () => {
  await resetDb();
  // Khoa thứ hai không có hiệu phó (dựng bằng SQL, mục 14 không có giao diện quản lý khoa).
  const [mau] = await sql<{ passwordHash: string }>(`SELECT "passwordHash" FROM "User" LIMIT 1`);
  const k2 = randomUUID();
  const b2 = randomUUID();
  await sql(`INSERT INTO "Khoa" (id, ten) VALUES ($1, 'Khoa Kinh tế')`, [k2]);
  await sql(`INSERT INTO "BoMon" (id, ten, "khoaId") VALUES ($1, 'Bộ môn Kế toán', $2)`, [b2, k2]);
  for (const [username, hoTen, role, cot, gt] of [
    ["tk.lethihai", "Lê Thị Hai", "TK", "khoaId", k2],
    ["tbm.vuvanba", "Vũ Văn Ba", "TBM", "boMonId", b2],
    ["gv.dinhthimuoi", "Đinh Thị Mười", "GV", "boMonId", b2],
  ]) {
    await sql(`INSERT INTO "User" (id, username, "hoTen", role, "passwordHash", "${cot}") VALUES ($1,$2,$3,$4,$5,$6)`, [
      randomUUID(),
      username,
      hoTen,
      role,
      mau.passwordHash,
      gt,
    ]);
  }
});

test("chuẩn bị: GV Bình 3 task (1 đã chốt, 1 chờ chốt, 1 đã duyệt); TBM, TK, HP được duyệt danh sách", async ({ page }) => {
  test.setTimeout(180_000);
  const kyId = await idKy();
  await dangKyVaGui(page, "gv.tranthibinh", "GV", 1, /^Gửi lên trưởng bộ môn$/);
  await duyetDangKy(page, "tbm.phamthibich", "gv.tranthibinh");
  const [a, b, c] = await taskCua("gv.tranthibinh", "BAT_BUOC");
  await lamChuoi(page, { lam: "gv.tranthibinh", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [a.id], den: "DA_CHOT", kyId });
  await lamChuoi(page, { lam: "gv.tranthibinh", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [b.id], den: "CHO_CHOT", kyId });
  await lamChuoi(page, { lam: "gv.tranthibinh", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [c.id], den: "DA_DUYET", kyId });
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, b.id);
  await expect(page.getByTestId("nut-thao-tac")).toBeVisible();
  await dangKyVaGui(page, "tbm.phamthibich", "TBM", 1, /^Gửi lên trưởng khoa$/);
  await duyetDangKy(page, "tk.levankhoa", "tbm.phamthibich");
  await dangKyVaGui(page, "tk.levankhoa", "TK", 1, /^Gửi lên hiệu phó$/);
  await duyetDangKy(page, "hp.tranthiphuong", "tk.levankhoa");
  await dangKyVaGui(page, "hp.tranthiphuong", "HP", 1, /^Gửi lên hiệu trưởng$/);
  await duyetDangKy(page, "ht.nguyenvanhieu", "hp.tranthiphuong");
});

test("TBM chỉ xuất được GV bộ môn; TK xuất GV + TBM; HP xuất GV + TBM + TK khoa phụ trách; HT xuất cả 4 vị trí", async ({ page }) => {
  const bang: [string, string[], string[]][] = [
    ["tbm.phamthibich", ["Giáo viên"], ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường"]],
    ["tk.levankhoa", ["Giáo viên", "Trưởng bộ môn"], ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Bích"]],
    [
      "hp.tranthiphuong",
      ["Giáo viên", "Trưởng bộ môn", "Trưởng khoa"],
      ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Bích", "Lê Văn Khoa"],
    ],
    [
      "ht.nguyenvanhieu",
      ["Giáo viên", "Trưởng bộ môn", "Trưởng khoa", "Hiệu phó"],
      ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Đinh Thị Mười", "Phạm Thị Bích", "Vũ Văn Ba", "Lê Văn Khoa", "Lê Thị Hai", "Trần Thị Phương"],
    ],
  ];
  for (const [u, chucVus, nguois] of bang) {
    await moBaoCao(page, u);
    const hop = page.locator("fieldset").filter({ hasText: "Chức vụ" }).getByRole("checkbox");
    await expect(hop, u).toHaveCount(chucVus.length);
    for (const cv of chucVus) await expect(page.getByLabel(cv, { exact: true }), u).toBeChecked();
    const { duongDan } = await taiBaoCao(page, "Xuất Excel", `pham-vi-${u}.xlsx`);
    const ten = dongDuLieu((await docExcel(duongDan)).getWorksheet("Kết quả")!).map((d) => String(d[1]));
    expect(ten.sort(), u).toEqual([...nguois].sort());
  }

  // Chặn ở server: TBM gọi API với chức vụ ngoài phạm vi / người ngoài phạm vi.
  await dangNhap(page, "tbm.phamthibich");
  const kyId = await idKy();
  const r1 = await page.request.get(`/api/bao-cao?kyId=${kyId}&viTri=TK&dinhDang=xlsx`);
  expect(r1.status()).toBe(400);
  const r2 = await page.request.get(`/api/bao-cao?kyId=${kyId}&viTri=GV&nguoiId=${await idNguoi("tk.levankhoa")}&dinhDang=pdf`);
  expect(r2.status()).toBe(403);
  await dangNhap(page, "gv.nguyenvanan");
  expect((await page.request.get(`/api/bao-cao?kyId=${kyId}&viTri=GV&dinhDang=xlsx`)).status()).toBe(403);
});

test("Excel đủ 3 sheet, có cột Chức vụ, Đơn vị; % chỉ đếm task đã chốt", async ({ page }) => {
  await moBaoCao(page, "tk.levankhoa");
  const { duongDan } = await taiBaoCao(page, "Xuất Excel", "tk.xlsx");
  const wb = await docExcel(duongDan);
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Đăng ký nhiệm vụ", "Kết quả", "Chi tiết task"]);
  const cot = (ten: string) => (wb.getWorksheet(ten)!.getRow(4).values as unknown[]).slice(1).map(String);
  expect(cot("Đăng ký nhiệm vụ")).toEqual(expect.arrayContaining(["Chức vụ", "Đơn vị"]));
  expect(cot("Kết quả")).toEqual(expect.arrayContaining(["Chức vụ", "Đơn vị", "% hoàn thành", "Task còn thiếu (kèm lý do)", "Số task đang treo", "Tình trạng"]));
  expect(cot("Chi tiết task")).toEqual(expect.arrayContaining(["Chức vụ", "Được tính (Có/Không)", "Nhận xét của người chốt"]));

  const binh = dongDuLieu(wb.getWorksheet("Kết quả")!).find((d) => d[1] === "Trần Thị Bình")!;
  // 3 task bắt buộc: 1 đã chốt, 1 chờ chốt, 1 đã duyệt → 33,3% (task treo không được tính), 2 task đang treo.
  expect(binh.slice(2, 9)).toEqual([
    "Giáo viên",
    "Bộ môn Khoa học máy tính",
    "33,3%",
    "Không đạt",
    "F",
    expect.stringContaining("Chờ chốt, chưa được chốt kịp"),
    2,
  ]);
  const chiTiet = dongDuLieu(wb.getWorksheet("Chi tiết task")!).filter((d) => d[1] === "Trần Thị Bình");
  expect(chiTiet.map((d) => [d[6], d[7]])).toEqual([
    ["Đã chốt", "Có"],
    ["Chờ chốt", "Không"],
    ["Đã duyệt, chưa gửi lên", "Không"],
  ]);
  const tbm = dongDuLieu(wb.getWorksheet("Đăng ký nhiệm vụ")!).find((d) => d[1] === "Phạm Thị Bích")!;
  expect(tbm.slice(3, 6)).toEqual(["Trưởng bộ môn", "Bộ môn Khoa học máy tính", "Đã duyệt"]);
});

test("PDF đúng khối chữ ký theo người xuất (HP: \"KT. HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG\"), tiếng Việt không lỗi font", async ({ page }) => {
  const bang: [string, string[], string[]][] = [
    ["tbm.phamthibich", ["TRƯỞNG BỘ MÔN"], ["KHOA CÔNG NGHỆ THÔNG TIN", "BỘ MÔN KHOA HỌC MÁY TÍNH"]],
    ["tk.levankhoa", ["TRƯỞNG KHOA"], ["KHOA CÔNG NGHỆ THÔNG TIN"]],
    ["hp.tranthiphuong", ["KT. HIỆU TRƯỞNG", "PHÓ HIỆU TRƯỞNG"], []],
    ["ht.nguyenvanhieu", ["HIỆU TRƯỞNG"], []],
  ];
  for (const [u, chuKy, donVi] of bang) {
    await moBaoCao(page, u);
    const { duongDan } = await taiBaoCao(page, "Xuất PDF", `chu-ky-${u}.pdf`);
    const raw = readFileSync(duongDan).toString("latin1");
    expect(raw, u).toMatch(/\/FontFile2/); // font nhúng
    expect(raw, u).toMatch(/Roboto/);
    const chu = await chuTrongPdf(duongDan);
    for (const s of [
      "TRƯỜNG ĐẠI HỌC HẠ LONG",
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "BÁO CÁO KẾT QUẢ THỰC HIỆN NHIỆM VỤ – KỲ 1 NĂM HỌC 2026-2027",
      "Trần Thị Bình",
      "(Ký, ghi rõ họ tên)",
      ...chuKy,
      ...donVi,
    ]) {
      expect(chu, `${u}: ${s}`).toContain(s);
    }
    expect(chu).toMatch(/Quảng Ninh, ngày \d{2} tháng \d{2} năm \d{4}/);
    if (u === "ht.nguyenvanhieu") expect(chu).not.toContain("PHÓ HIỆU TRƯỞNG");
    if (u !== "tbm.phamthibich") expect(chu).not.toContain("BỘ MÔN KHOA HỌC MÁY TÍNH");
  }
});

test("kỳ chưa chốt: ghi \"TẠM TÍNH\"; sau chốt thì không còn", async ({ page }) => {
  await moBaoCao(page, "tbm.phamthibich");
  await expect(page.getByTestId("tam-tinh")).toBeVisible();
  const x1 = await taiBaoCao(page, "Xuất Excel", "tam-tinh.xlsx");
  expect(x1.tenFile).toMatch(/_TamTinh\.xlsx$/);
  const kq1 = (await docExcel(x1.duongDan)).getWorksheet("Kết quả")!;
  expect(String(kq1.getCell("A1").value)).toContain("(TẠM TÍNH)");
  expect(dongDuLieu(kq1)[0][10]).toBe("Tạm tính");
  const p1 = await taiBaoCao(page, "Xuất PDF", "tam-tinh.pdf");
  expect(p1.tenFile).toMatch(/_TamTinh\.pdf$/);
  expect(await chuTrongPdf(p1.duongDan)).toContain("(TẠM TÍNH)");

  await chotKyNgay(page, 9);

  await moBaoCao(page, "tbm.phamthibich");
  await expect(page.getByTestId("tam-tinh")).toHaveCount(0);
  const x2 = await taiBaoCao(page, "Xuất Excel", "da-chot.xlsx");
  expect(x2.tenFile).not.toContain("TamTinh");
  const kq2 = (await docExcel(x2.duongDan)).getWorksheet("Kết quả")!;
  expect(String(kq2.getCell("A1").value)).not.toContain("TẠM TÍNH");
  expect(dongDuLieu(kq2).every((d) => d[10] === "Đã chốt kỳ")).toBe(true);
  expect(dongDuLieu(kq2).find((d) => d[1] === "Trần Thị Bình")![4]).toBe("33,3%");
  const p2 = await taiBaoCao(page, "Xuất PDF", "da-chot.pdf");
  expect(p2.tenFile).not.toContain("TamTinh");
  expect(await chuTrongPdf(p2.duongDan)).not.toContain("TẠM TÍNH");
});
