// Chi tiết một task đã chốt trong mục Theo dõi (spec-v1.6 mục 8.3): CHỈ ĐỌC – minh chứng (PDF/ảnh xem ngay,
// Word/Excel tải về), ghi chú, link, lịch sử (duyệt, chốt, nhận xét). Không có nút thao tác.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { LichSuNop } from "@/components/kpi/lich-su-nop";
import { NhatKyTask } from "@/components/kpi/nhat-ky-task";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { NHAN_LOAI_TASK, NHAN_TASK } from "@/lib/nhan";
import { TEN_VAI_TRO } from "@/lib/roles";
import { layLichSuNop, layNhatKyTask } from "@/lib/services/lich-su";
import { layTaskTheoDoi } from "@/lib/services/theo-doi";
import { hienNgayGio } from "@/lib/time";

export default async function TrangTaskTheoDoi(props: PageProps<"/theo-doi/task/[kpiTaskId]">) {
  const m = await yeuCauVaiTro("HP", "HT");
  const { kpiTaskId } = await props.params;
  const kt = await layTaskTheoDoi(m, kpiTaskId);
  if (!kt) notFound();
  const [baiNops, nhatKy] = await Promise.all([layLichSuNop(kt.id), layNhatKyTask(kt.id)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/theo-doi?kyId=${kt.ky.id}`} className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="size-4" /> Theo dõi kết quả đã chốt
        </Link>
        <TrangTieuDe tieuDe={kt.task.ten} moTa={`${kt.task.nhiemVu.ten} · ${kt.ky.ten}`} />
      </div>

      <Card data-testid="chi-tiet-theo-doi" data-task={kt.task.ten}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {kt.nguoi.hoTen} <span className="font-normal text-muted-foreground">({kt.nguoi.username})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={kt.task.loai === "BAT_BUOC" ? "default" : "outline"}>{NHAN_LOAI_TASK[kt.task.loai]}</Badge>
            <BadgeTrangThai trangThai={kt.trangThai} nhan={NHAN_TASK[kt.trangThai]} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            <dt className="text-muted-foreground">Chức vụ</dt>
            <dd>{TEN_VAI_TRO[kt.nguoi.chucVu]}</dd>
            <dt className="text-muted-foreground">Đơn vị</dt>
            <dd>{kt.nguoi.donVi}</dd>
            <dt className="text-muted-foreground">Người duyệt</dt>
            <dd data-testid="nguoi-duyet">{kt.nguoiDuyet}</dd>
            <dt className="text-muted-foreground">Người chốt</dt>
            <dd data-testid="nguoi-chot">{kt.nguoiChot}</dd>
            <dt className="text-muted-foreground">Ngày chốt</dt>
            <dd>{kt.chotLuc ? hienNgayGio(kt.chotLuc) : "—"}</dd>
          </dl>
          {kt.task.moTa && <p className="text-sm text-muted-foreground">{kt.task.moTa}</p>}
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
    </div>
  );
}
