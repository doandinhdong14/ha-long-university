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

/** Quy định + ai đã xem (Xem cấu hình). Admin xem ở đây không bị tính là đã xem. */
export default async function TrangQuyDinhCauHinh(props: PageProps<"/admin/cau-hinh/quy-dinh/[id]">) {
  await yeuCauVaiTro("ADMIN");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const vb = await db.vanBan.findUnique({
    where: { id },
    include: {
      nguoiGui: { select: { hoTen: true } },
      files: { orderBy: { taoLuc: "asc" }, select: { id: true, tenGoc: true, kichThuoc: true, mimeType: true } },
    },
  });
  if (!vb) notFound();
  const n = (await nguoiNhanHienTai([vb.id])).get(vb.id)!;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/cau-hinh?tab=quy-dinh" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="size-4" /> Quy định đã ban hành
        </Link>
        <TrangTieuDe
          tieuDe={vb.tieuDe}
          moTa={`${vb.nguoiGui?.hoTen ?? "(tài khoản đã xóa)"} · ${hienNgayGio(vb.guiLuc)} · Vị trí nhận: ${vb.viTriNhan.map((r) => TEN_VAI_TRO[r]).join(", ")}`}
        />
      </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{vb.noiDung}</div>
          <DanhSachFile files={vb.files} />
        </CardContent>
      </Card>
      <BangNguoiNhan
        nhan={n.nhan}
        viTriNhan={vb.viTriNhan}
        loc={typeof sp.viTri === "string" ? sp.viTri : undefined}
        duongDan={`/admin/cau-hinh/quy-dinh/${vb.id}`}
      />
    </div>
  );
}
