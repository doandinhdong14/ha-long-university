import { TrangTieuDe } from "@/components/chung/trang-tieu-de";
import { DanhSachGiayTo } from "@/components/giay-to/danh-sach-giay-to";
import { yeuCauVaiTro } from "@/lib/auth/dal";

/** Nhận chỉ thị của hiệu trưởng (mục 8.3): quy định có tick vị trí Admin. Chỉ đọc. */
export default async function TrangNhanChiThi() {
  const u = await yeuCauVaiTro("ADMIN");
  return (
    <div>
      <TrangTieuDe tieuDe="Nhận chỉ thị của hiệu trưởng" moTa="Quy định hiệu trưởng ban hành có tick vị trí Admin." />
      <DanhSachGiayTo u={u} duongDan="/admin/chi-thi" />
    </div>
  );
}
