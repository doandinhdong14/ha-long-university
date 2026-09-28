// Trang chi tiết 1 người trên màn hình Duyệt (mục 6.1), 2 tab: Đăng ký nhiệm vụ | Task và minh chứng
// (v1.6: bỏ tab Xin thêm task).
// Chỉ mở được người mà mình là người duyệt (theo cơ cấu hiện tại), người khác → 404.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { HaiBieuDoKpi } from "@/components/kpi/bieu-do-kpi";
import { PhuLucVDaGui } from "@/components/kpi/phu-luc-v";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChonKy } from "@/components/chung/chon-ky";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { tenDonVi } from "@/lib/co-cau";
import { TEN_VAI_TRO } from "@/lib/roles";
import { layCoCau } from "@/lib/services/co-cau";
import { layNguoiDuocDuyet } from "@/lib/services/duyet";
import { taiKetQua } from "@/lib/services/ket-qua";
import { dsChonKy, layKyTheoUrl } from "@/lib/services/ky";
import { layPhuLucV } from "@/lib/services/phu-luc-v";
import { PHU_LUC_V } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { TabDangKy } from "./tab-dang-ky";
import { TabTask } from "./tab-task";

const TABS = [
  { id: "dang-ky", nhan: "Đăng ký nhiệm vụ" },
  { id: "task", nhan: "Task và minh chứng" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function TrangDuyetMotNguoi(props: PageProps<"/duyet/[nguoiId]">) {
  const m = await yeuCauVaiTro("TBM", "TK", "HP", "HT");
  const { nguoiId } = await props.params;
  const nguoi = await layNguoiDuocDuyet(m, nguoiId);
  if (!nguoi) notFound();

  const sp = await props.searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "dang-ky";
  const { kys, ky } = await layKyTheoUrl(sp.kyId);
  const cc = await layCoCau();
  // v1.6 (mục 5): người duyệt mở chi tiết một người thấy đủ 2 biểu đồ (cấp trên, tự đánh giá).
  const kq = ky ? (await taiKetQua(ky.id, [nguoi])).get(nguoi.id) : undefined;
  // Hiệu trưởng xem Phụ lục V hiệu phó đã gửi (chỉ nhận và xem).
  const coPhuLucV = !!ky && nguoi.role === PHU_LUC_V.viTri;
  const phuLucV = coPhuLucV ? await layPhuLucV(ky.id, nguoi.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={ky ? `/duyet?kyId=${ky.id}` : "/duyet"}
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeft className="size-4" /> Tổng quan
        </Link>
        <TrangTieuDe
          tieuDe={nguoi.hoTen}
          moTa={`${nguoi.username} · ${TEN_VAI_TRO[nguoi.role]} · ${tenDonVi(nguoi, cc)}${ky ? ` · ${ky.ten}` : ""}`}
        >
          {ky && <ChonKy kyId={ky.id} kys={dsChonKy(kys)} />}
        </TrangTieuDe>
      </div>

      {!ky ? (
        <p className="text-muted-foreground">Chưa có kỳ nào được công bố.</p>
      ) : (
        <>
          {kq && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tổng quan KPI</CardTitle>
              </CardHeader>
              <CardContent>
                <HaiBieuDoKpi kq={kq} />
              </CardContent>
            </Card>
          )}
          {coPhuLucV && (
            <Card data-testid="khoi-phu-luc-v">
              <CardHeader>
                <CardTitle className="text-base">{PHU_LUC_V.ten}</CardTitle>
              </CardHeader>
              <CardContent>
                <PhuLucVDaGui pl={phuLucV} xemNgay />
              </CardContent>
            </Card>
          )}
          <nav className="flex flex-wrap gap-1 border-b" aria-label="Các tab">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={`/duyet/${nguoi.id}?kyId=${ky.id}&tab=${t.id}`}
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
          {tab === "dang-ky" && <TabDangKy ky={ky} userId={nguoi.id} />}
          {tab === "task" && (
            <TabTask
              ky={ky}
              nguoi={nguoi}
              loc={typeof sp.loc === "string" ? sp.loc : undefined}
              taskId={typeof sp.task === "string" ? sp.task : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
