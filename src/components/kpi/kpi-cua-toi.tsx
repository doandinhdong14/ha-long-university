// Phần giao diện KPI của chính người làm, dùng chung cho trang Trong kỳ và Cuối kỳ.
import Link from "next/link";
import { Info, Lightbulb } from "lucide-react";
import type { DoiTuong, LoaiTask, TrangThaiTask } from "@/generated/prisma/enums";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { BieuDoTron } from "@/components/kpi/bieu-do-tron";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KetQuaTinh } from "@/lib/ket-qua";
import { nhanChoNguoiLam } from "@/lib/kpi/trang-thai";
import { NHAN_LOAI_TASK } from "@/lib/nhan";

export type KpiTaskCuaToi = {
  id: string;
  trangThai: TrangThaiTask;
  taskId: string;
  task: { ten: string; loai: LoaiTask; thuTu: number; nhiemVuId: string };
};

/** Danh sách nhiệm vụ chưa được duyệt: chưa có task để làm. */
export function ChuaDuyetDanhSach({ kyId }: { kyId: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-4" data-testid="chua-duyet">
      <Info className="size-5 text-muted-foreground" />
      <p>
        Danh sách nhiệm vụ chưa được duyệt.{" "}
        <Link href={`/dau-ky?kyId=${kyId}`} className="text-primary hover:underline">
          Xem đăng ký
        </Link>
      </p>
    </div>
  );
}

/** Thẻ tổng quan task bắt buộc: biểu đồ tròn, xếp loại đăng ký, task vượt. */
export function TongQuanTask({
  kq,
  xepLoai,
  dongDau,
  children,
}: {
  kq: KetQuaTinh;
  xepLoai: string | null;
  /** Dòng số liệu đầu cột bên phải (vd số task đang treo). */
  dongDau: React.ReactNode;
  /** Thêm ở cuối cột bên phải (vd đếm ngược deadline). */
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tổng quan task bắt buộc</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-6">
        <BieuDoTron tk={kq.thongKe} phanTram={kq.phanTram} />
        <div className="space-y-3">
          {dongDau}
          <div>
            <div className="text-xs text-muted-foreground">Xếp loại đăng ký</div>
            <div className="text-3xl font-bold" data-testid="xep-loai-dang-ky">
              {xepLoai}
            </div>
          </div>
          {kq.taskVuot.length > 0 && (
            <Badge className="bg-primary text-primary-foreground" data-testid="task-vuot">
              +{kq.taskVuot.length} task vượt
            </Badge>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Nhiệm vụ đã duyệt và task của từng nhiệm vụ. v1.6 (mục 2.6): người có đăng ký cải tiến sáng tạo thấy thêm khối
 * "Cải tiến sáng tạo" bên dưới danh sách nhiệm vụ, chứa task cải tiến (cùng giao diện, cùng vòng trạng thái).
 */
export function DanhSachTaskCuaToi(props: {
  tieuDe: string;
  moTa?: string;
  doiTuong: DoiTuong;
  nhiemVus: { id: string; ten: string; diem: number; laCaiTien?: boolean }[];
  kpiTasks: KpiTaskCuaToi[];
  /** Đường dẫn và chữ của link ở cuối mỗi dòng task. */
  lienKet: (g: KpiTaskCuaToi) => { href: string; nhan: string };
  /** Ẩn nhiệm vụ không có task nào trong danh sách, và câu hiện khi không còn nhiệm vụ nào. */
  anNhiemVuTrong?: { thongBao: string };
}) {
  const tatCa = props.nhiemVus
    .map((nv) => ({
      nv,
      tasks: props.kpiTasks
        .filter((g) => g.task.nhiemVuId === nv.id)
        .sort((a, b) => (a.task.loai === b.task.loai ? a.task.thuTu - b.task.thuTu : a.task.loai === "BAT_BUOC" ? -1 : 1)),
    }))
    .filter((x) => !props.anNhiemVuTrong || x.tasks.length > 0);
  const nhom = tatCa.filter((x) => !x.nv.laCaiTien);
  const caiTien = tatCa.find((x) => x.nv.laCaiTien && x.tasks.length > 0);
  const dongTask = (g: KpiTaskCuaToi) => {
    const lk = props.lienKet(g);
    return (
      <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" data-task={g.task.ten}>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={g.task.loai === "BAT_BUOC" ? "default" : "outline"} className="min-w-20 justify-center">
            {NHAN_LOAI_TASK[g.task.loai]}
          </Badge>
          <span>{g.task.ten}</span>
        </div>
        <div className="flex items-center gap-3">
          <BadgeTrangThai trangThai={g.trangThai} nhan={nhanChoNguoiLam(g.trangThai, props.doiTuong)} />
          <Link href={lk.href} className="text-sm font-medium text-primary hover:underline">
            {lk.nhan}
          </Link>
        </div>
      </li>
    );
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{props.tieuDe}</h2>
        {props.moTa && <p className="text-sm text-muted-foreground">{props.moTa}</p>}
      </div>
      {nhom.length === 0 && !caiTien && props.anNhiemVuTrong && (
        <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground" data-testid="danh-sach-trong">
          {props.anNhiemVuTrong.thongBao}
        </p>
      )}
      {nhom.map(({ nv, tasks }) => (
        <Card key={nv.id} data-nhiem-vu={nv.ten}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{nv.ten}</CardTitle>
            <Badge variant="secondary">{nv.diem} điểm</Badge>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-md border">{tasks.map(dongTask)}</ul>
          </CardContent>
        </Card>
      ))}
      {caiTien && (
        <Card data-testid="khoi-cai-tien-task" className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-500" /> Cải tiến sáng tạo
            </CardTitle>
            <p className="text-sm text-muted-foreground">Hoàn thành và được chốt: +10% (tối đa 110%). Không bù được task bắt buộc còn thiếu.</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-md border bg-background">{caiTien.tasks.map(dongTask)}</ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
