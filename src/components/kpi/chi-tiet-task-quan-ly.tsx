// Khung xem + xử lý một task cho cấp quản lý (màn hình Duyệt và màn hình Chốt dùng chung):
// minh chứng (PDF/ảnh xem ngay, Word/Excel tải về), ghi chú, link, lịch sử, nhận xét, nút theo máy trạng thái.
// Trang gọi component này phải kiểm tra quyền trước (người duyệt / người chốt của người làm KPI).
import { MessageSquareWarning } from "lucide-react";
import type { DoiTuong } from "@/generated/prisma/enums";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { CHUOI } from "@/lib/kpi/chuoi";
import { taoNutTask } from "@/lib/kpi/nut-task";
import { hanhDongDuocPhep, laGop, nhanChoQuanLy, type TuCach } from "@/lib/kpi/trang-thai";
import { NHAN_LOAI_TASK } from "@/lib/nhan";
import { TEN_VAI_TRO } from "@/lib/roles";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { layLichSuNop, layNhatKyTask } from "@/lib/services/lich-su";
import { hienNgayGio } from "@/lib/time";
import { LichSuNop } from "./lich-su-nop";
import { NhatKyTask } from "./nhat-ky-task";
import { NutThaoTacTask } from "./nut-thao-tac-task";

export async function ChiTietTaskQuanLy({ kpiTaskId, tuCach }: { kpiTaskId: string; tuCach: Exclude<TuCach, "LAM"> }) {
  const kt = await db.kpiTask.findUnique({
    where: { id: kpiTaskId },
    include: {
      ky: true,
      user: { select: { hoTen: true, username: true, role: true } },
      task: { include: { nhiemVu: { select: { ten: true } } } },
    },
  });
  if (!kt) return null;
  const doiTuong = kt.user.role as DoiTuong;
  const lyDoKhoa = lyDoKhongThaoTacTask(kt.ky);
  const nuts = lyDoKhoa ? [] : taoNutTask(hanhDongDuocPhep(tuCach, kt.trangThai, laGop(doiTuong)), doiTuong);
  const [baiNops, nhatKy] = await Promise.all([layLichSuNop(kt.id), layNhatKyTask(kt.id)]);

  return (
    <Card id="chi-tiet-task" data-testid="chi-tiet-task" data-task={kt.task.ten}>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{kt.task.ten}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={kt.task.loai === "BAT_BUOC" ? "default" : "outline"}>{NHAN_LOAI_TASK[kt.task.loai]}</Badge>
            <BadgeTrangThai trangThai={kt.trangThai} nhan={nhanChoQuanLy(kt.trangThai)} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {kt.task.nhiemVu.ten} · {kt.user.hoTen} ({kt.user.username}) · {TEN_VAI_TRO[doiTuong]}
          {kt.guiChotLuc && ` · Duyệt, chờ chốt từ ${hienNgayGio(kt.guiChotLuc)}`}
          {kt.chotLuc && ` · Chốt lúc ${hienNgayGio(kt.chotLuc)}`}
        </p>
        {kt.task.moTa && <p className="text-sm text-muted-foreground">{kt.task.moTa}</p>}
      </CardHeader>
      <CardContent className="space-y-5">
        {kt.nhanXetChot && (
          <div
            className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm dark:bg-orange-950/30"
            data-testid="nhan-xet-chot"
          >
            <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-orange-600" />
            <div>
              <span className="font-medium">Nhận xét của {TEN_VAI_TRO[CHUOI[doiTuong].chot].toLowerCase()} khi trả về: </span>
              {kt.nhanXetChot}
            </div>
          </div>
        )}
        {lyDoKhoa ? (
          <p className="text-sm text-destructive">{lyDoKhoa}</p>
        ) : (
          <NutThaoTacTask kpiTaskId={kt.id} nuts={nuts} />
        )}
        <div>
          <h3 className="mb-2 text-sm font-semibold">Minh chứng</h3>
          <LichSuNop baiNops={baiNops} xemNgayLanMoiNhat />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Lịch sử xử lý</h3>
          <NhatKyTask ds={nhatKy} />
        </div>
      </CardContent>
    </Card>
  );
}
