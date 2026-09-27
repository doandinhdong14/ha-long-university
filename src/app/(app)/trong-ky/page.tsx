// Trong kỳ – làm task và theo dõi tiến độ (mục 5.2): một trang cho GV, TBM, TK, HP.
// Biểu đồ và % dùng chung hàm tinhKetQua (chỉ task DA_CHOT được tính).
import { AlertTriangle } from "lucide-react";
import type { TrangThaiDuyet } from "@/generated/prisma/enums";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { DemNguoc } from "@/components/chung/dem-nguoc";
import { KhoiKetQua } from "@/components/kpi/khoi-ket-qua";
import { ChuaDuyetDanhSach, DanhSachTaskCuaToi, TongQuanTask, type KpiTaskCuaToi } from "@/components/kpi/kpi-cua-toi";
import { yeuCauNguoiLamKpi } from "@/lib/auth/dal";
import { lyDoThieuNguoi } from "@/lib/co-cau";
import { db } from "@/lib/db";
import type { KetQuaTinh } from "@/lib/ket-qua";
import { CHUOI } from "@/lib/kpi/chuoi";
import { chucDanh } from "@/lib/roles";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { layCoCau } from "@/lib/services/co-cau";
import { taiKpiCuaToi } from "@/lib/services/kpi-cua-toi";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { deadline, hienNgayGio } from "@/lib/time";
import { XinThemTask, type TaskMoRong } from "./xin-them-task";

export default async function TrangTrongKy(props: PageProps<"/trong-ky">) {
  const u = await yeuCauNguoiLamKpi();
  const { kys, ky } = await layKyTheoUrl((await props.searchParams).kyId);

  if (!ky) {
    return (
      <div>
        <TrangTieuDe tieuDe="Trong kỳ" />
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      </div>
    );
  }

  const [{ dk, kpiTasks, kq, ketQuaKy }, yeuCaus, cc] = await Promise.all([
    taiKpiCuaToi(ky, u),
    db.yeuCauThemTask.findMany({ where: { userId: u.id, kyId: ky.id }, orderBy: { taoLuc: "desc" } }),
    layCoCau(),
  ]);
  const daDuyet = dk?.trangThai === "DA_DUYET";
  const chucDanhDuyet = chucDanh(CHUOI[u.role].duyet);

  return (
    <div className="space-y-6">
      <TrangTieuDe
        tieuDe="Trong kỳ"
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
        !ky.daChot && <ChuaDuyetDanhSach kyId={ky.id} />
      ) : (
        <NoiDungTrongKy
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

function NoiDungTrongKy(props: {
  doiTuong: "GV" | "TBM" | "TK" | "HP";
  lyDoKhoa: string | null;
  lyDoThieuDuyet: string | null;
  chucDanhDuyet: string;
  deadlineIso: string;
  daChot: boolean;
  xepLoai: string | null;
  kq: KetQuaTinh;
  nhiemVus: { id: string; ten: string; diem: number; tasks: { id: string; ten: string; moTa: string | null }[] }[];
  kpiTasks: KpiTaskCuaToi[];
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

      <TongQuanTask
        kq={kq}
        xepLoai={props.xepLoai}
        dongDau={
          <div className="text-sm" data-testid="dang-treo">
            Đang treo: <strong>{kq.soTreo}</strong> task
          </div>
        }
      >
        {!props.daChot && <DemNguoc den={props.deadlineIso} nhan="Còn lại đến deadline" />}
      </TongQuanTask>

      <DanhSachTaskCuaToi
        tieuDe="Nhiệm vụ và task"
        doiTuong={props.doiTuong}
        nhiemVus={props.nhiemVus}
        kpiTasks={props.kpiTasks}
        lienKet={(g) => ({
          href: `/trong-ky/task/${g.id}`,
          nhan: !props.lyDoKhoa && (g.trangThai === "CHUA_LAM" || g.trangThai === "TU_CHOI") ? "Nộp minh chứng" : "Chi tiết",
        })}
      />

      {!props.daChot && <XinThemTask tasks={moRong} lyDoKhoa={props.lyDoKhoa} chucDanhDuyet={props.chucDanhDuyet} />}
    </>
  );
}
