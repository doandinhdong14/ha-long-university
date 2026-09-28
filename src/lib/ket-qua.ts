// Tính kết quả (mục 10.3 v1.4, thay bằng spec-v1.6 mục 4): MỘT hàm dùng chung cho biểu đồ tròn, chốt kỳ, báo cáo
// tạm tính, bảng Tổng quan màn hình Duyệt. Chỉ task DA_CHOT mới được tính. Hàm thuần (dữ liệu tải ở
// src/lib/services/ket-qua.ts).
// v1.6: task Mở rộng bị bỏ qua hoàn toàn; task cải tiến sáng tạo (0 hoặc 1) được chốt cộng +10% (tối đa 110%) nhưng
// KHÔNG bù được phần bắt buộc còn thiếu – kết quả so sánh bằng SỐ LƯỢNG task, không so sánh số thập phân %.
import type { KetQua, LoaiTask, TrangThaiCaiTien, TrangThaiDangKy, TrangThaiTask } from "@/generated/prisma/enums";
import { THUONG_CAI_TIEN } from "@/lib/cai-tien";
import { bacThapNhat, type Bac } from "@/lib/xep-loai";

export const DUOC_TINH: readonly TrangThaiTask[] = ["DA_CHOT"];
/** Đang treo: đã duyệt nhưng chưa chốt – chỉ để hiển thị, KHÔNG tính. */
export const DANG_TREO: readonly TrangThaiTask[] = ["DA_DUYET", "CHO_CHOT"];

export const GHI_CHU_CHUA_DUYET = "Chưa có danh sách nhiệm vụ được duyệt";
export const GHI_CHU_CHUA_CO_BAT_BUOC = "Chưa có task bắt buộc";

/** Lý do task còn thiếu theo trạng thái lúc chốt kỳ (spec-v1.6 mục 6.2). */
export function lyDoThieu(trangThai: TrangThaiTask): string {
  switch (trangThai) {
    case "CHUA_LAM":
      return "Chưa nộp minh chứng";
    case "TU_CHOI":
      return "Bị từ chối, chưa nộp lại";
    case "CHO_DUYET":
      return "Chờ duyệt, chưa được duyệt kịp";
    case "DA_DUYET":
      // v1.6: chỉ task HP còn dừng ở trạng thái này (HT duyệt rồi mới chốt).
      return "Đã duyệt nhưng chưa được chốt";
    case "CHO_CHOT":
      return "Chờ chốt, chưa được chốt kịp";
    case "TRA_VE":
      return "Bị cấp chốt trả về, chưa xử lý xong";
    case "DA_CHOT":
      return "";
  }
}

export type TaskKetQua = { ten: string; nhiemVu: string; loai: LoaiTask; trangThai: TrangThaiTask };
export type MucThieu = { ten: string; nhiemVu: string; trangThai: TrangThaiTask; lyDo: string };
export type MucVuot = { ten: string; nhiemVu: string };

/** Đếm task bắt buộc theo 5 phần của biểu đồ cấp trên + phần "đã nộp" của biểu đồ tự đánh giá (mục 5.1). */
export type ThongKe = {
  tongBatBuoc: number;
  daChot: number;
  dangTreo: number;
  choDuyet: number;
  /** Bị từ chối, gồm cả bị trả về. */
  tuChoi: number;
  chuaLam: number;
  /** Tự đánh giá: mọi trạng thái khác Chưa làm (kể cả bị từ chối, bị trả về, đang chờ). */
  daNop: number;
};

/** Task cải tiến sáng tạo của người làm KPI (null = không đăng ký). */
export type CaiTienTinh = {
  ten: string;
  nhiemVu: string;
  trangThai: TrangThaiTask;
  daNop: boolean;
  daChot: boolean;
} | null;

export type KetQuaTinh = {
  ketQua: KetQua;
  xepLoai: string;
  /** Đánh giá của cấp trên = % bắt buộc đã chốt + 10 nếu cải tiến đã chốt (tối đa 110). */
  phanTram: number;
  /** % task bắt buộc đã chốt. */
  phanTramBatBuoc: number;
  /** Tự đánh giá = % bắt buộc đã nộp + 10 nếu cải tiến đã nộp (tối đa 110). Chỉ để tham khảo. */
  tuDanhGia: number;
  /** % task bắt buộc đã nộp (khác Chưa làm). */
  tuDanhGiaBatBuoc: number;
  trangThaiCaiTien: TrangThaiCaiTien;
  caiTien: CaiTienTinh;
  /** Task bắt buộc chưa chốt kèm lý do (chỉ khi Không đạt). Cải tiến không nằm trong danh sách này. */
  taskThieu: MucThieu[];
  /** v1.6: chỉ chứa task cải tiến (khi Vượt chỉ tiêu). */
  taskVuot: MucVuot[];
  /** Số task (bắt buộc + cải tiến) đang treo. */
  soTreo: number;
  ghiChu: string | null;
  /** "Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – <lý do>" (mục 4.2). */
  ghiChuCaiTien: string | null;
  thongKe: ThongKe;
};

/** Phần trăm a/b, lưu 2 chữ số thập phân (hiển thị làm tròn số nguyên – hienPhanTram). b = 0 → 0. */
function tiLe(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 10000) / 100;
}

export function tinhKetQuaThuan(input: {
  dangKy: { trangThai: TrangThaiDangKy; xepLoai: string | null } | null;
  tasks: TaskKetQua[];
  /** Bảng xếp loại của đúng vị trí trong kỳ. */
  bacs: Bac[];
}): KetQuaTinh {
  const { dangKy, tasks } = input;
  const batBuoc = tasks.filter((t) => t.loai === "BAT_BUOC");
  const ct = tasks.find((t) => t.loai === "CAI_TIEN");
  const dem = (ds: readonly TrangThaiTask[]) => batBuoc.filter((t) => ds.includes(t.trangThai)).length;
  const thongKe: ThongKe = {
    tongBatBuoc: batBuoc.length,
    daChot: dem(DUOC_TINH),
    dangTreo: dem(DANG_TREO),
    choDuyet: dem(["CHO_DUYET"]),
    tuChoi: dem(["TU_CHOI", "TRA_VE"]),
    chuaLam: dem(["CHUA_LAM"]),
    daNop: batBuoc.length - dem(["CHUA_LAM"]),
  };
  const soTreo = tasks.filter((t) => t.loai !== "MO_RONG" && DANG_TREO.includes(t.trangThai)).length;

  if (!dangKy || dangKy.trangThai !== "DA_DUYET") {
    return {
      ketQua: "KHONG_DAT",
      xepLoai: bacThapNhat(input.bacs) ?? "—",
      phanTram: 0,
      phanTramBatBuoc: 0,
      tuDanhGia: 0,
      tuDanhGiaBatBuoc: 0,
      trangThaiCaiTien: "KHONG_DANG_KY",
      caiTien: null,
      taskThieu: [],
      taskVuot: [],
      soTreo,
      ghiChu: GHI_CHU_CHUA_DUYET,
      ghiChuCaiTien: null,
      thongKe,
    };
  }

  const phanTramBatBuoc = tiLe(thongKe.daChot, batBuoc.length);
  const tuDanhGiaBatBuoc = tiLe(thongKe.daNop, batBuoc.length);
  const caiTien: CaiTienTinh = ct
    ? { ten: ct.ten, nhiemVu: ct.nhiemVu, trangThai: ct.trangThai, daNop: ct.trangThai !== "CHUA_LAM", daChot: ct.trangThai === "DA_CHOT" }
    : null;
  const phanTram = Math.min(100 + THUONG_CAI_TIEN, phanTramBatBuoc + (caiTien?.daChot ? THUONG_CAI_TIEN : 0));
  const tuDanhGia = Math.min(100 + THUONG_CAI_TIEN, tuDanhGiaBatBuoc + (caiTien?.daNop ? THUONG_CAI_TIEN : 0));
  const trangThaiCaiTien: TrangThaiCaiTien = !caiTien ? "KHONG_DANG_KY" : caiTien.daChot ? "DA_CHOT" : "CHUA_CHOT";

  // So sánh bằng số lượng task: thiếu dù chỉ 1 task bắt buộc (hoặc không có task bắt buộc nào) là Không đạt.
  const duBatBuoc = batBuoc.length > 0 && thongKe.daChot === batBuoc.length;
  const ketQua: KetQua = !duBatBuoc ? "KHONG_DAT" : caiTien?.daChot ? "VUOT" : "DAT";
  const taskThieu =
    ketQua === "KHONG_DAT"
      ? batBuoc
          .filter((t) => !DUOC_TINH.includes(t.trangThai))
          .map((t) => ({ ten: t.ten, nhiemVu: t.nhiemVu, trangThai: t.trangThai, lyDo: lyDoThieu(t.trangThai) }))
      : [];
  return {
    ketQua,
    xepLoai: dangKy.xepLoai ?? bacThapNhat(input.bacs) ?? "—",
    phanTram,
    phanTramBatBuoc,
    tuDanhGia,
    tuDanhGiaBatBuoc,
    trangThaiCaiTien,
    caiTien,
    taskThieu,
    taskVuot: ketQua === "VUOT" && caiTien ? [{ ten: caiTien.ten, nhiemVu: caiTien.nhiemVu }] : [],
    soTreo,
    ghiChu: batBuoc.length === 0 ? GHI_CHU_CHUA_CO_BAT_BUOC : null,
    ghiChuCaiTien:
      caiTien && !caiTien.daChot
        ? `Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – ${lyDoThieu(caiTien.trangThai)}`
        : null,
    thongKe,
  };
}

/** Hiển thị phần trăm làm tròn số nguyên (spec-v1.6 mục 4.1): 57.14 → "57%", 110 → "110%". */
export function hienPhanTram(p: number): string {
  return `${Math.round(p)}%`;
}

/**
 * Dòng tách dưới mọi con số % (mục 4.1, 5.3) để không hiểu nhầm cải tiến bù được phần bắt buộc:
 * "Bắt buộc 90% · Cải tiến +10%" / "Bắt buộc 90% · Cải tiến: chưa chốt" (cấp trên) / "… chưa nộp" (tự đánh giá).
 * caiTienDat: null = không đăng ký cải tiến (chỉ "Bắt buộc X%"); true = đã chốt (cấp trên) / đã nộp (tự đánh giá).
 */
export function dongTachPhanTram(loai: "cap-tren" | "tu-danh-gia", phanTramBatBuoc: number, caiTienDat: boolean | null): string {
  const batBuoc = `Bắt buộc ${hienPhanTram(phanTramBatBuoc)}`;
  if (caiTienDat === null) return batBuoc;
  if (caiTienDat) return `${batBuoc} · Cải tiến +${THUONG_CAI_TIEN}%`;
  return `${batBuoc} · Cải tiến: ${loai === "cap-tren" ? "chưa chốt" : "chưa nộp"}`;
}

/** Dòng tách cho biểu đồ / con số cấp trên và tự đánh giá của một kết quả tính (mục 5.3). */
export function dongTach(loai: "cap-tren" | "tu-danh-gia", kq: Pick<KetQuaTinh, "phanTramBatBuoc" | "tuDanhGiaBatBuoc" | "caiTien">) {
  return loai === "cap-tren"
    ? dongTachPhanTram(loai, kq.phanTramBatBuoc, kq.caiTien ? kq.caiTien.daChot : null)
    : dongTachPhanTram(loai, kq.tuDanhGiaBatBuoc, kq.caiTien ? kq.caiTien.daNop : null);
}
