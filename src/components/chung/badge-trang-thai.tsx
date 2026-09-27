import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAU: Record<string, string> = {
  NHAP: "bg-muted text-muted-foreground",
  CHUA_LAM: "bg-muted text-muted-foreground",
  CHO_DUYET: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  TU_CHOI: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  TRA_VE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  DA_DUYET: "bg-accent text-accent-foreground dark:bg-primary/20 dark:text-blue-200",
  CHO_CHOT: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  DA_CHOT: "bg-primary text-primary-foreground",
};

/** Trạng thái đăng ký "Đã duyệt" là trạng thái cuối → cùng màu với "Đã chốt". */
const MAU_DANG_KY_DUYET = MAU.DA_CHOT;

export function BadgeTrangThai({
  trangThai,
  nhan,
  className,
  laDangKy,
}: {
  trangThai: string;
  nhan: string;
  className?: string;
  laDangKy?: boolean;
}) {
  const mau = laDangKy && trangThai === "DA_DUYET" ? MAU_DANG_KY_DUYET : MAU[trangThai];
  return (
    <Badge variant="outline" className={cn("border-transparent", mau, className)} data-trang-thai={trangThai}>
      {nhan}
    </Badge>
  );
}
