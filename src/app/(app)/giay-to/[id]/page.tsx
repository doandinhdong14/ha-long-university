import { ChiTietGiayTo } from "@/components/giay-to/chi-tiet-giay-to";
import { yeuCauVaiTro } from "@/lib/auth/dal";

export default async function TrangChiTietGiayTo(props: PageProps<"/giay-to/[id]">) {
  const u = await yeuCauVaiTro("GV", "TBM", "TK", "HP");
  const { id } = await props.params;
  return <ChiTietGiayTo u={u} vanBanId={id} quayLai="/giay-to" nhanQuayLai="Nhận giấy tờ" />;
}
