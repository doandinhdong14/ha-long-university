"use client";

// Khối "Phân hệ mở rộng" gắn thêm dưới menu Admin (docs/spec-admin-menu.md).
// Màn hình rộng: 6 nhóm thu gọn/mở ra được, nhóm chứa trang đang xem tự mở.
// Điện thoại: một hàng cuộn ngang như menu hiện có, mỗi nhóm là một mục dẫn tới trang tổng quan.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronRight, ClipboardList, FileText, ListChecks, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import { GOC_PHAN_HE, hrefMuc, hrefNhom, PHAN_HE_ADMIN } from "@/lib/admin-phan-he";
import { cn } from "@/lib/utils";

const ICON: Record<string, LucideIcon> = { Settings, ListChecks, ClipboardList, ShieldCheck, FileText, BarChart3 };

function nhomDangXem(pathname: string): string | null {
  if (!pathname.startsWith(`${GOC_PHAN_HE}/`)) return null;
  return pathname.slice(GOC_PHAN_HE.length + 1).split("/")[0] || null;
}

export function PhanHeMenu() {
  const pathname = usePathname();
  const dangXem = nhomDangXem(pathname);
  const [mo, setMo] = useState<Set<string>>(() => new Set(dangXem ? [dangXem] : []));
  const [nhomTruoc, setNhomTruoc] = useState(dangXem);

  // Chuyển sang nhóm khác → nhóm đó tự mở, các nhóm khác thu gọn.
  if (nhomTruoc !== dangXem) {
    setNhomTruoc(dangXem);
    setMo(new Set(dangXem ? [dangXem] : []));
  }

  const dao = (slug: string) =>
    setMo((s) => {
      const moi = new Set(s);
      if (moi.has(slug)) moi.delete(slug);
      else moi.add(slug);
      return moi;
    });

  return (
    <div className="mt-2 border-t pt-2 md:mt-4 md:pt-4" data-phan-he-menu>
      <div className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Phân hệ mở rộng</div>

      {/* Điện thoại */}
      <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Phân hệ mở rộng">
        {PHAN_HE_ADMIN.map((n) => {
          const Icon = ICON[n.icon] ?? ClipboardList;
          const active = dangXem === n.slug;
          return (
            <Link
              key={n.slug}
              href={hrefNhom(n)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-accent font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {n.so}. {n.ten}
            </Link>
          );
        })}
      </nav>

      {/* Màn hình rộng */}
      <nav className="hidden flex-col gap-1 md:flex" aria-label="Phân hệ mở rộng">
        {PHAN_HE_ADMIN.map((n) => {
          const Icon = ICON[n.icon] ?? ClipboardList;
          const dangMo = mo.has(n.slug);
          const activeNhom = pathname === hrefNhom(n);
          return (
            <div key={n.slug} data-nhom={n.slug}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => dao(n.slug)}
                  aria-expanded={dangMo}
                  aria-label={dangMo ? `Thu gọn ${n.ten}` : `Mở ${n.ten}`}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className={cn("size-4 transition-transform", dangMo && "rotate-90")} />
                </button>
                <Link
                  href={hrefNhom(n)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium leading-snug transition-colors",
                    activeNhom ? "bg-accent font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>
                    {n.so}. {n.ten}
                  </span>
                </Link>
              </div>
              {dangMo && (
                <ul className="mt-1 mb-2 ml-5 space-y-0.5 border-l pl-2">
                  {n.mucCon.map((m) => {
                    const href = hrefMuc(n, m);
                    const active = pathname === href;
                    return (
                      <li key={m.slug}>
                        <Link
                          href={href}
                          className={cn(
                            "flex gap-1.5 rounded-md px-2 py-1.5 text-xs leading-snug transition-colors",
                            active ? "bg-accent font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <span className="shrink-0 tabular-nums">{m.so}</span>
                          <span>{m.ten}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
