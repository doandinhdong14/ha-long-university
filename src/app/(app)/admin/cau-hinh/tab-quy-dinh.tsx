import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { TEN_VAI_TRO } from "@/lib/roles";
import { nguoiNhanHienTai } from "@/lib/services/van-ban";
import { hienNgayGio } from "@/lib/time";

/** Tab Quy định đã ban hành + ai đã xem (chỉ xem). */
export async function TabQuyDinh() {
  const ds = await db.vanBan.findMany({ orderBy: { guiLuc: "desc" }, include: { nguoiGui: { select: { hoTen: true } } } });
  const nhan = await nguoiNhanHienTai(ds.map((v) => v.id));
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Người ban hành</TableHead>
            <TableHead>Ngày ban hành</TableHead>
            <TableHead>Vị trí nhận</TableHead>
            <TableHead>Đã xem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ds.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Chưa có quy định nào.
              </TableCell>
            </TableRow>
          )}
          {ds.map((vb) => {
            const n = nhan.get(vb.id)!;
            return (
              <TableRow key={vb.id} data-quy-dinh={vb.tieuDe}>
                <TableCell>
                  <Link href={`/admin/cau-hinh/quy-dinh/${vb.id}`} className="font-medium text-primary hover:underline">
                    {vb.tieuDe}
                  </Link>
                </TableCell>
                <TableCell>{vb.nguoiGui?.hoTen ?? "(tài khoản đã xóa)"}</TableCell>
                <TableCell>{hienNgayGio(vb.guiLuc)}</TableCell>
                <TableCell className="text-sm">{vb.viTriNhan.map((r) => TEN_VAI_TRO[r]).join(", ")}</TableCell>
                <TableCell data-testid="da-xem">
                  {n.soDaXem}/{n.nhan.length} đã xem
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
