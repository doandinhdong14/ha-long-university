// Cuối kỳ – làm task và kết quả (mục 5.2): một trang cho GV, TBM, TK, HP.
// Biểu đồ và % dùng chung hàm tinhKetQua (chỉ task DA_CHOT được tính).
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type { TrangThaiDuyet, TrangThaiTask } from "@/generated/prisma/enums";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { DemNguoc } from "@/components/chung/dem-nguoc";
import { BieuDoTron } from "@/components/kpi/bieu-do-tron";
import { KhoiKetQua } from "@/components/kpi/khoi-ket-qua";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { yeuCauNguoiLamKpi } from "@/lib/auth/dal";
import { lyDoThieuNguoi } from "@/lib/co-cau";
import { db } from "@/lib/db";
import type { KetQuaTinh } from "@/lib/ket-qua";
import { CHUOI } from "@/lib/kpi/chuoi";
import { nhanChoNguoiLam } from "@/lib/kpi/trang-thai";
import { NHAN_LOAI_TASK } from "@/lib/nhan";
import { chucDanh } from "@/lib/roles";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { layCoCau } from "@/lib/services/co-cau";
import { taiKetQua } from "@/lib/services/ket-qua";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { deadline, hienNgayGio } from "@/lib/time";
import { XinThemTask, type TaskMoRong } from "./xin-them-task";

export default async function TrangCuoiKy(props: PageProps<"/cuoi-ky">) {
  const u = await yeuCauNguoiLamKpi();
  const { kys, ky } = await layKyTheoUrl((await props.searchParams).kyId);

  if (!ky) {
    return (
      <div>
        <TrangTieuDe tieuDe="Cuối kỳ" />
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      </div>
    );
  }

  const [dk, kpiTasks, yeuCaus, ketQuas, cc, ketQuaKy] = await Promise.all([
    db.dangKy.findUnique({
      where: { kyId_userId: { kyId: ky.id, userId: u.id } },
      include: {
        nhiemVus: {
          include: {
            nhiemVu: { include: { tasks: { where: { loai: "MO_RONG" }, orderBy: [{ thuTu: "asc" }, { ten: "asc" }] } } },
          },
          orderBy: { nhiemVu: { thuTu: "asc" } },
        },
      },
    }),
    db.kpiTask.findMany({
      where: { userId: u.id, kyId: ky.id },
      include: { task: { select: { ten: true, loai: true, thuTu: true, nhiemVuId: true } } },
    }),
    db.yeuCauThemTask.findMany({ where: { userId: u.id, kyId: ky.id }, orderBy: { taoLuc: "desc" } }),
    taiKetQua(ky.id, [u]),
    layCoCau(),
    // Kết quả cuối cùng (chỉ có sau khi chốt kỳ).
    ky.daChot ? db.ketQuaKy.findUnique({ where: { kyId_userId: { kyId: ky.id, userId: u.id } } }) : null,
  ]);
  const kq = ketQuas.get(u.id)!;
  const daDuyet = dk?.trangThai === "DA_DUYET";
  const chucDanhDuyet = chucDanh(CHUOI[u.role].duyet);

  return (
    <div className="space-y-6">
      <TrangTieuDe
        tieuDe="Cuối kỳ"
        moTa={
          <>
            {ky.ten} · Deadline: <strong className="text-foreground">{hienNgayGio(deadline(ky))}</strong>
            {ky.daChot && " · Kỳ đã chốt"}
          </>
        }
      >
        <ChonKy kyId={ky.id} kys={dsChonKy(kys)} />
      </TrangTieuDe>

      {ky.daChot && <KhoiKetQua ketQua={ketQuaKy} />}

      {!daDuyet ? (
        !ky.daChot && (
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4" data-testid="chua-duyet">
            <Info className="size-5 text-muted-foreground" />
            <p>
              Danh sách nhiệm vụ chưa được duyệt.{" "}
              <Link href={`/dau-ky?kyId=${ky.id}`} className="text-primary hover:underline">
                Xem đăng ký
              </Link>
            </p>
          </div>
        )
      ) : (
        <NoiDungCuoiKy
          doiTuong={u.role}
          lyDoKhoa={lyDoKhongThaoTacTask(ky)}
          lyDoThieuDuyet={lyDoThieuNguoi(u, cc, "duyet")}
          chucDanhDuyet={chucDanhDuyet}
          deadlineIso={deadline(ky).toISOString()}
          daChot={ky.daChot}
          xepLoai={dk!.xepLoai}
          kq={kq}
          nhiemVus={dk!.nhiemVus.map((x) => x.nhiemVu)}
          kpiTasks={kpiTasks}
          yeuCaus={yeuCaus}
        />
      )}
    </div>
  );
}

function NoiDungCuoiKy(props: {
  doiTuong: "GV" | "TBM" | "TK" | "HP";
  lyDoKhoa: string | null;
  lyDoThieuDuyet: string | null;
  chucDanhDuyet: string;
  deadlineIso: string;
  daChot: boolean;
  xepLoai: string | null;
  kq: KetQuaTinh;
  nhiemVus: { id: string; ten: string; diem: number; tasks: { id: string; ten: string; moTa: string | null }[] }[];
  kpiTasks: {
    id: string;
    trangThai: TrangThaiTask;
    taskId: string;
    task: { ten: string; loai: "BAT_BUOC" | "MO_RONG"; thuTu: number; nhiemVuId: string };
  }[];
  yeuCaus: { taskId: string; trangThai: TrangThaiDuyet; nhanXet: string | null }[];
}) {
  const { kq } = props;
  const daCo = new Set(props.kpiTasks.map((g) => g.taskId));

  // Task mở rộng thuộc các nhiệm vụ đã duyệt, kèm tình trạng xin.
  const moRong: TaskMoRong[] = props.nhiemVus.flatMap((nv) =>
    nv.tasks.map((t) => {
      const yc = props.yeuCaus.find((y) => y.taskId === t.id);
      return {
        id: t.id,
        ten: t.ten,
        moTa: t.moTa,
        nhiemVu: nv.ten,
        tinhTrang: daCo.has(t.id)
          ? "DA_GIAO"
          : yc?.trangThai === "CHO_DUYET"
            ? "DANG_CHO"
            : yc?.trangThai === "TU_CHOI"
              ? "TU_CHOI"
              : "CHUA_XIN",
        nhanXet: yc?.trangThai === "TU_CHOI" ? yc.nhanXet : null,
      };
    }),
  );

  return (
    <>
      {props.lyDoThieuDuyet && !props.lyDoKhoa && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4" data-testid="thieu-nguoi">
          <AlertTriangle className="mt-0.5 size-5 text-destructive" />
          <p className="text-sm">
            {props.lyDoThieuDuyet} Bạn vẫn nộp được minh chứng; bài nộp sẽ chờ người duyệt được phân công.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tổng quan task bắt buộc</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-6">
          <BieuDoTron tk={kq.thongKe} phanTram={kq.phanTram} />
          <div className="space-y-3">
            <div className="text-sm" data-testid="dang-treo">
              Đang treo: <strong>{kq.soTreo}</strong> task
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Xếp loại đăng ký</div>
              <div className="text-3xl font-bold" data-testid="xep-loai-dang-ky">
                {props.xepLoai}
              </div>
            </div>
            {kq.taskVuot.length > 0 && (
              <Badge className="bg-primary text-primary-foreground" data-testid="task-vuot">
                +{kq.taskVuot.length} task vượt
              </Badge>
            )}
            {!props.daChot && <DemNguoc den={props.deadlineIso} nhan="Còn lại đến deadline" />}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold">Nhiệm vụ và task</h2>
        {props.nhiemVus.map((nv) => {
          const tasks = props.kpiTasks
            .filter((g) => g.task.nhiemVuId === nv.id)
            .sort((a, b) => (a.task.loai === b.task.loai ? a.task.thuTu - b.task.thuTu : a.task.loai === "BAT_BUOC" ? -1 : 1));
          return (
            <Card key={nv.id} data-nhiem-vu={nv.ten}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{nv.ten}</CardTitle>
                <Badge variant="secondary">{nv.diem} điểm</Badge>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-md border">
                  {tasks.map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" data-task={g.task.ten}>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant={g.task.loai === "BAT_BUOC" ? "default" : "outline"} className="w-20 justify-center">
                          {NHAN_LOAI_TASK[g.task.loai]}
                        </Badge>
                        <span>{g.task.ten}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <BadgeTrangThai trangThai={g.trangThai} nhan={nhanChoNguoiLam(g.trangThai, props.doiTuong)} />
                        <Link href={`/cuoi-ky/task/${g.id}`} className="text-sm font-medium text-primary hover:underline">
                          {!props.lyDoKhoa && (g.trangThai === "CHUA_LAM" || g.trangThai === "TU_CHOI") ? "Nộp minh chứng" : "Chi tiết"}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {!props.daChot && <XinThemTask tasks={moRong} lyDoKhoa={props.lyDoKhoa} chucDanhDuyet={props.chucDanhDuyet} />}
    </>
  );
}
