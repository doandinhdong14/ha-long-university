import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { TEN_VAI_TRO } from "@/lib/roles";
import { VI_TRI_NHAN } from "@/lib/services/van-ban";
import { FormBanHanh } from "./form-ban-hanh";

export default async function TrangBanHanhMoi() {
  await yeuCauVaiTro("HT");
  const dem = await db.user.groupBy({ by: ["role"], where: { role: { in: [...VI_TRI_NHAN] } }, _count: true });
  return (
    <div>
      <Link href="/quy-dinh" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="size-4" /> Ban hành quy định
      </Link>
      <TrangTieuDe tieuDe="Ban hành quy định mới" moTa="Tick vị trí nhận: mọi tài khoản ở vị trí đó sẽ nhận, kể cả người được thêm vào sau." />
      <FormBanHanh
        viTris={VI_TRI_NHAN.map((v) => ({ id: v, ten: TEN_VAI_TRO[v], soNguoi: dem.find((d) => d.role === v)?._count ?? 0 }))}
      />
    </div>
  );
}
