// Seed dữ liệu demo (mục 12.4 của docs/spec.md). Chỉ chạy trên DB trống.
// Làm lại demo từ đầu: npm run db:reset
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import type { DoiTuong, Role } from "../src/generated/prisma/enums";
import { tenGoc } from "../src/lib/username";
import { chuoiThanhNgay, congNgay, homNayVN } from "../src/lib/time";
import { damBaoNhiemVuCaiTien } from "../src/lib/cai-tien";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TAI_KHOAN: { hoTen: string; role: Role }[] = [
  { hoTen: "Quản trị", role: "ADMIN" },
  { hoTen: "Nguyễn Văn Hiếu", role: "HT" },
  { hoTen: "Trần Thị Phương", role: "HP" },
  { hoTen: "Lê Văn Khoa", role: "TK" },
  { hoTen: "Phạm Thị Bích", role: "TBM" },
  { hoTen: "Nguyễn Văn An", role: "GV" },
  { hoTen: "Trần Thị Bình", role: "GV" },
  { hoTen: "Lê Văn Cường", role: "GV" },
];

// [tên, mô tả, điểm, task bắt buộc[]] — v1.6: không còn task mở rộng.
type MauNhiemVu = [string, string, number, string[]];

const NHIEM_VU: Record<DoiTuong, MauNhiemVu[]> = {
  GV: [
    ["Biên soạn bài giảng", "Biên soạn và cập nhật bài giảng các học phần được phân công.", 15,
      ["Biên soạn đề cương chi tiết học phần", "Soạn slide bài giảng", "Nộp giáo án lên bộ môn"]],
    ["Hướng dẫn sinh viên NCKH", "Hướng dẫn ít nhất một nhóm sinh viên nghiên cứu khoa học.", 12,
      ["Đăng ký đề tài với khoa", "Hướng dẫn nhóm hoàn thành báo cáo"]],
    ["Công bố bài báo khoa học", "Công bố ít nhất một bài báo trên tạp chí chuyên ngành.", 12,
      ["Nộp bản thảo bài báo", "Có quyết định chấp nhận đăng"]],
    ["Biên soạn giáo trình, tài liệu tham khảo", "Tham gia biên soạn giáo trình hoặc tài liệu tham khảo.", 10,
      ["Nộp đề cương giáo trình", "Hoàn thành bản thảo 3 chương"]],
    ["Đổi mới phương pháp giảng dạy", "Áp dụng phương pháp giảng dạy mới trong ít nhất một học phần.", 10,
      ["Lập kế hoạch đổi mới", "Báo cáo kết quả áp dụng"]],
    ["Tham gia hội thảo chuyên môn", "Tham gia hội thảo, seminar chuyên môn của khoa/trường.", 10,
      ["Đăng ký tham dự hội thảo", "Nộp tham luận"]],
    ["Cố vấn học tập", "Làm cố vấn học tập cho lớp được phân công.", 8,
      ["Họp lớp định kỳ", "Báo cáo tình hình lớp"]],
    ["Coi thi, chấm thi", "Hoàn thành công tác coi thi, chấm thi theo phân công.", 8,
      ["Coi thi đủ buổi được phân công", "Nộp điểm đúng hạn", "Lưu trữ bài thi"]],
    ["Bồi dưỡng chuyên môn", "Tham gia các khóa bồi dưỡng nâng cao chuyên môn.", 8,
      ["Tham gia khóa bồi dưỡng", "Nộp chứng nhận hoàn thành"]],
    ["Công tác phục vụ cộng đồng", "Tham gia hoạt động phục vụ cộng đồng của trường.", 7,
      ["Tham gia hoạt động tình nguyện", "Báo cáo kết quả hoạt động"]],
  ],
  TBM: [
    ["Quản lý chương trình đào tạo của bộ môn", "Rà soát, cập nhật đề cương các học phần do bộ môn phụ trách.", 20,
      ["Rà soát đề cương các học phần", "Tổng hợp đề xuất cập nhật chương trình"]],
    ["Phân công và giám sát giảng dạy", "Phân công giảng dạy và theo dõi chất lượng giảng dạy trong bộ môn.", 20,
      ["Lập bảng phân công giảng dạy", "Dự giờ giảng viên trong bộ môn", "Báo cáo tình hình giảng dạy"]],
    ["Sinh hoạt chuyên môn bộ môn", "Tổ chức sinh hoạt chuyên môn định kỳ của bộ môn.", 15,
      ["Tổ chức sinh hoạt chuyên môn định kỳ", "Nộp biên bản sinh hoạt"]],
    ["Phát triển đội ngũ", "Bồi dưỡng, phát triển đội ngũ giảng viên của bộ môn.", 15,
      ["Lập kế hoạch bồi dưỡng giảng viên", "Báo cáo kết quả bồi dưỡng"]],
    ["Nghiên cứu khoa học của bộ môn", "Định hướng và tổng hợp hoạt động nghiên cứu của bộ môn.", 15,
      ["Tổng hợp đề tài NCKH của bộ môn", "Báo cáo kết quả NCKH"]],
    ["Công tác khảo thí của bộ môn", "Quản lý đề thi và kết quả thi các học phần của bộ môn.", 15,
      ["Duyệt đề thi các học phần", "Tổng hợp kết quả thi"]],
  ],
  TK: [
    ["Quản lý đào tạo của khoa", "Lập và theo dõi kế hoạch đào tạo của khoa.", 20,
      ["Lập kế hoạch đào tạo năm học", "Báo cáo tiến độ đào tạo"]],
    ["Kiểm định chất lượng chương trình", "Tổ chức tự đánh giá chương trình đào tạo của khoa.", 20,
      ["Chuẩn bị hồ sơ tự đánh giá", "Tổ chức họp hội đồng tự đánh giá"]],
    ["Hợp tác doanh nghiệp", "Mở rộng hợp tác với doanh nghiệp trong đào tạo và thực tập.", 20,
      ["Ký kết thỏa thuận hợp tác", "Tổ chức hội thảo với doanh nghiệp"]],
    ["Công tác sinh viên của khoa", "Theo dõi, hỗ trợ sinh viên của khoa.", 20,
      ["Họp giao ban công tác sinh viên", "Báo cáo tình hình sinh viên"]],
    ["Phát triển nghiên cứu khoa học của khoa", "Thúc đẩy hoạt động nghiên cứu và công bố của khoa.", 20,
      ["Tổ chức hội nghị khoa học của khoa", "Tổng hợp công bố của khoa"]],
  ],
  HP: [
    ["Chỉ đạo công tác đào tạo", "Chỉ đạo, kiểm tra công tác đào tạo của các khoa phụ trách.", 20,
      ["Ban hành kế hoạch đào tạo", "Kiểm tra tiến độ giảng dạy các khoa"]],
    ["Chỉ đạo nghiên cứu khoa học", "Chỉ đạo hoạt động nghiên cứu khoa học cấp trường.", 20,
      ["Phê duyệt danh mục đề tài cấp trường", "Tổ chức nghiệm thu đề tài"]],
    ["Đảm bảo chất lượng", "Chỉ đạo công tác đảm bảo chất lượng giáo dục.", 20,
      ["Chỉ đạo tự đánh giá cơ sở giáo dục", "Báo cáo kết quả khảo sát người học"]],
    ["Hợp tác quốc tế", "Phát triển quan hệ hợp tác với đối tác nước ngoài.", 20,
      ["Làm việc với đối tác quốc tế", "Báo cáo hoạt động hợp tác"]],
    ["Phụ trách các khoa", "Theo dõi, đánh giá hoạt động các khoa được phân công phụ trách.", 20,
      ["Giao ban định kỳ với các khoa", "Đánh giá hoạt động các khoa phụ trách"]],
  ],
};

// Bảng xếp loại mẫu, giống nhau cho 4 vị trí.
const BAC_XEP_LOAI: [string, number][] = [
  ["A1", 80], ["A2", 65], ["B", 50], ["C", 35], ["D", 20], ["F", 0],
];

/** v1.6: mỗi kỳ, mỗi vị trí có đúng 1 nhiệm vụ cải tiến. Chạy cả khi DB đã có dữ liệu (bước release trên Railway). */
async function damBaoCaiTienMoiKy() {
  let taoMoi = 0;
  for (const ky of await db.ky.findMany({ select: { id: true } })) {
    taoMoi += await db.$transaction((tx) => damBaoNhiemVuCaiTien(tx, ky.id));
  }
  if (taoMoi) console.log(`Đã tạo ${taoMoi} nhiệm vụ/task cải tiến sáng tạo còn thiếu.`);
}

async function main() {
  if ((await db.user.count()) > 0) {
    await damBaoCaiTienMoiKy();
    console.log("DB đã có dữ liệu → bỏ qua seed. Muốn làm lại từ đầu: npm run db:reset");
    return;
  }

  const khoa = await db.khoa.create({ data: { ten: "Khoa Công nghệ thông tin" } });
  const boMon = await db.boMon.create({ data: { ten: "Bộ môn Khoa học máy tính", khoaId: khoa.id } });

  const passwordHash = await bcrypt.hash("123456", 10);
  for (const tk of TAI_KHOAN) {
    const username = tenGoc(tk.hoTen, tk.role)!;
    // Gắn đơn vị theo mục 2.4: GV, TBM → bộ môn; TK → khoa; HP → khoa phụ trách (Khoa.hieuPhoId).
    const u = await db.user.create({
      data: {
        username,
        hoTen: tk.hoTen,
        role: tk.role,
        passwordHash,
        boMonId: tk.role === "GV" || tk.role === "TBM" ? boMon.id : null,
        khoaId: tk.role === "TK" ? khoa.id : null,
      },
    });
    if (tk.role === "HP") await db.khoa.update({ where: { id: khoa.id }, data: { hieuPhoId: u.id } });
    console.log(`  ${username.padEnd(20)} ${tk.hoTen}`);
  }

  const batDau = homNayVN();
  const doiTuongs = Object.keys(NHIEM_VU) as DoiTuong[];
  await db.ky.create({
    data: {
      ten: "Kỳ 1 – 2026-2027",
      namHoc: "2026-2027",
      soKy: 1,
      ngayBatDau: chuoiThanhNgay(batDau),
      ngayKetThuc: chuoiThanhNgay(congNgay(batDau, 30)),
      daCongBo: true,
      bacXepLoais: {
        create: doiTuongs.flatMap((doiTuong) =>
          BAC_XEP_LOAI.map(([ten, diemToiThieu]) => ({ doiTuong, ten, diemToiThieu })),
        ),
      },
      nhiemVus: {
        create: doiTuongs.flatMap((doiTuong) =>
          NHIEM_VU[doiTuong].map(([ten, moTa, diem, batBuoc], i) => ({
            doiTuong,
            ten,
            moTa,
            diem,
            thuTu: i + 1,
            tasks: { create: batBuoc.map((t, j) => ({ ten: t, loai: "BAT_BUOC" as const, thuTu: j + 1 })) },
          })),
        ),
      },
    },
  });

  await damBaoCaiTienMoiKy();
  const soNv = doiTuongs.reduce((s, d) => s + NHIEM_VU[d].length, 0);
  console.log(`Seed xong: 8 tài khoản (mật khẩu 123456), Kỳ 1 – 2026-2027 bắt đầu ${batDau}, ${soNv} nhiệm vụ + 4 nhiệm vụ cải tiến sáng tạo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
