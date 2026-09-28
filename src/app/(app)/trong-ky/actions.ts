"use server";

import { kiemTraNguoiLamKpi } from "@/lib/auth/dal";
import { hanhDong } from "@/lib/loi";
import { chanXinThemTask } from "@/lib/services/yeu-cau";

/** v1.6: bỏ xin thêm task mở rộng – action giữ lại chỉ để trả lỗi rõ ràng cho request cũ / gọi tay. */
export async function xinThemTask(taskId?: unknown) {
  void taskId;
  return hanhDong(async () => {
    await kiemTraNguoiLamKpi();
    chanXinThemTask();
  });
}
