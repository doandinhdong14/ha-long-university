import { Award, CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import type { KetQuaKy } from "@/generated/prisma/client";
import { dongTachPhanTram, hienPhanTram, type MucThieu } from "@/lib/ket-qua";
import { NHAN_KET_QUA } from "@/lib/nhan";
import { cn } from "@/lib/utils";

const KIEU = {
  KHONG_DAT: { icon: XCircle, khung: "border-red-300 bg-red-50 dark:bg-red-950/30", mau: "text-red-700 dark:text-red-300" },
  DAT: { icon: CheckCircle2, khung: "border-primary/40 bg-accent dark:bg-primary/15", mau: "text-primary" },
  VUOT: { icon: Award, khung: "border-amber-300 bg-amber-50 dark:bg-amber-950/30", mau: "text-amber-700 dark:text-amber-300" },
} as const;

/** "Không đạt – A1" / "Đạt – A1" / "Vượt chỉ tiêu – A1 (110%)" (spec-v1.6 mục 4.2). */
export function tieuDeKetQua(k: Pick<KetQuaKy, "ketQua" | "xepLoai" | "phanTram">): string {
  const co = `${NHAN_KET_QUA[k.ketQua]} – ${k.xepLoai}`;
  return k.ketQua === "VUOT" ? `${co} (${hienPhanTram(k.phanTram)})` : co;
}

/**
 * Khối kết quả sau khi chốt kỳ (mục 5.2 v1.4, spec-v1.6 mục 4.2): luôn hiện cả kết quả thực hiện và xếp loại đăng
 * ký, không gộp, không hạ bậc. Có dòng tách "Bắt buộc X% · Cải tiến +10%" để không hiểu nhầm cải tiến bù được phần
 * bắt buộc. Người làm KPI chỉ thấy kết quả cuối cùng (sau khi chốt kỳ).
 */
export function KhoiKetQua({ ketQua }: { ketQua: KetQuaKy | null }) {
  if (!ketQua) {
    return (
      <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Kỳ đã chốt nhưng không có kết quả cho tài khoản của bạn.
      </div>
    );
  }
  const k = KIEU[ketQua.ketQua];
  const Icon = k.icon;
  const thieu = ketQua.taskThieu as MucThieu[];
  const caiTienDat = ketQua.trangThaiCaiTien === "KHONG_DANG_KY" ? null : ketQua.trangThaiCaiTien === "DA_CHOT";

  return (
    <div className={cn("rounded-lg border p-5", k.khung)} data-testid="ket-qua">
      <div className="flex flex-wrap items-center gap-3">
        <Icon className={cn("size-8", k.mau)} />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Kết quả kỳ</div>
          <div className={cn("text-2xl font-bold", k.mau)} data-testid="ket-qua-tieu-de">
            {tieuDeKetQua(ketQua)}
          </div>
          {ketQua.ketQua === "VUOT" && (
            <div className="mt-1 flex items-center gap-1 text-sm" data-testid="cai-tien-da-chot">
              <Lightbulb className="size-4 text-amber-500" /> Cải tiến sáng tạo đã được chốt
            </div>
          )}
        </div>
        <div className="ml-auto grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
          <span className="text-muted-foreground">Kết quả thực hiện</span>
          <strong>{NHAN_KET_QUA[ketQua.ketQua]}</strong>
          <span className="text-muted-foreground">Xếp loại đăng ký</span>
          <strong>{ketQua.xepLoai}</strong>
          <span className="text-muted-foreground">Đánh giá của cấp trên</span>
          <span>
            <strong data-testid="ket-qua-cap-tren">{hienPhanTram(ketQua.phanTram)}</strong>{" "}
            <span className="text-xs text-muted-foreground" data-testid="ket-qua-dong-tach">
              ({dongTachPhanTram("cap-tren", ketQua.phanTramBatBuoc, caiTienDat)})
            </span>
          </span>
          <span className="text-muted-foreground">Tự đánh giá (tham khảo)</span>
          <strong data-testid="ket-qua-tu-danh-gia">{hienPhanTram(ketQua.tuDanhGia)}</strong>
        </div>
      </div>

      {ketQua.ghiChu && (
        <p className="mt-3 text-sm" data-testid="ket-qua-ghi-chu">
          {ketQua.ghiChu}
        </p>
      )}

      {ketQua.ketQua === "KHONG_DAT" && thieu.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-sm font-medium">Task bắt buộc còn thiếu ({thieu.length})</div>
          <ul className="list-inside list-disc text-sm" data-testid="task-thieu">
            {thieu.map((t, i) => (
              <li key={i}>
                {t.ten} <span className="text-muted-foreground">– {t.nhiemVu}</span>
                <span className="ml-1 text-red-700 dark:text-red-300" data-ly-do>
                  ({t.lyDo})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
