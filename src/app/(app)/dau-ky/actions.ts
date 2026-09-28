"use server";

import { z } from "zod";
import { kiemTraNguoiLamKpi } from "@/lib/auth/dal";
import { hanhDong } from "@/lib/loi";
import { guiDangKy as gui, luuDangKy as luu } from "@/lib/services/dang-ky";
import { docDuLieu } from "@/lib/validate";

// v1.6 (mục 2.1): client chỉ gửi được kỳ + có đăng ký cải tiến hay không. Danh sách nhiệm vụ do server quyết;
// trường thừa (vd nhiemVuIds sửa tay) bị bỏ qua.
const DangKyInput = z.object({
  kyId: z.string().min(1, "Kỳ không hợp lệ."),
  caiTien: z.boolean({ message: "Giá trị đăng ký cải tiến không hợp lệ." }),
});

/** Tick / bỏ tick "Đăng ký cải tiến sáng tạo" (tự lưu nháp). */
export async function luuDangKy(input: { kyId: string; caiTien: boolean }) {
  return hanhDong(async () => luu(await kiemTraNguoiLamKpi(), docDuLieu(DangKyInput, input)), false);
}

/** Gửi danh sách lên người duyệt. */
export async function guiDangKy(input: { kyId: string; caiTien: boolean }) {
  return hanhDong(async () => gui(await kiemTraNguoiLamKpi(), docDuLieu(DangKyInput, input)));
}
