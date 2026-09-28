// Hiệu phó gửi / gửi lại Phụ lục V (multipart: kyId, file). Route handler thay server action vì upload file lớn.
// Vai trò khác → 403 (kiểm tra ở server).
import { kiemTraVaiTro } from "@/lib/auth/dal";
import { xuLyApi } from "@/lib/loi";
import { docForm } from "@/lib/services/file-upload";
import { guiPhuLucV } from "@/lib/services/phu-luc-v";
import { PHU_LUC_V } from "@/lib/templates";

export async function POST(req: Request) {
  return xuLyApi(async () => {
    const u = await kiemTraVaiTro(PHU_LUC_V.viTri);
    return Response.json(await guiPhuLucV(u, await docForm(req)), { status: 201 });
  });
}
