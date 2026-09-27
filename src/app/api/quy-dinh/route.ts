// HT ban hành quy định (có file đính kèm → route handler). Chỉ hiệu trưởng được ban hành (mục 9).
import { kiemTraVaiTro } from "@/lib/auth/dal";
import { xuLyApi } from "@/lib/loi";
import { docForm } from "@/lib/services/file-upload";
import { banHanhQuyDinh } from "@/lib/services/van-ban";

export async function POST(req: Request) {
  return xuLyApi(async () => {
    const ht = await kiemTraVaiTro("HT");
    return Response.json(await banHanhQuyDinh(ht, await docForm(req)), { status: 201 });
  });
}
