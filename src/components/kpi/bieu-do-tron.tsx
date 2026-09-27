"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { hienPhanTram, type ThongKe } from "@/lib/ket-qua";

// 5 phần của biểu đồ tròn task bắt buộc (mục 5.2).
const PHAN = [
  { key: "daChot", nhan: "Đã chốt", mau: "#1877f2" },
  { key: "dangTreo", nhan: "Đang treo", mau: "#8b5cf6" },
  { key: "choDuyet", nhan: "Chờ duyệt", mau: "#f59e0b" },
  { key: "tuChoi", nhan: "Bị từ chối", mau: "#ef4444" },
  { key: "chuaLam", nhan: "Chưa làm", mau: "#e4e6eb" },
] as const;

/** Biểu đồ tròn task bắt buộc, giữa là % hoàn thành (chỉ đếm Đã chốt, không vượt 100%). */
export function BieuDoTron({ tk, phanTram }: { tk: ThongKe; phanTram: number }) {
  const data = PHAN.map((p) => ({ name: p.nhan, value: tk[p.key], mau: p.mau })).filter((d) => d.value > 0);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-44 shrink-0">
        {tk.tongBatBuoc > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" stroke="none" isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.mau} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} task`]} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="size-full rounded-full border-[14px] border-muted" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" data-testid="phan-tram">
            {hienPhanTram(phanTram)}
          </span>
          <span className="text-xs text-muted-foreground">hoàn thành</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm" data-testid="chu-giai">
        {PHAN.map((p) => (
          <li key={p.key} className="flex items-center gap-2" data-phan={p.key}>
            <span className="size-3 rounded-sm" style={{ background: p.mau }} />
            <span className="w-24">{p.nhan}</span>
            <strong>{tk[p.key]}</strong>
          </li>
        ))}
        <li className="pt-1 text-xs text-muted-foreground">Tổng {tk.tongBatBuoc} task bắt buộc</li>
      </ul>
    </div>
  );
}
