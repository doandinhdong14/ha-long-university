// Người làm KPI nộp / sửa minh chứng (mục 5.2, 5.3, ghi chú 12.2). Dùng chung GV, TBM, TK, HP.
import "server-only";
import type { NguoiLamKpi } from "@/lib/auth/dal";
import { nguoiDuyet } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { luatChuyen, lyDoKhongChuyen, laGop } from "@/lib/kpi/trang-thai";
import { chan, LoiNghiepVu } from "@/lib/loi";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { taiCoCau } from "@/lib/services/co-cau";
import { xoaNhieuFile } from "@/lib/storage";
import { guiThongBao, LINK } from "@/lib/thong-bao";
import { layChuoi, layFile, layLink, luuFiles } from "./file-upload";

/**
 * Nộp minh chứng cho task Chưa làm / Bị từ chối → tạo lần nộp mới, task sang Chờ duyệt.
 * Form: files (≥1, B14), ghiChu, link (không bắt buộc).
 */
export async function nopBaiMoi(u: NguoiLamKpi, kpiTaskId: string, form: FormData) {
  const kt = await db.kpiTask.findUnique({ where: { id: kpiTaskId }, include: { ky: true, task: true } });
  if (!kt || kt.userId !== u.id || kt.task.loai === "MO_RONG") throw new LoiNghiepVu("Không tìm thấy task.", 404);
  chan(lyDoKhongThaoTacTask(kt.ky));
  const gop = laGop(u.role);
  if (kt.trangThai === "CHO_DUYET") {
    throw new LoiNghiepVu("Task đang chờ duyệt – hãy sửa lần nộp hiện tại thay vì nộp mới.", 409);
  }
  chan(lyDoKhongChuyen("NOP", kt.trangThai, gop), 409);

  const files = layFile(form);
  if (!files.length) throw new LoiNghiepVu("Phải tải lên ít nhất 1 file minh chứng.");
  const ghiChu = layChuoi(form, "ghiChu");
  const link = layLink(form);

  const daLuu = await luuFiles(files);
  try {
    return await db.$transaction(async (tx) => {
      const ky = await tx.ky.findUniqueOrThrow({ where: { id: kt.kyId } });
      chan(lyDoKhongThaoTacTask(ky));
      const { count } = await tx.kpiTask.updateMany({
        where: { id: kt.id, trangThai: { in: luatChuyen("NOP", gop)!.tu } },
        data: { trangThai: "CHO_DUYET", capNhatLuc: new Date() },
      });
      if (!count) throw new LoiNghiepVu("Task vừa thay đổi trạng thái, vui lòng tải lại trang.", 409);
      const bn = await tx.baiNop.create({ data: { kpiTaskId: kt.id, ghiChu, link, files: { create: daLuu } } });
      await tx.lichSuTask.create({ data: { kpiTaskId: kt.id, hanhDong: "NOP", nguoiThucHienId: u.id } });

      const cc = await taiCoCau(tx);
      await guiThongBao(tx, [nguoiDuyet(u, cc)?.id], `${u.hoTen} đã nộp minh chứng task "${kt.task.ten}".`, {
        link: LINK.duyetTask(u.id, kt.kyId, kt.id),
        tru: u.id,
      });
      return { baiNopId: bn.id };
    });
  } catch (e) {
    await xoaNhieuFile(daLuu.map((f) => f.duongDan));
    throw e;
  }
}

/**
 * Sửa/thay minh chứng của lần nộp hiện tại khi task còn Chờ duyệt (chỉ chính người làm KPI).
 * Form: files (thêm mới), xoaFileIds (bỏ file cũ), ghiChu, link. Phải còn ≥1 file.
 */
export async function suaBaiNop(u: NguoiLamKpi, baiNopId: string, form: FormData) {
  const bn = await db.baiNop.findUnique({
    where: { id: baiNopId },
    include: { kpiTask: { include: { ky: true } }, files: { select: { id: true, duongDan: true } } },
  });
  if (!bn || bn.kpiTask.userId !== u.id) throw new LoiNghiepVu("Không tìm thấy lần nộp.", 404);
  chan(lyDoKhongThaoTacTask(bn.kpiTask.ky));
  chan(lyDoKhongChuyen("SUA_BAI_NOP", bn.kpiTask.trangThai, laGop(u.role)), 409);
  if (bn.trangThai !== "CHO_DUYET") throw new LoiNghiepVu("Chỉ sửa được lần nộp đang chờ duyệt.", 409);

  const xoaIds = new Set(form.getAll("xoaFileIds").filter((v): v is string => typeof v === "string"));
  const fileXoa = bn.files.filter((f) => xoaIds.has(f.id));
  const conLai = bn.files.length - fileXoa.length;
  const files = layFile(form, conLai);
  if (conLai + files.length === 0) throw new LoiNghiepVu("Phải còn ít nhất 1 file minh chứng.");
  const ghiChu = layChuoi(form, "ghiChu");
  const link = layLink(form);

  const daLuu = await luuFiles(files);
  try {
    await db.$transaction(async (tx) => {
      const ky = await tx.ky.findUniqueOrThrow({ where: { id: bn.kpiTask.kyId } });
      chan(lyDoKhongThaoTacTask(ky));
      // Cập nhật có điều kiện: người duyệt vừa duyệt/từ chối thì không sửa được nữa.
      const task = await tx.kpiTask.updateMany({
        where: { id: bn.kpiTaskId, trangThai: "CHO_DUYET" },
        data: { capNhatLuc: new Date() },
      });
      const { count } = await tx.baiNop.updateMany({ where: { id: bn.id, trangThai: "CHO_DUYET" }, data: { ghiChu, link } });
      if (!count || !task.count) throw new LoiNghiepVu("Lần nộp vừa được người duyệt xử lý, không thể sửa.", 409);
      if (fileXoa.length) await tx.fileDinhKem.deleteMany({ where: { id: { in: fileXoa.map((f) => f.id) }, baiNopId: bn.id } });
      if (daLuu.length) await tx.fileDinhKem.createMany({ data: daLuu.map((f) => ({ ...f, baiNopId: bn.id })) });
      await tx.lichSuTask.create({ data: { kpiTaskId: bn.kpiTaskId, hanhDong: "SUA_BAI_NOP", nguoiThucHienId: u.id } });
    });
  } catch (e) {
    await xoaNhieuFile(daLuu.map((f) => f.duongDan));
    throw e;
  }
  await xoaNhieuFile(fileXoa.map((f) => f.duongDan));
  return { baiNopId: bn.id };
}
