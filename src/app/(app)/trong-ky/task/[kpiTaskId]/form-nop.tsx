"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FileHienThi } from "@/components/chung/danh-sach-file";
import { ACCEPT_FILE, hienKichThuoc, lyDoFileKhongHopLe, lyDoLinkKhongHopLe, SO_FILE_TOI_DA } from "@/lib/files";
import { cn } from "@/lib/utils";

type Props = (
  | { cheDo: "nop"; kpiTaskId: string; chucDanhDuyet: string }
  | { cheDo: "sua"; baiNopId: string; ghiChu: string; link: string; files: FileHienThi[] }
) & {
  /** Gợi ý dưới ô tải file (vd task cải tiến sáng tạo: "Nộp Phụ lục IV đã điền và file sản phẩm."). */
  goiY?: string;
};

/** Form nộp minh chứng mới, hoặc sửa lần nộp hiện tại (Chờ duyệt). Gửi multipart tới route handler. */
export function FormNopMinhChung(props: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileMoi, setFileMoi] = useState<File[]>([]);
  const [boFile, setBoFile] = useState<Set<string>>(new Set());
  const [ghiChu, setGhiChu] = useState(props.cheDo === "sua" ? props.ghiChu : "");
  const [link, setLink] = useState(props.cheDo === "sua" ? props.link : "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);

  const fileCu = props.cheDo === "sua" ? props.files : [];
  const soFile = fileCu.length - boFile.size + fileMoi.length;

  function themFile(ds: FileList | null) {
    if (!ds) return;
    const moi = [...fileMoi, ...Array.from(ds)];
    setFileMoi(moi);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    // Kiểm tra sớm ở trình duyệt; server kiểm tra lại toàn bộ.
    const loiFile = fileMoi.map(lyDoFileKhongHopLe).find(Boolean) ?? null;
    const loiKhac =
      loiFile ??
      (soFile === 0 ? "Phải tải lên ít nhất 1 file minh chứng." : null) ??
      (soFile > SO_FILE_TOI_DA ? `Tối đa ${SO_FILE_TOI_DA} file cho mỗi lần nộp.` : null) ??
      lyDoLinkKhongHopLe(link.trim());
    if (loiKhac) {
      setLoi(loiKhac);
      return;
    }
    setLoi(null);

    const fd = new FormData();
    fileMoi.forEach((f) => fd.append("files", f));
    boFile.forEach((id) => fd.append("xoaFileIds", id));
    fd.append("ghiChu", ghiChu);
    fd.append("link", link.trim());

    setDangGui(true);
    try {
      const res = await fetch(
        props.cheDo === "nop" ? `/api/kpi-task/${props.kpiTaskId}/bai-nop` : `/api/bai-nop/${props.baiNopId}`,
        { method: props.cheDo === "nop" ? "POST" : "PATCH", body: fd },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoi(body.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      toast.success(props.cheDo === "nop" ? `Đã nộp minh chứng, chờ ${props.chucDanhDuyet} duyệt.` : "Đã cập nhật minh chứng.");
      setFileMoi([]);
      setBoFile(new Set());
      router.refresh();
    } catch {
      setLoi("Không gửi được, vui lòng kiểm tra kết nối.");
    } finally {
      setDangGui(false);
    }
  }

  return (
    <form onSubmit={gui} className="space-y-4">
      {fileCu.length > 0 && (
        <div className="space-y-1">
          <Label>File đã nộp</Label>
          <ul className="space-y-1">
            {fileCu.map((f) => {
              const bo = boFile.has(f.id);
              return (
                <li key={f.id} className="flex items-center gap-2 text-sm" data-file-cu={f.tenGoc}>
                  <a href={`/api/files/${f.id}`} target="_blank" rel="noopener" className={cn("text-primary hover:underline", bo && "line-through opacity-50")}>
                    {f.tenGoc}
                  </a>
                  <span className="text-xs text-muted-foreground">{hienKichThuoc(f.kichThuoc)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setBoFile((s) => {
                        const n = new Set(s);
                        if (bo) n.delete(f.id);
                        else n.add(f.id);
                        return n;
                      })
                    }
                  >
                    {bo ? "Giữ lại" : `Bỏ ${f.tenGoc}`}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="files">{props.cheDo === "sua" ? "Thêm file" : "File minh chứng"}</Label>
        <Input
          ref={inputRef}
          id="files"
          type="file"
          multiple
          accept={ACCEPT_FILE}
          onChange={(e) => themFile(e.target.files)}
        />
        {props.goiY && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300" data-testid="goi-y-nop">
            {props.goiY}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          PDF, JPG, PNG, DOC/DOCX, XLS/XLSX · tối đa 20MB/file · tối đa {SO_FILE_TOI_DA} file.
        </p>
        {fileMoi.length > 0 && (
          <ul className="space-y-1">
            {fileMoi.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm" data-file-moi={f.name}>
                <span>{f.name}</span>
                <span className="text-xs text-muted-foreground">{hienKichThuoc(f.size)}</span>
                {lyDoFileKhongHopLe(f) && <span className="text-xs text-destructive">{lyDoFileKhongHopLe(f)}</span>}
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Bỏ chọn ${f.name}`} onClick={() => setFileMoi((d) => d.filter((_, j) => j !== i))}>
                  <X className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ghiChu">Ghi chú (không bắt buộc)</Label>
        <Textarea id="ghiChu" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} maxLength={2000} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="link">Link (không bắt buộc)</Label>
        <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" maxLength={1000} />
      </div>

      {loi && (
        <p className="text-sm text-destructive" role="alert">
          {loi}
        </p>
      )}
      <Button type="submit" disabled={dangGui}>
        <Upload className="size-4" />
        {dangGui ? "Đang gửi…" : props.cheDo === "nop" ? "Gửi minh chứng" : "Lưu thay đổi"}
      </Button>
    </form>
  );
}
