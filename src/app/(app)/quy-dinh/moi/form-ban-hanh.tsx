"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPT_FILE, hienKichThuoc, lyDoFileKhongHopLe, SO_FILE_TOI_DA } from "@/lib/files";

type ViTri = { id: string; ten: string; soNguoi: number };

/** Tạo quy định: tiêu đề, nội dung, file đính kèm, tick vị trí nhận (có "Chọn tất cả") → Ban hành. */
export function FormBanHanh({ viTris }: { viTris: ViTri[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const chonHet = chon.size === viTris.length;

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    const loiKhac =
      (!tieuDe.trim() ? "Vui lòng nhập tiêu đề." : null) ??
      (!noiDung.trim() ? "Vui lòng nhập nội dung." : null) ??
      files.map(lyDoFileKhongHopLe).find(Boolean) ??
      (files.length > SO_FILE_TOI_DA ? `Tối đa ${SO_FILE_TOI_DA} file.` : null) ??
      (chon.size === 0 ? "Vui lòng tick ít nhất 1 vị trí nhận." : null);
    if (loiKhac) {
      setLoi(loiKhac);
      return;
    }
    setLoi(null);
    const fd = new FormData();
    fd.append("tieuDe", tieuDe);
    fd.append("noiDung", noiDung);
    files.forEach((f) => fd.append("files", f));
    chon.forEach((v) => fd.append("viTriNhan", v));

    setDangGui(true);
    try {
      const res = await fetch("/api/quy-dinh", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoi(body.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      toast.success(`Đã ban hành quy định cho ${body.soNguoiNhan} người.`);
      router.push(`/quy-dinh/${body.vanBanId}`);
    } catch {
      setLoi("Không gửi được, vui lòng kiểm tra kết nối.");
    } finally {
      setDangGui(false);
    }
  }

  return (
    <form onSubmit={gui} className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nội dung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tieuDe">Tiêu đề</Label>
            <Input id="tieuDe" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="noiDung">Nội dung</Label>
            <Textarea id="noiDung" value={noiDung} onChange={(e) => setNoiDung(e.target.value)} rows={8} maxLength={20000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="files">File đính kèm (không bắt buộc)</Label>
            <Input
              ref={inputRef}
              id="files"
              type="file"
              multiple
              accept={ACCEPT_FILE}
              onChange={(e) => {
                // Lấy danh sách ngay (trước khi xóa input), không đặt trong updater chạy trễ.
                const moi = Array.from(e.target.files ?? []);
                setFiles((f) => [...f, ...moi]);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC/DOCX, XLS/XLSX · tối đa 20MB/file.</p>
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                <span>{f.name}</span>
                <span className="text-xs text-muted-foreground">{hienKichThuoc(f.size)}</span>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Bỏ chọn ${f.name}`} onClick={() => setFiles((d) => d.filter((_, j) => j !== i))}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vị trí nhận</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
            <Checkbox
              checked={chonHet}
              onCheckedChange={(v) => setChon(v === true ? new Set(viTris.map((x) => x.id)) : new Set())}
              aria-label="Chọn tất cả"
            />
            Chọn tất cả
          </label>
          {viTris.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={chon.has(v.id)}
                onCheckedChange={(c) =>
                  setChon((s) => {
                    const n = new Set(s);
                    if (c === true) n.add(v.id);
                    else n.delete(v.id);
                    return n;
                  })
                }
                aria-label={v.ten}
              />
              {v.ten}
              <span className="text-xs text-muted-foreground">({v.soNguoi} người hiện tại)</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 xl:col-span-2">
        <Button type="submit" disabled={dangGui}>
          <Send className="size-4" /> {dangGui ? "Đang ban hành…" : "Ban hành"}
        </Button>
        {loi && (
          <p className="text-sm text-destructive" role="alert">
            {loi}
          </p>
        )}
      </div>
    </form>
  );
}
