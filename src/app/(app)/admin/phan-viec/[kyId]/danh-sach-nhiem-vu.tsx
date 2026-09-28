"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import type { DoiTuong, LoaiTask } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NutXacNhan } from "@/components/chung/nut-xac-nhan";
import { useHanhDong } from "@/components/chung/use-hanh-dong";
import { NHAN_LOAI_TASK } from "@/lib/nhan";
import { suaNhiemVu, suaTask, themNhiemVu, themTask, xoaNhiemVu, xoaTask } from "../actions";

export type TaskHienThi = {
  id: string;
  ten: string;
  moTa: string | null;
  loai: LoaiTask;
  thuTu: number;
  daCoNguoiLam: boolean;
};
export type NhiemVuHienThi = {
  id: string;
  ten: string;
  moTa: string | null;
  diem: number;
  thuTu: number;
  soDangKy: number;
  soDangKyDuyet: number;
  tasks: TaskHienThi[];
};

export function DanhSachNhiemVu({
  kyId,
  doiTuong,
  nhiemVus,
  tongDiem,
  khoa,
}: {
  kyId: string;
  doiTuong: DoiTuong;
  nhiemVus: NhiemVuHienThi[];
  tongDiem: number;
  khoa: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {nhiemVus.length} nhiệm vụ · tổng điểm tất cả nhiệm vụ: <strong className="text-foreground">{tongDiem}</strong>
        </p>
        {!khoa && <DialogNhiemVu kyId={kyId} doiTuong={doiTuong} thuTuMoi={nhiemVus.length + 1} />}
      </div>
      {nhiemVus.length === 0 && <p className="py-8 text-center text-muted-foreground">Chưa có nhiệm vụ nào.</p>}
      {nhiemVus.map((nv) => (
        <TheNhiemVu key={nv.id} nv={nv} khoa={khoa} />
      ))}
    </div>
  );
}

function TheNhiemVu({ nv, khoa }: { nv: NhiemVuHienThi; khoa: boolean }) {
  const xoa = useHanhDong();
  const coBatBuoc = nv.tasks.some((t) => t.loai === "BAT_BUOC");
  return (
    <Card data-nhiem-vu={nv.ten}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {nv.thuTu}. {nv.ten} <span className="font-normal text-muted-foreground">– {nv.diem} điểm</span>
          </CardTitle>
          {nv.moTa && <p className="text-sm text-muted-foreground">{nv.moTa}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {nv.soDangKy > 0 && <Badge variant="secondary">{nv.soDangKy} người đã chọn</Badge>}
            {!coBatBuoc && (
              <Badge variant="destructive">
                <AlertTriangle className="size-3" /> Chưa có task bắt buộc (tiến độ sẽ tính 100%)
              </Badge>
            )}
          </div>
        </div>
        {!khoa && (
          <div className="flex gap-1">
            <DialogNhiemVu nv={nv} />
            <NutXacNhan
              variant="ghost"
              size="sm"
              nguyHiem
              tieuDe={`Xóa nhiệm vụ "${nv.ten}"?`}
              moTa="Xóa nhiệm vụ sẽ xóa luôn các task bên trong."
              nhanXacNhan="Xóa"
              disabled={nv.soDangKy > 0 || xoa.pending}
              title={nv.soDangKy > 0 ? "Nhiệm vụ đã có người đăng ký, không thể xóa" : undefined}
              onXacNhan={() => xoa.chay(() => xoaNhiemVu(nv.id), { thanhCong: "Đã xóa nhiệm vụ." })}
            >
              <Trash2 className="size-4" /> Xóa
            </NutXacNhan>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border">
          {nv.tasks.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Chưa có task.</li>}
          {nv.tasks.map((t) => (
            <DongTask key={t.id} t={t} nv={nv} khoa={khoa} />
          ))}
        </ul>
        {!khoa && (
          <div className="mt-3">
            <DialogTask nv={nv} thuTuMoi={nv.tasks.length + 1} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DongTask({ t, nv, khoa }: { t: TaskHienThi; nv: NhiemVuHienThi; khoa: boolean }) {
  const xoa = useHanhDong();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" data-task={t.ten}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={t.loai === "BAT_BUOC" ? "default" : "outline"}>
            {t.loai === "MO_RONG" ? "Mở rộng – không còn sử dụng" : NHAN_LOAI_TASK[t.loai]}
          </Badge>
          <span className="font-medium">{t.ten}</span>
        </div>
        {t.moTa && <p className="mt-0.5 text-xs text-muted-foreground">{t.moTa}</p>}
      </div>
      {!khoa && (
        <div className="flex gap-1">
          <DialogTask nv={nv} task={t} />
          <NutXacNhan
            variant="ghost"
            size="sm"
            nguyHiem
            tieuDe={`Xóa task "${t.ten}"?`}
            nhanXacNhan="Xóa"
            disabled={t.daCoNguoiLam || xoa.pending}
            title={t.daCoNguoiLam ? "Task đã có người làm hoặc xin làm, không thể xóa" : undefined}
            onXacNhan={() => xoa.chay(() => xoaTask(t.id), { thanhCong: "Đã xóa task." })}
          >
            <Trash2 className="size-4" />
          </NutXacNhan>
        </div>
      )}
    </li>
  );
}

function DialogNhiemVu(
  props:
    | { kyId: string; doiTuong: DoiTuong; thuTuMoi: number; nv?: undefined }
    | { nv: NhiemVuHienThi; kyId?: undefined; doiTuong?: undefined; thuTuMoi?: undefined },
) {
  const [open, setOpen] = useState(false);
  const { pending, chay } = useHanhDong();
  const nv = props.nv;
  const khoaDiem = !!nv && nv.soDangKy > 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      ten: String(f.get("ten")),
      moTa: String(f.get("moTa") ?? ""),
      diem: String(f.get("diem") ?? nv?.diem ?? ""),
      thuTu: String(f.get("thuTu") ?? "0"),
    };
    chay(() => (nv ? suaNhiemVu({ id: nv.id, ...data }) : themNhiemVu({ kyId: props.kyId!, doiTuong: props.doiTuong!, ...data })), {
      thanhCong: nv ? "Đã lưu nhiệm vụ." : "Đã thêm nhiệm vụ.",
      sau: () => setOpen(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {nv ? (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" /> Sửa
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Thêm nhiệm vụ
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{nv ? "Sửa nhiệm vụ" : "Thêm nhiệm vụ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nv-ten">Tên nhiệm vụ</Label>
            <Input id="nv-ten" name="ten" defaultValue={nv?.ten} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nv-moTa">Mô tả</Label>
            <Textarea id="nv-moTa" name="moTa" defaultValue={nv?.moTa ?? ""} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nv-diem">Điểm</Label>
              <Input id="nv-diem" name="diem" type="number" min={0} defaultValue={nv?.diem} required disabled={khoaDiem} />
              {khoaDiem && <p className="text-xs text-muted-foreground">Đã có người đăng ký, không sửa điểm được.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nv-thuTu">Thứ tự</Label>
              <Input id="nv-thuTu" name="thuTu" type="number" min={0} defaultValue={nv?.thuTu ?? props.thuTuMoi} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialogTask({ nv, task, thuTuMoi }: { nv: NhiemVuHienThi; task?: TaskHienThi; thuTuMoi?: number }) {
  const [open, setOpen] = useState(false);
  const { pending, chay } = useHanhDong();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      ten: String(f.get("ten")),
      moTa: String(f.get("moTa") ?? ""),
      thuTu: String(f.get("thuTu") ?? "0"),
    };
    chay(() => (task ? suaTask({ id: task.id, ...data }) : themTask({ nhiemVuId: nv.id, ...data })), {
      thanhCong: task ? "Đã lưu task." : "Đã thêm task.",
      sau: () => setOpen(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {task ? (
          <Button variant="ghost" size="sm" aria-label={`Sửa task ${task.ten}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Thêm task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{task ? "Sửa task" : `Thêm task cho "${nv.ten}"`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="t-ten">Tên task</Label>
            <Input id="t-ten" name="ten" defaultValue={task?.ten} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-moTa">Mô tả</Label>
            <Textarea id="t-moTa" name="moTa" defaultValue={task?.moTa ?? ""} maxLength={2000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-thuTu">Thứ tự</Label>
            <Input id="t-thuTu" name="thuTu" type="number" min={0} defaultValue={task?.thuTu ?? thuTuMoi} className="w-32" />
            {!task && <p className="text-xs text-muted-foreground">Task mới luôn là task bắt buộc.</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
