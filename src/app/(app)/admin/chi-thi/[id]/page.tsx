import { ChiTietGiayTo } from "@/components/giay-to/chi-tiet-giay-to";
import { yeuCauVaiTro } from "@/lib/auth/dal";

export default async function TrangChiTietChiThi(props: PageProps<"/admin/chi-thi/[id]">) {
  const u = await yeuCauVaiTro("ADMIN");
  const { id } = await props.params;
  return <ChiTietGiayTo u={u} vanBanId={id} quayLai="/admin/chi-thi" nhanQuayLai="Nhận chỉ thị của hiệu trưởng" />;
}
