// Reset dữ liệu (nút đỏ "Reset dữ liệu" của Admin, ngoài đặc tả – xem NOTES.md).
// Xóa mọi dữ liệu người dùng tạo ra: đăng ký, task KPI, minh chứng, yêu cầu thêm task, kết quả kỳ,
// quy định/tài liệu, thông báo – kèm file trên ổ đĩa. Giữ tài khoản, cơ cấu khoa/bộ môn,
// kỳ và phân việc (nhiệm vụ, task, bảng xếp loại); kỳ đã chốt được mở lại.
import "server-only";
import { db } from "@/lib/db";
import { xoaNhieuFile } from "@/lib/storage";

export async function resetDuLieu(): Promise<{ soMinhChung: number; soTaiLieu: number; soFile: number }> {
  const kq = await db.$transaction(async (tx) => {
    const files = await tx.fileDinhKem.findMany({ select: { duongDan: true } });
    const soMinhChung = await tx.baiNop.count();
    // Xóa bản ghi cha; bài nộp, file, lịch sử task, người đã xem… đi theo onDelete: Cascade.
    await tx.kpiTask.deleteMany();
    await tx.yeuCauThemTask.deleteMany();
    await tx.dangKy.deleteMany();
    await tx.ketQuaKy.deleteMany();
    const { count: soTaiLieu } = await tx.vanBan.deleteMany();
    await tx.thongBao.deleteMany();
    await tx.fileDinhKem.deleteMany();
    await tx.ky.updateMany({ where: { daChot: true }, data: { daChot: false } });
    return { soMinhChung, soTaiLieu, files: files.map((f) => f.duongDan) };
  });
  // Cascade chỉ xóa DB → xóa file trên ổ đĩa sau khi transaction đã commit.
  await xoaNhieuFile(kq.files);
  return { soMinhChung: kq.soMinhChung, soTaiLieu: kq.soTaiLieu, soFile: kq.files.length };
}
