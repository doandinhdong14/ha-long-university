// Ban hành quy định (mục 9) – danh sách đã ban hành: tiêu đề, ngày, vị trí nhận, "x/y đã xem"
// (y = số tài khoản hiện đang ở các vị trí đó; x chỉ đếm trong y người, B11). Chỉ hiệu trưởng.
import Link from "next/link";
import { Plus } from "lucide-react";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { TEN_VAI_TRO } from "@/lib/roles";
import { nguoiNhanHienTai } from "@/lib/services/van-ban";
import { hienNgayGio } from "@/lib/time";

export default async function TrangQuyDinh() {
  await yeuCauVaiTro("HT");
  const ds = await db.vanBan.findMany({ orderBy: { guiLuc: "desc" }, include: { _count: { select: { files: true } } } });
  const nhan = await nguoiNhanHienTai(ds.map((v) => v.id));

  return (
    <div>
      <TrangTieuDe tieuDe="Ban hành quy định" moTa="Quy định gửi theo vị trí: mọi tài khoản ở vị trí được tick đều nhận, kể cả người được thêm vào sau.">
        <Button asChild>
          <Link href="/quy-dinh/moi">
            <Plus className="size-4" /> Ban hành quy định mới
          </Link>
        </Button>
      </TrangTieuDe>
      <h2 className="mb-3 font-semibold">Đã ban hành</h2>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Ngày ban hành</TableHead>
              <TableHead>Vị trí nhận</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Đã xem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ds.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Chưa ban hành quy định nào.
                </TableCell>
              </TableRow>
            )}
            {ds.map((vb) => {
              const n = nhan.get(vb.id)!;
              return (
                <TableRow key={vb.id} data-quy-dinh={vb.tieuDe}>
                  <TableCell>
                    <Link href={`/quy-dinh/${vb.id}`} className="font-medium text-primary hover:underline">
                      {vb.tieuDe}
                    </Link>
                  </TableCell>
                  <TableCell>{hienNgayGio(vb.guiLuc)}</TableCell>
                  <TableCell className="text-sm">{vb.viTriNhan.map((r) => TEN_VAI_TRO[r]).join(", ")}</TableCell>
                  <TableCell>{vb._count.files || "—"}</TableCell>
                  <TableCell data-testid="da-xem">
                    {n.soDaXem}/{n.nhan.length} đã xem
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
