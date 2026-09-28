// Màn hình Chốt dùng chung (mục 6.2): TK → task GV, HP → task TBM, HT → task TK.
// Chỉ thấy người mà mình là người chốt, chỉ thấy task CHO_CHOT / DA_CHOT / TRA_VE; không thấy danh sách
// đăng ký, task chưa được duyệt. v1.6: người duyệt bấm Duyệt là task vào Chờ chốt ngay (không còn Gửi lên). Tham số theo vai trò lấy từ bảng cấu hình chuỗi duyệt – chốt.
import Link from "next/link";
import type { TrangThaiTask } from "@/generated/prisma/enums";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { ChiTietTaskQuanLy } from "@/components/kpi/chi-tiet-task-quan-ly";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { nguoiToiChot, tenDonVi } from "@/lib/co-cau";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { viTriDuocChot } from "@/lib/kpi/chuoi";
import { nhanChoQuanLy } from "@/lib/kpi/trang-thai";
import { tenMuc } from "@/lib/menu";
import { NHAN_LOAI_TASK } from "@/lib/nhan";
import { TEN_VAI_TRO } from "@/lib/roles";
import { layCoCau } from "@/lib/services/co-cau";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { hienNgayGio } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BoLocChot } from "./bo-loc";

const NGUOI_CHOT_THAY: TrangThaiTask[] = ["CHO_CHOT", "DA_CHOT", "TRA_VE"];
const TAT_CA = "tat-ca";

export default async function TrangChot(props: PageProps<"/chot">) {
  const m = await yeuCauVaiTro("TK", "HP", "HT");
  const viTri = viTriDuocChot(m.role)!;
  const sp = await props.searchParams;
  const { kys, ky } = await layKyTheoUrl(sp.kyId);
  const tieuDe = tenMuc(m.role, "/chot");

  if (!ky) {
    return (
      <div>
        <TrangTieuDe tieuDe={tieuDe} />
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      </div>
    );
  }

  const cc = await layCoCau();
  const ds = nguoiToiChot(m, cc);
  // Mặc định lọc Chờ chốt (mục 6.2).
  const loc = sp.loc === TAT_CA ? TAT_CA : (NGUOI_CHOT_THAY.find((t) => t === sp.loc) ?? "CHO_CHOT");
  const nguoiLoc = typeof sp.nguoi === "string" && ds.some((x) => x.id === sp.nguoi) ? sp.nguoi : undefined;
  const donVis = [...new Set(ds.map((x) => tenDonVi(x, cc)))].sort();
  const donViLoc = typeof sp.donVi === "string" && donVis.includes(sp.donVi) ? sp.donVi : undefined;
  const idsLoc = ds.filter((x) => (!nguoiLoc || x.id === nguoiLoc) && (!donViLoc || tenDonVi(x, cc) === donViLoc)).map((x) => x.id);

  const [soChoChot, tasks] = await Promise.all([
    db.kpiTask.count({ where: { kyId: ky.id, userId: { in: ds.map((x) => x.id) }, trangThai: "CHO_CHOT", task: TASK_DANG_DUNG } }),
    db.kpiTask.findMany({
      where: { kyId: ky.id, userId: { in: idsLoc }, trangThai: loc === TAT_CA ? { in: NGUOI_CHOT_THAY } : loc, task: TASK_DANG_DUNG },
      // Cũ nhất lên trước theo thời điểm vào Chờ chốt (B10; v1.6: lúc người duyệt duyệt).
      orderBy: [{ guiChotLuc: "asc" }, { capNhatLuc: "asc" }],
      include: {
        user: { select: { hoTen: true, username: true, role: true, boMonId: true, khoaId: true, id: true } },
        task: { select: { ten: true, loai: true, nhiemVu: { select: { ten: true } } } },
      },
    }),
  ]);
  // Task đang mở: tra riêng (vẫn chỉ trong phạm vi được thấy) để vừa chốt xong vẫn còn hiện.
  const chon =
    typeof sp.task === "string"
      ? await db.kpiTask.findFirst({
          where: { id: sp.task, kyId: ky.id, userId: { in: ds.map((x) => x.id) }, trangThai: { in: NGUOI_CHOT_THAY }, task: TASK_DANG_DUNG },
          select: { id: true },
        })
      : null;

  const url = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams({ kyId: ky.id });
    const gop = { loc, nguoi: nguoiLoc, donVi: donViLoc, ...p };
    for (const [k, v] of Object.entries(gop)) if (v) q.set(k, v);
    return `/chot?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <TrangTieuDe
        tieuDe={tieuDe}
        moTa={`${ky.ten} · Task của ${TEN_VAI_TRO[viTri].toLowerCase()} đã được người duyệt duyệt. Chốt xong task được tính hoàn thành ngay.`}
      >
        <ChonKy kyId={ky.id} kys={dsChonKy(kys)} />
      </TrangTieuDe>

      <div className="flex flex-wrap items-end gap-4">
        <div className="rounded-lg border bg-background p-3" data-o-dem="cho-chot">
          <div className="text-2xl font-bold tabular-nums">{soChoChot}</div>
          <div className="text-xs text-muted-foreground">Task chờ chốt</div>
        </div>
        <BoLocChot
          nguois={ds.map((x) => ({ id: x.id, ten: `${x.hoTen} (${x.username})` }))}
          donVis={donVis}
          nguoi={nguoiLoc ?? ""}
          donVi={donViLoc ?? ""}
        />
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {[...NGUOI_CHOT_THAY, TAT_CA].map((t) => (
          <Link
            key={t}
            href={url({ loc: t, task: undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              loc === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t === TAT_CA ? "Tất cả" : nhanChoQuanLy(t as TrangThaiTask)}
          </Link>
        ))}
      </nav>

      {chon && <ChiTietTaskQuanLy kpiTaskId={chon.id} tuCach="CHOT" />}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người làm KPI</TableHead>
              <TableHead>Nhiệm vụ / Task</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Duyệt lúc</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Không có task nào.
                </TableCell>
              </TableRow>
            )}
            {tasks.map((t) => (
              <TableRow key={t.id} data-task={t.task.ten} data-nguoi={t.user.username} className={cn(t.id === chon?.id && "bg-muted/60")}>
                <TableCell>
                  <div className="font-medium">{t.user.hoTen}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.user.username} · {tenDonVi(t.user, cc)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.task.loai === "BAT_BUOC" ? "default" : "outline"} className="w-20 justify-center">
                      {NHAN_LOAI_TASK[t.task.loai]}
                    </Badge>
                    {t.task.ten}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.task.nhiemVu.ten}</div>
                </TableCell>
                <TableCell>
                  <BadgeTrangThai trangThai={t.trangThai} nhan={nhanChoQuanLy(t.trangThai)} />
                </TableCell>
                <TableCell className="text-sm">{t.guiChotLuc ? hienNgayGio(t.guiChotLuc) : "—"}</TableCell>
                <TableCell>
                  <Link href={`${url({ task: t.id })}#chi-tiet-task`} className="text-sm font-medium text-primary hover:underline">
                    {t.trangThai === "CHO_CHOT" ? "Xem và chốt" : "Xem"}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
