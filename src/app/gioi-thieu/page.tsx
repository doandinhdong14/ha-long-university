// Trang giới thiệu công khai (landing). Chỉ hiển thị tĩnh: không đọc DB, không đọc phiên đăng nhập.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ChartPie,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  GraduationCap,
  Lock,
  Send,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Giới thiệu – CRM KPI giáo viên – ĐH Hạ Long",
  description:
    "Hệ thống đăng ký nhiệm vụ, nộp minh chứng và chấm KPI giáo viên theo kỳ của Trường Đại học Hạ Long.",
};

// Bảng màu: xanh #1877F2 làm màu chính, nền xám nhạt #F0F2F5, xanh nhạt #E7F3FF, chữ phụ #65676B.
const TINH_NANG = [
  {
    icon: ClipboardCheck,
    ten: "Đăng ký nhiệm vụ đầu kỳ",
    mota: "Giáo viên chọn nhiệm vụ, thấy ngay tổng điểm và xếp loại dự kiến trước khi gửi trưởng bộ môn.",
  },
  {
    icon: Upload,
    ten: "Nộp minh chứng theo task",
    mota: "Tải PDF, ảnh, Word, Excel (tối đa 20MB/file), kèm ghi chú, link và lưu đủ lịch sử các lần nộp.",
  },
  {
    icon: FileCheck2,
    ten: "Phê duyệt rõ ràng",
    mota: "Trưởng bộ môn duyệt hoặc từ chối kèm nhận xét; giáo viên sửa và nộp lại ngay trên hệ thống.",
  },
  {
    icon: ChartPie,
    ten: "Theo dõi tiến độ trực quan",
    mota: "Biểu đồ các task bắt buộc, phần trăm hoàn thành, đếm ngược deadline và số task làm vượt.",
  },
  {
    icon: CalendarClock,
    ten: "Tự động chốt kỳ",
    mota: "Hết ngày kết thúc kỳ, hệ thống tự chốt, tính kết quả và khóa mọi thao tác trong kỳ đó.",
  },
  {
    icon: BellRing,
    ten: "Thông báo & giấy tờ",
    mota: "Thông báo trong web cho từng bước duyệt; nhận quyết định của hiệu trưởng và ghi nhận đã xem.",
  },
];

const QUY_TRINH = [
  {
    buoc: "01",
    ten: "Công bố kỳ",
    mota: "Quản trị tạo kỳ, nhiệm vụ, task bắt buộc/mở rộng và bảng xếp loại A1…F rồi công bố.",
  },
  {
    buoc: "02",
    ten: "Đăng ký nhiệm vụ",
    mota: "Đến hết ngày bắt đầu kỳ, giáo viên chọn nhiệm vụ và gửi; trưởng bộ môn duyệt danh sách.",
  },
  {
    buoc: "03",
    ten: "Thực hiện & nộp minh chứng",
    mota: "Trong kỳ, giáo viên nộp minh chứng cho từng task, xin thêm task mở rộng để làm vượt.",
  },
  {
    buoc: "04",
    ten: "Chốt kỳ & kết quả",
    mota: "Hết ngày kết thúc, hệ thống chốt kỳ, xếp kết quả và thông báo cho giáo viên, trưởng bộ môn.",
  },
];

const KET_QUA = [
  {
    nhan: "Không đạt",
    vd: "Không đạt – A1",
    mota: "Chưa hoàn thành đủ task bắt buộc. Hệ thống tự liệt kê các task còn thiếu.",
    mau: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  {
    nhan: "Đạt",
    vd: "Đạt – B",
    mota: "Hoàn thành 100% task bắt buộc đã đăng ký trong kỳ.",
    mau: "bg-[#E7F3FF] text-[#1877F2] ring-[#1877F2]/25",
  },
  {
    nhan: "Vượt chỉ tiêu",
    vd: "Vượt chỉ tiêu – A1",
    mota: "Đủ 100% task bắt buộc và có thêm task mở rộng được duyệt.",
    mau: "bg-amber-50 text-amber-700 ring-amber-200",
  },
];

const VAI_TRO = [
  {
    icon: GraduationCap,
    ten: "Giáo viên",
    mota: "Đăng ký nhiệm vụ, nộp minh chứng, xin thêm task, xem kết quả và nhận giấy tờ.",
  },
  {
    icon: ClipboardCheck,
    ten: "Trưởng bộ môn",
    mota: "Duyệt danh sách đăng ký, duyệt task và yêu cầu xin thêm, xem kết quả cả bộ môn.",
  },
  {
    icon: ShieldCheck,
    ten: "Quản trị",
    mota: "Quản lý tài khoản, phân việc đầu kỳ, cấu hình kỳ và chốt kỳ khi cần.",
  },
  {
    icon: FileText,
    ten: "Hiệu trưởng",
    mota: "Ban hành giấy tờ, quyết định tới giáo viên và theo dõi ai đã xem.",
  },
];

const NUT_CHINH =
  "inline-flex h-11 items-center gap-2 rounded-lg bg-[#1877F2] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166FE5] focus-visible:ring-4 focus-visible:ring-[#1877F2]/30 focus-visible:outline-none";

export default function TrangGioiThieu() {
  return (
    <div className="flex-1 bg-white text-[#1C1E21]">
      <DauTrang />
      <Hero />
      <SoLieu />
      <TinhNang />
      <QuyTrinh />
      <KetQua />
      <VaiTro />
      <KeuGoi />
      <ChanTrang />
    </div>
  );
}

function ThuongHieu() {
  return (
    <Link href="/gioi-thieu" className="flex items-center gap-3">
      <Image
        src="/logo-dhhl-mark.png"
        alt="Logo Trường Đại học Hạ Long"
        width={320}
        height={226}
        className="h-9 w-auto"
        priority
      />
      <span className="border-l border-slate-200 pl-3 leading-tight">
        <span className="block text-[15px] font-bold tracking-tight text-[#1877F2]">CRM KPI giáo viên</span>
        <span className="block text-xs text-[#65676B]">Trường Đại học Hạ Long</span>
      </span>
    </Link>
  );
}

function DauTrang() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <ThuongHieu />
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#65676B] md:flex">
          <a href="#tinh-nang" className="transition hover:text-[#1877F2]">Tính năng</a>
          <a href="#quy-trinh" className="transition hover:text-[#1877F2]">Quy trình</a>
          <a href="#ket-qua" className="transition hover:text-[#1877F2]">Kết quả</a>
          <a href="#vai-tro" className="transition hover:text-[#1877F2]">Vai trò</a>
        </nav>
        <Link
          href="/dang-nhap"
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition hover:bg-[#166FE5]"
        >
          Đăng nhập
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#E7F3FF] via-[#F5F9FF] to-white pt-16 pb-24 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: "radial-gradient(#1877F2 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 55% 55% at 85% 25%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 55% 55% at 85% 25%, black, transparent)",
          opacity: 0.18,
        }}
      />
      <div className="pointer-events-none absolute -top-32 -right-32 -z-10 size-[28rem] rounded-full bg-[#1877F2]/10 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1877F2] shadow-sm ring-1 ring-[#1877F2]/20">
            <span className="size-1.5 rounded-full bg-[#1877F2]" />
            Hệ thống quản lý KPI giảng viên
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-[#0A1F44] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Chấm KPI giáo viên <span className="text-[#1877F2]">minh bạch, đúng hạn</span> trên một nền tảng
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#4B4F56] sm:text-lg">
            Từ đăng ký nhiệm vụ đầu kỳ, nộp minh chứng, phê duyệt của trưởng bộ môn đến chốt kỳ và xếp
            loại — mọi bước đều có dấu vết, có thời hạn rõ ràng và được kiểm soát chặt chẽ.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/dang-nhap" className={NUT_CHINH}>
              Đăng nhập hệ thống
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#quy-trinh"
              className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-[#1C1E21] shadow-sm ring-1 ring-slate-200 transition hover:bg-[#F0F2F5]"
            >
              Xem quy trình một kỳ
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#4B4F56]">
            {["Phân quyền theo vai trò", "Theo giờ Việt Nam", "Giao diện tiếng Việt"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CircleCheck className="size-4 text-[#1877F2]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <BangMinhHoa />
      </div>
    </section>
  );
}

/** Thẻ minh họa màn hình "Trong kỳ" của giáo viên (chỉ là hình vẽ, dữ liệu mẫu). */
function BangMinhHoa() {
  const phanTram = 75;
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="rounded-2xl bg-white p-5 shadow-[0_20px_60px_-15px_rgba(24,119,242,0.35)] ring-1 ring-slate-200 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-[#65676B] uppercase">Trong kỳ</p>
            <p className="mt-0.5 font-semibold text-[#0A1F44]">Kỳ 1 · 2026–2027</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-amber-700 ring-1 ring-amber-200">
            <Clock3 className="size-3.5" />
            Còn 12 ngày
          </span>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <div
            className="relative grid size-32 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#1877F2 0 ${phanTram}%, #F59E0B ${phanTram}% 85%, #F43F5E 85% 90%, #E4E6EB 90% 100%)`,
            }}
          >
            <div className="grid size-24 place-items-center rounded-full bg-white">
              <div className="text-center">
                <p className="text-2xl font-bold tracking-tight text-[#0A1F44]">{phanTram}%</p>
                <p className="text-[11px] text-[#65676B]">tiến độ</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2.5 text-sm">
            <ChuThich mau="bg-[#1877F2]" nhan="Đã duyệt" so={15} />
            <ChuThich mau="bg-amber-500" nhan="Chờ duyệt" so={2} />
            <ChuThich mau="bg-rose-500" nhan="Bị từ chối" so={1} />
            <ChuThich mau="bg-[#E4E6EB]" nhan="Chưa làm" so={2} />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="rounded-md bg-[#0A1F44] px-2.5 py-1 text-xs font-semibold text-white">Xếp loại A1</span>
          <span className="rounded-md bg-[#E7F3FF] px-2.5 py-1 text-xs font-semibold text-[#1877F2]">+2 task vượt</span>
        </div>

        <ul className="mt-5 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          <DongTask ten="Biên soạn đề cương học phần" trangThai="Đã duyệt" mau="text-[#1877F2] bg-[#E7F3FF]" />
          <DongTask ten="Báo cáo sinh hoạt chuyên môn" trangThai="Chờ duyệt" mau="text-amber-700 bg-amber-50" />
          <DongTask ten="Hướng dẫn sinh viên NCKH" trangThai="Chưa làm" mau="text-[#65676B] bg-[#F0F2F5]" />
        </ul>
      </div>

      <div className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200 sm:flex">
        <span className="grid size-9 place-items-center rounded-full bg-[#1877F2] text-white">
          <Send className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-[#0A1F44]">Trưởng bộ môn đã duyệt</p>
          <p className="text-xs text-[#65676B]">Danh sách đăng ký · vừa xong</p>
        </div>
      </div>
    </div>
  );
}

function ChuThich({ mau, nhan, so }: { mau: string; nhan: string; so: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[#4B4F56]">
        <span className={`size-2.5 rounded-full ${mau}`} />
        {nhan}
      </span>
      <span className="font-semibold text-[#0A1F44] tabular-nums">{so}</span>
    </div>
  );
}

function DongTask({ ten, trangThai, mau }: { ten: string; trangThai: string; mau: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <span className="truncate text-[#1C1E21]">{ten}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${mau}`}>{trangThai}</span>
    </li>
  );
}

function SoLieu() {
  const muc = [
    { so: "4", nhan: "kỳ đánh giá mỗi năm học" },
    { so: "A1–F", nhan: "bảng xếp loại theo từng kỳ" },
    { so: "20MB", nhan: "mỗi file minh chứng" },
    { so: "00:05", nhan: "tự động chốt kỳ hằng ngày" },
  ];
  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15 shadow-lg shadow-[#1877F2]/20 md:grid-cols-4">
        {muc.map((m) => (
          <div key={m.nhan} className="bg-[#1877F2] px-5 py-7 text-center text-white">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">{m.so}</p>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">{m.nhan}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TieuDeMuc({ nhan, tieuDe, moTa }: { nhan: string; tieuDe: string; moTa: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-[#1877F2] uppercase">{nhan}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance text-[#0A1F44] sm:text-4xl">{tieuDe}</h2>
      <p className="mt-4 text-base leading-relaxed text-[#65676B]">{moTa}</p>
    </div>
  );
}

function TinhNang() {
  return (
    <section id="tinh-nang" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <TieuDeMuc
          nhan="Tính năng"
          tieuDe="Mọi công việc KPI trong một nơi"
          moTa="Thay cho bảng tính và giấy tờ rời rạc: nhiệm vụ, minh chứng, phê duyệt và kết quả được lưu tập trung, tra cứu lại bất cứ lúc nào."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TINH_NANG.map(({ icon: Icon, ten, mota }) => (
            <div
              key={ten}
              className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-[#1877F2]/40 hover:shadow-lg hover:shadow-[#1877F2]/10"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-[#E7F3FF] text-[#1877F2] transition group-hover:bg-[#1877F2] group-hover:text-white">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold text-[#0A1F44]">{ten}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#65676B]">{mota}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuyTrinh() {
  return (
    <section id="quy-trinh" className="scroll-mt-16 bg-[#F0F2F5] px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <TieuDeMuc
          nhan="Quy trình"
          tieuDe="Dòng thời gian của một kỳ"
          moTa="Hạn đăng ký là 23:59:59 ngày bắt đầu kỳ, deadline là 23:59:59 ngày kết thúc kỳ — theo giờ Việt Nam."
        />
        <ol className="relative mt-16 grid gap-8 md:grid-cols-4 md:gap-6">
          <div className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-0.5 bg-[#1877F2]/25 md:block" />
          {QUY_TRINH.map((b) => (
            <li key={b.buoc} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full bg-[#1877F2] text-sm font-bold text-white shadow-md shadow-[#1877F2]/30 ring-4 ring-[#F0F2F5]">
                {b.buoc}
              </span>
              <div>
                <h3 className="font-semibold text-[#0A1F44] md:mt-4">{b.ten}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#65676B]">{b.mota}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function KetQua() {
  return (
    <section id="ket-qua" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#1877F2] uppercase">Kết quả</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance text-[#0A1F44] sm:text-4xl">
            Hai thông tin, không gộp, không hạ bậc
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#65676B]">
            Mỗi giáo viên luôn thấy đồng thời <strong className="text-[#0A1F44]">kết quả thực hiện</strong> và{" "}
            <strong className="text-[#0A1F44]">xếp loại đăng ký</strong>. Xếp loại là bậc cao nhất mà tổng
            điểm các nhiệm vụ đã chọn đạt được; kết quả dựa trên tỉ lệ task bắt buộc được duyệt.
          </p>
          <div className="mt-8 flex items-start gap-3 rounded-lg border-l-4 border-[#1877F2] bg-[#E7F3FF] p-4 text-sm text-[#1C1E21]">
            <Lock className="mt-0.5 size-4 shrink-0 text-[#1877F2]" />
            Sau khi chốt kỳ, mọi thao tác trong kỳ bị khóa. Bài đã nộp không ai sửa được, trừ chính giáo
            viên khi bài còn ở trạng thái Chờ duyệt.
          </div>
        </div>
        <div className="space-y-4">
          {KET_QUA.map((k) => (
            <div key={k.nhan} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ring-1 ${k.mau}`}>{k.vd}</span>
              <div>
                <p className="font-semibold text-[#0A1F44]">{k.nhan}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#65676B]">{k.mota}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VaiTro() {
  return (
    <section id="vai-tro" className="scroll-mt-16 bg-[#F0F2F5] px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <TieuDeMuc
          nhan="Vai trò"
          tieuDe="Mỗi người thấy đúng phần việc của mình"
          moTa="Quyền được kiểm tra ở máy chủ theo vai trò và bộ môn. Giáo viên chỉ thấy kỳ đã công bố và bài của chính mình."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VAI_TRO.map(({ icon: Icon, ten, mota }) => (
            <div key={ten} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <span className="grid size-11 place-items-center rounded-full bg-[#E7F3FF] text-[#1877F2]">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-[#0A1F44]">{ten}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#65676B]">{mota}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-[#65676B]">
          <Users className="size-4 shrink-0" />
          Trưởng khoa và Hiệu phó: nhận giấy tờ, các chức năng khác đang phát triển.
        </p>
      </div>
    </section>
  );
}

function KeuGoi() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-[#1877F2] px-6 py-14 text-white sm:px-12">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-40 size-72 rounded-full bg-white/5" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Sẵn sàng cho kỳ đánh giá tiếp theo?
            </h2>
            <p className="mt-3 text-white/85">
              Đăng nhập bằng tài khoản nhà trường cấp để đăng ký nhiệm vụ và theo dõi tiến độ của bạn.
            </p>
          </div>
          <Link
            href="/dang-nhap"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-7 text-sm font-semibold text-[#1877F2] shadow-md transition hover:bg-[#E7F3FF]"
          >
            Đăng nhập ngay
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ChanTrang() {
  return (
    <footer className="bg-[#0A1F44] px-4 pt-14 pb-8 text-white/70 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <span className="shrink-0 rounded-xl bg-white p-3">
              <Image
                src="/logo-dhhl.png"
                alt="Logo Trường Đại học Hạ Long"
                width={480}
                height={376}
                className="h-16 w-auto"
              />
            </span>
            <div>
              <p className="text-lg font-semibold text-white">Trường Đại học Hạ Long</p>
              <p className="mt-1 text-sm">Hệ thống CRM chấm KPI giáo viên</p>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <a href="#tinh-nang" className="transition hover:text-white">Tính năng</a>
            <a href="#quy-trinh" className="transition hover:text-white">Quy trình</a>
            <a href="#ket-qua" className="transition hover:text-white">Kết quả</a>
            <a href="#vai-tro" className="transition hover:text-white">Vai trò</a>
            <Link href="/dang-nhap" className="transition hover:text-white">Đăng nhập</Link>
          </nav>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs">© 2026 Trường Đại học Hạ Long</div>
      </div>
    </footer>
  );
}
