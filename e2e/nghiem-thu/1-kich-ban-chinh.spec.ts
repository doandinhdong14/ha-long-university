// Nghiệm thu mục 15 – KỊCH BẢN CHÍNH (6 người), chạy hoàn toàn qua giao diện, cuối cùng admin bấm
// Chốt kỳ ngay và kiểm tra kết quả ở từng tài khoản và trong báo cáo.
// Kèm 3 case phụ cần chốt kỳ: treo đến hết kỳ, không đăng ký → F, task mở rộng đã duyệt chưa chốt.
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

test("đăng ký: 6 người gửi danh sách, đúng người duyệt duyệt (điểm, xếp loại đúng)", async ({ page }) => {
  test.setTimeout(180_000);
  const GUI_TBM = /^Gửi lên trưởng bộ môn$/;
  await dangKyVaGui(page, "gv.nguyenvanan", "GV", 10, GUI_TBM, ["100", "A1"]);
  await dangKyVaGui(page, "gv.tranthibinh", "GV", 3, GUI_TBM, ["39", "C"]);
  await dangKyVaGui(page, "gv.levancuong", "GV", 5, GUI_TBM, ["59", "B"]);
  await dangKyVaGui(page, "gv.ngovantreo", "GV", 1, GUI_TBM, ["15", "F"]);
  await duyetDangKy(page, "tbm.phamthibich", "gv.nguyenvanan", ["100", "A1"]);
  await duyetDangKy(page, "tbm.phamthibich", "gv.tranthibinh", ["39", "C"]);
  await duyetDangKy(page, "tbm.phamthibich", "gv.levancuong", ["59", "B"]);
  await duyetDangKy(page, "tbm.phamthibich", "gv.ngovantreo", ["15", "F"]);

  await dangKyVaGui(page, "tbm.phamthibich", "TBM", 3, /^Gửi lên trưởng khoa$/, ["55", "B"]);
  await duyetDangKy(page, "tk.levankhoa", "tbm.phamthibich", ["55", "B"]);
  await dangKyVaGui(page, "tk.levankhoa", "TK", 4, /^Gửi lên hiệu phó$/, ["80", "A1"]);
  await duyetDangKy(page, "hp.tranthiphuong", "tk.levankhoa", ["80", "A1"]);
  await dangKyVaGui(page, "hp.tranthiphuong", "HP", 3, /^Gửi lên hiệu trưởng$/, ["60", "B"]);
  await duyetDangKy(page, "ht.nguyenvanhieu", "hp.tranthiphuong", ["60", "B"]);

  expect(await taskCua("gv.nguyenvanan", "BAT_BUOC")).toHaveLength(22);
});

test("gv.nguyenvanan: ~50% task bắt buộc TBM duyệt → gửi → TK chốt, còn lại chưa nộp", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("gv.nguyenvanan", "BAT_BUOC")).slice(0, 11).map((t) => t.id);
  await lamChuoi(page, { lam: "gv.nguyenvanan", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids, den: "DA_CHOT", kyId });
});

test("gv.tranthibinh: 100% task bắt buộc TBM duyệt → gửi → TK chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("gv.tranthibinh", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "gv.tranthibinh", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids, den: "DA_CHOT", kyId });
});

test("gv.levancuong: 100% bắt buộc + xin thêm 3 task mở rộng; 2 được chốt, 1 chỉ được duyệt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("gv.levancuong", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "gv.levancuong", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids, den: "DA_CHOT", kyId });

  // Xin thêm 3 task mở rộng của nhiệm vụ 1–3.
  await dangNhap(page, "gv.levancuong");
  await page.goto("/trong-ky");
  for (const ten of ["Số hóa bài giảng lên hệ thống LMS", "Nhóm sinh viên đạt giải cấp trường", "Bài báo thuộc danh mục Scopus/ISI"]) {
    await page.locator(`[data-xin-them="${ten}"]`).getByRole("button", { name: "Xin làm" }).click();
    await expect(page.locator(`[data-xin-them="${ten}"]`)).toContainText("Đang chờ duyệt");
  }
  await dangNhap(page, "tbm.phamthibich");
  await page.goto(`/duyet/${await idNguoi("gv.levancuong")}?kyId=${kyId}&tab=xin-them`);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Duyệt", exact: true }).first().click();
    await page.getByRole("button", { name: "Xác nhận duyệt" }).click();
    await expect(page.getByText("Đã duyệt. Task mở rộng đã được giao.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Duyệt", exact: true })).toHaveCount(2 - i);
  }
  const moRong = await taskCua("gv.levancuong", "MO_RONG");
  expect(moRong).toHaveLength(3);
  await lamChuoi(page, { lam: "gv.levancuong", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: moRong.slice(0, 2).map((t) => t.id), den: "DA_CHOT", kyId });
  await lamChuoi(page, { lam: "gv.levancuong", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [moRong[2].id], den: "DA_DUYET", kyId });
});

test("tbm.phamthibich: TK duyệt danh sách; 100% task TK duyệt → gửi → HP chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("tbm.phamthibich", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "tbm.phamthibich", duyet: "tk.levankhoa", chot: "hp.tranthiphuong", ids, den: "DA_CHOT", kyId });
});

test("tk.levankhoa: HP duyệt danh sách; 100% task HP duyệt → gửi → HT chốt", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("tk.levankhoa", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "tk.levankhoa", duyet: "hp.tranthiphuong", chot: "ht.nguyenvanhieu", ids, den: "DA_CHOT", kyId });
});

test("hp.tranthiphuong: HT duyệt danh sách; 100% task HT duyệt → HT chốt (2 nút)", async ({ page }) => {
  test.setTimeout(600_000);
  const ids = (await taskCua("hp.tranthiphuong", "BAT_BUOC")).map((t) => t.id);
  await lamChuoi(page, { lam: "hp.tranthiphuong", duyet: "ht.nguyenvanhieu", chot: "ht.nguyenvanhieu", ids, den: "DA_CHOT", kyId });
});

test("case phụ chuẩn bị – treo đến hết kỳ: 3 task được duyệt; 1 chưa gửi lên, 1 chờ chốt, 1 bị trả về", async ({ page }) => {
  test.setTimeout(300_000);
  const [a, b, c] = await taskCua("gv.ngovantreo", "BAT_BUOC");
  await lamChuoi(page, { lam: "gv.ngovantreo", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [a.id], den: "DA_DUYET", kyId });
  await lamChuoi(page, { lam: "gv.ngovantreo", duyet: "tbm.phamthibich", chot: "tk.levankhoa", ids: [b.id, c.id], den: "CHO_CHOT", kyId });
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, c.id);
  await bamNut(page, "Trả về", "Minh chứng chưa rõ");
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, await idNguoi("gv.ngovantreo"), kyId, c.id);
  await expect(page.getByTestId("nhan-xet-chot")).toContainText("Minh chứng chưa rõ");
});

test("trước khi chốt kỳ: % chỉ đếm task đã chốt; chưa hiện khối Kết quả", async ({ page }) => {
  const mong: [string, string][] = [
    ["gv.nguyenvanan", "50%"],
    ["gv.tranthibinh", "100%"],
    ["gv.levancuong", "100%"],
    ["gv.ngovantreo", "0%"],
  ];
  for (const [u, pt] of mong) {
    await dangNhap(page, u);
    await page.goto("/trong-ky");
    await expect(page.getByTestId("phan-tram"), u).toHaveText(pt);
    await expect(page.getByTestId("ket-qua")).toHaveCount(0);
  }
  await dangNhap(page, "gv.levancuong");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("task-vuot")).toHaveText("+2 task vượt");
  // Dòng "Đang treo" = soTreo mục 10.3 (bắt buộc + mở rộng): task mở rộng thứ 3 mới chỉ được duyệt.
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 1 task");
  await dangNhap(page, "gv.ngovantreo");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 2 task");
});

test("admin bấm Chốt kỳ ngay", async ({ page }) => {
  await chotKyNgay(page, 8);
});

const KET_QUA: [string, string][] = [
  ["gv.nguyenvanan", "Không đạt – A1"],
  ["gv.tranthibinh", "Đạt – C"],
  ["gv.levancuong", "Vượt chỉ tiêu – B"],
  ["tbm.phamthibich", "Đạt – B"],
  ["tk.levankhoa", "Đạt – A1"],
  ["hp.tranthiphuong", "Đạt – B"],
];

for (const [u, kq] of KET_QUA) {
  test(`kết quả ${u}: ${kq}`, async ({ page }) => {
    await dangNhap(page, u);
    await page.goto("/trong-ky");
    await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText(kq);
    if (u === "gv.nguyenvanan") {
      const thieu = page.getByTestId("task-thieu").locator("li");
      await expect(thieu).toHaveCount(11);
      for (const li of await thieu.all()) await expect(li.locator("[data-ly-do]")).toHaveText("(Chưa nộp minh chứng)");
    }
    if (u === "gv.levancuong") {
      await expect(page.getByTestId("task-vuot-list").locator("li")).toHaveText([
        /Số hóa bài giảng lên hệ thống LMS/,
        /Nhóm sinh viên đạt giải cấp trường/,
      ]);
    }
  });
}

test("case phụ: treo đến hết kỳ → Không đạt, lý do treo / trả về", async ({ page }) => {
  await dangNhap(page, "gv.ngovantreo");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Không đạt – F");
  await expect(page.getByTestId("task-thieu").locator("[data-ly-do]")).toHaveText([
    "(Đã duyệt nhưng chưa gửi lên / chưa được chốt)",
    "(Chờ chốt, chưa được chốt kịp)",
    "(Bị cấp chốt trả về, chưa xử lý xong)",
  ]);
});

test("case phụ: không đăng ký → Không đạt – F, ghi chú \"Chưa có danh sách nhiệm vụ được duyệt\"", async ({ page }) => {
  await dangNhap(page, "gv.dovanvang");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("ket-qua-tieu-de")).toHaveText("Không đạt – F");
  await expect(page.getByTestId("ket-qua-ghi-chu")).toHaveText("Chưa có danh sách nhiệm vụ được duyệt");
});

test("case phụ: task mở rộng đã duyệt nhưng chưa chốt → không tính là vượt", async ({ page }) => {
  await dangNhap(page, "gv.levancuong");
  await page.goto("/trong-ky");
  await expect(page.getByTestId("task-vuot-list")).not.toContainText("Bài báo thuộc danh mục Scopus/ISI");
  await expect(page.locator('[data-task="Bài báo thuộc danh mục Scopus/ISI"]')).toContainText("Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt");
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
  const mong: [string, string, string, string][] = [
    ["Nguyễn Văn An", "50%", "Không đạt", "A1"],
    ["Trần Thị Bình", "100%", "Đạt", "C"],
    ["Lê Văn Cường", "100%", "Vượt chỉ tiêu", "B"],
    ["Phạm Thị Bích", "100%", "Đạt", "B"],
    ["Lê Văn Khoa", "100%", "Đạt", "A1"],
    ["Trần Thị Phương", "100%", "Đạt", "B"],
  ];
  for (const [ten, pt, ketQua, xepLoai] of mong) {
    const d = kq.get(ten)!;
    expect(d, ten).toBeTruthy();
    expect(d.slice(4, 7), ten).toEqual([pt, ketQua, xepLoai]);
    expect(d[10], ten).toBe("Đã chốt kỳ");
  }
  expect(kq.get("Lê Văn Cường")![9]).toContain("Nhóm sinh viên đạt giải cấp trường");
});
