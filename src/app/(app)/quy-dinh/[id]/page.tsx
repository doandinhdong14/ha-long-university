import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DanhSachFile } from "@/components/chung/danh-sach-file";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { BangNguoiNhan } from "@/components/giay-to/bang-nguoi-nhan";
import { Card, CardContent } from "@/components/ui/card";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { TEN_VAI_TRO } from "@/lib/roles";
import { nguoiNhanHienTai } from "@/lib/services/van-ban";
import { hienNgayGio } from "@/lib/time";

/** Chi tiết quy định đã ban hành: nội dung, file, ai đã xem / chưa xem (lọc theo vị trí). */
export default async function TrangChiTietQuyDinh(props: PageProps<"/quy-dinh/[id]">) {
  await yeuCauVaiTro("HT");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const vb = await db.vanBan.findUnique({
    where: { id },
    include: { files: { orderBy: { taoLuc: "asc" }, select: { id: true, tenGoc: true, kichThuoc: true, mimeType: true } } },
  });
  if (!vb) notFound();
  const n = (await nguoiNhanHienTai([vb.id])).get(vb.id)!;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/quy-dinh" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="size-4" /> Đã ban hành
        </Link>
        <TrangTieuDe
          tieuDe={vb.tieuDe}
          moTa={`Ban hành lúc ${hienNgayGio(vb.guiLuc)} · Vị trí nhận: ${vb.viTriNhan.map((r) => TEN_VAI_TRO[r]).join(", ")}`}
        />
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{vb.noiDung}</div>
          <div>
            <div className="mb-1 text-sm font-medium">File đính kèm</div>
            <DanhSachFile files={vb.files} />
          </div>
        </CardContent>
      </Card>
      <BangNguoiNhan
        nhan={n.nhan}
        viTriNhan={vb.viTriNhan}
        loc={typeof sp.viTri === "string" ? sp.viTri : undefined}
        duongDan={`/quy-dinh/${vb.id}`}
      />
    </div>
  );
}
