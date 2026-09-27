"use client";

import { RotateCcw } from "lucide-react";
import { NutXacNhan } from "@/components/chung/nut-xac-nhan";
import { useHanhDong } from "@/components/chung/use-hanh-dong";
import { resetDuLieuHeThong } from "./actions";

/** Nút đỏ: xóa toàn bộ minh chứng, tài liệu và dữ liệu KPI; giữ tài khoản, kỳ và phân việc. */
export function NutResetDuLieu() {
  const { pending, chay } = useHanhDong();
  return (
    <NutXacNhan
      variant="destructive"
      className="bg-destructive text-white hover:bg-destructive/90"
      nguyHiem
      tieuDe="Reset toàn bộ dữ liệu?"
      moTa={
        <>
          Sẽ xóa vĩnh viễn: đăng ký nhiệm vụ, task KPI, minh chứng và file đính kèm, yêu cầu thêm task, kết quả các kỳ,
          quy định/tài liệu đã ban hành, thông báo. Kỳ đã chốt được mở lại.
          <br />
          Giữ nguyên: tài khoản và mật khẩu, khoa/bộ môn, kỳ, nhiệm vụ, task, bảng xếp loại. Không thể hoàn tác.
        </>
      }
      nhanXacNhan="Xóa toàn bộ"
      disabled={pending}
      onXacNhan={() =>
        chay(resetDuLieuHeThong, {
          thanhCong: (d) => `Đã reset: xóa ${d.soMinhChung} minh chứng, ${d.soTaiLieu} tài liệu, ${d.soFile} file.`,
        })
      }
    >
      <RotateCcw className="size-4" /> Reset dữ liệu
    </NutXacNhan>
  );
}
