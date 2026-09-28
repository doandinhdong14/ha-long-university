import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import type { DoiTuong } from "@/generated/prisma/enums";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { DOI_TUONGS, TEN_VAI_TRO } from "@/lib/roles";
import { lyDoChuaCongBoDuoc } from "@/lib/services/phan-viec";
import { ngayThanhChuoi } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BangXepLoai } from "./bang-xep-loai";
import { DanhSachNhiemVu, type NhiemVuHienThi } from "./danh-sach-nhiem-vu";
import { NutChotKy } from "./nut-chot-ky";
import { ThongTinKy } from "./thong-tin-ky";

/** ?viTri=gv|tbm|tk|hp → vị trí đang xem (mặc định Giáo viên). */
function docViTri(v: unknown): DoiTuong {
  const up = typeof v === "string" ? v.toUpperCase() : "";
  return (DOI_TUONGS as readonly string[]).includes(up) ? (up as DoiTuong) : "GV";
}

export default async function TrangChiTietKy(props: PageProps<"/admin/phan-viec/[kyId]">) {
  await yeuCauVaiTro("ADMIN");
  const { kyId } = await props.params;
  const viTri = docViTri((await props.searchParams).viTri);

  const ky = await db.ky.findUnique({
    where: { id: kyId },
    include: {
      bacXepLoais: { where: { doiTuong: viTri }, orderBy: { diemToiThieu: "desc" } },
      nhiemVus: {
        where: { doiTuong: viTri, laCaiTien: false },
        orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
        include: {
          _count: { select: { dangKys: true } },
          tasks: {
            orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
            include: { _count: { select: { kpiTasks: true, yeuCaus: true } } },
          },
        },
      },
    },
  });
  if (!ky) notFound();

  const [demNv, demBac, duyet, lyDoCongBo, caiTien] = await Promise.all([
    db.nhiemVu.groupBy({ by: ["doiTuong"], where: { kyId, laCaiTien: false }, _count: true }),
    db.bacXepLoai.groupBy({ by: ["doiTuong"], where: { kyId }, _count: true }),
    db.dangKyNhiemVu.groupBy({
      by: ["nhiemVuId"],
      where: { nhiemVu: { kyId, doiTuong: viTri }, dangKy: { trangThai: "DA_DUYET" } },
      _count: true,
    }),
    ky.daCongBo ? null : lyDoChuaCongBoDuoc(db, kyId),
    db.nhiemVu.findFirst({
      where: { kyId, doiTuong: viTri, laCaiTien: true },
      include: { tasks: { select: { ten: true } }, _count: { select: { dangKys: true } } },
    }),
  ]);
  const soDuyet = new Map(duyet.map((d) => [d.nhiemVuId, d._count]));

  const nhiemVus: NhiemVuHienThi[] = ky.nhiemVus.map((nv) => ({
    id: nv.id,
    ten: nv.ten,
    moTa: nv.moTa,
    diem: nv.diem,
    thuTu: nv.thuTu,
    soDangKy: nv._count.dangKys,
    soDangKyDuyet: soDuyet.get(nv.id) ?? 0,
    tasks: nv.tasks.map((t) => ({
      id: t.id,
      ten: t.ten,
      moTa: t.moTa,
      loai: t.loai,
      thuTu: t.thuTu,
      daCoNguoiLam: t._count.kpiTasks + t._count.yeuCaus > 0,
    })),
  }));
  const tongDiem = ky.nhiemVus.reduce((s, nv) => s + nv.diem, 0);

  return (
    <div>
      <Link href="/admin/phan-viec" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="size-4" /> Danh sách kỳ
      </Link>
      <TrangTieuDe tieuDe={ky.ten} moTa={`Năm học ${ky.namHoc} · Kỳ ${ky.soKy}`} />

      <ThongTinKy
        ky={{
          id: ky.id,
          ngayBatDau: ngayThanhChuoi(ky.ngayBatDau),
          ngayKetThuc: ngayThanhChuoi(ky.ngayKetThuc),
          daCongBo: ky.daCongBo,
          daChot: ky.daChot,
        }}
        lyDoChuaCongBo={lyDoCongBo}
      >
        {ky.daCongBo && !ky.daChot && <NutChotKy kyId={ky.id} />}
      </ThongTinKy>

      {/* 4 tab vị trí: GV | TBM | TK | HP */}
      <nav className="mt-6 flex flex-wrap gap-1 border-b" aria-label="Vị trí">
        {DOI_TUONGS.map((d) => {
          const soNv = demNv.find((x) => x.doiTuong === d)?._count ?? 0;
          const thieuBac = !demBac.some((x) => x.doiTuong === d);
          return (
            <Link
              key={d}
              href={`/admin/phan-viec/${ky.id}?viTri=${d.toLowerCase()}`}
              className={cn(
                "-mb-px inline-flex items-center gap-1 border-b-2 px-3 py-2 text-sm font-medium",
                d === viTri ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-current={d === viTri ? "page" : undefined}
              title={thieuBac ? "Chưa có bảng xếp loại" : undefined}
            >
              {TEN_VAI_TRO[d]} ({soNv})
              {thieuBac && <AlertTriangle className="size-3.5 text-destructive" aria-label="Chưa có bảng xếp loại" />}
            </Link>
          );
        })}
      </nav>

      <Tabs defaultValue="nhiem-vu" className="mt-4" key={viTri}>
        <TabsList>
          <TabsTrigger value="nhiem-vu">Nhiệm vụ &amp; task ({ky.nhiemVus.length})</TabsTrigger>
          <TabsTrigger value="xep-loai">Bảng xếp loại ({ky.bacXepLoais.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="nhiem-vu" className="mt-4">
          <DanhSachNhiemVu
            kyId={ky.id}
            doiTuong={viTri}
            nhiemVus={nhiemVus}
            tongDiem={tongDiem}
            khoa={ky.daChot}
            daCongBo={ky.daCongBo}
            caiTien={caiTien ? { soDangKy: caiTien._count.dangKys, tasks: caiTien.tasks.map((t) => t.ten) } : null}
          />
        </TabsContent>
        <TabsContent value="xep-loai" className="mt-4">
          <BangXepLoai
            kyId={ky.id}
            doiTuong={viTri}
            bacs={ky.bacXepLoais.map((b) => ({ ten: b.ten, diemToiThieu: b.diemToiThieu }))}
            khoa={ky.daChot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
