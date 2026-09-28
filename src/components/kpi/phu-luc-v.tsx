import { Download, FileText, Send } from "lucide-react";
import { DanhSachFile, type FileHienThi } from "@/components/chung/danh-sach-file";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PHU_LUC_V } from "@/lib/templates";
import { hienNgayGio } from "@/lib/time";

export type PhuLucVHienThi = { guiLuc: Date; file: FileHienThi } | null;

/** Nút tải file mẫu Phụ lục V (chưa có file trên máy chủ → khóa). */
export function NutTaiMauPhuLucV({ coFile }: { coFile: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3" data-testid="mau-phu-luc-v">
      <div className="flex items-center gap-2 text-sm">
        <FileText className="size-5 text-blue-600" />
        <div>
          <div className="font-medium">Mẫu {PHU_LUC_V.ten}</div>
          {!coFile && <div className="text-xs text-muted-foreground">Mẫu {PHU_LUC_V.ten} đang được cập nhật</div>}
        </div>
      </div>
      {coFile ? (
        <Button asChild variant="outline" size="sm">
          <a href={PHU_LUC_V.url} download={PHU_LUC_V.tenTai}>
            <Download className="size-4" /> Tải mẫu
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <Download className="size-4" /> Tải mẫu
        </Button>
      )}
    </div>
  );
}

/**
 * Phụ lục V đã gửi: file (PDF xem ngay khi xemNgay), thời gian gửi. Dùng ở Cuối kỳ của hiệu phó và trang chi tiết
 * hiệu phó của hiệu trưởng.
 */
export function PhuLucVDaGui({ pl, xemNgay = false }: { pl: PhuLucVHienThi; xemNgay?: boolean }) {
  if (!pl) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="phu-luc-v-trang-thai">
        Chưa gửi
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge className="bg-primary text-primary-foreground" data-testid="phu-luc-v-trang-thai">
          <Send className="size-3" /> Đã gửi hiệu trưởng
        </Badge>
        <span className="text-muted-foreground">
          Gửi lúc <strong className="text-foreground" data-testid="phu-luc-v-gui-luc">{hienNgayGio(pl.guiLuc)}</strong>
        </span>
      </div>
      <DanhSachFile files={[pl.file]} xemNgay={xemNgay} />
    </div>
  );
}
