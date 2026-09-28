// Nhắc việc (mục 11, B12), chạy cùng cron mỗi ngày:
// - còn ≤3 ngày đến hạn đăng ký → người làm KPI chưa gửi đăng ký;
// - còn ≤7 ngày đến deadline → người làm KPI còn task bắt buộc chưa được chốt;
// - mốc 7 ngày và 2 ngày trước deadline → HT: "Còn N task đã duyệt chưa chốt" (task HP);
//   v1.6 (spec-v1.6 mục 6.4): bỏ nhắc "Còn N task đã duyệt chưa gửi lên" của chuỗi GV/TBM/TK (không còn bước Gửi lên);
//   người chốt: "Còn N task chờ chốt".
// Mỗi mốc gửi 1 lần / người / kỳ (ThongBao.maSuKien); dùng "≤" để cron lỡ một ngày vẫn nhắc. Chỉ gửi khi N > 0.
import "server-only";
import { nguoiChot, nguoiDuyet } from "@/lib/co-cau";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { CHUOI } from "@/lib/kpi/chuoi";
import { DOI_TUONGS, laDoiTuong } from "@/lib/roles";
import { taiCoCau } from "@/lib/services/co-cau";
import { guiThongBao, LINK } from "@/lib/thong-bao";
import { deadline, hanDangKy, hienNgayGio, soNgayConLai } from "@/lib/time";

function conLai(n: number) {
  return n === 0 ? "Hôm nay là ngày cuối" : `Còn ${n} ngày`;
}

/** Đếm theo khóa rồi gửi cho từng người (mỗi người một nội dung). */
async function guiTheoDem(dem: Map<string, number>, noiDung: (n: number) => string, link: string, maSuKien: string) {
  let so = 0;
  for (const [userId, n] of dem) {
    if (n > 0) so += await guiThongBao(db, [userId], noiDung(n), { link, maSuKien });
  }
  return so;
}

export async function guiNhacViec(now: Date = new Date()) {
  const kys = await db.ky.findMany({ where: { daCongBo: true, daChot: false } });
  const cc = await taiCoCau();
  const nguoiLam = cc.users.filter((u) => laDoiTuong(u.role));
  const kq = { hanDangKy: 0, deadline: 0, nguoiDuyet: 0, nguoiChot: 0 };

  for (const ky of kys) {
    // 1. Hạn đăng ký.
    const nDk = soNgayConLai(ky.ngayBatDau, now);
    if (nDk >= 0 && nDk <= 3 && now <= hanDangKy(ky)) {
      const daGui = await db.dangKy.findMany({ where: { kyId: ky.id, trangThai: { not: "NHAP" } }, select: { userId: true } });
      const boQua = new Set(daGui.map((d) => d.userId));
      kq.hanDangKy += await guiThongBao(
        db,
        nguoiLam.filter((u) => !boQua.has(u.id)).map((u) => u.id),
        `${conLai(nDk)} đến hạn đăng ký nhiệm vụ ${ky.ten} (${hienNgayGio(hanDangKy(ky))}).`,
        { link: LINK.dauKy(ky.id), maSuKien: `nhac-dang-ky:${ky.id}` },
      );
    }

    const nDl = soNgayConLai(ky.ngayKetThuc, now);
    if (nDl < 0 || nDl > 7 || now > deadline(ky)) continue;
    const hanChot = `${conLai(nDl)} đến deadline ${ky.ten} (${hienNgayGio(deadline(ky))})`;

    // 2. Người làm KPI còn task bắt buộc chưa được chốt.
    const conThieu = await db.kpiTask.findMany({
      where: { kyId: ky.id, trangThai: { not: "DA_CHOT" }, task: { loai: "BAT_BUOC" }, user: { role: { in: [...DOI_TUONGS] } } },
      select: { userId: true },
    });
    const demThieu = new Map<string, number>();
    for (const t of conThieu) demThieu.set(t.userId, (demThieu.get(t.userId) ?? 0) + 1);
    kq.deadline += await guiTheoDem(
      demThieu,
      (n) => `${hanChot}. Bạn còn ${n} task bắt buộc chưa được chốt.`,
      LINK.trongKy(ky.id),
      `nhac-deadline:${ky.id}`,
    );

    // 3. Người duyệt, người chốt: mốc 7 ngày (2 < N ≤ 7) và 2 ngày (N ≤ 2).
    const moc = nDl <= 2 ? 2 : 7;
    const treo = await db.kpiTask.findMany({
      where: { kyId: ky.id, trangThai: { in: ["DA_DUYET", "CHO_CHOT"] }, task: TASK_DANG_DUNG },
      select: { trangThai: true, user: { select: { id: true, role: true, boMonId: true, khoaId: true } } },
    });
    const demDuyetGop = new Map<string, number>();
    const demChot = new Map<string, number>();
    for (const t of treo) {
      if (!laDoiTuong(t.user.role)) continue;
      if (t.trangThai === "DA_DUYET") {
        // Chỉ task HP còn dừng ở Đã duyệt (HT duyệt rồi mới chốt).
        if (!CHUOI[t.user.role].gopDuyetChot) continue;
        const id = nguoiDuyet(t.user, cc)?.id;
        if (id) demDuyetGop.set(id, (demDuyetGop.get(id) ?? 0) + 1);
      } else {
        const id = nguoiChot(t.user, cc)?.id;
        if (id) demChot.set(id, (demChot.get(id) ?? 0) + 1);
      }
    }
    kq.nguoiDuyet += await guiTheoDem(
      demDuyetGop,
      (n) => `${hanChot}. Còn ${n} task đã duyệt chưa chốt.`,
      `${LINK.duyetTongQuan(ky.id)}&tab=hang-cho`,
      `nhac-duyet-chot-${moc}:${ky.id}`,
    );
    kq.nguoiChot += await guiTheoDem(
      demChot,
      (n) => `${hanChot}. Còn ${n} task chờ chốt.`,
      LINK.chot(ky.id),
      `nhac-chot-${moc}:${ky.id}`,
    );
  }
  return kq;
}
