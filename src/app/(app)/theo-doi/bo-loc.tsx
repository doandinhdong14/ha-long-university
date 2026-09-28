"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TAT_CA = "__tat-ca__";

export type NhomLoc = { ten: string; nhan: string; tatCa: string; giaTri: string; luaChon: { id: string; ten: string }[] };

/** Bộ lọc trang Theo dõi (khoa, bộ môn, chức vụ, người, loại): đổi tham số trên URL, về trang 1. */
export function BoLocTheoDoi({ nhoms }: { nhoms: NhomLoc[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function doi(ten: string, v: string) {
    const p = new URLSearchParams(sp);
    if (v === TAT_CA) p.delete(ten);
    else p.set(ten, v);
    // Đổi khoa thì bộ môn / người cũ có thể không còn thuộc khoa đó.
    if (ten === "khoa") {
      p.delete("boMon");
      p.delete("nguoi");
    }
    p.delete("trang");
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3" data-testid="bo-loc-theo-doi">
      {nhoms.map((n) => (
        <Select key={n.ten} value={n.giaTri || TAT_CA} onValueChange={(v) => doi(n.ten, v)}>
          <SelectTrigger className="w-56" aria-label={n.nhan}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TAT_CA}>{n.tatCa}</SelectItem>
            {n.luaChon.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.ten}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
