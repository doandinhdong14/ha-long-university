"use server";

import { kiemTraNguoiLamKpi } from "@/lib/auth/dal";
import { hanhDong } from "@/lib/loi";
import { xinThemTask as xin } from "@/lib/services/yeu-cau";

/** Xin làm thêm một task mở rộng (làm vượt). */
export async function xinThemTask(taskId: string) {
  return hanhDong(async () => xin(await kiemTraNguoiLamKpi(), taskId));
}
