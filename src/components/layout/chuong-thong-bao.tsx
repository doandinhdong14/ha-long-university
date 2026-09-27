"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { docTatCaThongBao, docThongBao } from "./thong-bao-actions";

type ThongBao = { id: string; noiDung: string; link: string | null; daDoc: boolean; taoLuc: string };

const fmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  hour12: false,
});

/**
 * Chuông ở header. Layout không render lại khi chuyển trang, nên chuông tự tải lại:
 * khi mở trang, khi đổi đường dẫn, khi mở chuông và mỗi 60 giây.
 */
export function ChuongThongBao() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ chuaDoc: number; items: ThongBao[] }>({ chuaDoc: 0, items: [] });

  const tai = useCallback(async () => {
    try {
      const res = await fetch("/api/thong-bao", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // Mất mạng tạm thời: giữ dữ liệu cũ.
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(tai, 0);
    const t = setInterval(tai, 60_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [tai, pathname]);

  async function moThongBao(tb: ThongBao) {
    setOpen(false);
    if (!tb.daDoc) await docThongBao(tb.id);
    await tai();
    if (tb.link) router.push(tb.link);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void tai();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Thông báo" className="relative">
          <Bell className="size-5" />
          {data.chuaDoc > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
              data-testid="so-chua-doc"
            >
              {data.chuaDoc > 99 ? "99+" : data.chuaDoc}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Thông báo</span>
          {data.chuaDoc > 0 && (
            <Button
              variant="link"
              size="xs"
              onClick={async () => {
                await docTatCaThongBao();
                await tai();
              }}
            >
              Đánh dấu đã đọc tất cả
            </Button>
          )}
        </div>
        <ul className="max-h-96 overflow-auto" data-testid="ds-thong-bao">
          {data.items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Chưa có thông báo.</li>
          )}
          {data.items.map((tb) => (
            <li key={tb.id}>
              <button
                type="button"
                onClick={() => moThongBao(tb)}
                className={cn(
                  "block w-full border-b px-3 py-2 text-left text-sm hover:bg-muted",
                  !tb.daDoc && "bg-accent dark:bg-primary/15",
                )}
                data-thong-bao
                data-da-doc={tb.daDoc}
              >
                <div className={cn(!tb.daDoc && "font-medium")}>{tb.noiDung}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{fmt.format(new Date(tb.taoLuc))}</div>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
