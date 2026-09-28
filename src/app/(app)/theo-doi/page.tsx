// Theo dõi kết quả đã chốt (spec-v1.6 mục 8): Hiệu phó (GV, TBM các khoa mình phụ trách) và Hiệu trưởng (GV, TBM,
// TK, HP toàn trường) xem các task đã chốt. CHỈ XEM: không có nút sửa / hủy chốt, trang không có thao tác ghi.
import Link from "next/link";
import type { DoiTuong } from "@/generated/prisma/enums";
import { ChonKy } from "@/components/chung/chon-ky";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { tenMuc } from "@/lib/menu";
import { DOI_TUONGS, TEN_VAI_TRO } from "@/lib/roles";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { layTheoDoi, type LocTheoDoi } from "@/lib/services/theo-doi";
import { hienNgayGio } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BoLocTheoDoi } from "./bo-loc";

const chuoi = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export default async function TrangTheoDoi(props: PageProps<"/theo-doi">) {
  const m = await yeuCauVaiTro("HP", "HT");
  const sp = await props.searchParams;
  const { kys, ky } = await layKyTheoUrl(sp.kyId);
  const tieuDe = tenMuc(m.role, "/theo-doi");

  if (!ky) {
    return (
      <div>
        <TrangTieuDe tieuDe={tieuDe} />
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      </div>
    );
  }

  const viTri = DOI_TUONGS.find((d) => d === sp.viTri) as DoiTuong | undefined;
  const loai = sp.loai === "nhiem-vu" || sp.loai === "cai-tien" ? sp.loai : undefined;
  const loc: LocTheoDoi = {
    khoa: chuoi(sp.khoa),
    boMon: chuoi(sp.boMon),
    viTri,
    nguoi: chuoi(sp.nguoi),
    loai,
    trang: Math.max(1, Number.parseInt(chuoi(sp.trang) ?? "1", 10) || 1),
  };
  const d = await layTheoDoi(m, ky.id, loc);
  const trang = Math.min(loc.trang, d.soTrang);

  const url = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams({ kyId: ky.id });
    const gop = { khoa: loc.khoa, boMon: loc.boMon, viTri: loc.viTri, nguoi: loc.nguoi, loai: loc.loai, ...p };
    for (const [k, v] of Object.entries(gop)) if (v) q.set(k, v);
    return `/theo-doi?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <TrangTieuDe
        tieuDe={tieuDe}
        moTa={`${ky.ten} · Chỉ xem các task đã chốt của ${d.viTris.map((v) => TEN_VAI_TRO[v].toLowerCase()).join(", ")}${
          m.role === "HP" ? " thuộc các khoa bạn phụ trách" : " toàn trường"
        }.`}
      >
        <ChonKy kyId={ky.id} kys={dsChonKy(kys)} />
      </TrangTieuDe>

      <div className="flex flex-wrap gap-3" data-testid="o-dem-theo-doi">
        {d.viTris.map((v) => (
          <div key={v} className="min-w-36 rounded-lg border bg-background p-3" data-o-dem={v}>
            <div className="text-2xl font-bold tabular-nums">{d.dem[v]}</div>
            <div className="text-xs text-muted-foreground">Task đã chốt – {TEN_VAI_TRO[v].toLowerCase()}</div>
          </div>
        ))}
      </div>

      <BoLocTheoDoi
        nhoms={[
          { ten: "khoa", nhan: "Lọc theo khoa", tatCa: "Tất cả khoa", giaTri: loc.khoa ?? "", luaChon: d.luaChon.khoas },
          { ten: "boMon", nhan: "Lọc theo bộ môn", tatCa: "Tất cả bộ môn", giaTri: loc.boMon ?? "", luaChon: d.luaChon.boMons },
          {
            ten: "viTri",
            nhan: "Lọc theo chức vụ",
            tatCa: "Tất cả chức vụ",
            giaTri: loc.viTri ?? "",
            luaChon: d.viTris.map((v) => ({ id: v, ten: TEN_VAI_TRO[v] })),
          },
          { ten: "nguoi", nhan: "Lọc theo người", tatCa: "Tất cả mọi người", giaTri: loc.nguoi ?? "", luaChon: d.luaChon.nguois },
          {
            ten: "loai",
            nhan: "Lọc theo loại",
            tatCa: "Tất cả loại",
            giaTri: loc.loai ?? "",
            luaChon: [
              { id: "nhiem-vu", ten: "Nhiệm vụ" },
              { id: "cai-tien", ten: "Cải tiến sáng tạo" },
            ],
          },
        ]}
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Nhiệm vụ</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Người duyệt</TableHead>
              <TableHead>Người chốt</TableHead>
              <TableHead>Ngày chốt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.dong.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Không có task đã chốt nào.
                </TableCell>
              </TableRow>
            )}
            {d.dong.map((r) => (
              <TableRow key={r.id} data-task={r.task} data-nguoi={r.username}>
                <TableCell>
                  <div className="font-medium">{r.hoTen}</div>
                  <div className="text-xs text-muted-foreground">{r.username}</div>
                </TableCell>
                <TableCell className="text-sm">{TEN_VAI_TRO[r.chucVu]}</TableCell>
                <TableCell className="text-sm">{r.donVi}</TableCell>
                <TableCell className="text-sm">{r.laCaiTien ? <Badge variant="outline">Cải tiến sáng tạo</Badge> : r.nhiemVu}</TableCell>
                <TableCell className="text-sm">{r.task}</TableCell>
                <TableCell className="text-sm">{r.nguoiDuyet}</TableCell>
                <TableCell className="text-sm">{r.nguoiChot}</TableCell>
                <TableCell className="text-sm">{r.chotLuc ? hienNgayGio(r.chotLuc) : "—"}</TableCell>
                <TableCell>
                  <Link href={`/theo-doi/task/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                    Xem
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <nav className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-label="Phân trang" data-testid="phan-trang">
        <span className="text-muted-foreground">
          {d.tong} task đã chốt · Trang {trang}/{d.soTrang}
        </span>
        <div className="flex gap-2">
          {[
            { nhan: "Trang trước", toi: trang - 1, tat: trang <= 1 },
            { nhan: "Trang sau", toi: trang + 1, tat: trang >= d.soTrang },
          ].map((n) =>
            n.tat ? (
              <span key={n.nhan} className="rounded-md border px-3 py-1 text-muted-foreground opacity-50">
                {n.nhan}
              </span>
            ) : (
              <Link key={n.nhan} href={url({ trang: String(n.toi) })} className={cn("rounded-md border px-3 py-1 hover:bg-muted")}>
                {n.nhan}
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
