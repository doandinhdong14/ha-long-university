// Máy trạng thái task (bảng 5.3 v1.4, sửa theo spec-v1.6 mục 7.2) – nơi duy nhất quy định ai được chuyển
// task từ trạng thái nào sang trạng thái nào. Dùng chung cho mọi cấp; task HP (gộp duyệt – chốt) chỉ khác ở
// cờ `gop`. Hàm thuần: server dùng để chặn, giao diện dùng để hiện nút.
// v1.6: bỏ bước "Gửi lên" — task GV/TBM/TK được Duyệt (hoặc Duyệt lại) là sang CHO_CHOT ngay; Hủy duyệt
// làm khi task còn CHO_CHOT (người chốt chưa chốt). Task HP giữ nguyên: Duyệt → DA_DUYET → Chốt.
import type { DoiTuong, HanhDongTask, TrangThaiTask } from "@/generated/prisma/enums";
import { CHUOI } from "@/lib/kpi/chuoi";
import { NHAN_TASK } from "@/lib/nhan";
import { chucDanh, TEN_VAI_TRO } from "@/lib/roles";

/** Tư cách của người thao tác đối với task: người làm KPI, người duyệt, người chốt. */
export type TuCach = "LAM" | "DUYET" | "CHOT";

/** Hành động trên task. TRA_LAM_LAI / DUYET_LAI: người duyệt xử lý task bị người chốt trả về. */
export type HanhDong =
  | "NOP"
  | "SUA_BAI_NOP"
  | "DUYET"
  | "TU_CHOI"
  | "HUY_DUYET"
  | "CHOT"
  | "TRA_VE"
  | "TRA_LAM_LAI"
  | "DUYET_LAI";

export type LuatChuyen = {
  tu: TrangThaiTask[];
  sang: TrangThaiTask;
  ai: TuCach;
  /** Bắt buộc nhận xét (từ chối, trả về, trả làm lại). */
  canNhanXet: boolean;
  /** Ghi vào LichSuTask với hành động này. */
  lichSu: HanhDongTask;
};

const L = (tu: TrangThaiTask[], sang: TrangThaiTask, ai: TuCach, lichSu: HanhDongTask, canNhanXet = false): LuatChuyen => ({
  tu,
  sang,
  ai,
  lichSu,
  canNhanXet,
});

/**
 * Luật chuyển của một hành động. gop = task HP (HT vừa duyệt vừa chốt, 2 nút, không có bước gửi lên).
 * null = hành động không áp dụng cho loại task này.
 */
export function luatChuyen(hd: HanhDong, gop: boolean): LuatChuyen | null {
  switch (hd) {
    case "NOP":
      return L(["CHUA_LAM", "TU_CHOI"], "CHO_DUYET", "LAM", "NOP");
    case "SUA_BAI_NOP":
      return L(["CHO_DUYET"], "CHO_DUYET", "LAM", "SUA_BAI_NOP");
    case "DUYET":
      // Task HP: HT duyệt rồi mới chốt (2 nút). Còn lại: lên thẳng người chốt.
      return L(["CHO_DUYET"], gop ? "DA_DUYET" : "CHO_CHOT", "DUYET", "DUYET");
    case "TU_CHOI":
      return L(["CHO_DUYET"], "TU_CHOI", "DUYET", "TU_CHOI", true);
    case "HUY_DUYET":
      // Chỉ khi người chốt chưa chốt; task rút khỏi danh sách Chờ chốt.
      return L([gop ? "DA_DUYET" : "CHO_CHOT"], "CHO_DUYET", "DUYET", "HUY_DUYET");
    case "CHOT":
      // Task HP: HT (người duyệt) bấm Chốt ngay trên task Đã duyệt.
      return gop ? L(["DA_DUYET"], "DA_CHOT", "DUYET", "CHOT") : L(["CHO_CHOT"], "DA_CHOT", "CHOT", "CHOT");
    case "TRA_VE":
      return gop ? null : L(["CHO_CHOT"], "TRA_VE", "CHOT", "TRA_VE", true);
    case "TRA_LAM_LAI":
      return gop ? null : L(["TRA_VE"], "TU_CHOI", "DUYET", "TU_CHOI", true);
    case "DUYET_LAI":
      return gop ? null : L(["TRA_VE"], "CHO_CHOT", "DUYET", "DUYET");
  }
}

const TEN_HANH_DONG: Record<HanhDong, string> = {
  NOP: "nộp minh chứng",
  SUA_BAI_NOP: "sửa bài nộp",
  DUYET: "duyệt",
  TU_CHOI: "từ chối",
  HUY_DUYET: "hủy duyệt",
  CHOT: "chốt",
  TRA_VE: "trả về",
  TRA_LAM_LAI: "trả làm lại",
  DUYET_LAI: "duyệt lại",
};

/** Lý do không chuyển được (sai loại task, sai tư cách, sai trạng thái) hoặc null. */
export function lyDoKhongChuyen(hd: HanhDong, trangThai: TrangThaiTask, gop: boolean, ai?: TuCach): string | null {
  const luat = luatChuyen(hd, gop);
  if (!luat) return "Thao tác này không áp dụng cho task của hiệu phó.";
  if (ai && luat.ai !== ai) return "Bạn không có quyền thực hiện thao tác này trên task.";
  if (!luat.tu.includes(trangThai)) {
    if (trangThai === "DA_CHOT") return "Task đã chốt, không ai sửa được.";
    return `Task đang ở trạng thái "${NHAN_TASK[trangThai]}", không thể ${TEN_HANH_DONG[hd]}.`;
  }
  return null;
}

/** Các hành động tư cách `ai` được làm với task đang ở `trangThai` (hiện nút ở giao diện). */
export function hanhDongDuocPhep(ai: TuCach, trangThai: TrangThaiTask, gop: boolean): HanhDong[] {
  const tatCa: HanhDong[] = ["NOP", "SUA_BAI_NOP", "DUYET", "TU_CHOI", "HUY_DUYET", "CHOT", "TRA_VE", "TRA_LAM_LAI", "DUYET_LAI"];
  return tatCa.filter((hd) => lyDoKhongChuyen(hd, trangThai, gop, ai) === null);
}

/** Task của vị trí này có gộp duyệt – chốt không (task HP). */
export function laGop(doiTuong: DoiTuong): boolean {
  return CHUOI[doiTuong].gopDuyetChot;
}

/** Nhãn trạng thái người làm KPI thấy (cột "Người làm KPI thấy" bảng 5.3). */
export function nhanChoNguoiLam(trangThai: TrangThaiTask, doiTuong: DoiTuong): string {
  const { duyet, chot, gopDuyetChot } = CHUOI[doiTuong];
  switch (trangThai) {
    case "DA_DUYET":
    case "CHO_CHOT":
      return gopDuyetChot
        ? `${TEN_VAI_TRO[duyet]} đã duyệt – chờ chốt`
        : `${TEN_VAI_TRO[duyet]} đã duyệt – chờ ${chucDanh(chot)} chốt`;
    case "DA_CHOT":
      return "Đã chốt – hoàn thành";
    case "TRA_VE":
      return `${TEN_VAI_TRO[chot]} trả về – chờ ${chucDanh(duyet)} xử lý`;
    default:
      return NHAN_TASK[trangThai];
  }
}

/** Nhãn trạng thái cho người duyệt / người chốt / admin (v1.6: không còn "Đã duyệt, chưa gửi lên"). */
export function nhanChoQuanLy(trangThai: TrangThaiTask): string {
  return NHAN_TASK[trangThai];
}
