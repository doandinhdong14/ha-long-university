// Nghiệm thu – CASE PHỤ: DUYỆT VÀ CHỐT (mục 15 v1.4, sửa theo spec-v1.6 mục 7, 12.4: không còn bước Gửi lên).
// (Case "treo đến hết kỳ" cần chốt kỳ nên nằm ở 1-kich-ban-chinh; 4 chuỗi mục 7.3 ở e2e/v16-03-duyet-len-cho-chot.)
import { randomUUID } from "node:crypto";
import { test, expect, type Browser, type Page } from "@playwright/test";
import { resetDb } from "../helpers";
import {
  bamNut,
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
  thongBaoCuaToi,
  trangThaiTask,
  type TaskCuaNguoi,
} from "./tien-ich";

test.describe.configure({ mode: "serial" });
let kyId: string;
let binhId: string;
let T: TaskCuaNguoi[] = [];
let H: TaskCuaNguoi[] = [];

async function trangMoi(browser: Browser, username: string): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  const p = await ctx.newPage();
  await dangNhap(p, username);
  return p;
}

async function xemCuoiKy(page: Page, username: string) {
  await dangNhap(page, username);
  await page.goto("/trong-ky");
}

async function taskTrongChot(page: Page, ten: string) {
  await dangNhap(page, "tk.levankhoa");
  await page.goto("/chot?loc=tat-ca");
  return page.locator(`tr[data-task="${ten}"]`).count();
}

test.beforeAll(async () => {
  await resetDb();
  kyId = await idKy();
  binhId = await idNguoi("gv.tranthibinh");
  // Khoa thứ hai (không có giao diện quản lý khoa, mục 14 → dựng bằng SQL) để kiểm tra lọc theo đơn vị.
  const [mau] = await sql<{ passwordHash: string }>(`SELECT "passwordHash" FROM "User" LIMIT 1`);
  const khoa2 = randomUUID();
  const bm2 = randomUUID();
  await sql(`INSERT INTO "Khoa" (id, ten) VALUES ($1, 'Khoa Kinh tế')`, [khoa2]);
  await sql(`INSERT INTO "BoMon" (id, ten, "khoaId") VALUES ($1, 'Bộ môn Kế toán', $2)`, [bm2, khoa2]);
  await sql(`INSERT INTO "User" (id, username, "hoTen", role, "passwordHash", "khoaId") VALUES ($1, 'tk.lethihai', 'Lê Thị Hai', 'TK', $2, $3)`, [
    randomUUID(),
    mau.passwordHash,
    khoa2,
  ]);
  await sql(`INSERT INTO "User" (id, username, "hoTen", role, "passwordHash", "boMonId") VALUES ($1, 'tbm.vuvanba', 'Vũ Văn Ba', 'TBM', $2, $3)`, [
    randomUUID(),
    mau.passwordHash,
    bm2,
  ]);
});

test("mỗi vị trí chỉ thấy nhiệm vụ của vị trí mình", async ({ page }) => {
  const bang: [string, string, number, string][] = [
    ["gv.nguyenvanan", "GV", 10, "Quản lý đào tạo của khoa"],
    ["tbm.phamthibich", "TBM", 6, "Biên soạn bài giảng"],
    ["tk.levankhoa", "TK", 5, "Phân công và giám sát giảng dạy"],
    ["hp.tranthiphuong", "HP", 5, "Quản lý đào tạo của khoa"],
  ];
  for (const [u, viTri, so, khongThay] of bang) {
    await dangNhap(page, u);
    await page.goto("/dau-ky");
    await expect(page.locator("[data-nhiem-vu]"), u).toHaveCount(so);
    for (const ten of await tenNhiemVu(viTri, so)) await expect(page.locator(`[data-nhiem-vu="${ten}"]`), u).toHaveCount(1);
    await expect(page.locator(`[data-nhiem-vu="${khongThay}"]`), u).toHaveCount(0);
  }
});

test("chuẩn bị: GV Trần Thị Bình (10 nhiệm vụ, 22 task) và HP (5 nhiệm vụ, 10 task) được duyệt danh sách", async ({ page }) => {
  await dangKyVaGui(page, "gv.tranthibinh", /^Gửi lên trưởng bộ môn$/, { soNhiemVu: 10, diem: ["100", "A1"] });
  await duyetDangKy(page, "tbm.phamthibich", "gv.tranthibinh");
  await dangKyVaGui(page, "hp.tranthiphuong", /^Gửi lên hiệu trưởng$/, { soNhiemVu: 5, diem: ["100", "A1"] });
  await duyetDangKy(page, "ht.nguyenvanhieu", "hp.tranthiphuong");
  T = await taskCua("gv.tranthibinh", "BAT_BUOC");
  H = await taskCua("hp.tranthiphuong", "BAT_BUOC");
  expect(T).toHaveLength(22);
  expect(H).toHaveLength(10);
});

test("người duyệt duyệt 1 task → người làm KPI thấy \"… đã duyệt – chờ … chốt\", % không tăng, \"Đang treo\" tăng", async ({ page }) => {
  await dangNhap(page, "gv.tranthibinh");
  await nop(page, T[0].id);
  await xemCuoiKy(page, "gv.tranthibinh");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 0 task");

  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[0].id);
  await bamNut(page, "Duyệt");

  await xemCuoiKy(page, "gv.tranthibinh");
  await expect(page.locator(`[data-task="${T[0].ten}"]`)).toContainText("Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 1 task");
  await expect(page.getByTestId("bieu-do-cap-tren").locator('[data-phan="dangTreo"]')).toContainText("1");
});

test("người chốt chốt (task lên Chờ chốt ngay khi duyệt) → \"Đã chốt – hoàn thành\", % tăng", async ({ page }) => {
  expect(await trangThaiTask(T[0].id)).toBe("CHO_CHOT");
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, T[0].id);
  await bamNut(page, "Chốt");

  await xemCuoiKy(page, "gv.tranthibinh");
  await expect(page.locator(`[data-task="${T[0].ten}"]`)).toContainText("Đã chốt – hoàn thành");
  await expect(page.getByTestId("phan-tram")).toHaveText("5%"); // 1/22
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 0 task");
});

test("hủy duyệt khi người chốt chưa chốt → về Chờ duyệt, biến mất khỏi Chờ chốt; đã chốt thì bị chặn (cả ở server)", async ({ page, browser }) => {
  await dangNhap(page, "gv.tranthibinh");
  await nop(page, T[1].id);
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[1].id);
  await bamNut(page, "Duyệt");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt"]);
  expect(await taskTrongChot(page, T[1].ten)).toBe(1);

  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[1].id);
  await bamNut(page, "Hủy duyệt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Chờ duyệt");
  expect(await trangThaiTask(T[1].id)).toBe("CHO_DUYET");
  expect(await taskTrongChot(page, T[1].ten)).toBe(0);
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[1].id);
  await bamNut(page, "Duyệt");
  expect(await trangThaiTask(T[1].id)).toBe("CHO_CHOT");

  // Trang cũ vẫn còn nút Hủy duyệt; ở tab khác người chốt chốt trước → bấm Hủy duyệt ở trang cũ bị server chặn.
  await dangNhap(page, "gv.tranthibinh");
  await nop(page, T[6].id);
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[6].id);
  await bamNut(page, "Duyệt");
  const tab2 = await trangMoi(browser, "tk.levankhoa");
  await moTaskChot(tab2, kyId, T[6].id);
  await bamNut(tab2, "Chốt");
  await tab2.context().close();

  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Hủy duyệt" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByText("Task đã chốt, không ai sửa được.")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await trangThaiTask(T[6].id)).toBe("DA_CHOT");
  await page.reload();
  await expect(page.getByTestId("nut-thao-tac")).toHaveCount(0);
});

test("người chốt không thấy task chưa được duyệt, không mở được file minh chứng của task đó, không thấy danh sách đăng ký", async ({ page }) => {
  await dangNhap(page, "gv.tranthibinh");
  await nop(page, T[2].id);
  const [f] = await sql<{ id: string }>(
    `SELECT f.id FROM "FileDinhKem" f JOIN "BaiNop" b ON b.id = f."baiNopId" WHERE b."kpiTaskId" = $1`,
    [T[2].id],
  );

  await dangNhap(page, "tk.levankhoa");
  await page.goto("/chot?loc=tat-ca");
  await expect(page.locator(`tr[data-task="${T[1].ten}"]`)).toHaveCount(1);
  await expect(page.locator(`tr[data-task="${T[2].ten}"]`)).toHaveCount(0);
  await page.goto(`/chot?kyId=${kyId}&loc=tat-ca&task=${T[2].id}`);
  await expect(page.getByTestId("chi-tiet-task")).toHaveCount(0);
  expect((await page.request.get(`/api/files/${f.id}`)).status()).toBe(403);
  // Danh sách đăng ký của GV chỉ lên người duyệt: TK mở trang Duyệt của GV → 404.
  expect((await page.goto(`/duyet/${binhId}?kyId=${kyId}&tab=dang-ky`))?.status()).toBe(404);
  await page.goto("/chot");
  await expect(page.locator("main")).not.toContainText("Đăng ký nhiệm vụ");

  // Người duyệt bấm Duyệt là task lên Chờ chốt → người chốt mở được file ngay.
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[2].id);
  await bamNut(page, "Duyệt");
  await dangNhap(page, "tk.levankhoa");
  expect((await page.request.get(`/api/files/${f.id}`)).status()).toBe(200);
});

test("người chốt trả về → người duyệt thấy nhận xét; người làm KPI chỉ thấy trạng thái", async ({ page }) => {
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, T[1].id);
  await page.getByTestId("nut-thao-tac").getByRole("button", { name: "Trả về" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Xác nhận" })).toBeDisabled();
  await page.getByRole("dialog").getByRole("textbox").fill("Thiếu trang bìa có chữ ký");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[1].id);
  await expect(page.getByTestId("nhan-xet-chot")).toContainText("Thiếu trang bìa có chữ ký");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Trả giáo viên làm lại", "Duyệt lại"]);

  await dangNhap(page, "gv.tranthibinh");
  await page.goto("/trong-ky");
  await expect(page.locator(`[data-task="${T[1].ten}"]`)).toContainText("Trưởng khoa trả về – chờ trưởng bộ môn xử lý");
  await page.goto(`/trong-ky/task/${T[1].id}`);
  await expect(page.locator("main")).not.toContainText("Thiếu trang bìa có chữ ký");
});

test("người duyệt trả làm lại → nộp lại → duyệt (lên Chờ chốt) → chốt → hoàn thành", async ({ page }) => {
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[1].id);
  await bamNut(page, "Trả giáo viên làm lại", "Bổ sung trang bìa rồi nộp lại");

  await dangNhap(page, "gv.tranthibinh");
  await page.goto(`/trong-ky/task/${T[1].id}`);
  await expect(page.getByTestId("lich-su-nop")).toContainText("Bổ sung trang bìa rồi nộp lại");
  await nop(page, T[1].id);
  await expect(page.locator("[data-lan-nop]")).toHaveCount(2);

  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[1].id);
  await bamNut(page, "Duyệt");
  await dangNhap(page, "tk.levankhoa");
  await moTaskChot(page, kyId, T[1].id);
  await bamNut(page, "Chốt");

  await xemCuoiKy(page, "gv.tranthibinh");
  await expect(page.locator(`[data-task="${T[1].ten}"]`)).toContainText("Đã chốt – hoàn thành");
  await expect(page.getByTestId("phan-tram")).toHaveText("14%"); // T0, T6, T1 đã chốt: 3/22
});

test("HT với HP: bấm Duyệt xong task vẫn treo, bấm Chốt mới tính; HT hủy duyệt được trước khi chốt", async ({ page }) => {
  const hpId = await idNguoi("hp.tranthiphuong");
  await dangNhap(page, "hp.tranthiphuong");
  await nop(page, H[0].id);
  await dangNhap(page, "ht.nguyenvanhieu");
  await moTaskDuyet(page, hpId, kyId, H[0].id);
  await bamNut(page, "Duyệt");
  await expect(page.getByTestId("nut-thao-tac").getByRole("button")).toHaveText(["Hủy duyệt", "Chốt"]);

  await xemCuoiKy(page, "hp.tranthiphuong");
  await expect(page.locator(`[data-task="${H[0].ten}"]`)).toContainText("Hiệu trưởng đã duyệt – chờ chốt");
  await expect(page.getByTestId("phan-tram")).toHaveText("0%");
  await expect(page.getByTestId("dang-treo")).toContainText("Đang treo: 1 task");

  await dangNhap(page, "ht.nguyenvanhieu");
  await moTaskDuyet(page, hpId, kyId, H[0].id);
  await bamNut(page, "Hủy duyệt");
  expect(await trangThaiTask(H[0].id)).toBe("CHO_DUYET");
  await bamNut(page, "Duyệt");
  await bamNut(page, "Chốt");
  await expect(page.getByTestId("chi-tiet-task")).toContainText("Đã chốt");

  await xemCuoiKy(page, "hp.tranthiphuong");
  await expect(page.locator(`[data-task="${H[0].ten}"]`)).toContainText("Đã chốt – hoàn thành");
  await expect(page.getByTestId("phan-tram")).toHaveText("10%"); // 1/10
});

test("HP chỉ thấy TK/TBM của khoa mình phụ trách; HT không thấy task GV/TBM ở Chốt (chỉ xem task đã chốt ở Theo dõi)", async ({ page }) => {
  await dangNhap(page, "hp.tranthiphuong");
  await page.goto("/duyet");
  await expect(page.locator("tr[data-nguoi]")).toHaveCount(1);
  await expect(page.locator('tr[data-nguoi="tk.levankhoa"]')).toHaveCount(1);
  await page.goto("/chot");
  await page.getByLabel("Lọc theo người").click();
  await expect(page.getByRole("option")).toHaveText(["Tất cả mọi người", "Phạm Thị Bích (tbm.phamthibich)"]);
  await page.keyboard.press("Escape");
  expect((await page.goto(`/duyet/${await idNguoi("tk.lethihai")}`))?.status()).toBe(404);

  await dangNhap(page, "ht.nguyenvanhieu");
  await page.goto("/duyet");
  await expect(page.locator("tr[data-nguoi]")).toHaveCount(1); // chỉ hiệu phó
  await page.goto("/chot");
  await page.getByLabel("Lọc theo người").click();
  await expect(page.getByRole("option")).toHaveText(["Tất cả mọi người", "Lê Thị Hai (tk.lethihai)", "Lê Văn Khoa (tk.levankhoa)"]);
  await page.keyboard.press("Escape");
  await page.goto("/chot?loc=tat-ca");
  await expect(page.locator(`tr[data-task="${T[0].ten}"]`)).toHaveCount(0);
  const file = async (kpiTaskId: string) =>
    (await sql<{ id: string }>(`SELECT f.id FROM "FileDinhKem" f JOIN "BaiNop" b ON b.id = f."baiNopId" WHERE b."kpiTaskId" = $1 LIMIT 1`, [kpiTaskId]))[0].id;
  // v1.6 (mục 8.4): HT xem được minh chứng của task GV ĐÃ CHỐT (mục Theo dõi); task chưa chốt vẫn bị chặn.
  expect((await page.request.get(`/api/files/${await file(T[0].id)}`)).status()).toBe(200);
  expect((await page.request.get(`/api/files/${await file(T[2].id)}`)).status()).toBe(403);
  expect((await page.goto(`/duyet/${binhId}`))?.status()).toBe(404);
});

test("nhắc việc trước deadline đến đúng người: người chốt \"Còn N task chờ chốt\"; không còn \"chưa gửi lên\"", async ({ page }) => {
  // T[2] đang Chờ chốt; thêm T[3] được duyệt (lên Chờ chốt ngay).
  await dangNhap(page, "gv.tranthibinh");
  await nop(page, T[3].id);
  await dangNhap(page, "tbm.phamthibich");
  await moTaskDuyet(page, binhId, kyId, T[3].id);
  await bamNut(page, "Duyệt");

  await suaNgayKy(page, ngayVN(-1), ngayVN(5)); // còn 5 ngày đến deadline
  const res = await page.request.post("/api/cron/chot-ky", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(res.status()).toBe(200);
  expect((await res.json()).daChot).toEqual([]);

  await dangNhap(page, "tbm.phamthibich");
  expect((await thongBaoCuaToi(page)).join("\n")).not.toMatch(/chưa gửi lên/);
  await dangNhap(page, "tk.levankhoa");
  const tk = (await thongBaoCuaToi(page)).join("\n");
  expect(tk).toMatch(/Còn 5 ngày đến deadline .*Còn 2 task chờ chốt\./);
  expect(tk).not.toMatch(/chưa gửi lên/);
  await dangNhap(page, "gv.tranthibinh");
  expect((await thongBaoCuaToi(page)).join("\n")).toMatch(/Bạn còn 19 task bắt buộc chưa được chốt\./);
  // Người không liên quan không nhận nhắc duyệt/chốt.
  await dangNhap(page, "hp.tranthiphuong");
  expect((await thongBaoCuaToi(page)).join("\n")).not.toMatch(/task chờ chốt|chưa gửi lên/);
});

test("sau deadline: không ai nộp, duyệt, hủy duyệt, chốt, trả về được (chặn ở server)", async ({ page, browser }) => {
  // Mở sẵn các trang khi còn hạn (còn nút), rồi admin cho kỳ hết deadline, rồi mới bấm.
  await dangNhap(page, "gv.tranthibinh");
  await nop(page, T[4].id); // T[4] Chờ duyệt để thử duyệt; T[5] Chưa làm để thử nộp
  const gv = await trangMoi(browser, "gv.tranthibinh");
  await gv.goto(`/trong-ky/task/${T[5].id}`);
  const tbmDuyet = await trangMoi(browser, "tbm.phamthibich");
  await moTaskDuyet(tbmDuyet, binhId, kyId, T[4].id);
  const tbmHuy = await trangMoi(browser, "tbm.phamthibich");
  await moTaskDuyet(tbmHuy, binhId, kyId, T[3].id);
  const tk = await trangMoi(browser, "tk.levankhoa");
  await moTaskChot(tk, kyId, T[2].id);

  await suaNgayKy(page, ngayVN(-10), ngayVN(-1));
  const LOI = "Đã hết deadline của kỳ, mọi thao tác đã bị khóa.";

  await gv.getByLabel("File minh chứng").setInputFiles({ name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await gv.getByRole("button", { name: "Gửi minh chứng" }).click();
  await expect(gv.locator("main").getByRole("alert")).toHaveText(LOI);

  const thu = async (p: Page, nut: string, nhanXet?: string) => {
    await p.getByTestId("nut-thao-tac").getByRole("button", { name: nut, exact: true }).click();
    if (nhanXet) await p.getByRole("dialog").getByRole("textbox").fill(nhanXet);
    await p.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
    await expect(p.getByText(LOI).first()).toBeVisible();
    await p.keyboard.press("Escape");
  };
  await thu(tbmDuyet, "Duyệt");
  await thu(tbmHuy, "Hủy duyệt");
  await thu(tk, "Trả về", "Xem lại");
  await thu(tk, "Chốt");

  expect(await trangThaiTask(T[5].id)).toBe("CHUA_LAM");
  expect(await trangThaiTask(T[4].id)).toBe("CHO_DUYET");
  expect(await trangThaiTask(T[3].id)).toBe("CHO_CHOT");
  expect(await trangThaiTask(T[2].id)).toBe("CHO_CHOT");

  // Tải lại: giao diện khóa, không còn nút.
  await tk.reload();
  await expect(tk.getByTestId("chi-tiet-task")).toContainText(LOI);
  await expect(tk.getByTestId("nut-thao-tac")).toHaveCount(0);
  await gv.reload();
  await expect(gv.locator("main")).toContainText(LOI);
  for (const p of [gv, tbmDuyet, tbmHuy, tk]) await p.context().close();
});
