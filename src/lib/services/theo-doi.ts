// "Theo dõi kết quả đã chốt" (spec-v1.6 mục 8): Hiệu phó, Hiệu trưởng xem – CHỈ XEM – các task đã chốt (DA_CHOT)
// trong phạm vi phamViTheoDoi. Task ở trạng thái khác không hiện. Không có thao tác ghi, không gửi thông báo.
import "server-only";
import type { DoiTuong } from "@/generated/prisma/enums";
import type { NguoiDung } from "@/lib/auth/dal";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { khoaCua, phamViTheoDoi, tenDonVi, type CoCau, type NguoiCoCau } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { layCoCau } from "@/lib/services/co-cau";

export const SO_DONG_MOI_TRANG = 50;

export type LocTheoDoi = {
  khoa?: string;
  boMon?: string;
  viTri?: DoiTuong;
  nguoi?: string;
  /** Nhiệm vụ (task bắt buộc) hoặc Cải tiến sáng tạo. */
  loai?: "nhiem-vu" | "cai-tien";
  trang: number;
};

/** Người trong phạm vi sau khi áp bộ lọc khoa / bộ môn / chức vụ / người. */
function locNguoi(ds: NguoiCoCau[], cc: CoCau, loc: LocTheoDoi) {
  return ds.filter(
    (u) =>
      (!loc.khoa || khoaCua(u, cc) === loc.khoa) &&
      (!loc.boMon || u.boMonId === loc.boMon) &&
      (!loc.viTri || u.role === loc.viTri) &&
      (!loc.nguoi || u.id === loc.nguoi),
  );
}

const tenNguoi = (cc: CoCau, id: string | null) => (id ? (cc.users.find((u) => u.id === id)?.hoTen ?? "(tài khoản đã xóa)") : "—");

/** Dữ liệu trang Theo dõi: ô đếm theo chức vụ, lựa chọn bộ lọc, một trang task đã chốt (mới chốt nhất trước). */
export async function layTheoDoi(m: NguoiDung, kyId: string, loc: LocTheoDoi) {
  const cc = await layCoCau();
  const pv = phamViTheoDoi(m, cc);
  const nguois = locNguoi(pv.nguoi, cc, loc);
  const where = {
    kyId,
    trangThai: "DA_CHOT" as const,
    userId: { in: nguois.map((u) => u.id) },
    task: loc.loai === "cai-tien" ? { loai: "CAI_TIEN" as const } : loc.loai === "nhiem-vu" ? { loai: "BAT_BUOC" as const } : TASK_DANG_DUNG,
  };

  const [tong, tasks, demTheoNguoi] = await Promise.all([
    db.kpiTask.count({ where }),
    db.kpiTask.findMany({
      where,
      orderBy: [{ chotLuc: "desc" }, { id: "asc" }],
      skip: (loc.trang - 1) * SO_DONG_MOI_TRANG,
      take: SO_DONG_MOI_TRANG,
      include: {
        task: { select: { ten: true, loai: true, nhiemVu: { select: { ten: true } } } },
        // Người duyệt: lấy từ bài nộp đã duyệt gần nhất (mục 8.3).
        baiNops: { where: { trangThai: "DA_DUYET" }, orderBy: { duyetLuc: "desc" }, take: 1, select: { nguoiDuyetId: true } },
      },
    }),
    // Ô đếm: số task đã chốt theo chức vụ trong cả phạm vi của kỳ (không theo bộ lọc).
    db.kpiTask.groupBy({
      by: ["userId"],
      where: { kyId, trangThai: "DA_CHOT", userId: { in: pv.nguoi.map((u) => u.id) }, task: TASK_DANG_DUNG },
      _count: true,
    }),
  ]);

  const dem = Object.fromEntries(pv.viTris.map((v) => [v, 0])) as Record<DoiTuong, number>;
  for (const d of demTheoNguoi) {
    const u = pv.nguoi.find((x) => x.id === d.userId);
    if (u) dem[u.role as DoiTuong] += d._count;
  }

  const khoaIds = new Set(pv.nguoi.map((u) => khoaCua(u, cc)).filter((x): x is string => !!x));
  return {
    viTris: pv.viTris,
    dem,
    tong,
    soTrang: Math.max(1, Math.ceil(tong / SO_DONG_MOI_TRANG)),
    luaChon: {
      khoas: cc.khoas.filter((k) => khoaIds.has(k.id)).map((k) => ({ id: k.id, ten: k.ten })),
      boMons: cc.boMons
        .filter((b) => khoaIds.has(b.khoaId) && (!loc.khoa || b.khoaId === loc.khoa))
        .map((b) => ({ id: b.id, ten: b.ten })),
      nguois: locNguoi(pv.nguoi, cc, { ...loc, nguoi: undefined }).map((u) => ({ id: u.id, ten: `${u.hoTen} (${u.username})` })),
    },
    dong: tasks.map((k) => {
      const u = pv.nguoi.find((x) => x.id === k.userId)!;
      return {
        id: k.id,
        hoTen: u.hoTen,
        username: u.username,
        chucVu: u.role as DoiTuong,
        donVi: tenDonVi(u, cc),
        nhiemVu: k.task.nhiemVu.ten,
        task: k.task.ten,
        laCaiTien: k.task.loai === "CAI_TIEN",
        nguoiDuyet: tenNguoi(cc, k.baiNops[0]?.nguoiDuyetId ?? null),
        nguoiChot: tenNguoi(cc, k.nguoiChotId),
        chotLuc: k.chotLuc,
      };
    }),
  };
}

/** Một task đã chốt trong phạm vi Theo dõi của m (null nếu không có / ngoài phạm vi / chưa chốt → trang trả 404). */
export async function layTaskTheoDoi(m: NguoiDung, kpiTaskId: string) {
  const cc = await layCoCau();
  const kt = await db.kpiTask.findFirst({
    where: { id: kpiTaskId, trangThai: "DA_CHOT", task: TASK_DANG_DUNG },
    include: {
      ky: { select: { id: true, ten: true } },
      task: { select: { ten: true, moTa: true, loai: true, nhiemVu: { select: { ten: true } } } },
      baiNops: { where: { trangThai: "DA_DUYET" }, orderBy: { duyetLuc: "desc" }, take: 1, select: { nguoiDuyetId: true } },
    },
  });
  if (!kt) return null;
  const u = phamViTheoDoi(m, cc).nguoi.find((x) => x.id === kt.userId);
  if (!u) return null;
  return {
    ...kt,
    nguoi: { hoTen: u.hoTen, username: u.username, chucVu: u.role as DoiTuong, donVi: tenDonVi(u, cc) },
    nguoiDuyet: tenNguoi(cc, kt.baiNops[0]?.nguoiDuyetId ?? null),
    nguoiChot: tenNguoi(cc, kt.nguoiChotId),
  };
}
