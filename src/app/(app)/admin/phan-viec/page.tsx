import Link from "next/link";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { moTaThoiGianKy, trangThaiKy } from "@/lib/ky";
import { DOI_TUONGS } from "@/lib/roles";
import { DialogTaoKy } from "./dialog-tao-ky";
import { NutResetDuLieu } from "./nut-reset-du-lieu";

export default async function TrangPhanViec() {
  await yeuCauVaiTro("ADMIN");
  const [kys, dem] = await Promise.all([
    db.ky.findMany({ orderBy: [{ ngayBatDau: "desc" }, { createdAt: "desc" }] }),
    db.nhiemVu.groupBy({ by: ["kyId", "doiTuong"], where: { laCaiTien: false }, _count: true }),
  ]);
  const soNhiemVu = (kyId: string, doiTuong: string) =>
    dem.find((d) => d.kyId === kyId && d.doiTuong === doiTuong)?._count ?? 0;

  return (
    <div>
      <TrangTieuDe
        tieuDe="Phân việc đầu kỳ"
        moTa="Tạo kỳ, nhiệm vụ, task và bảng xếp loại cho 4 vị trí. Người làm KPI chỉ thấy kỳ đã công bố."
      >
        <div className="flex flex-wrap gap-2">
          <NutResetDuLieu />
          <DialogTaoKy kys={kys.map((k) => ({ id: k.id, ten: k.ten }))} />
        </div>
      </TrangTieuDe>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên kỳ</TableHead>
              <TableHead>Năm học</TableHead>
              <TableHead>Kỳ số</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Kết thúc</TableHead>
              <TableHead>Số nhiệm vụ (GV · TBM · TK · HP)</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kys.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Chưa có kỳ nào.
                </TableCell>
              </TableRow>
            )}
            {kys.map((k) => {
              const tg = moTaThoiGianKy(k);
              const tt = trangThaiKy(k);
              return (
                <TableRow key={k.id} data-ky={k.ten}>
                  <TableCell>
                    <Link href={`/admin/phan-viec/${k.id}`} className="font-medium text-primary hover:underline">
                      {k.ten}
                    </Link>
                  </TableCell>
                  <TableCell>{k.namHoc}</TableCell>
                  <TableCell>{k.soKy}</TableCell>
                  <TableCell>{tg.batDau}</TableCell>
                  <TableCell>{tg.ketThuc}</TableCell>
                  <TableCell className="tabular-nums">{DOI_TUONGS.map((d) => soNhiemVu(k.id, d)).join(" · ")}</TableCell>
                  <TableCell>
                    <Badge variant={tt === "Đã công bố" ? "default" : tt === "Đã chốt" ? "secondary" : "outline"}>{tt}</Badge>
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
