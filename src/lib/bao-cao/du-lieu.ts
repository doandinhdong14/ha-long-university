// Dữ liệu Xuất báo cáo (mục 6.3), dùng chung cho TBM, TK, HP, HT; chỉ khác phạm vi (phamViBaoCao).
// Kỳ chưa chốt: kết quả tính tại thời điểm xuất bằng hàm dùng chung (TẠM TÍNH); đã chốt: lấy KetQuaKy.
// Không gồm KPI của chính người xuất, không kèm file minh chứng (A1: báo cáo làm đúng 6.3).
import "server-only";
import type { DoiTuong, LoaiTask } from "@/generated/prisma/enums";
import type { NguoiDung } from "@/lib/auth/dal";
import { khoaPhuTrach, phamViBaoCao, tenDonVi } from "@/lib/co-cau";
import { db } from "@/lib/db";
import type { KetQuaTinh, MucThieu, MucVuot } from "@/lib/ket-qua";
import { DUOC_TINH } from "@/lib/ket-qua";
import { nhanChoQuanLy } from "@/lib/kpi/trang-thai";
import { LoiNghiepVu } from "@/lib/loi";
import { NHAN_DANG_KY, NHAN_KET_QUA, NHAN_LOAI_TASK } from "@/lib/nhan";
import { DOI_TUONGS, TEN_VAI_TRO } from "@/lib/roles";
import { taiCoCau } from "@/lib/services/co-cau";
import { taiKetQua } from "@/lib/services/ket-qua";
import { homNayVN } from "@/lib/time";

export type DongTask = {
  nhiemVu: string;
  ten: string;
  loai: string;
  trangThai: string;
  duocTinh: boolean;
  ngayNopGanNhat: Date | null;
  soLanNop: number;
  nhanXetDuyet: string | null;
  nhanXetChot: string | null;
  ngayChot: Date | null;
};

export type DongNguoi = {
  id: string;
  hoTen: string;
  username: string;
  role: DoiTuong;
  chucVu: string;
  donVi: string;
  dangKy: { trangThai: string; nhiemVus: { ten: string; diem: number }[]; tongDiem: number | null; xepLoai: string | null };
  ketQua: {
    phanTram: number;
    ketQua: string;
    xepLoai: string;
    taskThieu: MucThieu[];
    taskVuot: MucVuot[];
    soTreo: number;
    ghiChu: string | null;
  };
  tasks: DongTask[];
};

export type DuLieuBaoCao = {
  ky: { ten: string; soKy: number; namHoc: string };
  tamTinh: boolean;
  tinhTrang: "Tạm tính" | "Đã chốt kỳ";
  nguoiXuat: { hoTen: string; role: NguoiDung["role"] };
  /** Dòng đơn vị ở đầu PDF (KHOA … cho TBM, TK; BỘ MÔN … chỉ TBM) và tên đơn vị trong tên file. */
  donVi: { khoa: string | null; boMon: string | null; tenFile: string };
  viTris: DoiTuong[];
  motNguoi: boolean;
  nguois: DongNguoi[];
  ngayXuat: string;
};

export async function layDuLieuBaoCao(
  m: NguoiDung,
  input: { kyId: string; viTris: string[]; nguoiId?: string | null },
): Promise<DuLieuBaoCao> {
  const ky = await db.ky.findUnique({ where: { id: input.kyId } });
  if (!ky || !ky.daCongBo) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);

  const cc = await taiCoCau();
  const pv = phamViBaoCao(m, cc);
  if (!pv.viTris.length) throw new LoiNghiepVu("Bạn không có quyền xuất báo cáo.", 403);
  const viTris = pv.viTris.filter((v) => input.viTris.includes(v));
  if (!viTris.length) throw new LoiNghiepVu("Vui lòng chọn ít nhất 1 chức vụ trong phạm vi của bạn.");

  let nguois = pv.nguoi.filter((u) => (viTris as string[]).includes(u.role));
  if (input.nguoiId) {
    const mot = pv.nguoi.find((u) => u.id === input.nguoiId);
    if (!mot) throw new LoiNghiepVu("Người này không thuộc phạm vi báo cáo của bạn.", 403);
    nguois = [mot];
  }
  const thuTu = (r: string) => DOI_TUONGS.indexOf(r as DoiTuong);
  nguois.sort((a, b) => thuTu(a.role) - thuTu(b.role) || tenDonVi(a, cc).localeCompare(tenDonVi(b, cc)) || a.hoTen.localeCompare(b.hoTen));
  const ids = nguois.map((u) => u.id);

  const [dangKys, kpiTasks, ketQuaDaChot, tamTinh] = await Promise.all([
    db.dangKy.findMany({
      where: { kyId: ky.id, userId: { in: ids } },
      include: { nhiemVus: { include: { nhiemVu: { select: { ten: true, diem: true, thuTu: true } } } } },
    }),
    db.kpiTask.findMany({
      where: { kyId: ky.id, userId: { in: ids } },
      include: {
        task: { select: { ten: true, loai: true, thuTu: true, nhiemVu: { select: { ten: true, thuTu: true } } } },
        baiNops: { orderBy: { nopLuc: "desc" }, select: { nopLuc: true, nhanXet: true, duyetLuc: true } },
      },
    }),
    ky.daChot ? db.ketQuaKy.findMany({ where: { kyId: ky.id, userId: { in: ids } } }) : Promise.resolve([]),
    taiKetQua(ky.id, nguois),
  ]);

  const ketQuaCua = (id: string): KetQuaTinh | null => {
    const k = ketQuaDaChot.find((x) => x.userId === id);
    if (!k) return tamTinh.get(id) ?? null;
    return {
      ketQua: k.ketQua,
      xepLoai: k.xepLoai,
      phanTram: k.phanTram,
      taskThieu: k.taskThieu as MucThieu[],
      taskVuot: k.taskVuot as MucVuot[],
      soTreo: k.soTreo,
      ghiChu: k.ghiChu,
      thongKe: tamTinh.get(id)!.thongKe,
    };
  };

  const dong: DongNguoi[] = nguois.map((u) => {
    const role = u.role as DoiTuong;
    const dk = dangKys.find((d) => d.userId === u.id);
    const kq = ketQuaCua(u.id)!;
    const tasks = kpiTasks
      .filter((k) => k.userId === u.id)
      .sort(
        (a, b) =>
          a.task.nhiemVu.thuTu - b.task.nhiemVu.thuTu ||
          (a.task.loai === b.task.loai ? a.task.thuTu - b.task.thuTu : a.task.loai === "BAT_BUOC" ? -1 : 1),
      )
      .map((k) => {
        const daXuLy = k.baiNops.find((b) => b.duyetLuc);
        return {
          nhiemVu: k.task.nhiemVu.ten,
          ten: k.task.ten,
          loai: NHAN_LOAI_TASK[k.task.loai as LoaiTask],
          trangThai: nhanChoQuanLy(k.trangThai),
          duocTinh: DUOC_TINH.includes(k.trangThai),
          ngayNopGanNhat: k.baiNops[0]?.nopLuc ?? null,
          soLanNop: k.baiNops.length,
          nhanXetDuyet: daXuLy?.nhanXet ?? null,
          nhanXetChot: k.nhanXetChot,
          ngayChot: k.chotLuc,
        };
      });
    return {
      id: u.id,
      hoTen: u.hoTen,
      username: u.username,
      role,
      chucVu: TEN_VAI_TRO[role],
      donVi: tenDonVi(u, cc),
      dangKy: {
        trangThai: dk ? NHAN_DANG_KY[dk.trangThai] : "Chưa đăng ký",
        nhiemVus: (dk?.nhiemVus ?? [])
          .map((x) => x.nhiemVu)
          .sort((a, b) => a.thuTu - b.thuTu)
          .map((nv) => ({ ten: nv.ten, diem: nv.diem })),
        tongDiem: dk && dk.trangThai !== "NHAP" ? dk.tongDiem : null,
        xepLoai: dk && dk.trangThai !== "NHAP" ? dk.xepLoai : null,
      },
      ketQua: {
        phanTram: kq.phanTram,
        ketQua: NHAN_KET_QUA[kq.ketQua],
        xepLoai: kq.xepLoai,
        taskThieu: kq.taskThieu,
        taskVuot: kq.taskVuot,
        soTreo: kq.soTreo,
        ghiChu: kq.ghiChu,
      },
      tasks,
    };
  });

  return {
    ky: { ten: ky.ten, soKy: ky.soKy, namHoc: ky.namHoc },
    tamTinh: !ky.daChot,
    tinhTrang: ky.daChot ? "Đã chốt kỳ" : "Tạm tính",
    nguoiXuat: { hoTen: m.hoTen, role: m.role },
    donVi: donViNguoiXuat(m, cc),
    viTris,
    motNguoi: !!input.nguoiId,
    nguois: dong,
    ngayXuat: homNayVN(),
  };
}

/** Đơn vị của người xuất: dòng KHOA/BỘ MÔN ở đầu PDF và tên đơn vị trong tên file (B15). */
function donViNguoiXuat(m: NguoiDung, cc: Awaited<ReturnType<typeof taiCoCau>>) {
  switch (m.role) {
    case "TBM": {
      const bm = cc.boMons.find((b) => b.id === m.boMonId);
      const khoa = cc.khoas.find((k) => k.id === bm?.khoaId);
      return { khoa: khoa?.ten ?? null, boMon: bm?.ten ?? null, tenFile: bm?.ten ?? "BoMon" };
    }
    case "TK": {
      const khoa = cc.khoas.find((k) => k.id === m.khoaId);
      return { khoa: khoa?.ten ?? null, boMon: null, tenFile: khoa?.ten ?? "Khoa" };
    }
    case "HP": {
      const ds = khoaPhuTrach(m.id, cc);
      const ten = ds.length === 1 ? cc.khoas.find((k) => k.id === ds[0])!.ten : "CacKhoaPhuTrach";
      return { khoa: null, boMon: null, tenFile: ten };
    }
    default:
      return { khoa: null, boMon: null, tenFile: "ToanTruong" };
  }
}
