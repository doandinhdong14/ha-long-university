"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hienKichThuoc } from "@/lib/files";
import { lyDoFilePhuLucV, PHU_LUC_V } from "@/lib/templates";

/** Hiệu phó chọn 1 file Phụ lục V đã điền và gửi hiệu trưởng (gửi lại thì thay bản cũ). Server kiểm tra lại toàn bộ. */
export function FormPhuLucV({ kyId, daGui }: { kyId: string; daGui: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    const loiFile = file ? lyDoFilePhuLucV(file) : `Chọn file ${PHU_LUC_V.ten} đã điền.`;
    if (loiFile) {
      setLoi(loiFile);
      return;
    }
    setLoi(null);
    const fd = new FormData();
    fd.append("kyId", kyId);
    fd.append("file", file!);
    setDangGui(true);
    try {
      const res = await fetch("/api/phu-luc-v", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoi(body.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      toast.success(`Đã gửi ${PHU_LUC_V.ten} cho hiệu trưởng.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setLoi("Không gửi được, vui lòng kiểm tra kết nối.");
    } finally {
      setDangGui(false);
    }
  }

  return (
    <form onSubmit={gui} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="file-phu-luc-v">{daGui ? `Gửi lại ${PHU_LUC_V.ten} (thay bản đã gửi)` : `File ${PHU_LUC_V.ten} đã điền`}</Label>
        <Input
          ref={inputRef}
          id="file-phu-luc-v"
          type="file"
          accept={PHU_LUC_V.duoiNhan.join(",")}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          PDF, DOC, DOCX · tối đa 20MB · 1 file{file ? ` · Đã chọn: ${file.name} (${hienKichThuoc(file.size)})` : ""}
        </p>
      </div>
      {loi && (
        <p className="text-sm text-destructive" role="alert">
          {loi}
        </p>
      )}
      <Button type="submit" disabled={dangGui}>
        <Send className="size-4" />
        {dangGui ? "Đang gửi…" : "Gửi hiệu trưởng"}
      </Button>
    </form>
  );
}
