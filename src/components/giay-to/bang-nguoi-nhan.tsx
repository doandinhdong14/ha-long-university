import Link from "next/link";
import type { Role } from "@/generated/prisma/enums";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TEN_VAI_TRO } from "@/lib/roles";
import { hienNgayGio } from "@/lib/time";
import { cn } from "@/lib/utils";

type NguoiNhan = { id: string; hoTen: string; username: string; role: Role; daXemLuc: Date | null };

/**
 * Ai đã xem, ai chưa xem một quy định, lọc theo vị trí (?viTri=) (mục 9: HT; Admin xem cấu hình).
 * Người nhận = tài khoản HIỆN đang ở các vị trí được tick.
 */
export function BangNguoiNhan({
  nhan,
  viTriNhan,
  loc,
  duongDan,
}: {
  nhan: NguoiNhan[];
  viTriNhan: Role[];
  loc: string | undefined;
  duongDan: string;
}) {
  const viTriLoc = viTriNhan.find((v) => v === loc);
  const ds = (viTriLoc ? nhan.filter((n) => n.role === viTriLoc) : nhan).sort(
    (a, b) => Number(!!b.daXemLuc) - Number(!!a.daXemLuc) || a.hoTen.localeCompare(b.hoTen),
  );
  const daXem = nhan.filter((n) => n.daXemLuc).length;
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">
        Người nhận hiện tại: <span data-testid="tong-da-xem">{daXem}/{nhan.length} đã xem</span>
      </h2>
      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo vị trí">
        {[undefined, ...viTriNhan].map((v) => (
          <Link
            key={v ?? "tat-ca"}
            href={v ? `${duongDan}?viTri=${v}` : duongDan}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              viTriLoc === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {v ? TEN_VAI_TRO[v] : "Tất cả vị trí"}
          </Link>
        ))}
      </nav>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Tình trạng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ds.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  Không có ai.
                </TableCell>
              </TableRow>
            )}
            {ds.map((n) => (
              <TableRow key={n.id} data-nguoi-nhan={n.username}>
                <TableCell>{n.hoTen}</TableCell>
                <TableCell className="font-mono text-xs">{n.username}</TableCell>
                <TableCell>{TEN_VAI_TRO[n.role]}</TableCell>
                <TableCell>
                  {n.daXemLuc ? (
                    <span className="text-primary">Đã xem · {hienNgayGio(n.daXemLuc)}</span>
                  ) : (
                    <span className="text-muted-foreground">Chưa xem</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
