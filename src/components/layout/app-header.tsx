import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dangXuat } from "@/app/dang-nhap/actions";
import { TEN_VAI_TRO } from "@/lib/roles";
import type { NguoiDung } from "@/lib/auth/dal";
import { ChuongThongBao } from "./chuong-thong-bao";

/** Chữ viết tắt cho ảnh đại diện: chữ cái đầu của 2 từ cuối họ tên (vd "Nguyễn Văn An" → "VA"). */
function vietTat(hoTen: string): string {
  const tu = hoTen.trim().split(/\s+/).filter(Boolean);
  return tu.slice(-2).map((t) => t[0]).join("").toUpperCase();
}

export function AppHeader({ user }: { user: NguoiDung }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo-dhhl-mark.png"
            alt="Logo Trường Đại học Hạ Long"
            width={320}
            height={226}
            className="h-9 w-auto shrink-0"
            priority
          />
          <div className="hidden min-w-0 border-l pl-3 leading-tight sm:block">
            <div className="truncate text-[15px] font-bold tracking-tight text-primary">CRM KPI giáo viên</div>
            <div className="truncate text-xs text-muted-foreground">Trường Đại học Hạ Long</div>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ChuongThongBao />
          <div className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 sm:bg-muted sm:pr-4">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {vietTat(user.hoTen)}
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-semibold text-navy">{user.hoTen}</div>
              <div className="text-xs text-muted-foreground">
                {TEN_VAI_TRO[user.role]} · {user.username}
              </div>
            </div>
          </div>
          <form action={dangXuat}>
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" /> <span className="sr-only sm:not-sr-only">Đăng xuất</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
