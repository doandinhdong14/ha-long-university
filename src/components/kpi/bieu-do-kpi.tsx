"use client";

// Hai biểu đồ tròn KPI (spec-v1.6 mục 5), MỘT component dùng chung cho Trong kỳ / Cuối kỳ và trang chi tiết một người ở
// màn hình Duyệt: "Đánh giá của cấp trên" (5 phần task bắt buộc, giữa là phanTram) và "Tự đánh giá" (Đã nộp /
// Chưa nộp, giữa là tuDanhGia). Người có đăng ký cải tiến thấy thêm một vòng mỏng bên ngoài cho phần +10%
// (biểu đồ tròn không vẽ quá 100%): tô màu nổi khi đạt (cấp trên: đã chốt; tự đánh giá: đã nộp), xám nhạt khi chưa.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { dongTach, hienPhanTram, type KetQuaTinh, type ThongKe } from "@/lib/ket-qua";
import { cn } from "@/lib/utils";

type Loai = "cap-tren" | "tu-danh-gia";

const MAU_CAI_TIEN = "#eab308";
const MAU_XAM = "#e4e6eb";

// Vòng trong – cấp trên giữ nguyên 5 phần như v1.4; tự đánh giá 2 phần.
const PHAN: Record<Loai, { key: keyof ThongKe | "chuaNop"; nhan: string; mau: string }[]> = {
  "cap-tren": [
    { key: "daChot", nhan: "Đã chốt", mau: "#1877f2" },
    { key: "dangTreo", nhan: "Đang treo", mau: "#8b5cf6" },
    { key: "choDuyet", nhan: "Chờ duyệt", mau: "#f59e0b" },
    { key: "tuChoi", nhan: "Bị từ chối", mau: "#ef4444" },
    { key: "chuaLam", nhan: "Chưa làm", mau: MAU_XAM },
  ],
  "tu-danh-gia": [
    { key: "daNop", nhan: "Đã nộp", mau: "#0ea5e9" },
    { key: "chuaNop", nhan: "Chưa nộp", mau: MAU_XAM },
  ],
};

const TIEU_DE: Record<Loai, string> = { "cap-tren": "Đánh giá của cấp trên", "tu-danh-gia": "Tự đánh giá" };

export function BieuDoKpi({
  loai,
  tk,
  phanTram,
  dongTach,
  caiTienDat,
  children,
}: {
  loai: Loai;
  tk: ThongKe;
  /** Số ở giữa: phanTram (cấp trên) hoặc tuDanhGia (tự đánh giá), đã gồm +10% cải tiến. */
  phanTram: number;
  /** "Bắt buộc X% · Cải tiến +10%" … (mục 5.3). */
  dongTach: string;
  /** null = không đăng ký cải tiến (không có vòng ngoài); true = đạt (cấp trên: đã chốt, tự đánh giá: đã nộp). */
  caiTienDat: boolean | null;
  /** Dòng phụ thêm dưới biểu đồ (vd "Đang treo: N task"). */
  children?: React.ReactNode;
}) {
  const giaTri = (key: keyof ThongKe | "chuaNop") => (key === "chuaNop" ? tk.tongBatBuoc - tk.daNop : tk[key]);
  const phan = PHAN[loai].map((p) => ({ ...p, value: giaTri(p.key) }));
  const data = phan.filter((d) => d.value > 0).map((d) => ({ name: d.nhan, value: d.value, mau: d.mau }));
  const trangThaiVong = caiTienDat === null ? null : loai === "cap-tren" ? (caiTienDat ? "đã chốt" : "chưa chốt") : caiTienDat ? "đã nộp" : "chưa nộp";
  const nhanVong = trangThaiVong && `Cải tiến sáng tạo +10% – ${trangThaiVong}`;
  const coVong = caiTienDat !== null;

  return (
    <figure className="flex min-w-0 flex-col items-center gap-3 rounded-lg border bg-background p-4" data-testid={`bieu-do-${loai}`}>
      <figcaption className="text-sm font-semibold">{TIEU_DE[loai]}</figcaption>
      <div className="relative size-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {tk.tongBatBuoc > 0 ? (
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={coVong ? "58%" : "64%"}
                outerRadius={coVong ? "86%" : "96%"}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.mau} />
                ))}
              </Pie>
            ) : (
              <Pie
                data={[{ name: "Chưa có task bắt buộc", value: 1 }]}
                dataKey="value"
                innerRadius={coVong ? "58%" : "64%"}
                outerRadius={coVong ? "86%" : "96%"}
                stroke="none"
                isAnimationActive={false}
              >
                <Cell fill={MAU_XAM} />
              </Pie>
            )}
            {coVong && (
              // Vòng ngoài đủ 360° cho phần +10% cải tiến.
              <Pie
                data={[{ name: nhanVong, value: 1, vong: true }]}
                dataKey="value"
                nameKey="name"
                innerRadius="92%"
                outerRadius="100%"
                stroke="none"
                isAnimationActive={false}
              >
                <Cell fill={caiTienDat ? MAU_CAI_TIEN : MAU_XAM} />
              </Pie>
            )}
            <Tooltip formatter={(v, n, item) => ((item?.payload as { vong?: boolean })?.vong ? [String(n), ""] : [`${v} task`, n])} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" data-testid={loai === "cap-tren" ? "phan-tram" : "tu-danh-gia"}>
            {hienPhanTram(phanTram)}
          </span>
          <span className="text-xs text-muted-foreground">{loai === "cap-tren" ? "cấp trên" : "tự đánh giá"}</span>
        </div>
      </div>
      <p className="text-center text-sm font-medium" data-testid={`dong-tach-${loai}`}>
        {dongTach}
      </p>
      {children}
      <ul className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-xs" data-testid={`chu-giai-${loai}`}>
        {phan.map((p) => (
          <li key={p.key} className="flex items-center gap-2" data-phan={p.key}>
            <span className="size-3 shrink-0 rounded-sm" style={{ background: p.mau }} />
            <span className="flex-1">{p.nhan}</span>
            <strong>{p.value}</strong>
          </li>
        ))}
        {nhanVong && (
          <li
            className="col-span-2 flex items-center gap-2"
            data-testid={`vong-cai-tien-${loai}`}
            data-dat={caiTienDat ? "true" : "false"}
          >
            <span className={cn("size-3 shrink-0 rounded-full border-2")} style={{ borderColor: caiTienDat ? MAU_CAI_TIEN : MAU_XAM }} />
            <span>{nhanVong}</span>
          </li>
        )}
        <li className="col-span-2 pt-1 text-muted-foreground">Tổng {tk.tongBatBuoc} task bắt buộc</li>
      </ul>
    </figure>
  );
}

/**
 * Hai biểu đồ cạnh nhau trên máy tính, xếp dọc trên điện thoại (mục 5.1): trái "Đánh giá của cấp trên" (kèm dòng
 * "Đang treo: N task"), phải "Tự đánh giá". Số liệu lấy từ hàm dùng chung tinhKetQua.
 */
export function HaiBieuDoKpi({ kq }: { kq: KetQuaTinh }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="hai-bieu-do">
      <BieuDoKpi
        loai="cap-tren"
        tk={kq.thongKe}
        phanTram={kq.phanTram}
        dongTach={dongTach("cap-tren", kq)}
        caiTienDat={kq.caiTien ? kq.caiTien.daChot : null}
      >
        <div className="text-sm" data-testid="dang-treo">
          Đang treo: <strong>{kq.soTreo}</strong> task
        </div>
      </BieuDoKpi>
      <BieuDoKpi
        loai="tu-danh-gia"
        tk={kq.thongKe}
        phanTram={kq.tuDanhGia}
        dongTach={dongTach("tu-danh-gia", kq)}
        caiTienDat={kq.caiTien ? kq.caiTien.daNop : null}
      >
        <div className="text-xs text-muted-foreground">Chỉ để tham khảo, không ảnh hưởng kết quả.</div>
      </BieuDoKpi>
    </div>
  );
}
