// Nghiệm thu v1.6 – KỊCH BẢN CHÍNH mục 12.1 (thay kịch bản mục 15 của v1.4), chạy hoàn toàn qua giao diện, cuối
// cùng admin bấm Chốt kỳ ngay và kiểm tra kết quả ở từng tài khoản và trong báo cáo.
// Mọi người đăng ký đủ nhiệm vụ của vị trí (100 điểm) → A1. Kèm 2 case phụ cần chốt kỳ: treo đến hết kỳ, không đăng ký.
import ExcelJS from "exceljs";
import { test, expect } from "@playwright/test";
import { resetDb } from "../helpers";
import {
  bamNut,
  chotKyNgay,
  dangKyVaGui,
  dangNhap,
  duyetDangKy,
  idKy,
  idNguoi,
  lamChuoi,
  moTaskChot,
  moTaskDuyet,
  nop,
  taiBaoCao,
  taskCua,
} from "./tien-ich";

test.describe.configure({ mode: "serial" });
let kyId: string;

test.beforeAll(async () => {
  await resetDb();
  kyId = await idKy();
});

test("chuẩn bị: kỳ đã công bố; admin tạo 2 GV cho case phụ (treo đến hết kỳ, không đăng ký)", async ({ page }) => {
  await dangNhap(page, "admin.quantri");
  await page.goto("/admin/phan-viec");
  await expect(page.locator('tr[data-ky="Kỳ 1 – 2026-2027"]')).toContainText("Đã công bố");
  for (const [hoTen, username] of [
    ["Ngô Văn Treo", "gv.ngovantreo"],
    ["Đỗ Văn Vắng", "gv.dovanvang"],
  ]) {
    await page.goto("/admin/tai-khoan");
    await page.getByRole("button", { name: "Thêm tài khoản" }).click();
    await page.getByLabel("Họ tên").fill(hoTen);
    await expect(page.getByTestId("xem-truoc-username")).toHaveText(username);
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText(`Đã tạo tài khoản ${username} (mật khẩu 123456).`)).toBeVisible();
  }
});

test("đăng ký: 6 người gửi đủ nhiệm vụ (100 điểm → A1), chọn cải tiến theo mục 12.1; đúng người duyệt duyệt", async ({ page }) => {
  test.setTimeout(240_000);
  const A1: [string, string] = ["100", "A1"];
  const GUI_TBM = /^Gửi lên trưởng bộ môn$/;
  // [người, số nhiệm vụ, nút gửi, cải tiến, người duyệt]
  const BANG: [string, number, RegExp, boolean, string][] = [
    ["gv.nguyenvanan", 10, GUI_TBM, false, "tbm.phamthibich"],
    ["gv.tranthibinh", 10, GUI_TBM, false, "tbm.phamthibich"],
    ["gv.levancuong", 10, GUI_TBM, true, "tbm.phamthibich"],
    ["gv.ngovantreo", 10, GUI_TBM, true, "tbm.phamthibich"],
    ["tbm.phamthibich", 6, /^Gửi lên trưởng khoa$/, true, "tk.levankhoa"],
    ["tk.levankhoa", 5, /^Gửi lên hiệu phó$/, true, "hp.tranthiphuong"],
    ["hp.tranthiphuong", 5, /^Gửi lên hiệu trưởng$/, false, "ht.nguyenvanhieu"],
  ];
  for (const [lam, soNhiemVu, nut, caiTien] of BANG) await dangKyVaGui(page, lam, nut, { soNhiemVu, diem: A1, caiTien });
  for (const [lam, , , caiTien, duyet] of BANG) await duyetDangKy(page, duyet, lam, A1, caiTien);

  expect(await taskCua("gv.nguyenvanan", "BAT_BUOC")).toHaveLength(22);
  expect(await taskCua("gv.nguyenvanan", "CAI_TIEN")).toHaveLength(0);
  expect(await taskCua("gv.levancuong", "CAI_TIEN")).toHaveLength(1);
});

test("gv.nguyenvanan: ~50% task bắt buộc TBM duyệt → TK chốt, còn lại chưa nộp", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("gv.nguyenvanan", "BAT_BUOC")).slice(0, 11).map((t) => t.id);
  await lamChuoi(page, { lam: "gv.nguyenvanan", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids, den: "DA_CHOT", kyId });
});

test("gv.tranthibinh: 100% task bắt buộc TBM duyệt → TK chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("gv.tranthibinh", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "gv.tranthibinh", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids, den: "DA_CHOT", kyId });
});

test("gv.levancuong: 100% bắt buộc + cải tiến được chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("gv.levancuong")).map((t) => t.id);
  expect(ids).toHaveLength(23);
  await lamChuoi(page, { lam: "gv.levancuong", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids, den: "DA_CHOT", kyId });
});

test("tbm.phamthibich: 100% bắt buộc (TK duyệt → HP chốt) + cải tiến được chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("tbm.phamthibich")).map((t) => t.id);
  await lamChuoi(page, { lam: "tbm.phamthibich", duyet: "tk.levankhoa", chot: "hp.tranthiphuong", ids, den: "DA_CHOT", kyId });
});

test("tk.levankhoa: 100% bắt buộc (HP duyệt → HT chốt), cải tiến đã nộp chưa chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("tk.levankhoa", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "tk.levankhoa", duyet: "hp.tranthiphuong", chot: "ht.nguyenvanhieu", ids, den: "DA_CHOT", kyId });
  const [ct] = await taskCua("tk.levankhoa", "CAI_TIEN");
  await dangNhap(page, "tk.levankhoa");
  await page.goto(`/trong-ky/task/${ct.id}`);
  await expect(page.getByTestId("goi-y-nop")).toHaveText("Nộp Phụ lục IV đã điền và file sản phẩm.");
  await nop(page, ct.id);
});

test("hp.tranthiphuong: 100% bắt buộc (HT duyệt → HT chốt, 2 nút)", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("hp.tranthiphuong", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "hp.tranthiphuong", duyet: "ht.nguyenvanhieu", chot: "ht.nguyenvanhieu", ids, den: "DA_CHOT", kyId });
});

test("case phụ chuẩn bị – treo đến hết kỳ: 2 task chờ chốt (1 bị trả về), 1 chờ duyệt; cải tiến chưa nộp", async ({ page }) => {
  test.setTimeout(300_000);
  const [a, b, c] = await taskCua("gv.ngovantreo", "BAT_BUOC");
  await lamChuoi(page, { lam: "gv.ngovantreo", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [a.id, b.id], den: "CHO_CHOT", kyId });
  await dangNhap(page, "gv.ngovantreo");
  await nop(page, c.id);
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, b.id);
  await bamNut(page, "Trả về", "Minh chứng chưa rõ");
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, await idNguoi("gv.ngovantreo"), kyId, b.id);
  await expect(page.getByTestId("nhan-xet-chot")).toContainText("Minh chứng chưa rõ");
});

test("trước khi chốt kỳ: 2 biểu đồ – cấp trên chỉ đếm task đã chốt, tự đánh giá đếm task đã nộp; chưa hiện Kết quả", async ({ page }) => {
  // [người, cấp trên, tự đánh giá, dòng tách cấp trên]
  const mong: [string, string, string, string][] = [
    ["gv.nguyenvanan", "50%", "50%", "Bắt buộc 50%"],
    ["gv.tranthibinh", "100%", "100%", "Bắt buộc 100%"],
    ["gv.levancuong", "110%", "110%", "Bắt buộc 100% · Cải tiến +10%"],
    ["tbm.phamthibich", "110%", "110%", "Bắt buộc 100% · Cải tiến +10%"],
    ["tk.levankhoa", "100%", "110%", "Bắt buộc 100% · Cải tiến: chưa chốt"],
    ["hp.tranthiphuong", "100%", "100%", "Bắt buộc 100%"],
    ["gv.ngovantreo", "0%", "14%", "Bắt buộc 0% · Cải tiến: chưa chốt"],
  ];
  for (const [u, capTren, tuDanhGia, dongTach] of mong) {
    await dangNhap(page, u);
    await page.goto("/trong-ky");
    await expect(page.getByTestId("phan-tram"), u).toHaveText(capTren);
    await expect(page.getByTestId("tu-danh-gia"), u).toHaveText(tuDanhGia);
    await expect(page.getByTestId("dong-tach-cap-tren"), u).toHaveText(dongTach);
    await expect(page.getByTestId("ket-qua")).toHaveCount(0);
  }
  await dangNhap(page, "gv.ngovantreo");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 1 task");
});

test("admin bấm Chốt kỳ ngay", async ({ page }) => {
  await chotKyNgay(page, 8);
});

const KET_QUA: [string, string][] = [
  ["gv.nguyenvanan", "Không đạt – A1"],
  ["gv.tranthibinh", "Đạt – A1"],
  ["gv.levancuong", "Vượt chỉ tiêu – A1 (110%)"],
  ["tbm.phamthibich", "Vượt chỉ tiêu – A1 (110%)"],
  ["tk.levankhoa", "Đạt – A1"],
  ["hp.tranthiphuong", "Đạt – A1"],
];

for (const [u, kq] of KET_QUA) {
  test(`kết quả ${u}: ${kq}`, async ({ page }) => {
    await dangNhap(page, u);
    await page.goto("/cuoi-ky");
    await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText(kq);
    if (u === "gv.nguyenvanan") {
      const thieu = page.getByTestId("task-thieu").locator("li");
      await expect(thieu).toHaveCount(11);
      for (const li of await thieu.all()) await expect(li.locator("[data-ly-do]")).toHaveText("(Chưa nộp minh chứng)");
    }
    if (kq.startsWith("Vượt")) await expect(page.getByTestId("cai-tien-da-chot")).toHaveText("Cải tiến sáng tạo đã được chốt");
    if (u === "tk.levankhoa") {
      await expect(page.getByTestId("ket-qua-ghi-chu")).toHaveText(
        "Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – Chờ duyệt, chưa được duyệt kịp",
      );
      await expect(page.getByTestId("ket-qua-tu-danh-gia")).toHaveText("110%");
    }
  });
}

test("case phụ: treo đến hết kỳ → Không đạt, lý do theo mục 6.2; cải tiến không nằm trong task thiếu", async ({ page }) => {
  await dangNhap(page, "gv.ngovantreo");
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Không đạt – A1");
  const lyDo = page.getByTestId("task-thieu").locator("[data-ly-do]");
  await expect(lyDo).toHaveCount(22);
  await expect(lyDo.nth(0)).toHaveText("(Chờ chốt, chưa được chốt kịp)");
  await expect(lyDo.nth(1)).toHaveText("(Bị cấp chốt trả về, chưa xử lý xong)");
  await expect(lyDo.nth(2)).toHaveText("(Chờ duyệt, chưa được duyệt kịp)");
  await expect(page.getByTestId("task-thieu")).not.toContainText("Sản phẩm cải tiến sáng tạo");
  await expect(page.getByTestId("ket-qua-ghi-chu")).toHaveText("Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – Chưa nộp minh chứng");
});

test("case phụ: không đăng ký → Không đạt – F, ghi chú \"Chưa có danh sách nhiệm vụ được duyệt\"", async ({ page }) => {
  await dangNhap(page, "gv.dovanvang");
  await page.goto("/cuoi-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Không đạt – F");
  await expect(page.getByTestId("ket-qua-ghi-chu")).toHaveText("Chưa có danh sách nhiệm vụ được duyệt");
});

test("kết quả trong báo cáo: HT xuất Excel toàn trường sau khi chốt kỳ", async ({ page }) => {
  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/bao-cao");
  const { duongDan, tenFile } = await taiBaoCao(page, "Xuất Excel", "kich-ban-chinh.xlsx");
  expect(tenFile).not.toContain("TamTinh");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(duongDan);
  const kq = new Map<string, unknown[]>();
  wb.getWorksheet("Kết quả")!.eachRow((row, i) => {
    if (i > 4) kq.set(String(row.getCell(2).value), (row.values as unknown[]).slice(1));
  });
  // [họ tên, đánh giá cấp trên %, % bắt buộc, tự đánh giá %, kết quả, xếp loại, cải tiến]
  const mong: [string, string, string, string, string, string, string][] = [
    ["Nguyễn Văn An", "50%", "50%", "50%", "Không đạt", "A1", "Không đăng ký"],
    ["Trần Thị Bình", "100%", "100%", "100%", "Đạt", "A1", "Không đăng ký"],
    ["Lê Văn Cường", "110%", "100%", "110%", "Vượt chỉ tiêu", "A1", "Đã chốt"],
    ["Phạm Thị Bích", "110%", "100%", "110%", "Vượt chỉ tiêu", "A1", "Đã chốt"],
    ["Lê Văn Khoa", "100%", "100%", "110%", "Đạt", "A1", "Chưa chốt"],
    ["Trần Thị Phương", "100%", "100%", "100%", "Đạt", "A1", "Không đăng ký"],
  ];
  for (const [ten, capTren, batBuoc, tuDanhGia, ketQua, xepLoai, caiTien] of mong) {
    const d = kq.get(ten)!;
    expect(d, ten).toBeTruthy();
    expect(d.slice(4, 7), ten).toEqual([capTren, batBuoc, tuDanhGia]);
    expect(String(d[7]).startsWith(ketQua), ten).toBe(true);
    expect(d[8], ten).toBe(xepLoai);
    expect(d[11], ten).toBe(caiTien);
    expect(d[12], ten).toBe("Đã chốt kỳ");
  }
});
