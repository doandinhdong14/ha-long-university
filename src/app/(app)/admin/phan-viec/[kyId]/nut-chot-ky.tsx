"use client";

import { Lock } from "lucide-react";
import { NutXacNhan } from "@/components/chung/nut-xac-nhan";
import { useHanhDong } from "@/components/chung/use-hanh-dong";
import { chotKyNgay } from "../actions";

/** Nút demo: chốt kỳ ngay, không cần chờ deadline. */
export function NutChotKy({ kyId }: { kyId: string }) {
  const { pending, chay } = useHanhDong();
  return (
    <NutXacNhan
      variant="destructive"
      nguyHiem
      tieuDe="Chốt kỳ ngay?"
      moTa="Hệ thống sẽ tính kết quả cho mọi giáo viên, trưởng bộ môn, trưởng khoa, hiệu phó và khóa toàn bộ thao tác trong kỳ (nộp, duyệt, chốt). Task chưa được chốt không được tính. Không thể hoàn tác."
      nhanXacNhan="Chốt kỳ"
      disabled={pending}
      onXacNhan={() => chay(() => chotKyNgay(kyId), { thanhCong: (d) => `Đã chốt kỳ, tính kết quả cho ${d.soNguoi} người.` })}
    >
      <Lock className="size-4" /> Chốt kỳ ngay
    </NutXacNhan>
  );
}
