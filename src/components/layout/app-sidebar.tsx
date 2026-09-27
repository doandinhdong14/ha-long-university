"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  CircleCheckBig,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  Inbox,
  ListChecks,
  Megaphone,
  ScrollText,
  Settings2,
  Stamp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PhanHeMenu } from "@/components/phan-he/phan-he-menu";
import { cn } from "@/lib/utils";
import type { MucMenu } from "@/lib/menu";

// Biểu tượng chỉ để trang trí, theo đường dẫn của mục menu.
const ICON: Record<string, LucideIcon> = {
  "/dau-ky": ClipboardList,
  "/trong-ky": ListChecks,
  "/cuoi-ky": CircleCheckBig,
  "/duyet": FileCheck2,
  "/chot": Stamp,
  "/bao-cao": FileSpreadsheet,
  "/giay-to": Inbox,
  "/quy-dinh": ScrollText,
  "/admin/tai-khoan": Users,
  "/admin/phan-viec": CalendarRange,
  "/admin/chi-thi": Megaphone,
  "/admin/cau-hinh": Settings2,
};

export function AppSidebar({ menu }: { menu: MucMenu[] }) {
  const pathname = usePathname();
  // Khối "Phân hệ mở rộng" chỉ gắn dưới menu Admin (docs/spec-admin-menu.md).
  const laMenuAdmin = menu.some((m) => m.href.startsWith("/admin/"));
  return (
    <>
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {menu.map((m) => {
        const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
        const Icon = ICON[m.href] ?? ClipboardList;
        return (
          <Link
            key={m.href}
            href={m.href}
            className={cn(
              "group relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium leading-snug transition-colors md:whitespace-normal",
              active
                ? "bg-accent font-semibold text-primary md:before:absolute md:before:inset-y-2 md:before:-left-3 md:before:w-1 md:before:rounded-r-full md:before:bg-primary"
                : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary",
              )}
            >
              <Icon className="size-4" />
            </span>
            {m.nhan}
          </Link>
        );
      })}
    </nav>
    {laMenuAdmin && <PhanHeMenu />}
    </>
  );
}
