import { Badge } from "@/components/ui/badge";
import { NHAN_TRANG_THAI_PHAN_HE, type TrangThaiPhanHe } from "@/lib/admin-phan-he";
import { cn } from "@/lib/utils";

const MAU: Record<TrangThaiPhanHe, string> = {
  HOAT_DONG: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  MOT_PHAN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  PHAT_TRIEN: "bg-muted text-muted-foreground",
};

export function TrangThaiBadge({ trangThai, className }: { trangThai: TrangThaiPhanHe; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", MAU[trangThai], className)} data-trang-thai={trangThai}>
      {NHAN_TRANG_THAI_PHAN_HE[trangThai]}
    </Badge>
  );
}
