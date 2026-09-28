// Xuất Excel (mục 6.3; spec-v1.6 mục 6.3): 3 sheet Đăng ký nhiệm vụ | Kết quả | Chi tiết task.
import "server-only";
import ExcelJS from "exceljs";
import { hienPhanTram } from "@/lib/ket-qua";
import { TEN_VAI_TRO } from "@/lib/roles";
import { hienNgay, hienNgayGio, chuoiThanhNgay } from "@/lib/time";
import type { DuLieuBaoCao } from "./du-lieu";

type Cot = { tieuDe: string; rong: number };

export function tieuDeBaoCao(d: DuLieuBaoCao) {
  return `BÁO CÁO KẾT QUẢ THỰC HIỆN NHIỆM VỤ – KỲ ${d.ky.soKy} NĂM HỌC ${d.ky.namHoc}`;
}

function themSheet(wb: ExcelJS.Workbook, d: DuLieuBaoCao, ten: string, cots: Cot[], dong: (string | number)[][]) {
  const ws = wb.addWorksheet(ten, { views: [{ state: "frozen", ySplit: 4 }] });
  const cuoi = ws.getColumn(cots.length).letter;
  ws.addRow([`${tieuDeBaoCao(d)}${d.tamTinh ? " (TẠM TÍNH)" : ""}`]);
  ws.mergeCells(`A1:${cuoi}1`);
  ws.getRow(1).font = { bold: true, size: 13 };
  ws.addRow([
    `Người xuất: ${d.nguoiXuat.hoTen} (${TEN_VAI_TRO[d.nguoiXuat.role]}) · Ngày xuất: ${hienNgay(chuoiThanhNgay(d.ngayXuat))} · Tình trạng: ${d.tinhTrang}`,
  ]);
  ws.mergeCells(`A2:${cuoi}2`);
  ws.getRow(2).font = { italic: true };
  ws.addRow([]);
  const header = ws.addRow(cots.map((c) => c.tieuDe));
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  });
  for (const r of dong) {
    const row = ws.addRow(r);
    row.alignment = { vertical: "top", wrapText: true };
  }
  cots.forEach((c, i) => (ws.getColumn(i + 1).width = c.rong));
  ws.eachRow((row, i) => {
    if (i < 4) return;
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  });
}

export async function taoExcel(d: DuLieuBaoCao): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CRM KPI giáo viên – ĐH Hạ Long";
  wb.created = new Date();

  themSheet(
    wb,
    d,
    "Đăng ký nhiệm vụ",
    [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Họ tên", rong: 24 },
      { tieuDe: "Tên đăng nhập", rong: 22 },
      { tieuDe: "Chức vụ", rong: 16 },
      { tieuDe: "Đơn vị", rong: 28 },
      { tieuDe: "Trạng thái đăng ký", rong: 16 },
      { tieuDe: "Các nhiệm vụ đã chọn", rong: 60 },
      { tieuDe: "Tổng điểm", rong: 10 },
      { tieuDe: "Xếp loại", rong: 10 },
      { tieuDe: "Đăng ký cải tiến (Có/Không)", rong: 14 },
    ],
    d.nguois.map((n, i) => [
      i + 1,
      n.hoTen,
      n.username,
      n.chucVu,
      n.donVi,
      n.dangKy.trangThai,
      n.dangKy.nhiemVus.map((nv) => `${nv.ten} (${nv.diem})`).join("\n"),
      n.dangKy.tongDiem ?? "",
      n.dangKy.xepLoai ?? "",
      n.dangKy.caiTien ? "Có" : "Không",
    ]),
  );

  themSheet(
    wb,
    d,
    "Kết quả",
    [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Họ tên", rong: 24 },
      { tieuDe: "Chức vụ", rong: 16 },
      { tieuDe: "Đơn vị", rong: 28 },
      { tieuDe: "Đánh giá cấp trên %", rong: 14 },
      { tieuDe: "% bắt buộc", rong: 11 },
      { tieuDe: "Tự đánh giá %", rong: 12 },
      { tieuDe: "Kết quả", rong: 18 },
      { tieuDe: "Xếp loại", rong: 10 },
      { tieuDe: "Task còn thiếu (kèm lý do)", rong: 60 },
      { tieuDe: "Số task đang treo", rong: 12 },
      { tieuDe: "Cải tiến sáng tạo", rong: 16 },
      { tieuDe: "Tình trạng", rong: 14 },
    ],
    d.nguois.map((n, i) => [
      i + 1,
      n.hoTen,
      n.chucVu,
      n.donVi,
      hienPhanTram(n.ketQua.phanTram),
      hienPhanTram(n.ketQua.phanTramBatBuoc),
      hienPhanTram(n.ketQua.tuDanhGia),
      n.ketQua.ghiChu ? `${n.ketQua.ketQua} (${n.ketQua.ghiChu})` : n.ketQua.ketQua,
      n.ketQua.xepLoai,
      n.ketQua.taskThieu.map((t) => `${t.ten} – ${t.nhiemVu}: ${t.lyDo}`).join("\n"),
      n.ketQua.soTreo,
      n.ketQua.caiTien,
      d.tinhTrang,
    ]),
  );

  const chiTiet: (string | number)[][] = [];
  for (const n of d.nguois) {
    for (const t of n.tasks) {
      chiTiet.push([
        chiTiet.length + 1,
        n.hoTen,
        n.chucVu,
        t.nhiemVu,
        t.ten,
        t.loai,
        t.trangThai,
        t.duocTinh ? "Có" : "Không",
        t.ngayNopGanNhat ? hienNgayGio(t.ngayNopGanNhat) : "",
        t.soLanNop,
        t.nhanXetDuyet ?? "",
        t.nhanXetChot ?? "",
        t.ngayChot ? hienNgayGio(t.ngayChot) : "",
      ]);
    }
  }
  themSheet(
    wb,
    d,
    "Chi tiết task",
    [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Họ tên", rong: 22 },
      { tieuDe: "Chức vụ", rong: 16 },
      { tieuDe: "Nhiệm vụ", rong: 32 },
      { tieuDe: "Task", rong: 36 },
      { tieuDe: "Loại", rong: 16 },
      { tieuDe: "Trạng thái", rong: 20 },
      { tieuDe: "Được tính (Có/Không)", rong: 12 },
      { tieuDe: "Ngày nộp gần nhất", rong: 18 },
      { tieuDe: "Số lần nộp", rong: 10 },
      { tieuDe: "Nhận xét gần nhất của người duyệt", rong: 36 },
      { tieuDe: "Nhận xét của người chốt", rong: 36 },
      { tieuDe: "Ngày chốt", rong: 18 },
    ],
    chiTiet,
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}
