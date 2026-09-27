// Tổng quan một nhóm phân hệ mở rộng (docs/spec-admin-menu.md mục 3.1). Nội dung lấy từ config, không đọc database.
import Link from "next/link";
import { notFound } from "next/navigation";
import { DuongDan } from "@/components/phan-he/duong-dan";
import { TrangThaiBadge } from "@/components/phan-he/trang-thai-badge";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { Card, CardContent } from "@/components/ui/card";
import { hrefMuc, timNhom } from "@/lib/admin-phan-he";
import { yeuCauVaiTro } from "@/lib/auth/dal";

export default async function TrangTongQuanNhom(props: PageProps<"/admin/phan-he/[nhom]">) {
  await yeuCauVaiTro("ADMIN");
  const { nhom: slug } = await props.params;
  const nhom = timNhom(slug);
  if (!nhom) notFound();

  const dem = (t: string) => nhom.mucCon.filter((m) => m.trangThai === t).length;

  return (
    <div>
      <DuongDan muc={[{ nhan: nhom.ten }]} />
      <TrangTieuDe tieuDe={`${nhom.so}. ${nhom.ten}`} moTa={nhom.moTa} />

      <p className="mb-4 text-sm text-muted-foreground" data-tom-tat>
        {dem("HOAT_DONG")} đang hoạt động · {dem("MOT_PHAN")} một phần · {dem("PHAT_TRIEN")} đang phát triển
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {nhom.mucCon.map((m) => (
          <Link key={m.slug} href={hrefMuc(nhom, m)} className="group rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
            <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-muted/40">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="flex gap-2 font-medium leading-snug">
                  <span className="shrink-0 text-primary tabular-nums">{m.so}</span>
                  <span>{m.ten}</span>
                </div>
                <div className="mt-auto">
                  <TrangThaiBadge trangThai={m.trangThai} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
