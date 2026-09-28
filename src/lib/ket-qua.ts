// Tính kết quả (mục 10.3): MỘT hàm dùng chung cho biểu đồ tròn, chốt kỳ, báo cáo tạm tính và
// cột % ở màn hình Duyệt. Chỉ task DA_CHOT mới được tính. Hàm thuần (dữ liệu tải ở
// src/lib/services/ket-qua.ts).
import type { DoiTuong, KetQua, LoaiTask, TrangThaiDangKy, TrangThaiTask } from "@/generated/prisma/enums";
import { bacThapNhat, type Bac } from "@/lib/xep-loai";

export const DUOC_TINH: readonly TrangThaiTask[] = ["DA_CHOT"];
/** Đang treo: đã duyệt nhưng chưa chốt – chỉ để hiển thị, KHÔNG tính. */
export const DANG_TREO: readonly TrangThaiTask[] = ["DA_DUYET", "CHO_CHOT"];

export const GHI_CHU_CHUA_DUYET = "Chưa có danh sách nhiệm vụ được duyệt";

/** Lý do task còn thiếu theo trạng thái lúc chốt kỳ (mục 5.4). */
export function lyDoThieu(trangThai: TrangThaiTask): string {
  switch (trangThai) {
    case "CHUA_LAM":
      return "Chưa nộp minh chứng";
    case "TU_CHOI":
      return "Bị từ chối, chưa nộp lại";
    case "CHO_DUYET":
      return "Chờ duyệt, chưa được duyệt kịp";
    case "DA_DUYET":
      // v1.6 (mục 6.2): chỉ task HP còn ở trạng thái này.
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

/** Đếm task bắt buộc theo 5 phần của biểu đồ tròn (mục 5.2). */
export type ThongKe = {
  tongBatBuoc: number;
  daChot: number;
  dangTreo: number;
  choDuyet: number;
  /** Bị từ chối, gồm cả bị trả về. */
  tuChoi: number;
  chuaLam: number;
};

export type KetQuaTinh = {
  ketQua: KetQua;
  xepLoai: string;
  /** % task bắt buộc đã chốt. Không có task bắt buộc → 100. */
  phanTram: number;
  taskThieu: MucThieu[];
  /** Task mở rộng đã chốt (làm vượt). */
  taskVuot: MucVuot[];
  /** Số task (bắt buộc + mở rộng) đang treo. */
  soTreo: number;
  ghiChu: string | null;
  thongKe: ThongKe;
};

export function tinhKetQuaThuan(input: {
  doiTuong: DoiTuong;
  dangKy: { trangThai: TrangThaiDangKy; xepLoai: string | null } | null;
  tasks: TaskKetQua[];
  /** Bảng xếp loại của đúng vị trí trong kỳ. */
  bacs: Bac[];
}): KetQuaTinh {
  const { dangKy, tasks } = input;
  const batBuoc = tasks.filter((t) => t.loai === "BAT_BUOC");
  const dem = (ds: readonly TrangThaiTask[]) => batBuoc.filter((t) => ds.includes(t.trangThai)).length;
  const thongKe: ThongKe = {
    tongBatBuoc: batBuoc.length,
    daChot: dem(DUOC_TINH),
    dangTreo: dem(DANG_TREO),
    choDuyet: dem(["CHO_DUYET"]),
    tuChoi: dem(["TU_CHOI", "TRA_VE"]),
    chuaLam: dem(["CHUA_LAM"]),
  };
  const soTreo = tasks.filter((t) => DANG_TREO.includes(t.trangThai)).length;

  if (!dangKy || dangKy.trangThai !== "DA_DUYET") {
    return {
      ketQua: "KHONG_DAT",
      xepLoai: bacThapNhat(input.bacs) ?? "—",
      phanTram: 0,
      taskThieu: [],
      taskVuot: [],
      soTreo,
      ghiChu: GHI_CHU_CHUA_DUYET,
      thongKe,
    };
  }

  const phanTram = batBuoc.length === 0 ? 100 : Math.round((thongKe.daChot / batBuoc.length) * 10000) / 100;
  const taskVuot = tasks
    .filter((t) => t.loai === "MO_RONG" && DUOC_TINH.includes(t.trangThai))
    .map((t) => ({ ten: t.ten, nhiemVu: t.nhiemVu }));
  const ketQua: KetQua = phanTram < 100 ? "KHONG_DAT" : taskVuot.length > 0 ? "VUOT" : "DAT";
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
    taskThieu,
    taskVuot,
    soTreo,
    ghiChu: null,
    thongKe,
  };
}

/** Hiển thị phần trăm gọn kiểu Việt: 100 → "100%", 57.14 → "57,1%". */
export function hienPhanTram(p: number): string {
  return `${Number.isInteger(p) ? p : p.toFixed(1).replace(".", ",")}%`;
}
