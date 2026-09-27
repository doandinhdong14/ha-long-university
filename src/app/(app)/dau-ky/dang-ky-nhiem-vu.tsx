"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock, Lock, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { LoaiTask, TrangThaiDangKy } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { DemNguoc } from "@/components/chung/dem-nguoc";
import { NutXacNhan } from "@/components/chung/nut-xac-nhan";
import { useHanhDong } from "@/components/chung/use-hanh-dong";
import { NHAN_DANG_KY, NHAN_LOAI_TASK } from "@/lib/nhan";
import { cn } from "@/lib/utils";
import { tinhXepLoai, type Bac } from "@/lib/xep-loai";
import { chonNhiemVu, guiDangKy } from "./actions";

type NhiemVu = {
  id: string;
  ten: string;
  moTa: string | null;
  diem: number;
  tasks: { id: string; ten: string; loai: LoaiTask }[];
};

type DangKy = {
  trangThai: TrangThaiDangKy;
  nhanXet: string | null;
  tongDiem: number;
  xepLoai: string | null;
  nopLuc: string | null;
  duyetLuc: string | null;
};

export function DangKyNhiemVu(props: {
  kyId: string;
  /** Chức danh người duyệt viết thường, vd "trưởng bộ môn" (mục 3.2). */
  chucDanhDuyet: string;
  /** A3: thiếu người duyệt / người chốt → chặn gửi. */
  lyDoThieuNguoi: string | null;
  nhiemVus: NhiemVu[];
  bacs: Bac[];
  daChon: string[];
  dangKy: DangKy | null;
  lyDoKhoa: string | null;
  hanDangKy: string;
  deadline: string;
  deadlineHienThi: string;
}) {
  const { kyId, nhiemVus, bacs, dangKy, lyDoKhoa, chucDanhDuyet, lyDoThieuNguoi } = props;
  const [chon, setChon] = useState<Set<string>>(() => new Set(props.daChon));
  const [, startTransition] = useTransition();
  const dangLuu = useRef(0);
  const [soDangLuu, setSoDangLuu] = useState(0);
  const gui = useHanhDong();
  const choPhepSua = !lyDoKhoa;
  const trangThai = dangKy?.trangThai ?? "NHAP";

  const daChon = nhiemVus.filter((nv) => chon.has(nv.id));
  const tongDiem = daChon.reduce((s, nv) => s + nv.diem, 0);
  const xepLoai = tinhXepLoai(tongDiem, bacs) ?? "—";

  function doiChon(nvId: string, co: boolean) {
    const truoc = new Set(chon);
    const sau = new Set(chon);
    if (co) sau.add(nvId);
    else sau.delete(nvId);
    setChon(sau);
    dangLuu.current++;
    setSoDangLuu(dangLuu.current);
    startTransition(async () => {
      const r = await chonNhiemVu({ kyId, nhiemVuId: nvId, chon: co });
      dangLuu.current--;
      setSoDangLuu(dangLuu.current);
      if (!r.ok) {
        toast.error(r.error);
        setChon(truoc);
      }
    });
  }

  return (
    <div className="space-y-4">
      {choPhepSua && lyDoThieuNguoi && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4" data-testid="thieu-nguoi">
          <AlertTriangle className="mt-0.5 size-5 text-destructive" />
          <p className="text-sm">{lyDoThieuNguoi}</p>
        </div>
      )}
      <BannerTrangThai
        dangKy={dangKy}
        lyDoKhoa={lyDoKhoa}
        deadlineHienThi={props.deadlineHienThi}
        chucDanhDuyet={chucDanhDuyet}
      />

      <div className="flex flex-wrap gap-2">
        {trangThai === "TU_CHOI" ? (
          <DemNguoc den={props.deadline} nhan="Còn lại đến deadline" />
        ) : (
          <DemNguoc den={props.hanDangKy} nhan="Còn lại đến hạn đăng ký" />
        )}
      </div>

      {nhiemVus.length === 0 && <p className="text-muted-foreground">Kỳ này chưa có nhiệm vụ.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {nhiemVus.map((nv) => {
          const co = chon.has(nv.id);
          return (
            <Card
              key={nv.id}
              data-nhiem-vu={nv.ten}
              className={cn("transition-colors", co && "ring-2 ring-primary")}
            >
              <CardHeader className="flex flex-row items-start gap-3">
                <Checkbox
                  id={`nv-${nv.id}`}
                  checked={co}
                  disabled={!choPhepSua}
                  onCheckedChange={(v) => doiChon(nv.id, v === true)}
                  aria-label={`Chọn ${nv.ten}`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`nv-${nv.id}`} className={cn(choPhepSua && "cursor-pointer")}>
                    <CardTitle className="text-base">{nv.ten}</CardTitle>
                  </label>
                  {nv.moTa && <p className="mt-1 text-sm text-muted-foreground">{nv.moTa}</p>}
                </div>
                <Badge variant="secondary" className="shrink-0 text-sm">
                  {nv.diem} điểm
                </Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {nv.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <Badge variant={t.loai === "BAT_BUOC" ? "default" : "outline"} className="w-20 justify-center">
                        {NHAN_LOAI_TASK[t.loai]}
                      </Badge>
                      <span>{t.ten}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Thanh tổng kết cố định */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur md:left-60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" data-testid="thanh-tong-ket">
            <span>
              Đã chọn: <strong data-testid="so-nhiem-vu">{daChon.length}</strong> nhiệm vụ
            </span>
            <span>
              Tổng điểm: <strong data-testid="tong-diem">{tongDiem}</strong>
            </span>
            <span>
              Xếp loại dự kiến: <strong data-testid="xep-loai">{xepLoai}</strong>
            </span>
          </div>
          {choPhepSua && (
            <NutXacNhan
              variant="default"
              tieuDe={`Gửi danh sách lên ${chucDanhDuyet}?`}
              moTa={`Bạn đã chọn ${daChon.length} nhiệm vụ, tổng ${tongDiem} điểm, xếp loại dự kiến ${xepLoai}. Sau khi gửi sẽ không sửa được cho đến khi ${chucDanhDuyet} xử lý.`}
              nhanXacNhan="Gửi"
              disabled={gui.pending || soDangLuu > 0 || daChon.length === 0 || !!lyDoThieuNguoi}
              title={lyDoThieuNguoi ?? (daChon.length === 0 ? "Phải chọn ít nhất 1 nhiệm vụ" : undefined)}
              onXacNhan={() =>
                gui.chay(() => guiDangKy(kyId), {
                  thanhCong: (d) => `Đã gửi danh sách (${d.tongDiem} điểm, xếp loại ${d.xepLoai}).`,
                })
              }
            >
              <Send className="size-4" /> Gửi lên {chucDanhDuyet}
            </NutXacNhan>
          )}
        </div>
      </div>
    </div>
  );
}

function BannerTrangThai({
  dangKy,
  lyDoKhoa,
  deadlineHienThi,
  chucDanhDuyet,
}: {
  dangKy: DangKy | null;
  lyDoKhoa: string | null;
  deadlineHienThi: string;
  chucDanhDuyet: string;
}) {
  const tt = dangKy?.trangThai ?? "NHAP";
  const khung = "flex items-start gap-3 rounded-lg border p-4";
  return (
    <div data-testid="banner-trang-thai">
      {tt === "NHAP" && (
        <div className={cn(khung, lyDoKhoa ? "border-destructive/40 bg-destructive/5" : "bg-background")}>
          {lyDoKhoa ? <Lock className="mt-0.5 size-5 text-destructive" /> : <Clock className="mt-0.5 size-5" />}
          <div>
            <div className="flex items-center gap-2 font-medium">
              Trạng thái: <BadgeTrangThai trangThai="NHAP" nhan={NHAN_DANG_KY.NHAP} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {lyDoKhoa ?? `Tick chọn nhiệm vụ (tự lưu), rồi bấm Gửi lên ${chucDanhDuyet} trước hạn đăng ký.`}
            </p>
          </div>
        </div>
      )}
      {tt === "CHO_DUYET" && (
        <div className={cn(khung, "border-amber-300 bg-amber-50 dark:bg-amber-950/30")}>
          <Clock className="mt-0.5 size-5 text-amber-600" />
          <div>
            <div className="flex items-center gap-2 font-medium">
              Trạng thái: <BadgeTrangThai trangThai="CHO_DUYET" nhan={NHAN_DANG_KY.CHO_DUYET} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Đã gửi lúc {dangKy?.nopLuc} ({dangKy?.tongDiem} điểm, xếp loại {dangKy?.xepLoai}). Đang chờ {chucDanhDuyet} duyệt.
            </p>
          </div>
        </div>
      )}
      {tt === "TU_CHOI" && (
        <div className={cn(khung, "border-red-300 bg-red-50 dark:bg-red-950/30")}>
          <XCircle className="mt-0.5 size-5 text-red-600" />
          <div>
            <div className="flex items-center gap-2 font-medium">
              Trạng thái: <BadgeTrangThai trangThai="TU_CHOI" nhan={NHAN_DANG_KY.TU_CHOI} />
            </div>
            <p className="mt-1 text-sm">
              <span className="font-medium">Nhận xét của {chucDanhDuyet}:</span>{" "}
              <span data-testid="nhan-xet">{dangKy?.nhanXet}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lyDoKhoa ?? `Bạn có thể sửa danh sách và gửi lại đến hết deadline (${deadlineHienThi}).`}
            </p>
          </div>
        </div>
      )}
      {tt === "DA_DUYET" && (
        <div className={cn(khung, "border-primary/40 bg-accent dark:bg-primary/15")}>
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
          <div>
            <div className="flex items-center gap-2 font-medium">
              Trạng thái: <BadgeTrangThai trangThai="DA_DUYET" nhan={NHAN_DANG_KY.DA_DUYET} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Được duyệt lúc {dangKy?.duyetLuc}. Tổng điểm {dangKy?.tongDiem}, xếp loại đăng ký{" "}
              <strong className="text-foreground">{dangKy?.xepLoai}</strong>. Danh sách đã khóa.
            </p>
            {dangKy?.nhanXet && (
              <p className="mt-1 text-sm">
                <span className="font-medium">Nhận xét của {chucDanhDuyet}:</span> {dangKy.nhanXet}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
