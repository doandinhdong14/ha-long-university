// Các tab KPI của trang Xem cấu hình (chỉ xem): Đăng ký nhiệm vụ, Tiến độ & minh chứng, Kết quả các kỳ.
import Link from "next/link";
import type { Ky } from "@/generated/prisma/client";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tenDonVi, type CoCau, type NguoiCoCau } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { hienPhanTram, type MucThieu, type MucVuot } from "@/lib/ket-qua";
import { NHAN_DANG_KY, NHAN_KET_QUA } from "@/lib/nhan";
import { DOI_TUONGS, laDoiTuong, TEN_VAI_TRO } from "@/lib/roles";
import { taiKetQua } from "@/lib/services/ket-qua";
import { hienNgayGio } from "@/lib/time";

/** Người làm KPI hiện tại, xếp theo vị trí → đơn vị → họ tên. */
export function nguoiLamKpi(cc: CoCau): NguoiCoCau[] {
  const thuTu = (r: string) => DOI_TUONGS.indexOf(r as never);
  return cc.users
    .filter((u) => laDoiTuong(u.role))
    .sort((a, b) => thuTu(a.role) - thuTu(b.role) || tenDonVi(a, cc).localeCompare(tenDonVi(b, cc)) || a.hoTen.localeCompare(b.hoTen));
}

function OTen({ u, cc }: { u: NguoiCoCau; cc: CoCau }) {
  return (
    <>
      <div className="font-medium">{u.hoTen}</div>
      <div className="text-xs text-muted-foreground">
        {u.username} · {TEN_VAI_TRO[u.role]} · {tenDonVi(u, cc)}
      </div>
    </>
  );
}

export async function TabDangKy({ ky, cc }: { ky: Ky; cc: CoCau }) {
  const ds = nguoiLamKpi(cc);
  const dks = await db.dangKy.findMany({
    where: { kyId: ky.id, userId: { in: ds.map((u) => u.id) } },
    include: { _count: { select: { nhiemVus: true } } },
  });
  const ten = (id: string | null) => (id ? (cc.users.find((u) => u.id === id)?.hoTen ?? "(tài khoản đã xóa)") : "—");
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người làm KPI</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Số nhiệm vụ</TableHead>
            <TableHead className="text-right">Tổng điểm</TableHead>
            <TableHead>Xếp loại</TableHead>
            <TableHead>Gửi lúc</TableHead>
            <TableHead>Duyệt lúc</TableHead>
            <TableHead>Người duyệt · nhận xét</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ds.map((u) => {
            const dk = dks.find((d) => d.userId === u.id);
            return (
              <TableRow key={u.id} data-nguoi={u.username} className="align-top">
                <TableCell>
                  <OTen u={u} cc={cc} />
                </TableCell>
                <TableCell>
                  {dk ? (
                    <BadgeTrangThai trangThai={dk.trangThai} nhan={NHAN_DANG_KY[dk.trangThai]} laDangKy />
                  ) : (
                    <span className="text-sm text-muted-foreground">Chưa đăng ký</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{dk?._count.nhiemVus ?? "—"}</TableCell>
                <TableCell className="text-right">{dk && dk.trangThai !== "NHAP" ? dk.tongDiem : "—"}</TableCell>
                <TableCell>{dk && dk.trangThai !== "NHAP" ? dk.xepLoai : "—"}</TableCell>
                <TableCell className="text-sm">{dk?.nopLuc ? hienNgayGio(dk.nopLuc) : "—"}</TableCell>
                <TableCell className="text-sm">{dk?.duyetLuc ? hienNgayGio(dk.duyetLuc) : "—"}</TableCell>
                <TableCell className="max-w-64 text-sm">
                  {dk?.duyetLuc ? `${ten(dk.nguoiDuyetId)}${dk.nhanXet ? ` · “${dk.nhanXet}”` : ""}` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export async function TabTienDo({ ky, cc }: { ky: Ky; cc: CoCau }) {
  const ds = nguoiLamKpi(cc);
  const kq = await taiKetQua(ky.id, ds);
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người làm KPI</TableHead>
            <TableHead className="text-right">% hoàn thành</TableHead>
            <TableHead className="text-right">Đã chốt</TableHead>
            <TableHead className="text-right">Đang treo</TableHead>
            <TableHead className="text-right">Chờ duyệt</TableHead>
            <TableHead className="text-right">Bị từ chối</TableHead>
            <TableHead className="text-right">Chưa làm</TableHead>
            <TableHead className="text-right">Task vượt</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ds.map((u) => {
            const k = kq.get(u.id)!;
            return (
              <TableRow key={u.id} data-nguoi={u.username}>
                <TableCell>
                  <OTen u={u} cc={cc} />
                </TableCell>
                <TableCell className="text-right font-medium" data-cot="phan-tram">
                  {hienPhanTram(k.phanTram)}
                </TableCell>
                <TableCell className="text-right">{k.thongKe.daChot}</TableCell>
                <TableCell className="text-right">{k.thongKe.dangTreo}</TableCell>
                <TableCell className="text-right">{k.thongKe.choDuyet}</TableCell>
                <TableCell className="text-right">{k.thongKe.tuChoi}</TableCell>
                <TableCell className="text-right">{k.thongKe.chuaLam}</TableCell>
                <TableCell className="text-right">{k.taskVuot.length}</TableCell>
                <TableCell>
                  <Link href={`/admin/cau-hinh/nguoi/${u.id}?kyId=${ky.id}`} className="text-sm font-medium text-primary hover:underline">
                    Xem minh chứng
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const MAU_KQ = {
  KHONG_DAT: "bg-red-100 text-red-800",
  DAT: "bg-accent text-accent-foreground",
  VUOT: "bg-amber-100 text-amber-800",
} as const;

export async function TabKetQua({ ky, cc }: { ky: Ky; cc: CoCau }) {
  if (!ky.daChot) return <p className="text-muted-foreground">{ky.ten} chưa chốt, chưa có kết quả cuối cùng.</p>;
  const kqs = await db.ketQuaKy.findMany({
    where: { kyId: ky.id },
    include: { user: { select: { id: true, hoTen: true, username: true, role: true, boMonId: true, khoaId: true } } },
  });
  const thuTu = (r: string) => DOI_TUONGS.indexOf(r as never);
  kqs.sort((a, b) => thuTu(a.doiTuong) - thuTu(b.doiTuong) || a.user.hoTen.localeCompare(b.user.hoTen));
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người</TableHead>
            <TableHead>Vị trí lúc chốt</TableHead>
            <TableHead>Kết quả</TableHead>
            <TableHead>Xếp loại</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead>Task còn thiếu (lý do)</TableHead>
            <TableHead>Task vượt</TableHead>
            <TableHead className="text-right">Treo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kqs.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                Không có kết quả.
              </TableCell>
            </TableRow>
          )}
          {kqs.map((k) => {
            const thieu = k.taskThieu as MucThieu[];
            const vuot = k.taskVuot as MucVuot[];
            return (
              <TableRow key={k.id} data-nguoi={k.user.username} className="align-top">
                <TableCell>
                  <div className="font-medium">{k.user.hoTen}</div>
                  <div className="text-xs text-muted-foreground">
                    {k.user.username} · {tenDonVi(k.user, cc)}
                  </div>
                </TableCell>
                <TableCell>{TEN_VAI_TRO[k.doiTuong]}</TableCell>
                <TableCell data-cot="ket-qua">
                  <Badge variant="outline" className={`border-transparent ${MAU_KQ[k.ketQua]}`}>
                    {NHAN_KET_QUA[k.ketQua]}
                  </Badge>
                  {k.ghiChu && <div className="mt-1 max-w-48 text-xs text-muted-foreground">{k.ghiChu}</div>}
                </TableCell>
                <TableCell className="font-semibold">{k.xepLoai}</TableCell>
                <TableCell className="text-right">{hienPhanTram(k.phanTram)}</TableCell>
                <TableCell>
                  {thieu.length ? (
                    <details>
                      <summary className="cursor-pointer text-sm">{thieu.length} task</summary>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {thieu.map((t, i) => (
                          <li key={i}>
                            {t.ten} – {t.lyDo}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {vuot.length ? (
                    <ul className="list-inside list-disc text-xs">
                      {vuot.map((t, i) => (
                        <li key={i}>{t.ten}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">{k.soTreo}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
