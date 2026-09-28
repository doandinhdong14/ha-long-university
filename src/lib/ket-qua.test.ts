import { describe, expect, it } from "vitest";
import type { LoaiTask, TrangThaiTask } from "@/generated/prisma/enums";
import {
  dongTach,
  dongTachPhanTram,
  GHI_CHU_CHUA_CO_BAT_BUOC,
  GHI_CHU_CHUA_DUYET,
  hienPhanTram,
  tinhKetQuaThuan,
  type TaskKetQua,
} from "./ket-qua";

const BAC = [
  { ten: "A1", diemToiThieu: 80 },
  { ten: "B", diemToiThieu: 50 },
  { ten: "C", diemToiThieu: 35 },
  { ten: "F", diemToiThieu: 0 },
];
const duyet = (xepLoai: string) => ({ trangThai: "DA_DUYET" as const, xepLoai });
const t = (ten: string, loai: LoaiTask, trangThai: TrangThaiTask): TaskKetQua => ({ ten, nhiemVu: "NV", loai, trangThai });
/** n task bắt buộc cùng một trạng thái. */
const bb = (n: number, trangThai: TrangThaiTask, tien = "b") =>
  Array.from({ length: n }, (_, i) => t(`${tien}${i + 1}`, "BAT_BUOC", trangThai));

describe("tinhKetQua v1.6 (spec-v1.6 mục 4) – chỉ DA_CHOT được tính, cải tiến +10%", () => {
  it("chưa có đăng ký / đăng ký chưa duyệt → Không đạt, bậc thấp nhất, mọi % = 0, không đăng ký cải tiến", () => {
    for (const dangKy of [null, { trangThai: "CHO_DUYET" as const, xepLoai: "A1" }]) {
      const kq = tinhKetQuaThuan({ dangKy, tasks: [t("c", "CAI_TIEN", "DA_CHOT")], bacs: BAC });
      expect(kq).toMatchObject({
        ketQua: "KHONG_DAT",
        xepLoai: "F",
        phanTram: 0,
        phanTramBatBuoc: 0,
        tuDanhGia: 0,
        trangThaiCaiTien: "KHONG_DANG_KY",
        ghiChu: GHI_CHU_CHUA_DUYET,
      });
    }
  });

  it("12.1 gv.nguyenvanan: ~50% chốt, còn lại chưa nộp → cấp trên ~50%, tự đánh giá ~50%, Không đạt – A1", () => {
    const kq = tinhKetQuaThuan({ dangKy: duyet("A1"), tasks: [...bb(11, "DA_CHOT", "x"), ...bb(11, "CHUA_LAM")], bacs: BAC });
    expect(kq).toMatchObject({ ketQua: "KHONG_DAT", xepLoai: "A1", phanTram: 50, tuDanhGia: 50, trangThaiCaiTien: "KHONG_DANG_KY" });
    expect(kq.taskThieu).toHaveLength(11);
    expect(kq.taskThieu[0]).toEqual({ ten: "b1", nhiemVu: "NV", trangThai: "CHUA_LAM", lyDo: "Chưa nộp minh chứng" });
  });

  it("12.1 gv.tranthibinh: 100% bắt buộc chốt, không cải tiến → Đạt – A1, 100% / 100%", () => {
    const kq = tinhKetQuaThuan({ dangKy: duyet("A1"), tasks: bb(22, "DA_CHOT"), bacs: BAC });
    expect(kq).toMatchObject({ ketQua: "DAT", phanTram: 100, tuDanhGia: 100, taskThieu: [], taskVuot: [], ghiChuCaiTien: null });
  });

  it("12.1 gv.levancuong: 100% + cải tiến chốt → Vượt chỉ tiêu – A1 (110%), tự đánh giá 110%", () => {
    const kq = tinhKetQuaThuan({ dangKy: duyet("A1"), tasks: [...bb(22, "DA_CHOT"), t("CT", "CAI_TIEN", "DA_CHOT")], bacs: BAC });
    expect(kq).toMatchObject({
      ketQua: "VUOT",
      phanTram: 110,
      phanTramBatBuoc: 100,
      tuDanhGia: 110,
      trangThaiCaiTien: "DA_CHOT",
      taskVuot: [{ ten: "CT", nhiemVu: "NV" }],
    });
  });

  it("12.1 tk.levankhoa: 100% bắt buộc, cải tiến đã nộp chưa chốt → Đạt, cấp trên 100%, tự đánh giá 110% + ghi chú", () => {
    for (const tt of ["CHO_DUYET", "CHO_CHOT"] as const) {
      const kq = tinhKetQuaThuan({ dangKy: duyet("A1"), tasks: [...bb(10, "DA_CHOT"), t("CT", "CAI_TIEN", tt)], bacs: BAC });
      expect(kq).toMatchObject({ ketQua: "DAT", phanTram: 100, tuDanhGia: 110, trangThaiCaiTien: "CHUA_CHOT", taskThieu: [] });
      expect(kq.ghiChuCaiTien).toBe(
        `Cải tiến sáng tạo đã đăng ký nhưng chưa được chốt – ${tt === "CHO_DUYET" ? "Chờ duyệt, chưa được duyệt kịp" : "Chờ chốt, chưa được chốt kịp"}`,
      );
    }
  });

  it("12.2: 10 task bắt buộc: 3 chốt, 2 chờ duyệt, 1 bị từ chối, 4 chưa làm → cấp trên 30%, tự đánh giá 60%", () => {
    const kq = tinhKetQuaThuan({
      dangKy: duyet("A1"),
      tasks: [...bb(3, "DA_CHOT", "c"), ...bb(2, "CHO_DUYET", "d"), ...bb(1, "TU_CHOI", "e"), ...bb(4, "CHUA_LAM", "f")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ phanTram: 30, phanTramBatBuoc: 30, tuDanhGia: 60, tuDanhGiaBatBuoc: 60, ketQua: "KHONG_DAT" });
    expect(kq.thongKe).toEqual({ tongBatBuoc: 10, daChot: 3, dangTreo: 0, choDuyet: 2, tuChoi: 1, chuaLam: 4, daNop: 6 });
  });

  it("12.2: bắt buộc 90% + cải tiến đã chốt → hiện 100% nhưng vẫn Không đạt (cải tiến không bù phần thiếu)", () => {
    const kq = tinhKetQuaThuan({
      dangKy: duyet("A1"),
      tasks: [...bb(9, "DA_CHOT"), t("thieu", "BAT_BUOC", "CHO_CHOT"), t("CT", "CAI_TIEN", "DA_CHOT")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "KHONG_DAT", phanTram: 100, phanTramBatBuoc: 90, trangThaiCaiTien: "DA_CHOT", taskVuot: [] });
    expect(hienPhanTram(kq.phanTram)).toBe("100%");
    expect(dongTach("cap-tren", kq)).toBe("Bắt buộc 90% · Cải tiến +10%");
    // Cải tiến không nằm trong danh sách task thiếu.
    expect(kq.taskThieu.map((x) => x.ten)).toEqual(["thieu"]);
  });

  it("so sánh bằng số lượng task, không so % thập phân: 2/3 chốt (66,67%) + cải tiến ≠ Đạt", () => {
    const kq = tinhKetQuaThuan({
      dangKy: duyet("B"),
      tasks: [...bb(2, "DA_CHOT"), t("x", "BAT_BUOC", "CHUA_LAM"), t("CT", "CAI_TIEN", "DA_CHOT")],
      bacs: BAC,
    });
    expect(kq.phanTramBatBuoc).toBe(66.67);
    expect(kq.phanTram).toBe(76.67);
    expect(hienPhanTram(kq.phanTram)).toBe("77%");
    expect(kq.ketQua).toBe("KHONG_DAT");
  });

  it("treo đến hết kỳ → Không đạt với lý do theo mục 6.2", () => {
    const kq = tinhKetQuaThuan({
      dangKy: duyet("A1"),
      tasks: [t("a", "BAT_BUOC", "CHO_CHOT"), t("b", "BAT_BUOC", "TRA_VE"), t("c", "BAT_BUOC", "TU_CHOI"), t("d", "BAT_BUOC", "CHO_DUYET")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "KHONG_DAT", phanTram: 0, tuDanhGia: 100, soTreo: 1 });
    expect(kq.taskThieu.map((x) => x.lyDo)).toEqual([
      "Chờ chốt, chưa được chốt kịp",
      "Bị cấp chốt trả về, chưa xử lý xong",
      "Bị từ chối, chưa nộp lại",
      "Chờ duyệt, chưa được duyệt kịp",
    ]);
  });

  it("task HP đã duyệt chưa chốt → \"Đã duyệt nhưng chưa được chốt\"", () => {
    const kq = tinhKetQuaThuan({ dangKy: duyet("B"), tasks: [t("a", "BAT_BUOC", "DA_DUYET")], bacs: BAC });
    expect(kq.taskThieu[0].lyDo).toBe("Đã duyệt nhưng chưa được chốt");
  });

  it("task Mở rộng (dữ liệu cũ) bị bỏ qua hoàn toàn", () => {
    const kq = tinhKetQuaThuan({
      dangKy: duyet("B"),
      tasks: [t("a", "BAT_BUOC", "DA_CHOT"), t("m1", "MO_RONG", "DA_CHOT"), t("m2", "MO_RONG", "CHO_CHOT")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "DAT", phanTram: 100, taskVuot: [], soTreo: 0, trangThaiCaiTien: "KHONG_DANG_KY" });
  });

  it("không có task bắt buộc → 0%, ghi chú \"Chưa có task bắt buộc\", Không đạt", () => {
    const kq = tinhKetQuaThuan({ dangKy: duyet("C"), tasks: [], bacs: BAC });
    expect(kq).toMatchObject({ phanTram: 0, phanTramBatBuoc: 0, tuDanhGia: 0, ketQua: "KHONG_DAT", ghiChu: GHI_CHU_CHUA_CO_BAT_BUOC });
  });
});

describe("hiển thị % và dòng tách (mục 4.1, 5.3)", () => {
  it("làm tròn số nguyên", () => {
    expect(hienPhanTram(14.29)).toBe("14%");
    expect(hienPhanTram(4.55)).toBe("5%");
    expect(hienPhanTram(110)).toBe("110%");
  });

  it("dòng tách theo trạng thái cải tiến", () => {
    const khong = { phanTramBatBuoc: 90, tuDanhGiaBatBuoc: 100, caiTien: null };
    expect(dongTach("cap-tren", khong)).toBe("Bắt buộc 90%");
    expect(dongTach("tu-danh-gia", khong)).toBe("Bắt buộc 100%");
    const daNop = { ...khong, caiTien: { ten: "CT", nhiemVu: "NV", trangThai: "CHO_DUYET" as const, daNop: true, daChot: false } };
    expect(dongTach("cap-tren", daNop)).toBe("Bắt buộc 90% · Cải tiến: chưa chốt");
    expect(dongTach("tu-danh-gia", daNop)).toBe("Bắt buộc 100% · Cải tiến +10%");
    const chuaNop = { ...khong, caiTien: { ...daNop.caiTien, trangThai: "CHUA_LAM" as const, daNop: false } };
    expect(dongTach("tu-danh-gia", chuaNop)).toBe("Bắt buộc 100% · Cải tiến: chưa nộp");
    // Từ KetQuaKy đã lưu (chỉ còn trạng thái cải tiến).
    expect(dongTachPhanTram("cap-tren", 100, true)).toBe("Bắt buộc 100% · Cải tiến +10%");
    expect(dongTachPhanTram("cap-tren", 100, null)).toBe("Bắt buộc 100%");
  });
});
