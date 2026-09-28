// Đầu kỳ – đăng ký nhiệm vụ (mục 5.1), một bộ code cho GV, TBM, TK, HP. Người duyệt lấy theo
// mục 3.2 (nguoiDuyet), tính theo cơ cấu hiện tại. Mọi kiểm tra quyền, thời gian ở đây (server).
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { DoiTuong, TrangThaiDangKy } from "@/generated/prisma/enums";
import type { NguoiDung, NguoiLamKpi } from "@/lib/auth/dal";
import { lyDoKhongGuiDangKy, nguoiDuyet } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { chan, LoiNghiepVu } from "@/lib/loi";
import { lyDoKhongDuyetDangKy, lyDoKhongSuaDangKy } from "@/lib/rules";
import { taiCoCau } from "@/lib/services/co-cau";
import { guiThongBao, LINK } from "@/lib/thong-bao";
import { tinhXepLoai } from "@/lib/xep-loai";

type Tx = Prisma.TransactionClient;

/** Tick / bỏ tick một nhiệm vụ (tự lưu). Tạo danh sách Nháp nếu chưa có. Chỉ nhiệm vụ đúng vị trí mình. */
export async function chonNhiemVu(u: NguoiLamKpi, input: { kyId: string; nhiemVuId: string; chon: boolean }) {
  await db.$transaction(async (tx) => {
    const ky = await tx.ky.findUnique({ where: { id: input.kyId } });
    if (!ky || !ky.daCongBo) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);
    const nv = await tx.nhiemVu.findFirst({
      where: { id: input.nhiemVuId, kyId: ky.id, doiTuong: u.role, laCaiTien: false },
      select: { id: true },
    });
    if (!nv) throw new LoiNghiepVu("Nhiệm vụ không thuộc kỳ này hoặc không dành cho vị trí của bạn.", 404);

    // Tạo Nháp nếu chưa có, rồi khóa dòng để đọc trạng thái chắc chắn.
    await tx.dangKy.upsert({
      where: { kyId_userId: { kyId: ky.id, userId: u.id } },
      create: { kyId: ky.id, userId: u.id },
      update: {},
    });
    const [dk] = await tx.$queryRaw<{ id: string; trangThai: TrangThaiDangKy }[]>`
      SELECT id, "trangThai"::text AS "trangThai" FROM "DangKy" WHERE "kyId" = ${ky.id} AND "userId" = ${u.id} FOR UPDATE`;
    chan(lyDoKhongSuaDangKy(ky, dk.trangThai));

    if (input.chon) {
      await tx.dangKyNhiemVu.createMany({ data: [{ dangKyId: dk.id, nhiemVuId: nv.id }], skipDuplicates: true });
    } else {
      await tx.dangKyNhiemVu.deleteMany({ where: { dangKyId: dk.id, nhiemVuId: nv.id } });
    }
  });
}

/** Tổng điểm + xếp loại theo bảng xếp loại đúng vị trí (mục 10.2). */
function tinhDiem(
  nhiemVus: { nhiemVu: { diem: number } }[],
  bacs: { doiTuong: DoiTuong; ten: string; diemToiThieu: number }[],
  doiTuong: DoiTuong,
) {
  const tongDiem = nhiemVus.reduce((s, x) => s + x.nhiemVu.diem, 0);
  const xepLoai = tinhXepLoai(tongDiem, bacs.filter((b) => b.doiTuong === doiTuong));
  return { tongDiem, xepLoai };
}

/** Gửi danh sách lên người duyệt (lần đầu hoặc gửi lại sau khi bị từ chối). */
export async function guiDangKy(u: NguoiLamKpi, kyId: string) {
  return db.$transaction(async (tx) => {
    const ky = await tx.ky.findUnique({ where: { id: kyId }, include: { bacXepLoais: true } });
    if (!ky || !ky.daCongBo) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);
    const dk = await tx.dangKy.findUnique({
      where: { kyId_userId: { kyId, userId: u.id } },
      include: { nhiemVus: { include: { nhiemVu: { select: { diem: true, doiTuong: true } } } } },
    });
    chan(lyDoKhongSuaDangKy(ky, dk?.trangThai ?? null));
    // A3: thiếu người duyệt hoặc người chốt → chặn gửi.
    const cc = await taiCoCau(tx);
    chan(lyDoKhongGuiDangKy(u, cc), 409);
    if (!dk || dk.nhiemVus.length === 0) throw new LoiNghiepVu("Phải chọn ít nhất 1 nhiệm vụ mới gửi được.");
    if (dk.nhiemVus.some((x) => x.nhiemVu.doiTuong !== u.role)) {
      throw new LoiNghiepVu("Danh sách có nhiệm vụ không thuộc vị trí của bạn.", 409);
    }

    const { tongDiem, xepLoai } = tinhDiem(dk.nhiemVus, ky.bacXepLoais, u.role);
    const { count } = await tx.dangKy.updateMany({
      where: { id: dk.id, trangThai: dk.trangThai },
      data: { trangThai: "CHO_DUYET", tongDiem, xepLoai, nopLuc: new Date(), nhanXet: null },
    });
    if (!count) throw new LoiNghiepVu("Danh sách vừa thay đổi trạng thái, vui lòng tải lại trang.", 409);

    const laGuiLai = dk.trangThai === "TU_CHOI";
    await guiThongBao(
      tx,
      [nguoiDuyet(u, cc)?.id],
      `${u.hoTen} đã ${laGuiLai ? "gửi lại" : "gửi"} danh sách đăng ký nhiệm vụ ${ky.ten} (${tongDiem} điểm, xếp loại ${xepLoai}).`,
      { link: LINK.duyetNguoi(u.id, ky.id, "dang-ky"), tru: u.id },
    );
    return { tongDiem, xepLoai };
  });
}

/** Lấy danh sách đăng ký mà m là người duyệt (theo cơ cấu hiện tại); không phải → 404. */
async function layDangKyDuocDuyet(tx: Tx, m: NguoiDung, dangKyId: string) {
  const dk = await tx.dangKy.findUnique({
    where: { id: dangKyId },
    include: {
      user: { select: { id: true, hoTen: true, role: true, boMonId: true, khoaId: true } },
      ky: { include: { bacXepLoais: true } },
      nhiemVus: {
        include: {
          nhiemVu: { include: { tasks: { where: { loai: "BAT_BUOC" }, select: { id: true } } } },
        },
      },
    },
  });
  if (!dk) throw new LoiNghiepVu("Không tìm thấy danh sách đăng ký.", 404);
  const cc = await taiCoCau(tx);
  if (nguoiDuyet(dk.user, cc)?.id !== m.id) throw new LoiNghiepVu("Không tìm thấy danh sách đăng ký.", 404);
  return { ...dk, doiTuong: dk.user.role as DoiTuong };
}

/**
 * Người duyệt duyệt cả danh sách: tính lại điểm/xếp loại (mục 10.2), giao các task bắt buộc
 * (trạng thái Chưa làm). Danh sách chỉ lên người duyệt, không lên người chốt.
 */
export async function duyetDangKy(m: NguoiDung, input: { dangKyId: string; nhanXet: string | null }) {
  return db.$transaction(async (tx) => {
    const dk = await layDangKyDuocDuyet(tx, m, input.dangKyId);
    chan(lyDoKhongDuyetDangKy(dk.ky));
    if (dk.trangThai !== "CHO_DUYET") throw new LoiNghiepVu("Danh sách không ở trạng thái Chờ duyệt.", 409);

    const { tongDiem, xepLoai } = tinhDiem(dk.nhiemVus, dk.ky.bacXepLoais, dk.doiTuong);
    const { count } = await tx.dangKy.updateMany({
      where: { id: dk.id, trangThai: "CHO_DUYET" },
      data: { trangThai: "DA_DUYET", tongDiem, xepLoai, nhanXet: input.nhanXet, nguoiDuyetId: m.id, duyetLuc: new Date() },
    });
    if (!count) throw new LoiNghiepVu("Danh sách vừa được xử lý hoặc vừa thay đổi, vui lòng tải lại trang.", 409);

    const taskIds = dk.nhiemVus.flatMap((x) => x.nhiemVu.tasks.map((t) => t.id));
    await tx.kpiTask.createMany({
      data: taskIds.map((taskId) => ({ userId: dk.userId, kyId: dk.kyId, taskId })),
      skipDuplicates: true,
    });
    await guiThongBao(
      tx,
      [dk.userId],
      `Danh sách đăng ký nhiệm vụ ${dk.ky.ten} đã được duyệt (${tongDiem} điểm, xếp loại ${xepLoai}).`,
      { link: LINK.trongKy(dk.kyId), tru: m.id },
    );
    return { soTask: taskIds.length };
  });
}

/** Từ chối cả danh sách (bắt buộc nhận xét). Người làm KPI được sửa và gửi lại đến hết deadline. */
export async function tuChoiDangKy(m: NguoiDung, input: { dangKyId: string; nhanXet: string }) {
  await db.$transaction(async (tx) => {
    const dk = await layDangKyDuocDuyet(tx, m, input.dangKyId);
    chan(lyDoKhongDuyetDangKy(dk.ky));
    if (dk.trangThai !== "CHO_DUYET") throw new LoiNghiepVu("Danh sách không ở trạng thái Chờ duyệt.", 409);

    const { count } = await tx.dangKy.updateMany({
      where: { id: dk.id, trangThai: "CHO_DUYET" },
      data: { trangThai: "TU_CHOI", nhanXet: input.nhanXet, nguoiDuyetId: m.id, duyetLuc: new Date() },
    });
    if (!count) throw new LoiNghiepVu("Danh sách vừa được xử lý hoặc vừa thay đổi, vui lòng tải lại trang.", 409);

    await guiThongBao(tx, [dk.userId], `Danh sách đăng ký nhiệm vụ ${dk.ky.ten} bị từ chối. Nhận xét: ${input.nhanXet}`, {
      link: LINK.dauKy(dk.kyId),
      tru: m.id,
    });
  });
}
