// Chốt kỳ (mục 10.4): tính kết quả cho mọi GV, TBM, TK, HP bằng hàm dùng chung tinhKetQua, lưu KetQuaKy,
// đặt ky.daChot = true, gửi thông báo. Sau khi chốt mọi thao tác trong kỳ bị khóa (rules.ts).
// Chạy bởi Railway Cron (POST /api/cron/chot-ky) và nút "Chốt kỳ ngay" của admin.
import "server-only";
import type { DoiTuong } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { NHAN_KET_QUA } from "@/lib/nhan";
import { DOI_TUONGS } from "@/lib/roles";
import { taiKetQua } from "@/lib/services/ket-qua";
import { guiThongBao, LINK } from "@/lib/thong-bao";
import { homNayVN, ngayThanhChuoi } from "@/lib/time";

/**
 * Chốt một kỳ. Đặt daChot có điều kiện nên chạy hai lần không nhân đôi.
 * Trả về null nếu kỳ không tồn tại / chưa công bố / đã chốt.
 */
export async function chotKy(kyId: string): Promise<{ soNguoi: number } | null> {
  return db.$transaction(
    async (tx) => {
      const { count } = await tx.ky.updateMany({
        where: { id: kyId, daCongBo: true, daChot: false },
        data: { daChot: true },
      });
      if (!count) return null;

      const ky = await tx.ky.findUniqueOrThrow({ where: { id: kyId } });
      const nguois = await tx.user.findMany({ where: { role: { in: [...DOI_TUONGS] } }, select: { id: true, role: true } });
      const ketQuas = await taiKetQua(kyId, nguois, tx);
      const chotLuc = new Date();

      for (const u of nguois) {
        const kq = ketQuas.get(u.id)!;
        const data = {
          doiTuong: u.role as DoiTuong,
          phanTram: kq.phanTram,
          phanTramBatBuoc: kq.phanTramBatBuoc,
          tuDanhGia: kq.tuDanhGia,
          trangThaiCaiTien: kq.trangThaiCaiTien,
          ketQua: kq.ketQua,
          xepLoai: kq.xepLoai,
          taskThieu: kq.taskThieu,
          taskVuot: kq.taskVuot,
          soTreo: kq.soTreo,
          // Ghi chú kỳ + (nếu có) "Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – <lý do>" (spec-v1.6 mục 4.2).
          ghiChu: [kq.ghiChu, kq.ghiChuCaiTien].filter(Boolean).join(". ") || null,
          chotLuc,
        };
        await tx.ketQuaKy.upsert({
          where: { kyId_userId: { kyId, userId: u.id } },
          create: { kyId, userId: u.id, ...data },
          update: data,
        });
        await guiThongBao(tx, [u.id], `${ky.ten} đã chốt. Kết quả của bạn: ${NHAN_KET_QUA[kq.ketQua]} – ${kq.xepLoai}.`, {
          link: LINK.cuoiKy(kyId),
        });
      }

      // Cấp quản lý không làm KPI (hiệu trưởng) nhận thông báo chung (mục 11).
      const hts = await tx.user.findMany({ where: { role: "HT" }, select: { id: true } });
      await guiThongBao(tx, hts.map((h) => h.id), `${ky.ten} đã chốt, đã có kết quả của các cấp.`, {
        link: LINK.duyetTongQuan(kyId),
      });
      return { soNguoi: nguois.length };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

/** Chốt mọi kỳ đã công bố, chưa chốt, đã quá deadline (dùng cho cron, B19). */
export async function chotCacKyQuaHan(now: Date = new Date()) {
  const homNay = homNayVN(now);
  const kys = await db.ky.findMany({
    where: { daCongBo: true, daChot: false },
    select: { id: true, ten: true, ngayKetThuc: true },
  });
  // Quá deadline (23:59:59 ngày kết thúc, giờ VN) ⇔ hôm nay (VN) sau ngày kết thúc.
  const quaHan = kys.filter((k) => ngayThanhChuoi(k.ngayKetThuc) < homNay);
  const daChot: { id: string; ten: string; soNguoi: number }[] = [];
  for (const k of quaHan) {
    const r = await chotKy(k.id);
    if (r) daChot.push({ id: k.id, ten: k.ten, soNguoi: r.soNguoi });
  }
  return daChot;
}
