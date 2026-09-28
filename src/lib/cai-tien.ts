// Cải tiến sáng tạo (spec-v1.6 mục 2.4): mỗi (kỳ, vị trí) có đúng 1 nhiệm vụ hệ thống `laCaiTien = true`,
// điểm 0, có đúng 1 task loại CAI_TIEN. Người làm KPI tick "Đăng ký cải tiến" = thêm nhiệm vụ này vào
// DangKyNhiemVu. Không dùng alias "@/" để seed (tsx) import được.
import type { Prisma } from "../generated/prisma/client";
import type { LoaiTask } from "../generated/prisma/enums";
import { DOI_TUONGS } from "./roles";

type Tx = Prisma.TransactionClient;

/**
 * Loại task còn dùng. v1.6 mục 3: task Mở rộng (dữ liệu cũ) bị bỏ qua hoàn toàn – không tạo, không đếm,
 * không hiện. Mọi truy vấn KpiTask lọc bằng `task: TASK_DANG_DUNG`.
 */
export const LOAI_TASK_DANG_DUNG: LoaiTask[] = ["BAT_BUOC", "CAI_TIEN"];
export const TASK_DANG_DUNG = { loai: { in: LOAI_TASK_DANG_DUNG } };

/** Phần trăm cộng thêm khi task cải tiến được chốt (mục 4.1). */
export const THUONG_CAI_TIEN = 10;

export const NHIEM_VU_CAI_TIEN = {
  ten: "Đăng ký cải tiến sáng tạo",
  moTa: "Nhiệm vụ hệ thống: đăng ký thực hiện cải tiến sáng tạo trong kỳ (không bắt buộc, không cộng điểm đăng ký).",
  /** Đứng sau mọi nhiệm vụ thường. */
  thuTu: 100000,
  task: {
    ten: "Sản phẩm cải tiến sáng tạo",
    moTa: "Nộp Phụ lục IV đã điền và các file sản phẩm cải tiến.",
  },
} as const;

/**
 * Bảo đảm kỳ có đúng 1 nhiệm vụ cải tiến (kèm 1 task CAI_TIEN) cho mỗi vị trí GV, TBM, TK, HP.
 * Chạy nhiều lần không bị trùng (khóa theo kỳ trong transaction). Gọi khi tạo kỳ, sao chép kỳ, seed.
 * Trả về số nhiệm vụ / task vừa tạo thêm.
 */
export async function damBaoNhiemVuCaiTien(tx: Tx, kyId: string): Promise<number> {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`cai-tien:${kyId}`}))`;
  const co = await tx.nhiemVu.findMany({
    where: { kyId, laCaiTien: true },
    include: { tasks: { where: { loai: "CAI_TIEN" }, select: { id: true } } },
  });
  let taoMoi = 0;
  for (const doiTuong of DOI_TUONGS) {
    const nv = co.find((x) => x.doiTuong === doiTuong);
    if (!nv) {
      await tx.nhiemVu.create({
        data: {
          kyId,
          doiTuong,
          laCaiTien: true,
          ten: NHIEM_VU_CAI_TIEN.ten,
          moTa: NHIEM_VU_CAI_TIEN.moTa,
          diem: 0,
          thuTu: NHIEM_VU_CAI_TIEN.thuTu,
          tasks: { create: { ...NHIEM_VU_CAI_TIEN.task, loai: "CAI_TIEN", thuTu: 1 } },
        },
      });
      taoMoi++;
    } else if (nv.tasks.length === 0) {
      await tx.task.create({ data: { ...NHIEM_VU_CAI_TIEN.task, loai: "CAI_TIEN", thuTu: 1, nhiemVuId: nv.id } });
      taoMoi++;
    }
  }
  return taoMoi;
}
