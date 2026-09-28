import Link from "next/link";
import type { Ky } from "@/generated/prisma/client";
import type { DoiTuong, TrangThaiTask } from "@/generated/prisma/enums";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { ChiTietTaskQuanLy } from "@/components/kpi/chi-tiet-task-quan-ly";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { laGop, nhanChoQuanLy } from "@/lib/kpi/trang-thai";
import { NHAN_LOAI_TASK } from "@/lib/nhan";
import { hienNgayGio } from "@/lib/time";
import { cn } from "@/lib/utils";

const TAT_CA_TRANG_THAI: TrangThaiTask[] = ["CHUA_LAM", "CHO_DUYET", "TU_CHOI", "DA_DUYET", "CHO_CHOT", "TRA_VE", "DA_CHOT"];

/** Tab Task và minh chứng (mục 6.1): lọc theo trạng thái, mở một task để xem minh chứng và xử lý. */
export async function TabTask({
  ky,
  nguoi,
  loc,
  taskId,
}: {
  ky: Ky;
  nguoi: { id: string; role: string };
  loc: string | undefined;
  taskId: string | undefined;
}) {
  const doiTuong = nguoi.role as DoiTuong;
  // Task HP không dùng Chờ chốt / Bị trả về; task GV, TBM, TK không còn dừng ở Đã duyệt (v1.6, không còn Gửi lên).
  const trangThais = laGop(doiTuong)
    ? TAT_CA_TRANG_THAI.filter((t) => t !== "CHO_CHOT" && t !== "TRA_VE")
    : TAT_CA_TRANG_THAI.filter((t) => t !== "DA_DUYET");
  const kpiTasks = await db.kpiTask.findMany({
    where: { kyId: ky.id, userId: nguoi.id, task: TASK_DANG_DUNG },
    include: {
      task: { select: { ten: true, loai: true, thuTu: true, nhiemVu: { select: { ten: true, thuTu: true } } } },
      _count: { select: { baiNops: true } },
    },
  });
  kpiTasks.sort(
    (a, b) =>
      a.task.nhiemVu.thuTu - b.task.nhiemVu.thuTu ||
      (a.task.loai === b.task.loai ? a.task.thuTu - b.task.thuTu : a.task.loai === "BAT_BUOC" ? -1 : 1),
  );
  const locHopLe = trangThais.find((t) => t === loc);
  const hienThi = locHopLe ? kpiTasks.filter((t) => t.trangThai === locHopLe) : kpiTasks;
  const chon = kpiTasks.find((t) => t.id === taskId);
  const url = (p: { loc?: string; task?: string }) => {
    const q = new URLSearchParams({ kyId: ky.id, tab: "task" });
    if (p.loc) q.set("loc", p.loc);
    if (p.task) q.set("task", p.task);
    return `/duyet/${nguoi.id}?${q.toString()}`;
  };

  if (!kpiTasks.length) {
    return <p className="text-muted-foreground">Chưa có task nào (danh sách nhiệm vụ chưa được duyệt).</p>;
  }

  return (
    <div className="space-y-4">
      {chon && <ChiTietTaskQuanLy kpiTaskId={chon.id} tuCach="DUYET" />}

      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {[undefined, ...trangThais].map((t) => {
          const so = t ? kpiTasks.filter((k) => k.trangThai === t).length : kpiTasks.length;
          return (
            <Link
              key={t ?? "tat-ca"}
              href={url({ loc: t })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                (locHopLe ?? undefined) === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {t ? nhanChoQuanLy(t) : "Tất cả"} ({so})
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhiệm vụ</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Số lần nộp</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hienThi.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  Không có task ở trạng thái này.
                </TableCell>
              </TableRow>
            )}
            {hienThi.map((k) => (
              <TableRow key={k.id} data-task={k.task.ten} className={cn(k.id === chon?.id && "bg-muted/60")}>
                <TableCell className="text-sm text-muted-foreground">{k.task.nhiemVu.ten}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={k.task.loai === "BAT_BUOC" ? "default" : "outline"} className="w-20 justify-center">
                      {NHAN_LOAI_TASK[k.task.loai]}
                    </Badge>
                    {k.task.ten}
                  </div>
                </TableCell>
                <TableCell>
                  <BadgeTrangThai trangThai={k.trangThai} nhan={nhanChoQuanLy(k.trangThai)} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{k._count.baiNops}</TableCell>
                <TableCell className="text-sm">{hienNgayGio(k.capNhatLuc)}</TableCell>
                <TableCell>
                  <Link href={`${url({ loc: locHopLe, task: k.id })}#chi-tiet-task`} className="text-sm font-medium text-primary hover:underline">
                    Mở
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
