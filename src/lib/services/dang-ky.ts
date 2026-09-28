// Đầu kỳ – đăng ký nhiệm vụ (mục 5.1; spec-v1.6 mục 2), một bộ code cho GV, TBM, TK, HP. Người duyệt lấy
// theo mục 3.2 (nguoiDuyet), tính theo cơ cấu hiện tại. Mọi kiểm tra quyền, thời gian ở đây (server).
// v1.6: mọi nhiệm vụ của vị trí đều bắt buộc. Server tự quyết danh sách: khi lưu nháp hoặc gửi luôn ghi TOÀN BỘ
// nhiệm vụ thường của vị trí; client chỉ gửi được đúng 1 giá trị – có đăng ký cải tiến sáng tạo hay không.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { DoiTuong, TrangThaiDangKy } from "@/generated/prisma/enums";
import type { NguoiDung, NguoiLamKpi } from "@/lib/auth/dal";
import { lyDoKhongGuiDangKy, nguoiDuyet } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { damBaoNhiemVuCaiTien } from "@/lib/cai-tien";
import { chan, LoiNghiepVu } from "@/lib/loi";
import { lyDoKhongDuyetDangKy, lyDoKhongSuaDangKy } from "@/lib/rules";
import { taiCoCau } from "@/lib/services/co-cau";
import { guiThongBao, LINK } from "@/lib/thong-bao";
import { tinhXepLoai } from "@/lib/xep-loai";

type Tx = Prisma.TransactionClient;

export const LOI_CHUA_CO_NHIEM_VU = "Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin.";

/** Tạo Nháp nếu chưa có, khóa dòng DangKy (FOR UPDATE) để đọc trạng thái chắc chắn; chặn nếu không được sửa. */
async function khoaDangKyDeSua(tx: Tx, ky: { id: string; ngayBatDau: Date; ngayKetThuc: Date; daCongBo: boolean; daChot: boolean }, userId: string) {
  await tx.dangKy.upsert({ where: { kyId_userId: { kyId: ky.id, userId } }, create: { kyId: ky.id, userId }, update: {} });
  const [dk] = await tx.$queryRaw<{ id: string; trangThai: TrangThaiDangKy }[]>`
    SELECT id, "trangThai"::text AS "trangThai" FROM "DangKy" WHERE "kyId" = ${ky.id} AND "userId" = ${userId} FOR UPDATE`;
  chan(lyDoKhongSuaDangKy(ky, dk.trangThai));
  return dk;
}

/**
 * Ghi danh sách theo luật v1.6: toàn bộ nhiệm vụ thường của vị trí + nhiệm vụ cải tiến nếu có tick.
 * Bỏ qua mọi danh sách client gửi lên. Trả về nhiệm vụ thường đã ghi (để tính điểm).
 */
async function ghiDanhSach(tx: Tx, dangKyId: string, kyId: string, doiTuong: DoiTuong, caiTien: boolean) {
  const thuong = await tx.nhiemVu.findMany({ where: { kyId, doiTuong, laCaiTien: false }, select: { id: true, diem: true } });
  let ct = caiTien ? await tx.nhiemVu.findFirst({ where: { kyId, doiTuong, laCaiTien: true }, select: { id: true } }) : null;
  if (caiTien && !ct) {
    await damBaoNhiemVuCaiTien(tx, kyId);
    ct = await tx.nhiemVu.findFirst({ where: { kyId, doiTuong, laCaiTien: true }, select: { id: true } });
  }
  const ids = [...thuong.map((x) => x.id), ...(ct ? [ct.id] : [])];
  await tx.dangKyNhiemVu.deleteMany({ where: { dangKyId, nhiemVuId: { notIn: ids } } });
  await tx.dangKyNhiemVu.createMany({ data: ids.map((nhiemVuId) => ({ dangKyId, nhiemVuId })), skipDuplicates: true });
  return thuong;
}

/**
 * Lưu nháp (tự lưu khi tick/bỏ tick "Đăng ký cải tiến sáng tạo"). Được khi danh sách Nháp (trước hạn đăng ký)
 * hoặc Bị từ chối (trước deadline). Server ghi đủ nhiệm vụ thường của vị trí.
 */
export async function luuDangKy(u: NguoiLamKpi, input: { kyId: string; caiTien: boolean }) {
  await db.$transaction(async (tx) => {
    const ky = await tx.ky.findUnique({ where: { id: input.kyId } });
    if (!ky || !ky.daCongBo) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);
    const dk = await khoaDangKyDeSua(tx, ky, u.id);
    await ghiDanhSach(tx, dk.id, ky.id, u.role, input.caiTien);
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

/**
 * Gửi danh sách lên người duyệt (lần đầu hoặc gửi lại sau khi bị từ chối). Server ghi lại đủ nhiệm vụ thường
 * của vị trí + cải tiến theo `caiTien`, rồi tính điểm/xếp loại (cải tiến không cộng điểm).
 */
export async function guiDangKy(u: NguoiLamKpi, input: { kyId: string; caiTien: boolean }) {
  return db.$transaction(async (tx) => {
    const ky = await tx.ky.findUnique({ where: { id: input.kyId }, include: { bacXepLoais: true } });
    if (!ky || !ky.daCongBo) throw new LoiNghiepVu("Kỳ không tồn tại.", 404);
    const dk = await khoaDangKyDeSua(tx, ky, u.id);
    // A3: thiếu người duyệt hoặc người chốt → chặn gửi.
    const cc = await taiCoCau(tx);
    chan(lyDoKhongGuiDangKy(u, cc), 409);
    const thuong = await ghiDanhSach(tx, dk.id, ky.id, u.role, input.caiTien);
    if (thuong.length === 0) throw new LoiNghiepVu(LOI_CHUA_CO_NHIEM_VU, 409);

    const { tongDiem, xepLoai } = tinhDiem(
      thuong.map((nv) => ({ nhiemVu: nv })),
      ky.bacXepLoais,
      u.role,
    );
    const { count } = await tx.dangKy.updateMany({
      where: { id: dk.id, trangThai: dk.trangThai },
      data: { trangThai: "CHO_DUYET", tongDiem, xepLoai, nopLuc: new Date(), nhanXet: null },
    });
    if (!count) throw new LoiNghiepVu("Danh sách vừa thay đổi trạng thái, vui lòng tải lại trang.", 409);

    const laGuiLai = dk.trangThai === "TU_CHOI";
    const caiTien = input.caiTien ? ", có đăng ký cải tiến sáng tạo" : "";
    await guiThongBao(
      tx,
      [nguoiDuyet(u, cc)?.id],
      `${u.hoTen} đã ${laGuiLai ? "gửi lại" : "gửi"} danh sách đăng ký nhiệm vụ ${ky.ten} (${tongDiem} điểm, xếp loại ${xepLoai}${caiTien}).`,
      { link: LINK.duyetNguoi(u.id, ky.id, "dang-ky"), tru: u.id },
    );
    return { tongDiem, xepLoai, soNhiemVu: thuong.length, caiTien: input.caiTien };
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
          // v1.6: task Bắt buộc của nhiệm vụ thường + task Cải tiến của nhiệm vụ cải tiến; không giao task Mở rộng.
          nhiemVu: { include: { tasks: { where: { loai: { in: ["BAT_BUOC", "CAI_TIEN"] } }, select: { id: true } } } },
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
 * Người duyệt duyệt cả danh sách: tính lại điểm/xếp loại (mục 10.2), giao các task bắt buộc và – nếu có
 * đăng ký – 1 task cải tiến sáng tạo (trạng thái Chưa làm). Danh sách chỉ lên người duyệt, không lên người chốt.
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
