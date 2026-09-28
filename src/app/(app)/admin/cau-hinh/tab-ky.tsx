import type { Ky } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { moTaThoiGianKy, trangThaiKy } from "@/lib/ky";
import { DOI_TUONGS, TEN_VAI_TRO } from "@/lib/roles";

/** Tab Kỳ và bảng xếp loại (4 vị trí) – chỉ xem. */
export async function TabKy({ kys, ky }: { kys: Ky[]; ky: Ky | null }) {
  const [bacs, demNv] = ky
    ? await Promise.all([
        db.bacXepLoai.findMany({ where: { kyId: ky.id }, orderBy: { diemToiThieu: "desc" } }),
        db.nhiemVu.groupBy({ by: ["doiTuong"], where: { kyId: ky.id, laCaiTien: false }, _count: true }),
      ])
    : [[], []];
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kỳ</TableHead>
              <TableHead>Năm học</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Kết thúc</TableHead>
              <TableHead>Hạn đăng ký</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kys.map((k) => {
              const tg = moTaThoiGianKy(k);
              return (
                <TableRow key={k.id} className={k.id === ky?.id ? "bg-muted/60" : undefined}>
                  <TableCell className="font-medium">{k.ten}</TableCell>
                  <TableCell>{k.namHoc}</TableCell>
                  <TableCell>{tg.batDau}</TableCell>
                  <TableCell>{tg.ketThuc}</TableCell>
                  <TableCell>{tg.hanDangKy}</TableCell>
                  <TableCell>{tg.deadline}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{trangThaiKy(k)}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {ky && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="bang-xep-loai">
          {DOI_TUONGS.map((d) => (
            <Card key={d} data-vi-tri={d}>
              <CardHeader>
                <CardTitle className="text-base">{TEN_VAI_TRO[d]}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {demNv.find((x) => x.doiTuong === d)?._count ?? 0} nhiệm vụ trong {ky.ten}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {bacs.filter((b) => b.doiTuong === d).length === 0 && (
                    <li className="text-destructive">Chưa có bảng xếp loại.</li>
                  )}
                  {bacs
                    .filter((b) => b.doiTuong === d)
                    .map((b) => (
                      <li key={b.id} className="flex justify-between">
                        <strong>{b.ten}</strong>
                        <span>≥ {b.diemToiThieu} điểm</span>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
