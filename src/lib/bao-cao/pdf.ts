// Xuất PDF (mục 6.3): A4 ngang, font Roboto nhúng (đủ tiếng Việt), quốc hiệu, tiêu đề, bảng, khối chữ ký.
import "server-only";
import path from "node:path";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { DIA_DANH, TEN_TRUONG } from "@/lib/cau-hinh";
import { hienPhanTram } from "@/lib/ket-qua";
import type { Role } from "@/generated/prisma/enums";
import { hienNgayGio } from "@/lib/time";
import type { DongNguoi, DuLieuBaoCao } from "./du-lieu";
import { tieuDeBaoCao } from "./excel";

/** Khối chữ ký theo người xuất (mục 6.3). */
export const KHOI_CHU_KY: Partial<Record<Role, string[]>> = {
  TBM: ["TRƯỞNG BỘ MÔN"],
  TK: ["TRƯỞNG KHOA"],
  HP: ["KT. HIỆU TRƯỞNG", "PHÓ HIỆU TRƯỞNG"],
  HT: ["HIỆU TRƯỞNG"],
};

const hoa = (s: string) => s.toLocaleUpperCase("vi-VN");

/**
 * Bảng có tiêu đề mục nằm ngay trong bảng (dòng 0, không kẻ viền) để tiêu đề không bị lẻ cuối trang;
 * sang trang thì lặp lại cả tiêu đề mục và dòng tiêu đề cột. Không cắt một dòng ra hai trang.
 */
function bang(tieuDeMuc: string, tieuDe: string[], dong: TableCell[][], widths: (string | number)[]): Content {
  const dongMuc: TableCell[] = tieuDe.map((_, i) =>
    i === 0
      ? { text: tieuDeMuc, style: "muc", colSpan: tieuDe.length, border: [false, false, false, false] }
      : { text: "" },
  );
  return {
    table: {
      headerRows: 2,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
      widths,
      body: [dongMuc, tieuDe.map((t) => ({ text: t, style: "thBang" })), ...dong],
    },
    layout: {
      fillColor: (i: number) => (i === 1 ? "#e5e7eb" : null),
      hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
      vLineWidth: () => 0.5,
    },
    fontSize: 9,
    margin: [0, 4, 0, 12],
  };
}

const taskThieu = (n: DongNguoi) => n.ketQua.taskThieu.map((t) => `• ${t.ten} – ${t.lyDo}`).join("\n");
// % luôn kèm dòng tách "Bắt buộc X% · Cải tiến +10%" (spec-v1.6 mục 4.1) – trong cùng ô, không thêm cột.
const phanTram = (n: DongNguoi) => `${hienPhanTram(n.ketQua.phanTram)}\n(${n.ketQua.dongTach})`;
const ketQua = (n: DongNguoi) => (n.ketQua.ghiChu ? `${n.ketQua.ketQua}\n(${n.ketQua.ghiChu})` : n.ketQua.ketQua);

function bangKetQua(d: DuLieuBaoCao): Content {
  return bang(
    "I. KẾT QUẢ THỰC HIỆN",
    ["STT", "Họ tên", "Chức vụ", "Đơn vị", "% hoàn thành", "Kết quả", "Xếp loại", "Task còn thiếu (lý do)", "Số task treo", "Cải tiến sáng tạo"],
    d.nguois.map((n, i) => [
      String(i + 1),
      n.hoTen,
      n.chucVu,
      n.donVi,
      phanTram(n),
      ketQua(n),
      n.ketQua.xepLoai,
      taskThieu(n),
      String(n.ketQua.soTreo),
      n.ketQua.caiTien,
    ]),
    [22, 80, 60, 80, 60, 60, 38, "*", 38, 70],
  );
}

function bangDangKy(d: DuLieuBaoCao): Content {
  return bang(
    "II. ĐĂNG KÝ NHIỆM VỤ",
    ["STT", "Họ tên", "Chức vụ", "Đơn vị", "Trạng thái", "Các nhiệm vụ đã chọn", "Tổng điểm", "Xếp loại"],
    d.nguois.map((n, i) => [
      String(i + 1),
      n.hoTen,
      n.chucVu,
      n.donVi,
      n.dangKy.trangThai,
      n.dangKy.nhiemVus.map((nv) => `• ${nv.ten} (${nv.diem})`).join("\n"),
      n.dangKy.tongDiem === null ? "" : String(n.dangKy.tongDiem),
      n.dangKy.xepLoai ?? "",
    ]),
    [22, 90, 70, 100, 60, "*", 45, 45],
  );
}

function motNguoi(d: DuLieuBaoCao, n: DongNguoi): Content[] {
  return [
    { text: "I. THÔNG TIN", style: "muc" },
    {
      columns: [
        { text: [{ text: "Họ tên: ", bold: true }, n.hoTen] },
        { text: [{ text: "Tên đăng nhập: ", bold: true }, n.username] },
        { text: [{ text: "Chức vụ: ", bold: true }, n.chucVu] },
        { text: [{ text: "Đơn vị: ", bold: true }, n.donVi] },
      ],
      margin: [0, 0, 0, 8],
    },
    { text: "II. NHIỆM VỤ ĐÃ ĐĂNG KÝ", style: "muc" },
    {
      text: `Trạng thái: ${n.dangKy.trangThai}${n.dangKy.tongDiem !== null ? ` · Tổng điểm: ${n.dangKy.tongDiem} · Xếp loại đăng ký: ${n.dangKy.xepLoai}` : ""}`,
      margin: [0, 0, 0, 4],
    },
    n.dangKy.nhiemVus.length
      ? { ul: n.dangKy.nhiemVus.map((nv) => `${nv.ten} (${nv.diem} điểm)`), margin: [0, 0, 0, 8] }
      : { text: "Chưa chọn nhiệm vụ nào.", italics: true, margin: [0, 0, 0, 8] },
    n.tasks.length
      ? bang(
          "III. CHI TIẾT TASK",
          ["STT", "Nhiệm vụ", "Task", "Loại", "Trạng thái", "Được tính", "Nộp gần nhất", "Số lần nộp", "Ngày chốt"],
          n.tasks.map((t, i) => [
            String(i + 1),
            t.nhiemVu,
            t.ten,
            t.loai,
            t.trangThai,
            t.duocTinh ? "Có" : "Không",
            t.ngayNopGanNhat ? hienNgayGio(t.ngayNopGanNhat) : "",
            String(t.soLanNop),
            t.ngayChot ? hienNgayGio(t.ngayChot) : "",
          ]),
          [22, 130, "*", 45, 90, 40, 70, 40, 70],
        )
      : { stack: [{ text: "III. CHI TIẾT TASK", style: "muc" }, { text: "Chưa có task.", italics: true, margin: [0, 0, 0, 8] }] },
    { text: "IV. KẾT QUẢ", style: "muc" },
    {
      table: {
        widths: [150, "*"],
        body: [
          ["% hoàn thành", phanTram(n)],
          ["Kết quả thực hiện", ketQua(n)],
          ["Xếp loại đăng ký", n.ketQua.xepLoai],
          ["Task còn thiếu (lý do)", taskThieu(n) || "—"],
          ["Cải tiến sáng tạo", n.ketQua.caiTien],
          ["Số task đang treo", String(n.ketQua.soTreo)],
          ["Tình trạng", d.tinhTrang],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      fontSize: 10,
      margin: [0, 4, 0, 12],
    },
  ];
}

/** Định nghĩa tài liệu PDF (thuần, để test được nội dung). */
export function taoDinhNghiaPdf(d: DuLieuBaoCao): TDocumentDefinitions {
  const [nam, thang, ngay] = d.ngayXuat.split("-");
  const donVi: Content[] = [];
  if (d.donVi.khoa) donVi.push({ text: hoa(d.donVi.khoa), bold: true });
  if (d.donVi.boMon) donVi.push({ text: hoa(d.donVi.boMon), bold: true });
  const chuKy = KHOI_CHU_KY[d.nguoiXuat.role] ?? [];

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 36, 40, 40],
    info: { title: tieuDeBaoCao(d), author: d.nguoiXuat.hoTen, creator: "CRM KPI giáo viên – ĐH Hạ Long" },
    defaultStyle: { font: "Roboto", fontSize: 10 },
    styles: {
      thBang: { bold: true },
      muc: { bold: true, fontSize: 11, margin: [0, 6, 0, 4] },
    },
    footer: (trang, tong) => ({ text: `Trang ${trang}/${tong}`, alignment: "right", fontSize: 8, margin: [0, 10, 40, 0] }),
    content: [
      {
        columns: [
          { width: "*", alignment: "center", stack: [{ text: TEN_TRUONG }, ...donVi] },
          {
            width: "*",
            alignment: "center",
            stack: [
              { text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true },
              { text: "Độc lập – Tự do – Hạnh phúc", bold: true },
              { text: `${DIA_DANH}, ngày ${ngay} tháng ${thang} năm ${nam}`, italics: true, margin: [0, 8, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 18],
      },
      { text: tieuDeBaoCao(d), bold: true, fontSize: 14, alignment: "center" },
      ...(d.tamTinh ? [{ text: "(TẠM TÍNH)", bold: true, alignment: "center" as const }] : []),
      { text: " ", margin: [0, 0, 0, 6] },
      ...(d.motNguoi && d.nguois[0]
        ? motNguoi(d, d.nguois[0])
        : [
            d.nguois.length ? bangKetQua(d) : { text: "Không có ai trong phạm vi đã chọn.", italics: true },
            ...(d.nguois.length ? [bangDangKy(d)] : []),
          ]),
      {
        unbreakable: true,
        columns: [
          { width: "*", text: "" },
          {
            width: 260,
            alignment: "center",
            stack: [
              ...chuKy.map((dong) => ({ text: dong, bold: true })),
              { text: "(Ký, ghi rõ họ tên)", italics: true },
              { text: " ", margin: [0, 36, 0, 0] },
              { text: d.nguoiXuat.hoTen, bold: true },
            ],
          },
        ],
        margin: [0, 16, 0, 0],
      },
    ],
  };
}

const THU_MUC_FONT = path.join(process.cwd(), "assets", "fonts", "Roboto");
let daCauHinh = false;

type PdfMake = typeof import("pdfmake");

async function layPdfMake(): Promise<PdfMake> {
  // pdfmake là CommonJS (module.exports = một đối tượng) → lấy default khi import động.
  const mod = (await import("pdfmake")) as unknown as { default?: PdfMake } & PdfMake;
  const pdfmake = mod.default ?? mod;
  if (!daCauHinh) {
    pdfmake.setFonts({
      Roboto: {
        normal: path.join(THU_MUC_FONT, "Roboto-Regular.ttf"),
        bold: path.join(THU_MUC_FONT, "Roboto-Medium.ttf"),
        italics: path.join(THU_MUC_FONT, "Roboto-Italic.ttf"),
        bolditalics: path.join(THU_MUC_FONT, "Roboto-MediumItalic.ttf"),
      },
    });
    // Không tải tài nguyên ngoài; chỉ đọc file font.
    pdfmake.setUrlAccessPolicy(() => false);
    pdfmake.setLocalAccessPolicy((p) => path.resolve(p).startsWith(THU_MUC_FONT));
    daCauHinh = true;
  }
  return pdfmake;
}

export async function taoPdf(d: DuLieuBaoCao): Promise<Buffer> {
  const pdfmake = await layPdfMake();
  return pdfmake.createPdf(taoDinhNghiaPdf(d)).getBuffer();
}
