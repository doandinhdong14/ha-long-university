// Đầu kỳ – Đăng ký nhiệm vụ (mục 5.1): một trang cho GV, TBM, TK, HP; mỗi vị trí chỉ thấy
// nhiệm vụ và bảng xếp loại của vị trí mình, người duyệt lấy theo mục 3.2.
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { yeuCauNguoiLamKpi } from "@/lib/auth/dal";
import { lyDoKhongGuiDangKy } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { CHUOI } from "@/lib/kpi/chuoi";
import { chucDanh } from "@/lib/roles";
import { lyDoKhongSuaDangKy } from "@/lib/rules";
import { layCoCau } from "@/lib/services/co-cau";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { deadline, hanDangKy, hienNgayGio } from "@/lib/time";
import { DangKyNhiemVu } from "./dang-ky-nhiem-vu";

export default async function TrangDauKy(props: PageProps<"/dau-ky">) {
  const u = await yeuCauNguoiLamKpi();
  const { kys, ky } = await layKyTheoUrl((await props.searchParams).kyId);

  if (!ky) {
    return (
      <div>
        <TrangTieuDe tieuDe="Đầu kỳ – Đăng ký nhiệm vụ" />
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      </div>
    );
  }

  const [nhiemVus, bacs, dk, cc] = await Promise.all([
    db.nhiemVu.findMany({
      where: { kyId: ky.id, doiTuong: u.role, laCaiTien: false },
      orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
      include: { tasks: { orderBy: [{ thuTu: "asc" }, { ten: "asc" }], select: { id: true, ten: true, loai: true } } },
    }),
    db.bacXepLoai.findMany({ where: { kyId: ky.id, doiTuong: u.role }, orderBy: { diemToiThieu: "desc" } }),
    db.dangKy.findUnique({
      where: { kyId_userId: { kyId: ky.id, userId: u.id } },
      include: { nhiemVus: { select: { nhiemVuId: true } } },
    }),
    layCoCau(),
  ]);
  const lyDoKhoa = lyDoKhongSuaDangKy(ky, dk?.trangThai ?? null);

  return (
    <div className="pb-28">
      <TrangTieuDe
        tieuDe="Đầu kỳ – Đăng ký nhiệm vụ"
        moTa={
          <>
            {ky.ten} · Hạn đăng ký: <strong className="text-foreground">{hienNgayGio(hanDangKy(ky))}</strong> · Deadline:{" "}
            <strong className="text-foreground">{hienNgayGio(deadline(ky))}</strong>
          </>
        }
      >
        <ChonKy kyId={ky.id} kys={dsChonKy(kys)} />
      </TrangTieuDe>

      <DangKyNhiemVu
        key={ky.id}
        kyId={ky.id}
        chucDanhDuyet={chucDanh(CHUOI[u.role].duyet)}
        lyDoThieuNguoi={lyDoKhongGuiDangKy(u, cc)}
        nhiemVus={nhiemVus.map((nv) => ({ id: nv.id, ten: nv.ten, moTa: nv.moTa, diem: nv.diem, tasks: nv.tasks }))}
        bacs={bacs.map((b) => ({ ten: b.ten, diemToiThieu: b.diemToiThieu }))}
        daChon={dk?.nhiemVus.map((x) => x.nhiemVuId) ?? []}
        dangKy={
          dk
            ? {
                trangThai: dk.trangThai,
                nhanXet: dk.nhanXet,
                tongDiem: dk.tongDiem,
                xepLoai: dk.xepLoai,
                nopLuc: dk.nopLuc ? hienNgayGio(dk.nopLuc) : null,
                duyetLuc: dk.duyetLuc ? hienNgayGio(dk.duyetLuc) : null,
              }
            : null
        }
        lyDoKhoa={lyDoKhoa}
        hanDangKy={hanDangKy(ky).toISOString()}
        deadline={deadline(ky).toISOString()}
        deadlineHienThi={hienNgayGio(deadline(ky))}
      />
    </div>
  );
}
