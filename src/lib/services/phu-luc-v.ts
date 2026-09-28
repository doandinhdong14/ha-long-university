// Phụ lục V (src/lib/templates.ts): hiệu phó gửi phiếu tự đánh giá đã điền cho hiệu trưởng ở Cuối kỳ.
// Mỗi hiệu phó mỗi kỳ 1 bản, gửi lại thì thay bản cũ, đến hết deadline; hết deadline / kỳ đã chốt → khóa.
// Hiệu trưởng chỉ nhận và xem (không duyệt, không từ chối). Quyền xem file: src/lib/services/quyen-file.ts.
import "server-only";
import type { NguoiDung } from "@/lib/auth/dal";
import { nguoiDuyet } from "@/lib/co-cau";
import { db } from "@/lib/db";
import { chan, LoiNghiepVu } from "@/lib/loi";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { taiCoCau } from "@/lib/services/co-cau";
import { xoaNhieuFile } from "@/lib/storage";
import { lyDoFilePhuLucV, PHU_LUC_V } from "@/lib/templates";
import { guiThongBao, LINK } from "@/lib/thong-bao";
import { layChuoi, luuFiles } from "./file-upload";

const CHON_FILE = { select: { id: true, tenGoc: true, kichThuoc: true, mimeType: true } } as const;

/** Phụ lục V của một hiệu phó trong kỳ (null nếu chưa gửi). */
export function layPhuLucV(kyId: string, userId: string) {
  return db.phuLucV.findUnique({ where: { kyId_userId: { kyId, userId } }, include: { file: CHON_FILE } });
}

/** Phụ lục V của nhiều người trong kỳ, theo userId (bảng tổng quan của hiệu trưởng). */
export async function dsPhuLucV(kyId: string, userIds: string[]) {
  const ds = await db.phuLucV.findMany({ where: { kyId, userId: { in: userIds } }, select: { userId: true, guiLuc: true } });
  return new Map(ds.map((x) => [x.userId, x.guiLuc]));
}

/** Hiệu phó gửi (hoặc gửi lại) Phụ lục V của chính mình. Form: kyId, file (đúng 1 file). */
export async function guiPhuLucV(u: NguoiDung, form: FormData) {
  if (u.role !== PHU_LUC_V.viTri) throw new LoiNghiepVu("Chỉ hiệu phó được gửi Phụ lục V.", 403);
  const kyId = layChuoi(form, "kyId", 100);
  const ky = kyId ? await db.ky.findUnique({ where: { id: kyId } }) : null;
  if (!ky) throw new LoiNghiepVu("Không tìm thấy kỳ.", 404);
  chan(lyDoKhongThaoTacTask(ky));

  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.name !== "");
  if (files.length !== 1) throw new LoiNghiepVu(`Chọn đúng 1 file ${PHU_LUC_V.ten} đã điền.`);
  chan(lyDoFilePhuLucV(files[0]));

  const [daLuu] = await luuFiles(files);
  let fileCu: string | null = null;
  try {
    const kq = await db.$transaction(async (tx) => {
      // Khóa dòng kỳ: chốt kỳ / sửa ngày cùng lúc thì một bên phải chờ, kiểm tra lại luật trong transaction.
      await tx.$queryRaw`SELECT id FROM "Ky" WHERE id = ${ky.id} FOR UPDATE`;
      chan(lyDoKhongThaoTacTask(await tx.ky.findUniqueOrThrow({ where: { id: ky.id } })));

      const cu = await tx.phuLucV.findUnique({ where: { kyId_userId: { kyId: ky.id, userId: u.id } }, include: { file: true } });
      const file = await tx.fileDinhKem.create({ data: daLuu });
      const guiLuc = new Date();
      await tx.phuLucV.upsert({
        where: { kyId_userId: { kyId: ky.id, userId: u.id } },
        create: { kyId: ky.id, userId: u.id, fileId: file.id, guiLuc },
        update: { fileId: file.id, guiLuc },
      });
      if (cu) {
        await tx.fileDinhKem.delete({ where: { id: cu.fileId } });
        fileCu = cu.file.duongDan;
      }

      const cc = await taiCoCau(tx);
      await guiThongBao(tx, [nguoiDuyet(u, cc)?.id], `Hiệu phó ${u.hoTen} đã gửi ${PHU_LUC_V.ten} – ${ky.ten}`, {
        link: LINK.duyetNguoi(u.id, ky.id, "dang-ky"),
        tru: u.id,
      });
      return { guiLuc, guiLai: !!cu };
    });
    // Bản cũ chỉ xóa khỏi ổ đĩa sau khi transaction đã commit.
    if (fileCu) await xoaNhieuFile([fileCu]);
    return kq;
  } catch (e) {
    await xoaNhieuFile([daLuu.duongDan]);
    throw e;
  }
}
