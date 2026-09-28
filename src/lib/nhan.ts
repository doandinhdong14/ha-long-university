// Nhãn tiếng Việt cho các trạng thái. Nhãn task theo góc nhìn từng người (có chức danh người
// duyệt/chốt) nằm ở src/lib/kpi/trang-thai.ts.
import type { KetQua, LoaiTask, TrangThaiDangKy, TrangThaiDuyet, TrangThaiTask } from "@/generated/prisma/enums";

export const NHAN_DANG_KY: Record<TrangThaiDangKy, string> = {
  NHAP: "Nháp",
  CHO_DUYET: "Chờ duyệt",
  TU_CHOI: "Bị từ chối",
  DA_DUYET: "Đã duyệt",
};

/** Nhãn ngắn của trạng thái task (bộ lọc, báo cáo). */
export const NHAN_TASK: Record<TrangThaiTask, string> = {
  CHUA_LAM: "Chưa làm",
  CHO_DUYET: "Chờ duyệt",
  TU_CHOI: "Bị từ chối",
  DA_DUYET: "Đã duyệt, chưa chốt",
  CHO_CHOT: "Chờ chốt",
  DA_CHOT: "Đã chốt",
  TRA_VE: "Bị trả về",
};

export const NHAN_DUYET: Record<TrangThaiDuyet, string> = {
  CHO_DUYET: "Chờ duyệt",
  TU_CHOI: "Bị từ chối",
  DA_DUYET: "Đã duyệt",
};

export const NHAN_LOAI_TASK: Record<LoaiTask, string> = {
  BAT_BUOC: "Bắt buộc",
  MO_RONG: "Mở rộng",
  CAI_TIEN: "Cải tiến sáng tạo",
};

export const NHAN_KET_QUA: Record<KetQua, string> = {
  KHONG_DAT: "Không đạt",
  DAT: "Đạt",
  VUOT: "Vượt chỉ tiêu",
};
