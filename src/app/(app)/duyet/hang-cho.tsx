import Link from "next/link";
import type { Ky } from "@/generated/prisma/client";
import type { TrangThaiTask } from "@/generated/prisma/enums";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NguoiDung } from "@/lib/auth/dal";
import { nguoiToiDuyet } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { viTriDuocDuyet } from "@/lib/kpi/chuoi";
import { laGop, nhanChoQuanLy } from "@/lib/kpi/trang-thai";
import { layCoCau } from "@/lib/services/co-cau";
import { LINK } from "@/lib/thong-bao";
import { hienNgayGio } from "@/lib/time";

/**
 * Tab Hàng chờ (mục 6.1): task Chờ duyệt, Bị trả về của những người mình duyệt, cũ nhất lên trước (theo
 * thời điểm đổi trạng thái gần nhất, B10). v1.6: task đã duyệt đã nằm ở người chốt nên không còn ở đây;
 * riêng HT với task HP (tự chốt) vẫn thấy task Đã duyệt, chưa chốt.
 */
export async function HangCho({ m, ky }: { m: NguoiDung; ky: Ky }) {
  const cc = await layCoCau();
  const ids = nguoiToiDuyet(m, cc).map((x) => x.id);
  const viTri = viTriDuocDuyet(m.role);
  const trangThais: TrangThaiTask[] = viTri && laGop(viTri) ? ["CHO_DUYET", "DA_DUYET"] : ["CHO_DUYET", "TRA_VE"];
  const tasks = await db.kpiTask.findMany({
    where: { kyId: ky.id, userId: { in: ids }, trangThai: { in: trangThais } },
    orderBy: { capNhatLuc: "asc" },
    include: {
      user: { select: { hoTen: true, username: true, role: true } },
      task: { select: { ten: true, nhiemVu: { select: { ten: true } } } },
    },
  });

  return (
    <div className="rounded-lg border bg-background" data-testid="hang-cho">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người làm</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Từ lúc</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Không có task nào cần xử lý.
              </TableCell>
            </TableRow>
          )}
          {tasks.map((t) => (
            <TableRow key={t.id} data-task={t.task.ten} data-nguoi={t.user.username}>
              <TableCell>
                <div className="font-medium">{t.user.hoTen}</div>
                <div className="text-xs text-muted-foreground">{t.user.username}</div>
              </TableCell>
              <TableCell>
                <div>{t.task.ten}</div>
                <div className="text-xs text-muted-foreground">{t.task.nhiemVu.ten}</div>
              </TableCell>
              <TableCell>
                <BadgeTrangThai trangThai={t.trangThai} nhan={nhanChoQuanLy(t.trangThai)} />
              </TableCell>
              <TableCell className="text-sm">{hienNgayGio(t.capNhatLuc)}</TableCell>
              <TableCell>
                <Link href={`${LINK.duyetTask(t.userId, ky.id, t.id)}#chi-tiet-task`} className="text-sm font-medium text-primary hover:underline">
                  Xử lý
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
