// Nhãn + mô tả các nút thao tác task cho cấp quản lý, tham số theo vị trí người làm KPI.
import type { DoiTuong } from "@/generated/prisma/enums";
import { CHUOI } from "@/lib/kpi/chuoi";
import { luatChuyen, type HanhDong } from "@/lib/kpi/trang-thai";
import { chucDanh } from "@/lib/roles";

export type HanhDongQuanLy = Exclude<HanhDong, "NOP" | "SUA_BAI_NOP">;

export type NutTask = {
  hanhDong: HanhDongQuanLy;
  nhan: string;
  moTa: string;
  canNhanXet: boolean;
  choPhepNhanXet: boolean;
};

export function taoNutTask(hds: HanhDong[], doiTuong: DoiTuong): NutTask[] {
  const { chot, gopDuyetChot } = CHUOI[doiTuong];
  const nguoiLam = chucDanh(doiTuong);
  const nguoiChot = chucDanh(chot);
  const noi: Record<HanhDongQuanLy, { nhan: string; moTa: string; choPhepNhanXet: boolean }> = {
    DUYET: {
      nhan: "Duyệt",
      moTa: gopDuyetChot
        ? "Chấp nhận minh chứng. Task chưa được tính cho đến khi bấm Chốt."
        : `Chấp nhận minh chứng. Task lên ${nguoiChot} chốt ngay; chưa được tính cho đến khi ${nguoiChot} chốt.`,
      choPhepNhanXet: true,
    },
    TU_CHOI: { nhan: "Từ chối", moTa: `Trả minh chứng cho ${nguoiLam} nộp lại.`, choPhepNhanXet: true },
    HUY_DUYET: {
      nhan: "Hủy duyệt",
      moTa: gopDuyetChot
        ? "Task quay về Chờ duyệt."
        : `Rút task khỏi danh sách chờ chốt của ${nguoiChot}, quay về Chờ duyệt. Chỉ làm được khi ${nguoiChot} chưa chốt.`,
      choPhepNhanXet: false,
    },
    CHOT: {
      nhan: "Chốt",
      moTa: "Xác nhận cuối cùng: task được tính hoàn thành ngay, sau đó không ai sửa được.",
      choPhepNhanXet: false,
    },
    TRA_VE: {
      nhan: "Trả về",
      moTa: "Trả task về người duyệt. Nhận xét chỉ người duyệt thấy.",
      choPhepNhanXet: true,
    },
    TRA_LAM_LAI: {
      nhan: `Trả ${nguoiLam} làm lại`,
      moTa: `Task chuyển sang Bị từ chối để ${nguoiLam} nộp lại. Nhận xét này ${nguoiLam} sẽ thấy.`,
      choPhepNhanXet: true,
    },
    DUYET_LAI: { nhan: "Duyệt lại", moTa: `Task lên thẳng Chờ chốt của ${nguoiChot}.`, choPhepNhanXet: false },
  };
  const gop = gopDuyetChot;
  return hds
    .filter((hd): hd is HanhDongQuanLy => hd !== "NOP" && hd !== "SUA_BAI_NOP")
    .map((hd) => ({ hanhDong: hd, ...noi[hd], canNhanXet: luatChuyen(hd, gop)?.canNhanXet ?? false }));
}
