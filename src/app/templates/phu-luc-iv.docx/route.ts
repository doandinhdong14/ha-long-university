// Tải file mẫu Phụ lục IV (spec-v1.6 mục 2.2). File thật nằm ở public/templates/phu-luc-iv.docx; `next start` chỉ
// phục vụ file tĩnh có sẵn lúc build, nên route này đọc file lúc request: chủ dự án chép file vào là tải được
// ngay, không cần build lại. Người chưa đăng nhập bị proxy chuyển về trang đăng nhập.
import { readFile } from "node:fs/promises";
import { coPhuLucIV, FILE_PHU_LUC_IV } from "@/lib/phu-luc";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!coPhuLucIV()) return new Response("Mẫu Phụ lục IV đang được cập nhật.", { status: 404 });
  const noiDung = await readFile(FILE_PHU_LUC_IV);
  return new Response(new Uint8Array(noiDung), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="phu-luc-iv.docx"',
      "Cache-Control": "no-store",
    },
  });
}
