// Một mục con (nhóm 1–5, mục 3.2) hoặc một phân hệ Hgt (nhóm 6, mục 3.3) của docs/spec-admin-menu.md.
// Nội dung lấy từ config, không đọc database; nút "Mở chức năng hiện có" chỉ là đường link.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { DuongDan, KhungDangPhatTrien } from "@/components/phan-he/duong-dan";
import { TrangThaiBadge } from "@/components/phan-he/trang-thai-badge";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hrefNhom, laNhomHgt, ROUTE_LIEN_KET, timMuc } from "@/lib/admin-phan-he";
import { yeuCauVaiTro } from "@/lib/auth/dal";

export default async function TrangMucPhanHe(props: PageProps<"/admin/phan-he/[nhom]/[muc]">) {
  await yeuCauVaiTro("ADMIN");
  const { nhom: nhomSlug, muc: mucSlug } = await props.params;
  const tim = timMuc(nhomSlug, mucSlug);
  if (!tim) notFound();
  const { nhom, muc } = tim;
  const lienKet = muc.lienKet ? ROUTE_LIEN_KET[muc.lienKet] : null;
  const hgt = laNhomHgt(nhom);

  return (
    <div className="space-y-6">
      <div>
        <DuongDan muc={[{ nhan: nhom.ten, href: hrefNhom(nhom) }, { nhan: muc.ten }]} />
        <TrangTieuDe tieuDe={`${muc.so}. ${muc.ten}`} moTa={<TrangThaiBadge trangThai={muc.trangThai} />}>
          {lienKet && (
            <Link href={lienKet.href} className={buttonVariants()}>
              <ExternalLink className="size-4" /> Mở chức năng hiện có
            </Link>
          )}
        </TrangTieuDe>
      </div>

      {(muc.moTa || muc.ghiChu || lienKet) && (
        <Card>
          <CardContent className="space-y-2 text-sm">
            {muc.moTa && <p>{muc.moTa}</p>}
            {muc.ghiChu && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Ghi chú: </span>
                {muc.ghiChu}
              </p>
            )}
            {lienKet && (
              <p className="text-muted-foreground">
                Chức năng hiện có nằm tại trang <span className="font-medium text-foreground">{lienKet.nhan}</span>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {hgt && muc.chucNang && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chức năng của phân hệ</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y" data-chuc-nang>
              {muc.chucNang.map((cn) => {
                const [so, ...ten] = cn.split(" ");
                return (
                  <li key={cn} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="flex gap-2">
                      <span className="shrink-0 text-primary tabular-nums">{so}</span>
                      <span>{ten.join(" ")}</span>
                    </span>
                    <TrangThaiBadge trangThai="PHAT_TRIEN" />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {muc.trangThai === "PHAT_TRIEN" && <KhungDangPhatTrien />}
    </div>
  );
}
