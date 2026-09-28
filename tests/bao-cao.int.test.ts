import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as apiBaoCao } from "@/app/api/bao-cao/route";
import { db } from "@/lib/db";
import { dangKyVaDuyet, dangNhapNhu, kyDau, lamTask, resetDb, taskCua } from "./helpers";

let kyId: string;

function goi(q: Record<string, string | string[]>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) for (const x of [v].flat()) p.append(k, x);
  return apiBaoCao(new Request(`http://localhost/api/bao-cao?${p.toString()}`));
}

async function excel(res: Response) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as never);
  return wb;
}

/** Tên (cột 2) các dòng dữ liệu của một sheet (từ dòng 5; dòng 4 là tiêu đề cột). */
function hoTens(ws: ExcelJS.Worksheet) {
  const ds: string[] = [];
  ws.eachRow((row, i) => {
    if (i > 4) ds.push(String(row.getCell(2).value));
  });
  return ds;
}

async function chuPdf(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: false }).promise;
  let s = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    s += tc.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  }
  return s;
}

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
  await dangKyVaDuyet("gv.tranthibinh");
  const [t1] = await taskCua("gv.tranthibinh");
  await lamTask("gv.tranthibinh", t1.id, "DA_CHOT");
  await dangKyVaDuyet("tbm.phamthibich");
  await dangKyVaDuyet("tk.levankhoa");
  await dangKyVaDuyet("hp.tranthiphuong");
});

describe("phạm vi xuất báo cáo theo vai trò (mục 6.3)", () => {
  const TAT_CA = ["GV", "TBM", "TK", "HP"];
  const bang: [string, string[]][] = [
    ["tbm.phamthibich", ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường"]],
    ["tk.levankhoa", ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Bích"]],
    ["hp.tranthiphuong", ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Bích", "Lê Văn Khoa"]],
    ["ht.nguyenvanhieu", ["Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Bích", "Lê Văn Khoa", "Trần Thị Phương"]],
  ];
  for (const [u, mongDoi] of bang) {
    it(`${u} chỉ xuất được đúng phạm vi, không gồm chính mình`, async () => {
      await dangNhapNhu(u);
      const res = await goi({ kyId, viTri: TAT_CA, dinhDang: "xlsx" });
      expect(res.status).toBe(200);
      const wb = await excel(res);
      expect(hoTens(wb.getWorksheet("Kết quả")!).sort()).toEqual([...mongDoi].sort());
    });
  }

  it("TBM chọn chức vụ ngoài phạm vi → lỗi; người ngoài phạm vi → 403; GV/Admin → 403", async () => {
    await dangNhapNhu("tbm.phamthibich");
    const r1 = await goi({ kyId, viTri: "TK", dinhDang: "xlsx" });
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toBe("Vui lòng chọn ít nhất 1 chức vụ trong phạm vi của bạn.");
    const tk = await db.user.findUniqueOrThrow({ where: { username: "tk.levankhoa" } });
    expect((await goi({ kyId, viTri: "GV", nguoiId: tk.id, dinhDang: "pdf" })).status).toBe(403);
    await dangNhapNhu("gv.nguyenvanan");
    expect((await goi({ kyId, viTri: "GV", dinhDang: "xlsx" })).status).toBe(403);
    await dangNhapNhu("admin.quantri");
    expect((await goi({ kyId, viTri: "GV", dinhDang: "xlsx" })).status).toBe(403);
  });
});

describe("nội dung Excel", () => {
  it("đủ 3 sheet, đúng cột, % chỉ đếm task đã chốt, ghi Tạm tính; tên file có _TamTinh", async () => {
    await dangNhapNhu("tk.levankhoa");
    const res = await goi({ kyId, viTri: ["GV", "TBM"], dinhDang: "xlsx" });
    expect(res.headers.get("content-disposition")).toMatch(/BaoCao_KhoaCongNgheThongTin_Ky1-2026-2027_\d{8}_TamTinh\.xlsx/);
    const wb = await excel(res);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Đăng ký nhiệm vụ", "Kết quả", "Chi tiết task"]);
    const cot = (ten: string) => (wb.getWorksheet(ten)!.getRow(4).values as unknown[]).slice(1);
    expect(cot("Đăng ký nhiệm vụ")).toEqual([
      "STT", "Họ tên", "Tên đăng nhập", "Chức vụ", "Đơn vị", "Trạng thái đăng ký", "Các nhiệm vụ đã chọn", "Tổng điểm", "Xếp loại",
    ]);
    expect(cot("Kết quả")).toEqual([
      "STT", "Họ tên", "Chức vụ", "Đơn vị", "% hoàn thành", "Kết quả", "Xếp loại", "Task còn thiếu (kèm lý do)", "Số task đang treo", "Task vượt", "Tình trạng",
    ]);
    expect(cot("Chi tiết task")).toEqual([
      "STT", "Họ tên", "Chức vụ", "Nhiệm vụ", "Task", "Loại", "Trạng thái", "Được tính (Có/Không)", "Ngày nộp gần nhất", "Số lần nộp",
      "Nhận xét gần nhất của người duyệt", "Nhận xét của người chốt", "Ngày chốt",
    ]);
    const kq = wb.getWorksheet("Kết quả")!;
    expect(String(kq.getCell("A1").value)).toContain("(TẠM TÍNH)");
    let binh: unknown[] = [];
    kq.eachRow((row) => {
      if (row.getCell(2).value === "Trần Thị Bình") binh = (row.values as unknown[]).slice(1);
    });
    // v1.6: đăng ký đủ 10 nhiệm vụ (100 điểm) → A1; 1/22 task bắt buộc đã chốt → Không đạt.
    expect(binh.slice(2, 4)).toEqual(["Giáo viên", "Bộ môn Khoa học máy tính"]);
    expect(binh[4]).toMatch(/^[0-9]+([,.][0-9])?%$/);
    expect(binh.slice(5, 7)).toEqual(["Không đạt", "A1"]);
    expect(binh[10]).toBe("Tạm tính");
    const ct = wb.getWorksheet("Chi tiết task")!;
    const dongChot: unknown[][] = [];
    ct.eachRow((row) => {
      if (row.getCell(8).value === "Có") dongChot.push((row.values as unknown[]).slice(1));
    });
    expect(dongChot).toHaveLength(1);
    expect(dongChot[0][6]).toBe("Đã chốt");
  });
});

describe("nội dung PDF", () => {
  it("A4 ngang, tiếng Việt đọc đúng, khối chữ ký theo người xuất, có TẠM TÍNH khi chưa chốt kỳ", async () => {
    const mong: [string, string[], string[]][] = [
      ["tbm.phamthibich", ["TRƯỞNG BỘ MÔN"], ["KHOA CÔNG NGHỆ THÔNG TIN", "BỘ MÔN KHOA HỌC MÁY TÍNH"]],
      ["tk.levankhoa", ["TRƯỞNG KHOA"], ["KHOA CÔNG NGHỆ THÔNG TIN"]],
      ["hp.tranthiphuong", ["KT. HIỆU TRƯỞNG", "PHÓ HIỆU TRƯỞNG"], []],
      ["ht.nguyenvanhieu", ["HIỆU TRƯỞNG"], []],
    ];
    for (const [u, chuKy, donVi] of mong) {
      await dangNhapNhu(u);
      const res = await goi({ kyId, viTri: ["GV", "TBM", "TK", "HP"], dinhDang: "pdf" });
      expect(res.status, u).toBe(200);
      const buf = await res.arrayBuffer();
      const raw = Buffer.from(buf).toString("latin1");
      expect(raw.startsWith("%PDF")).toBe(true);
      expect(raw).toMatch(/\/MediaBox \[0 0 841\.8\d+ 595\.2\d+\]/);
      expect(raw).toMatch(/Roboto/);
      const chu = await chuPdf(buf);
      expect(chu).toContain("TRƯỜNG ĐẠI HỌC HẠ LONG");
      expect(chu).toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
      expect(chu).toContain("Độc lập – Tự do – Hạnh phúc");
      expect(chu).toMatch(/Quảng Ninh, ngày \d{2} tháng \d{2} năm \d{4}/);
      expect(chu).toContain("BÁO CÁO KẾT QUẢ THỰC HIỆN NHIỆM VỤ – KỲ 1 NĂM HỌC 2026-2027");
      expect(chu).toContain("(TẠM TÍNH)");
      expect(chu).toContain("Trần Thị Bình");
      for (const d of chuKy) expect(chu, u).toContain(d);
      for (const d of donVi) expect(chu, u).toContain(d);
      expect(chu).toContain("(Ký, ghi rõ họ tên)");
      if (u === "ht.nguyenvanhieu") expect(chu).not.toContain("PHÓ HIỆU TRƯỞNG");
    }
  });

  it("1 người: thông tin + nhiệm vụ + chi tiết task + kết quả", async () => {
    await dangNhapNhu("tbm.phamthibich");
    const binh = await db.user.findUniqueOrThrow({ where: { username: "gv.tranthibinh" } });
    const res = await goi({ kyId, viTri: "GV", nguoiId: binh.id, dinhDang: "pdf" });
    const chu = await chuPdf(await res.arrayBuffer());
    for (const s of ["I. THÔNG TIN", "II. NHIỆM VỤ ĐÃ ĐĂNG KÝ", "III. CHI TIẾT TASK", "IV. KẾT QUẢ", "gv.tranthibinh", "Biên soạn bài giảng"]) {
      expect(chu).toContain(s);
    }
    expect(chu).not.toContain("Nguyễn Văn An");
  });

  it("sau khi chốt kỳ: không còn TẠM TÍNH, tên file không có _TamTinh, tình trạng Đã chốt kỳ", async () => {
    const { chotKy } = await import("@/lib/services/chot-ky");
    await chotKy(kyId);
    await dangNhapNhu("tbm.phamthibich");
    const pdf = await goi({ kyId, viTri: "GV", dinhDang: "pdf" });
    expect(pdf.headers.get("content-disposition")).toMatch(/BaoCao_BoMonKhoaHocMayTinh_Ky1-2026-2027_\d{8}\.pdf/);
    expect(await chuPdf(await pdf.arrayBuffer())).not.toContain("TẠM TÍNH");
    const wb = await excel(await goi({ kyId, viTri: "GV", dinhDang: "xlsx" }));
    const kq = wb.getWorksheet("Kết quả")!;
    expect(String(kq.getCell("A1").value)).not.toContain("TẠM TÍNH");
    expect(kq.getRow(5).getCell(11).value).toBe("Đã chốt kỳ");
  });
});
