// Trong kỳ – làm task và theo dõi tiến độ (mục 5.2): một trang cho GV, TBM, TK, HP.
// Biểu đồ và % dùng chung hàm tinhKetQua (chỉ task DA_CHOT được tính).
import { AlertTriangle } from "lucide-react";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { DemNguoc } from "@/components/chung/dem-nguoc";
import { KhoiKetQua } from "@/components/kpi/khoi-ket-qua";
import { ChuaDuyetDanhSach, DanhSachTaskCuaToi, TongQuanTask, type KpiTaskCuaToi } from "@/components/kpi/kpi-cua-toi";
import { yeuCauNguoiLamKpi } from "@/lib/auth/dal";
import { lyDoThieuNguoi } from "@/lib/co-cau";
import type { KetQuaTinh } from "@/lib/ket-qua";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { layCoCau } from "@/lib/services/co-cau";
import { taiKpiCuaToi } from "@/lib/services/kpi-cua-toi";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { deadline, hienNgayGio } from "@/lib/time";

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

  const [{ dk, kpiTasks, kq, ketQuaKy }, cc] = await Promise.all([taiKpiCuaToi(ky, u), layCoCau()]);
  const daDuyet = dk?.trangThai === "DA_DUYET";

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
          deadlineIso={deadline(ky).toISOString()}
          daChot={ky.daChot}
          xepLoai={dk!.xepLoai}
          kq={kq}
          nhiemVus={dk!.nhiemVus.map((x) => x.nhiemVu)}
          kpiTasks={kpiTasks}
        />
      )}
    </div>
  );
}

function NoiDungTrongKy(props: {
  doiTuong: "GV" | "TBM" | "TK" | "HP";
  lyDoKhoa: string | null;
  lyDoThieuDuyet: string | null;
  deadlineIso: string;
  daChot: boolean;
  xepLoai: string | null;
  kq: KetQuaTinh;
  nhiemVus: { id: string; ten: string; diem: number; laCaiTien: boolean }[];
  kpiTasks: KpiTaskCuaToi[];
}) {
  const { kq } = props;

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

    </>
  );
}
