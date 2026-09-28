"use client";

// Đầu kỳ – đăng ký nhiệm vụ (spec-v1.6 mục 2): mọi nhiệm vụ của vị trí đều bắt buộc (tick sẵn, khóa). Người làm
// KPI chỉ chọn có đăng ký cải tiến sáng tạo hay không (tự lưu), rồi Gửi. Danh sách nhiệm vụ do server quyết.
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, FileText, Lightbulb, Lock, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { TrangThaiDangKy } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { DemNguoc } from "@/components/chung/dem-nguoc";
import { NutXacNhan } from "@/components/chung/nut-xac-nhan";
import { useHanhDong } from "@/components/chung/use-hanh-dong";
import { DUONG_DAN_PHU_LUC_IV } from "@/lib/cai-tien";
import { NHAN_DANG_KY } from "@/lib/nhan";
import { cn } from "@/lib/utils";
import { tinhXepLoai, type Bac } from "@/lib/xep-loai";
import { guiDangKy, luuDangKy } from "./actions";

type NhiemVu = {
  id: string;
  ten: string;
  moTa: string | null;
  diem: number;
  /** Chỉ task Bắt buộc (task Mở rộng cũ bị ẩn). */
  tasks: { id: string; ten: string }[];
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
  /** Nhiệm vụ bắt buộc (đều được ghi vào đăng ký). */
  nhiemVus: NhiemVu[];
  bacs: Bac[];
  caiTien: boolean;
  /** File mẫu Phụ lục IV đã có trên máy chủ chưa. */
  coPhuLucIV: boolean;
  dangKy: DangKy | null;
  lyDoKhoa: string | null;
  hanDangKy: string;
  deadline: string;
  deadlineHienThi: string;
}) {
  const { kyId, nhiemVus, bacs, dangKy, lyDoKhoa, chucDanhDuyet, lyDoThieuNguoi } = props;
  const [caiTien, setCaiTien] = useState(props.caiTien);
  const [, startTransition] = useTransition();
  const dangLuu = useRef(0);
  const [soDangLuu, setSoDangLuu] = useState(0);
  const gui = useHanhDong();
  // Tick cải tiến được khi Nháp (trước hạn đăng ký) hoặc Bị từ chối (trước deadline) – cùng luật với sửa danh sách.
  const choPhepSua = !lyDoKhoa;
  const trangThai = dangKy?.trangThai ?? "NHAP";
  const chuaCoNhiemVu = nhiemVus.length === 0;

  const tongDiem = nhiemVus.reduce((s, nv) => s + nv.diem, 0);
  const xepLoai = tinhXepLoai(tongDiem, bacs) ?? "—";
  const nhanCaiTien = caiTien ? "Có" : "Không";

  function doiCaiTien(co: boolean) {
    const truoc = caiTien;
    setCaiTien(co);
    dangLuu.current++;
    setSoDangLuu(dangLuu.current);
    startTransition(async () => {
      const r = await luuDangKy({ kyId, caiTien: co });
      dangLuu.current--;
      setSoDangLuu(dangLuu.current);
      if (!r.ok) {
        toast.error(r.error);
        setCaiTien(truoc);
      }
    });
  }

  const lyDoKhongGui = lyDoThieuNguoi ?? (chuaCoNhiemVu ? "Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin." : undefined);

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

      {chuaCoNhiemVu && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4" data-testid="chua-co-nhiem-vu">
          <AlertTriangle className="mt-0.5 size-5 text-destructive" />
          <p className="text-sm">Chưa có nhiệm vụ cho vị trí này, vui lòng liên hệ admin.</p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {nhiemVus.map((nv) => (
          <Card key={nv.id} data-nhiem-vu={nv.ten} className="ring-2 ring-primary/60">
            <CardHeader className="flex flex-row items-start gap-3">
              {/* Nhiệm vụ bắt buộc: tick sẵn, khóa, không bỏ được. */}
              <Checkbox checked disabled aria-label={`Chọn ${nv.ten}`} className="mt-1" />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{nv.ten}</CardTitle>
                {nv.moTa && <p className="mt-1 text-sm text-muted-foreground">{nv.moTa}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant="secondary" className="text-sm">
                  {nv.diem} điểm
                </Badge>
                <Badge variant="default" data-testid="nhan-bat-buoc">
                  <Lock className="size-3" /> Bắt buộc
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {nv.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <Badge variant="default" className="w-20 justify-center">
                      Bắt buộc
                    </Badge>
                    <span>{t.ten}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Khối "Đăng ký cải tiến sáng tạo" – bên dưới danh sách nhiệm vụ, trên nút Gửi (mục 2.2). */}
      <Card data-testid="khoi-cai-tien" className={cn("border-dashed", caiTien && "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20")}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-amber-500" /> Đăng ký cải tiến sáng tạo{" "}
            <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3" data-testid="phu-luc-iv">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-5 text-blue-600" />
              <div>
                <div className="font-medium">Phụ lục IV</div>
                {!props.coPhuLucIV && <div className="text-xs text-muted-foreground">Mẫu Phụ lục IV đang được cập nhật</div>}
              </div>
            </div>
            {props.coPhuLucIV ? (
              <Button asChild variant="outline" size="sm">
                <a href={DUONG_DAN_PHU_LUC_IV} download>
                  <Download className="size-4" /> Tải về
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Download className="size-4" /> Tải về
              </Button>
            )}
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="dang-ky-cai-tien"
              checked={caiTien}
              disabled={!choPhepSua}
              onCheckedChange={(v) => doiCaiTien(v === true)}
              className="mt-0.5"
            />
            <div className="text-sm">
              <label htmlFor="dang-ky-cai-tien" className={cn("font-medium", choPhepSua && "cursor-pointer")}>
                Tôi đăng ký thực hiện cải tiến sáng tạo trong kỳ này
              </label>
              <p className="text-muted-foreground">Hoàn thành và được chốt: +10% (tối đa 110%).</p>
              <p className="text-muted-foreground">Không ảnh hưởng xếp loại đăng ký.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thanh tổng kết cố định */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur md:left-60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" data-testid="thanh-tong-ket">
            <span>
              Số nhiệm vụ: <strong data-testid="so-nhiem-vu">{nhiemVus.length}</strong>
            </span>
            <span>
              Tổng điểm: <strong data-testid="tong-diem">{tongDiem}</strong>
            </span>
            <span>
              Xếp loại dự kiến: <strong data-testid="xep-loai">{xepLoai}</strong>
            </span>
            <span>
              Cải tiến sáng tạo: <strong data-testid="cai-tien">{nhanCaiTien}</strong>
            </span>
          </div>
          {choPhepSua && (
            <NutXacNhan
              variant="default"
              tieuDe={`Gửi danh sách lên ${chucDanhDuyet}?`}
              moTa={`Đăng ký ${nhiemVus.length} nhiệm vụ bắt buộc, tổng ${tongDiem} điểm, xếp loại dự kiến ${xepLoai}. Cải tiến sáng tạo: ${nhanCaiTien}. Sau khi gửi sẽ không sửa được cho đến khi ${chucDanhDuyet} xử lý.`}
              nhanXacNhan="Gửi"
              disabled={gui.pending || soDangLuu > 0 || !!lyDoKhongGui}
              title={lyDoKhongGui}
              onXacNhan={() =>
                gui.chay(() => guiDangKy({ kyId, caiTien }), {
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
              {lyDoKhoa ??
                `Mọi nhiệm vụ của vị trí đều bắt buộc. Chọn có đăng ký cải tiến sáng tạo hay không (tự lưu), rồi bấm Gửi lên ${chucDanhDuyet} trước hạn đăng ký.`}
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
              {lyDoKhoa ?? `Bạn có thể sửa đăng ký cải tiến và gửi lại đến hết deadline (${deadlineHienThi}).`}
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
