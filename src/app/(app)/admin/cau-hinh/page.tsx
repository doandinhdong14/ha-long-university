// Xem cấu hình (mục 8.4): mọi tab chỉ xem, không sửa được bài đã nộp.
import Link from "next/link";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { ChonKy } from "@/components/chung/chon-ky";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { trangThaiKy } from "@/lib/ky";
import { chonKy } from "@/lib/ky-hien-tai";
import { layCoCau } from "@/lib/services/co-cau";
import { homNayVN } from "@/lib/time";
import { cn } from "@/lib/utils";
import { TabDangKy, TabKetQua, TabTienDo } from "./tab-kpi";
import { TabKy } from "./tab-ky";
import { TabQuyDinh } from "./tab-quy-dinh";
import { TabTaiKhoan } from "./tab-tai-khoan";

const TABS = [
  { id: "ky", nhan: "Kỳ và bảng xếp loại" },
  { id: "tai-khoan", nhan: "Tài khoản và cơ cấu" },
  { id: "dang-ky", nhan: "Đăng ký nhiệm vụ" },
  { id: "tien-do", nhan: "Tiến độ task và minh chứng" },
  { id: "ket-qua", nhan: "Kết quả các kỳ" },
  { id: "quy-dinh", nhan: "Quy định đã ban hành" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const CAN_KY: Tab[] = ["ky", "dang-ky", "tien-do", "ket-qua"];

export default async function TrangXemCauHinh(props: PageProps<"/admin/cau-hinh">) {
  await yeuCauVaiTro("ADMIN");
  const sp = await props.searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "ky";
  // Admin xem mọi kỳ, kể cả chưa công bố.
  const kys = await db.ky.findMany({ orderBy: [{ ngayBatDau: "desc" }, { createdAt: "desc" }] });
  const ky = chonKy(kys, typeof sp.kyId === "string" ? sp.kyId : undefined, homNayVN()) ?? kys[0] ?? null;
  const cc = await layCoCau();

  return (
    <div>
      <TrangTieuDe tieuDe="Xem cấu hình" moTa="Chỉ xem. Không sửa được dữ liệu hay bài đã nộp.">
        {CAN_KY.includes(tab) && ky && (
          <ChonKy kyId={ky.id} kys={kys.map((k) => ({ id: k.id, ten: k.ten, nhanPhu: trangThaiKy(k) }))} />
        )}
      </TrangTieuDe>

      <nav className="mb-6 flex flex-wrap gap-1 border-b" aria-label="Các tab">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/cau-hinh?tab=${t.id}${ky ? `&kyId=${ky.id}` : ""}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              t.id === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-current={t.id === tab ? "page" : undefined}
          >
            {t.nhan}
          </Link>
        ))}
      </nav>

      {tab === "ky" && <TabKy kys={kys} ky={ky} />}
      {tab === "tai-khoan" && <TabTaiKhoan />}
      {CAN_KY.includes(tab) && tab !== "ky" && !ky && <p className="text-muted-foreground">Chưa có kỳ nào.</p>}
      {tab === "dang-ky" && ky && <TabDangKy ky={ky} cc={cc} />}
      {tab === "tien-do" && ky && <TabTienDo ky={ky} cc={cc} />}
      {tab === "ket-qua" && ky && <TabKetQua ky={ky} cc={cc} />}
      {tab === "quy-dinh" && <TabQuyDinh />}
    </div>
  );
}
