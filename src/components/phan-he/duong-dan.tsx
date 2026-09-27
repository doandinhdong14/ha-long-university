import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type MucDuongDan = { nhan: string; href?: string };

/** Breadcrumb "Phân hệ mở rộng › …" của các trang phân hệ. */
export function DuongDan({ muc }: { muc: MucDuongDan[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <span>Phân hệ mở rộng</span>
      {muc.map((m) => (
        <Fragment key={m.nhan}>
          <ChevronRight className="size-3.5 shrink-0" />
          {m.href ? (
            <Link href={m.href} className="hover:text-foreground hover:underline">
              {m.nhan}
            </Link>
          ) : (
            <span className="text-foreground" aria-current="page">
              {m.nhan}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export function KhungDangPhatTrien() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground" role="status">
      Chức năng này đang được phát triển và sẽ có trong giai đoạn tiếp theo.
    </div>
  );
}
