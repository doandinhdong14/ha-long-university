// Màn hình Duyệt dùng chung (mục 6.1): TBM → GV, TK → TBM, HP → TK, HT → HP (Duyệt & chốt hiệu phó).
// Tham số theo vai trò lấy từ bảng cấu hình chuỗi duyệt – chốt (src/lib/kpi/chuoi.ts).
import Link from "next/link";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { CHUOI, viTriDuocDuyet } from "@/lib/kpi/chuoi";
import { tenMuc } from "@/lib/menu";
import { NHAN_DANG_KY, NHAN_KET_QUA } from "@/lib/nhan";
import { TEN_VAI_TRO } from "@/lib/roles";
import { hienPhanTram } from "@/lib/ket-qua";
import { tongQuanDuyet } from "@/lib/services/duyet";
import { taiKetQua } from "@/lib/services/ket-qua";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { cn } from "@/lib/utils";
import { HangCho } from "./hang-cho";

const TABS = [
  { id: "tong-quan", nhan: "Tổng quan" },
  { id: "hang-cho", nhan: "Hàng chờ" },
] as const;

export default async function TrangDuyet(props: PageProps<"/duyet">) {
  const m = await yeuCauVaiTro("TBM", "TK", "HP", "HT");
  const viTri = viTriDuocDuyet(m.role)!;
  const gop = CHUOI[viTri].gopDuyetChot;
  const sp = await props.searchParams;
  const tab = sp.tab === "hang-cho" ? "hang-cho" : "tong-quan";
  const { kys, ky } = await layKyTheoUrl(sp.kyId);
  const tieuDe = tenMuc(m.role, "/duyet");

  if (!ky) {
    return (
      <div>
        <TrangTieuDe tieuDe={tieuDe} />
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      </div>
    );
  }

  const dong = await tongQuanDuyet(m, ky.id);
  const ketQua = await taiKetQua(ky.id, dong.map((d) => d.nguoi));
  const tong = (f: (d: (typeof dong)[number]) => number) => dong.reduce((s, d) => s + f(d), 0);
  const oDem = [
    { nhan: "Danh sách đăng ký chờ duyệt", so: dong.filter((d) => d.dangKy?.trangThai === "CHO_DUYET").length, id: "dang-ky" },
    { nhan: "Task chờ duyệt", so: tong((d) => d.demTask.CHO_DUYET ?? 0), id: "cho-duyet" },
    // v1.6: không còn "Chưa gửi lên". HT với task HP vẫn tự chốt nên giữ ô "Đã duyệt, chưa chốt".
    ...(gop
      ? [{ nhan: "Đã duyệt, chưa chốt", so: tong((d) => d.demTask.DA_DUYET ?? 0), id: "chua-chot" }]
      : [
          { nhan: "Task chờ chốt", so: tong((d) => d.demTask.CHO_CHOT ?? 0), id: "cho-chot" },
          { nhan: "Task bị trả về", so: tong((d) => d.demTask.TRA_VE ?? 0), id: "tra-ve" },
        ]),
    { nhan: "Yêu cầu xin thêm chờ duyệt", so: tong((d) => d.xinThemChoDuyet), id: "xin-them" },
  ];

  return (
    <div className="space-y-6">
      <TrangTieuDe
        tieuDe={tieuDe}
        moTa={`${ky.ten} · Những ${TEN_VAI_TRO[viTri].toLowerCase()} mà bạn là người duyệt.`}
      >
        <ChonKy kyId={ky.id} kys={dsChonKy(kys)} />
      </TrangTieuDe>

      <nav className="flex gap-1 border-b" aria-label="Các tab">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/duyet?kyId=${ky.id}&tab=${t.id}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              t.id === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-current={t.id === tab ? "page" : undefined}
          >
            {t.nhan}
          </Link>
        ))}
      </nav>

      {tab === "tong-quan" ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-testid="o-dem">
            {oDem.map((o) => (
              <div key={o.id} className="rounded-lg border bg-background p-3" data-o-dem={o.id}>
                <div className="text-2xl font-bold tabular-nums">{o.so}</div>
                <div className="text-xs text-muted-foreground">{o.nhan}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Đăng ký</TableHead>
                  <TableHead className="text-right">% hoàn thành</TableHead>
                  <TableHead className="text-right">Chờ duyệt</TableHead>
                  {gop && <TableHead className="text-right">Chưa chốt</TableHead>}
                  {!gop && <TableHead className="text-right">Chờ chốt</TableHead>}
                  {!gop && <TableHead className="text-right">Bị trả về</TableHead>}
                  <TableHead className="text-right">Xin thêm chờ duyệt</TableHead>
                  {ky.daChot && <TableHead>Kết quả</TableHead>}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dong.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      Chưa có ai trong phạm vi duyệt của bạn.
                    </TableCell>
                  </TableRow>
                )}
                {dong.map((d) => (
                  <TableRow key={d.nguoi.id} data-nguoi={d.nguoi.username}>
                    <TableCell>
                      <div className="font-medium">{d.nguoi.hoTen}</div>
                      <div className="text-xs text-muted-foreground">{d.nguoi.username}</div>
                    </TableCell>
                    <TableCell>
                      {d.dangKy ? (
                        <div className="flex items-center gap-2">
                          <BadgeTrangThai trangThai={d.dangKy.trangThai} nhan={NHAN_DANG_KY[d.dangKy.trangThai]} laDangKy />
                          {d.dangKy.trangThai !== "NHAP" && (
                            <span className="text-sm">
                              {d.dangKy.xepLoai} · {d.dangKy.tongDiem} điểm
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Chưa đăng ký</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums" data-cot="phan-tram">
                      {hienPhanTram(ketQua.get(d.nguoi.id)?.phanTram ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.demTask.CHO_DUYET ?? 0}</TableCell>
                    {gop && <TableCell className="text-right tabular-nums">{d.demTask.DA_DUYET ?? 0}</TableCell>}
                    {!gop && <TableCell className="text-right tabular-nums">{d.demTask.CHO_CHOT ?? 0}</TableCell>}
                    {!gop && <TableCell className="text-right tabular-nums">{d.demTask.TRA_VE ?? 0}</TableCell>}
                    <TableCell className="text-right tabular-nums">{d.xinThemChoDuyet}</TableCell>
                    {ky.daChot && (
                      <TableCell data-cot="ket-qua" className="font-medium">
                        {d.ketQuaKy ? `${NHAN_KET_QUA[d.ketQuaKy.ketQua]} – ${d.ketQuaKy.xepLoai}` : "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Link href={`/duyet/${d.nguoi.id}?kyId=${ky.id}`} className="text-sm font-medium text-primary hover:underline">
                        Xem
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <HangCho m={m} ky={ky} />
      )}
    </div>
  );
}
