// Cuối kỳ – những gì đã hoàn thành trong kỳ: chỉ các task đã chốt (DA_CHOT), kèm tổng quan và kết quả kỳ.
// Một trang cho GV, TBM, TK, HP; cùng giao diện với Trong kỳ nhưng chỉ để xem.
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { KhoiKetQua } from "@/components/kpi/khoi-ket-qua";
import { ChuaDuyetDanhSach, DanhSachTaskCuaToi, TongQuanTask } from "@/components/kpi/kpi-cua-toi";
import { yeuCauNguoiLamKpi } from "@/lib/auth/dal";
import { DUOC_TINH } from "@/lib/ket-qua";
import { taiKpiCuaToi } from "@/lib/services/kpi-cua-toi";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { deadline, hienNgayGio } from "@/lib/time";

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

  const { dk, kpiTasks, kq, ketQuaKy } = await taiKpiCuaToi(ky, u);
  const daChot = kpiTasks.filter((g) => DUOC_TINH.includes(g.trangThai));

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

      {dk?.trangThai !== "DA_DUYET" ? (
        !ky.daChot && <ChuaDuyetDanhSach kyId={ky.id} />
      ) : (
        <>
          <TongQuanTask
            kq={kq}
            xepLoai={dk.xepLoai}
            dongDau={
              <div className="text-sm" data-testid="so-da-chot">
                Đã chốt: <strong>{daChot.length}</strong> task
              </div>
            }
          />

          <DanhSachTaskCuaToi
            tieuDe="Task đã chốt – hoàn thành"
            moTa={
              ky.daChot
                ? "Các task đã được chốt trong kỳ."
                : "Kỳ chưa kết thúc: danh sách gồm các task đã được chốt tính đến hiện tại."
            }
            doiTuong={u.role}
            nhiemVus={dk.nhiemVus.map((x) => x.nhiemVu)}
            kpiTasks={daChot}
            lienKet={(g) => ({ href: `/trong-ky/task/${g.id}?tu=cuoi-ky`, nhan: "Chi tiết" })}
            anNhiemVuTrong={{ thongBao: "Chưa có task nào được chốt trong kỳ này." }}
          />
        </>
      )}
    </div>
  );
}
