// Tiến độ task và minh chứng của một người (Xem cấu hình, chỉ xem): biểu đồ, đăng ký, từng task với
// lịch sử nộp (mở xem/tải file) và nhật ký xử lý. Không có nút thao tác.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { DoiTuong } from "@/generated/prisma/enums";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { HaiBieuDoKpi } from "@/components/kpi/bieu-do-kpi";
import { LichSuNop } from "@/components/kpi/lich-su-nop";
import { NhatKyTask } from "@/components/kpi/nhat-ky-task";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { tenDonVi } from "@/lib/co-cau";
import { TASK_DANG_DUNG } from "@/lib/cai-tien";
import { db } from "@/lib/db";
import { nhanChoQuanLy } from "@/lib/kpi/trang-thai";
import { NHAN_DANG_KY, NHAN_LOAI_TASK } from "@/lib/nhan";
import { laDoiTuong, TEN_VAI_TRO } from "@/lib/roles";
import { layCoCau } from "@/lib/services/co-cau";
import { taiKetQua } from "@/lib/services/ket-qua";
import { layLichSuNop, layNhatKyTask } from "@/lib/services/lich-su";

export default async function TrangTienDoMotNguoi(props: PageProps<"/admin/cau-hinh/nguoi/[userId]">) {
  await yeuCauVaiTro("ADMIN");
  const { userId } = await props.params;
  const sp = await props.searchParams;
  const cc = await layCoCau();
  const u = cc.users.find((x) => x.id === userId);
  const ky = typeof sp.kyId === "string" ? await db.ky.findUnique({ where: { id: sp.kyId } }) : null;
  if (!u || !laDoiTuong(u.role) || !ky) notFound();
  const doiTuong = u.role as DoiTuong;

  const [dk, kpiTasks, ketQua] = await Promise.all([
    db.dangKy.findUnique({ where: { kyId_userId: { kyId: ky.id, userId } } }),
    db.kpiTask.findMany({
      where: { kyId: ky.id, userId, task: TASK_DANG_DUNG },
      include: { task: { select: { ten: true, loai: true, thuTu: true, nhiemVu: { select: { ten: true, thuTu: true } } } } },
    }),
    taiKetQua(ky.id, [u]),
  ]);
  kpiTasks.sort((a, b) => a.task.nhiemVu.thuTu - b.task.nhiemVu.thuTu || a.task.thuTu - b.task.thuTu);
  const chiTiet = await Promise.all(kpiTasks.map(async (k) => ({ k, nop: await layLichSuNop(k.id), nk: await layNhatKyTask(k.id) })));
  const kq = ketQua.get(userId)!;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/cau-hinh?tab=tien-do&kyId=${ky.id}`} className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="size-4" /> Tiến độ task và minh chứng
        </Link>
        <TrangTieuDe tieuDe={u.hoTen} moTa={`${u.username} · ${TEN_VAI_TRO[doiTuong]} · ${tenDonVi(u, cc)} · ${ky.ten}`} />
      </div>

      <Card>
        <CardContent className="grid items-center gap-6 xl:grid-cols-[1fr_auto]">
          <HaiBieuDoKpi kq={kq} />
          <div className="space-y-1 text-sm">
            <div>
              Đăng ký:{" "}
              {dk ? <BadgeTrangThai trangThai={dk.trangThai} nhan={NHAN_DANG_KY[dk.trangThai]} laDangKy /> : "Chưa đăng ký"}
            </div>
            {dk && dk.trangThai !== "NHAP" && (
              <div>
                Tổng điểm {dk.tongDiem} · Xếp loại đăng ký <strong>{dk.xepLoai}</strong>
              </div>
            )}
            <div>Đang treo: {kq.soTreo} task · Task vượt (đã chốt): {kq.taskVuot.length}</div>
          </div>
        </CardContent>
      </Card>

      {chiTiet.length === 0 && <p className="text-muted-foreground">Chưa có task nào.</p>}
      {chiTiet.map(({ k, nop, nk }) => (
        <Card key={k.id} data-task={k.task.ten}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{k.task.ten}</CardTitle>
              <p className="text-xs text-muted-foreground">{k.task.nhiemVu.ten}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={k.task.loai === "BAT_BUOC" ? "default" : "outline"}>{NHAN_LOAI_TASK[k.task.loai]}</Badge>
              <BadgeTrangThai trangThai={k.trangThai} nhan={nhanChoQuanLy(k.trangThai)} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Minh chứng</h3>
              <LichSuNop baiNops={nop} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Lịch sử xử lý</h3>
              <NhatKyTask ds={nk} />
              {k.nhanXetChot && <p className="mt-2 text-sm">Nhận xét của người chốt: {k.nhanXetChot}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
