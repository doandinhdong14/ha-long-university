// Kiểm tra file mẫu phụ lục (src/lib/templates.ts) đã có trên máy chủ chưa (spec-v1.6 mục 2.2): chưa có thì giao
// diện báo "đang được cập nhật" và khóa nút Tải về.
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import type { MauPhuLuc } from "@/lib/templates";

/** Máy chủ đã có file mẫu chưa (kiểm tra mỗi lần hiển thị). */
export function coFileMau(mau: MauPhuLuc): boolean {
  return existsSync(path.join(process.cwd(), "public", mau.tepPublic));
}
