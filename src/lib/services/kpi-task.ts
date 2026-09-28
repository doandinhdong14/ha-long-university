// Chuyển trạng thái task của người duyệt / người chốt (bảng 5.3, ghi chú 12.2; spec-v1.6 mục 7.2). Một hàm
// cho mọi cấp: tư cách (người duyệt / người chốt) tính theo cơ cấu hiện tại, luật chuyển lấy từ máy trạng thái.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { NguoiDung } from "@/lib/auth/dal";
import { lyDoThieuNguoi, nguoiChot, nguoiDuyet, type CoCau, type NguoiDonVi } from "@/lib/co-cau";
import { db } from "@/lib/db";
import type { HanhDongQuanLy } from "@/lib/kpi/nut-task";
import { luatChuyen, lyDoKhongChuyen, laGop, type TuCach } from "@/lib/kpi/trang-thai";
import { chan, LoiNghiepVu } from "@/lib/loi";
import { laDoiTuong } from "@/lib/roles";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { taiCoCau } from "@/lib/services/co-cau";
import { guiThongBao, LINK } from "@/lib/thong-bao";

type Tx = Prisma.TransactionClient;


/** Tư cách của m đối với task của người làm KPI `nguoiLam` (theo cơ cấu hiện tại). HT với task HP: cả hai. */
export function tuCachVoiTask(m: { id: string }, nguoiLam: NguoiDonVi, cc: CoCau): TuCach[] {
  const ds: TuCach[] = [];
  if (m.id === nguoiLam.id) ds.push("LAM");
  if (nguoiDuyet(nguoiLam, cc)?.id === m.id) ds.push("DUYET");
  if (nguoiChot(nguoiLam, cc)?.id === m.id) ds.push("CHOT");
  return ds;
}

async function layTask(tx: Tx, kpiTaskId: string) {
  return tx.kpiTask.findUnique({
    where: { id: kpiTaskId },
    include: {
      ky: true,
      user: { select: { id: true, hoTen: true, role: true, boMonId: true, khoaId: true } },
      task: { select: { ten: true } },
    },
  });
}

/**
 * Người duyệt / người chốt thực hiện một hành động trên task:
 * Duyệt, Từ chối, Hủy duyệt, Chốt (kể cả HT chốt task HP), Trả về, Trả làm lại, Duyệt lại.
 * v1.6: Duyệt / Duyệt lại task GV, TBM, TK đưa task sang Chờ chốt ngay (không còn nút Gửi lên).
 * Chuyển trạng thái bằng cập nhật có điều kiện (chỉ khi task còn đúng trạng thái đã đọc: hai người bấm
 * cùng lúc thì người sau nhận lỗi); mọi hành động ghi LichSuTask.
 */
export async function thucHienTask(
  m: NguoiDung,
  input: { kpiTaskId: string; hanhDong: HanhDongQuanLy; nhanXet: string | null },
) {
  const { hanhDong: hd, nhanXet } = input;
  return db.$transaction(async (tx) => {
    const kt = await layTask(tx, input.kpiTaskId);
    if (!kt || !laDoiTuong(kt.user.role)) throw new LoiNghiepVu("Không tìm thấy task.", 404);
    const gop = laGop(kt.user.role);
    const luat = luatChuyen(hd, gop);
    chan(luat ? null : lyDoKhongChuyen(hd, kt.trangThai, gop));

    // Quyền: đúng người duyệt / người chốt của người làm KPI (không tin id do client gửi).
    const cc = await taiCoCau(tx);
    const tuCach = tuCachVoiTask(m, kt.user, cc);
    if (!luat || !tuCach.includes(luat.ai)) throw new LoiNghiepVu("Không tìm thấy task.", 404);
    // Người chốt chỉ thấy task đã được duyệt lên (CHO_CHOT, DA_CHOT, TRA_VE).
    if (luat.ai === "CHOT" && !["CHO_CHOT", "DA_CHOT", "TRA_VE"].includes(kt.trangThai)) {
      throw new LoiNghiepVu("Không tìm thấy task.", 404);
    }
    chan(lyDoKhongThaoTacTask(kt.ky));
    chan(lyDoKhongChuyen(hd, kt.trangThai, gop), 409);
    if (luat.canNhanXet && !nhanXet) throw new LoiNghiepVu("Vui lòng nhập nhận xét.");
    // A3: thiếu người chốt thì không đưa task lên Chờ chốt được (trước đây chặn ở nút Gửi lên).
    const lenChoChot = luat.sang === "CHO_CHOT";
    if (lenChoChot) chan(lyDoThieuNguoi(kt.user, cc, "chot"), 409);

    const now = new Date();
    const { count } = await tx.kpiTask.updateMany({
      where: { id: kt.id, trangThai: kt.trangThai },
      data: {
        trangThai: luat.sang,
        capNhatLuc: now,
        // guiChotLuc = lúc task vào danh sách Chờ chốt (sắp xếp màn hình Chốt, B10); hủy duyệt thì xóa.
        ...(lenChoChot ? { guiChotLuc: now } : {}),
        ...(hd === "HUY_DUYET" ? { guiChotLuc: null } : {}),
        ...(hd === "CHOT" ? { nguoiChotId: m.id, chotLuc: now } : {}),
        ...(hd === "TRA_VE" ? { nhanXetChot: nhanXet } : {}),
      },
    });
    if (!count) throw new LoiNghiepVu("Task vừa được người khác xử lý, vui lòng tải lại trang.", 409);

    // Kết quả duyệt của lần nộp gần nhất (12.2).
    const bn = await tx.baiNop.findFirst({ where: { kpiTaskId: kt.id }, orderBy: { nopLuc: "desc" } });
    if (bn) {
      if (hd === "DUYET" || hd === "TU_CHOI" || hd === "TRA_LAM_LAI") {
        await tx.baiNop.update({
          where: { id: bn.id },
          data: { trangThai: hd === "DUYET" ? "DA_DUYET" : "TU_CHOI", nhanXet, nguoiDuyetId: m.id, duyetLuc: now },
        });
      } else if (hd === "HUY_DUYET") {
        await tx.baiNop.update({
          where: { id: bn.id },
          data: { trangThai: "CHO_DUYET", nhanXet: null, nguoiDuyetId: null, duyetLuc: null },
        });
      }
    }
    await tx.lichSuTask.create({
      data: { kpiTaskId: kt.id, hanhDong: luat.lichSu, nguoiThucHienId: m.id, nhanXet, luc: now },
    });

    // Thông báo (mục 11).
    const ten = `"${kt.task.ten}"`;
    const linkLam = LINK.taskCuaToi(kt.id);
    const tru = m.id;
    // v1.6 (mục 6.4): "người duyệt gửi task lên → người chốt" nay bắn ngay khi Duyệt / Duyệt lại.
    if (lenChoChot) {
      await guiThongBao(tx, [nguoiChot(kt.user, cc)?.id], `${m.hoTen} đã duyệt task ${ten} của ${kt.user.hoTen}, chờ chốt.`, {
        link: LINK.chotTask(kt.kyId, kt.id),
        tru,
      });
    }
    switch (hd) {
      case "DUYET":
        await guiThongBao(tx, [kt.userId], `Task ${ten} đã được duyệt.`, { link: linkLam, tru });
        break;
      case "TU_CHOI":
      case "TRA_LAM_LAI":
        await guiThongBao(tx, [kt.userId], `Task ${ten} bị từ chối, cần nộp lại. Nhận xét: ${nhanXet}`, { link: linkLam, tru });
        break;
      case "CHOT":
        await guiThongBao(tx, [kt.userId], `Task ${ten} đã được chốt – hoàn thành.`, { link: linkLam, tru });
        await guiThongBao(tx, [nguoiDuyet(kt.user, cc)?.id], `Task ${ten} của ${kt.user.hoTen} đã được chốt.`, {
          link: LINK.duyetTask(kt.userId, kt.kyId, kt.id),
          tru,
        });
        break;
      case "TRA_VE":
        await guiThongBao(
          tx,
          [nguoiDuyet(kt.user, cc)?.id],
          `${m.hoTen} trả về task ${ten} của ${kt.user.hoTen}. Nhận xét: ${nhanXet}`,
          { link: LINK.duyetTask(kt.userId, kt.kyId, kt.id), tru },
        );
        break;
    }
    return { trangThai: luat.sang };
  });
}
