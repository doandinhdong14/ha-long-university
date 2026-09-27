import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { layNguoiDung } from "@/lib/auth/dal";
import { trangChu } from "@/lib/menu";
import { FormDangNhap } from "./form-dang-nhap";

const DIEM_NOI_BAT = [
  "Đăng ký nhiệm vụ và nộp minh chứng theo kỳ",
  "Duyệt, chốt task theo đúng cấp phụ trách",
  "Theo dõi tiến độ, kết quả và xếp loại",
];

export default async function TrangDangNhap() {
  const u = await layNguoiDung();
  if (u) redirect(trangChu(u.role));

  return (
    <main className="grid flex-1 bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Cột giới thiệu (màn hình lớn) */}
      <section className="relative hidden overflow-hidden bg-primary px-12 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-white/5" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 60% 50% at 80% 30%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 80% 30%, black, transparent)",
          }}
        />

        <div className="relative flex items-center gap-4">
          <span className="rounded-xl bg-white p-2.5 shadow-lg">
            <Image src="/logo-dhhl.png" alt="Logo Trường Đại học Hạ Long" width={480} height={376} className="h-14 w-auto" priority />
          </span>
          <div className="leading-tight">
            <div className="text-lg font-semibold">Trường Đại học Hạ Long</div>
            <div className="text-sm text-white/75">Hệ thống CRM chấm KPI giáo viên</div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl leading-tight font-bold tracking-tight text-balance">
            Chấm KPI giáo viên minh bạch, đúng hạn trên một nền tảng
          </h2>
          <ul className="mt-8 space-y-3 text-white/90">
            {DIEM_NOI_BAT.map((d) => (
              <li key={d} className="flex items-center gap-3">
                <CircleCheck className="size-5 shrink-0 text-white" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© 2026 Trường Đại học Hạ Long</p>
      </section>

      {/* Cột đăng nhập */}
      <section className="flex flex-col items-center justify-center bg-muted px-4 py-12 sm:px-8 lg:bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Image src="/logo-dhhl.png" alt="Logo Trường Đại học Hạ Long" width={480} height={376} className="h-20 w-auto" priority />
          </div>
          <div className="rounded-2xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-border sm:p-8 lg:p-0 lg:shadow-none lg:ring-0">
            <div className="mb-6">
              <div className="text-2xl font-bold tracking-tight text-navy">CRM KPI giáo viên</div>
              <div className="mt-1 text-sm text-muted-foreground">Trường Đại học Hạ Long · Đăng nhập để tiếp tục</div>
            </div>
            <FormDangNhap />
          </div>
          <Link
            href="/gioi-thieu"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Về trang giới thiệu
          </Link>
        </div>
      </section>
    </main>
  );
}
