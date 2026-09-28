"use server";

// Server action chung cho màn hình Duyệt và màn hình Chốt: người duyệt / người chốt thao tác trên task.
// Quyền (đúng người duyệt/chốt của người làm KPI) và luật chuyển kiểm tra ở service.
import { z } from "zod";
import { kiemTraVaiTro } from "@/lib/auth/dal";
import { hanhDong } from "@/lib/loi";
import { thucHienTask } from "@/lib/services/kpi-task";
import { docDuLieu, NhanXetTuyChon } from "@/lib/validate";

const HanhDongQuanLy = z.enum(["DUYET", "TU_CHOI", "HUY_DUYET", "CHOT", "TRA_VE", "TRA_LAM_LAI", "DUYET_LAI"], {
  message: "Thao tác không hợp lệ.",
});

export async function thaoTacTask(input: { kpiTaskId: string; hanhDong: string; nhanXet?: string }) {
  return hanhDong(async () => {
    const m = await kiemTraVaiTro("TBM", "TK", "HP", "HT");
    return thucHienTask(m, {
      kpiTaskId: input.kpiTaskId,
      hanhDong: docDuLieu(HanhDongQuanLy, input.hanhDong),
      nhanXet: docDuLieu(NhanXetTuyChon, input.nhanXet),
    });
  });
}
