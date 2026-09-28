// Chi tiết task của người làm KPI: tên, mô tả, khu vực tải file, ghi chú, link, lịch sử các lần nộp.
// Chỉ chính người đó mở được. Nhận xét của người chốt không hiện ở đây (chỉ người duyệt thấy).
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { BadgeTrangThai } from "@/components/chung/badge-trang-thai";
import { LichSuNop } from "@/components/kpi/lich-su-nop";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { yeuCauNguoiLamKpi } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CHUOI } from "@/lib/kpi/chuoi";
import { hanhDongDuocPhep, laGop, nhanChoNguoiLam } from "@/lib/kpi/trang-thai";
import { NHAN_LOAI_TASK } from "@/lib/nhan";
import { chucDanh } from "@/lib/roles";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { layLichSuNop } from "@/lib/services/lich-su";
import { PHU_LUC_IV } from "@/lib/templates";
import { deadline, hienNgayGio } from "@/lib/time";
import { FormNopMinhChung } from "./form-nop";

export default async function TrangTaskCuaToi(props: PageProps<"/trong-ky/task/[kpiTaskId]">) {
  const u = await yeuCauNguoiLamKpi();
  const { kpiTaskId } = await props.params;
  // Mở từ trang Cuối kỳ thì nút quay lại về Cuối kỳ.
  const tuCuoiKy = (await props.searchParams).tu === "cuoi-ky";
  const kt = await db.kpiTask.findUnique({
    where: { id: kpiTaskId },
    include: { ky: true, task: { include: { nhiemVu: { select: { ten: true } } } } },
  });
  if (!kt || kt.userId !== u.id || kt.task.loai === "MO_RONG") notFound();

  const lichSu = await layLichSuNop(kt.id);
  const lyDoKhoa = lyDoKhongThaoTacTask(kt.ky);
  const duocLam = hanhDongDuocPhep("LAM", kt.trangThai, laGop(u.role));
  const hienTai = duocLam.includes("SUA_BAI_NOP") ? lichSu[0] : undefined;
  const chucDanhDuyet = chucDanh(CHUOI[u.role].duyet);
  // v1.6 (mục 2.6): task cải tiến dùng đúng giao diện task thường, thêm gợi ý dưới ô tải file.
  const goiY = kt.task.loai === "CAI_TIEN" ? `Nộp ${PHU_LUC_IV.ten} đã điền và file sản phẩm.` : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tuCuoiKy ? "cuoi-ky" : "trong-ky"}?kyId=${kt.kyId}`}
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeft className="size-4" /> {tuCuoiKy ? "Cuối kỳ" : "Trong kỳ"}
        </Link>
        <TrangTieuDe tieuDe={kt.task.ten} moTa={`${kt.task.nhiemVu.ten} · ${kt.ky.ten} · Deadline: ${hienNgayGio(deadline(kt.ky))}`}>
          <div className="flex items-center gap-2">
            <Badge variant={kt.task.loai === "BAT_BUOC" ? "default" : "outline"}>{NHAN_LOAI_TASK[kt.task.loai]}</Badge>
            <BadgeTrangThai trangThai={kt.trangThai} nhan={nhanChoNguoiLam(kt.trangThai, u.role)} className="text-sm" />
          </div>
        </TrangTieuDe>
        {kt.task.moTa && <p className="text-sm text-muted-foreground">{kt.task.moTa}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {hienTai
              ? "Sửa / thay minh chứng của lần nộp hiện tại"
              : kt.trangThai === "TU_CHOI"
                ? "Nộp lại minh chứng"
                : duocLam.includes("NOP")
                  ? "Nộp minh chứng"
                  : "Minh chứng"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lyDoKhoa ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <Lock className="size-4" /> {lyDoKhoa}
            </p>
          ) : hienTai ? (
            <FormNopMinhChung
              key={hienTai.id}
              cheDo="sua"
              baiNopId={hienTai.id}
              ghiChu={hienTai.ghiChu ?? ""}
              link={hienTai.link ?? ""}
              files={hienTai.files}
              goiY={goiY}
            />
          ) : duocLam.includes("NOP") ? (
            <FormNopMinhChung cheDo="nop" kpiTaskId={kt.id} chucDanhDuyet={chucDanhDuyet} goiY={goiY} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="da-khoa">
              <Lock className="size-4" /> {nhanChoNguoiLam(kt.trangThai, u.role)}. Không sửa được minh chứng.
            </p>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-semibold">Lịch sử các lần nộp</h2>
        <LichSuNop baiNops={lichSu} />
      </section>
    </div>
  );
}
