import { describe, expect, it } from "vitest";
import type { LoaiTask, TrangThaiTask } from "@/generated/prisma/enums";
import { GHI_CHU_CHUA_DUYET, hienPhanTram, tinhKetQuaThuan, type TaskKetQua } from "./ket-qua";

const BAC = [
  { ten: "A1", diemToiThieu: 80 },
  { ten: "B", diemToiThieu: 50 },
  { ten: "C", diemToiThieu: 35 },
  { ten: "F", diemToiThieu: 0 },
];
const duyet = (xepLoai: string) => ({ trangThai: "DA_DUYET" as const, xepLoai });
const t = (ten: string, loai: LoaiTask, trangThai: TrangThaiTask): TaskKetQua => ({ ten, nhiemVu: "NV", loai, trangThai });

describe("tinhKetQua (mục 10.3) – chỉ DA_CHOT được tính", () => {
  it("chưa có đăng ký / đăng ký chưa duyệt → Không đạt, bậc thấp nhất, 0%", () => {
    for (const dangKy of [null, { trangThai: "CHO_DUYET" as const, xepLoai: "A1" }]) {
      const kq = tinhKetQuaThuan({ doiTuong: "GV", dangKy, tasks: [], bacs: BAC });
      expect(kq).toMatchObject({ ketQua: "KHONG_DAT", xepLoai: "F", phanTram: 0, ghiChu: GHI_CHU_CHUA_DUYET });
    }
  });

  it("~50% đã chốt, còn lại chưa nộp → Không đạt – A1, task thiếu kèm lý do", () => {
    const kq = tinhKetQuaThuan({
      doiTuong: "GV",
      dangKy: duyet("A1"),
      tasks: [t("a", "BAT_BUOC", "DA_CHOT"), t("b", "BAT_BUOC", "CHUA_LAM")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "KHONG_DAT", xepLoai: "A1", phanTram: 50 });
    expect(kq.taskThieu).toEqual([{ ten: "b", nhiemVu: "NV", trangThai: "CHUA_LAM", lyDo: "Chưa nộp minh chứng" }]);
  });

  it("100% đã chốt → Đạt; + task mở rộng đã chốt → Vượt", () => {
    const bb = [t("a", "BAT_BUOC", "DA_CHOT"), t("b", "BAT_BUOC", "DA_CHOT")];
    expect(tinhKetQuaThuan({ doiTuong: "GV", dangKy: duyet("C"), tasks: bb, bacs: BAC })).toMatchObject({
      ketQua: "DAT",
      xepLoai: "C",
      phanTram: 100,
      taskThieu: [],
      taskVuot: [],
    });
    const kq = tinhKetQuaThuan({
      doiTuong: "GV",
      dangKy: duyet("B"),
      tasks: [...bb, t("m1", "MO_RONG", "DA_CHOT"), t("m2", "MO_RONG", "DA_CHOT")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "VUOT", xepLoai: "B", phanTram: 100 });
    expect(kq.taskVuot.map((x) => x.ten)).toEqual(["m1", "m2"]);
  });

  it("treo đến hết kỳ: 100% đã duyệt nhưng chưa chốt → Không đạt với lý do treo; % không tăng", () => {
    const kq = tinhKetQuaThuan({
      doiTuong: "GV",
      dangKy: duyet("A1"),
      // v1.6: task GV không còn dừng ở Đã duyệt (duyệt là lên Chờ chốt).
      tasks: [t("a", "BAT_BUOC", "CHO_CHOT"), t("b", "BAT_BUOC", "CHO_CHOT"), t("c", "BAT_BUOC", "TRA_VE")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "KHONG_DAT", phanTram: 0, soTreo: 2 });
    expect(kq.taskThieu.map((x) => x.lyDo)).toEqual([
      "Chờ chốt, chưa được chốt kịp",
      "Chờ chốt, chưa được chốt kịp",
      "Bị cấp chốt trả về, chưa xử lý xong",
    ]);
  });

  it("task mở rộng đã duyệt nhưng chưa chốt → không tính là vượt (vẫn đếm treo)", () => {
    const kq = tinhKetQuaThuan({
      doiTuong: "GV",
      dangKy: duyet("B"),
      tasks: [t("a", "BAT_BUOC", "DA_CHOT"), t("m", "MO_RONG", "CHO_CHOT")],
      bacs: BAC,
    });
    expect(kq).toMatchObject({ ketQua: "DAT", taskVuot: [], soTreo: 1 });
  });

  it("task HP đã duyệt chưa chốt → lý do không nhắc gửi lên (B9)", () => {
    const kq = tinhKetQuaThuan({ doiTuong: "HP", dangKy: duyet("B"), tasks: [t("a", "BAT_BUOC", "DA_DUYET")], bacs: BAC });
    expect(kq.taskThieu[0].lyDo).toBe("Đã duyệt nhưng chưa được chốt");
  });

  it("thống kê 5 phần biểu đồ (chỉ task bắt buộc; bị trả về gộp vào bị từ chối)", () => {
    const kq = tinhKetQuaThuan({
      doiTuong: "TBM",
      dangKy: duyet("B"),
      tasks: [
        t("1", "BAT_BUOC", "DA_CHOT"),
        t("2", "BAT_BUOC", "DA_DUYET"),
        t("3", "BAT_BUOC", "CHO_CHOT"),
        t("4", "BAT_BUOC", "CHO_DUYET"),
        t("5", "BAT_BUOC", "TU_CHOI"),
        t("6", "BAT_BUOC", "TRA_VE"),
        t("7", "BAT_BUOC", "CHUA_LAM"),
        t("8", "MO_RONG", "DA_CHOT"),
      ],
      bacs: BAC,
    });
    expect(kq.thongKe).toEqual({ tongBatBuoc: 7, daChot: 1, dangTreo: 2, choDuyet: 1, tuChoi: 2, chuaLam: 1 });
    expect(kq.phanTram).toBe(14.29);
    expect(hienPhanTram(kq.phanTram)).toBe("14,3%");
  });

  it("không có task bắt buộc → 100%", () => {
    expect(tinhKetQuaThuan({ doiTuong: "GV", dangKy: duyet("C"), tasks: [], bacs: BAC }).phanTram).toBe(100);
  });
});
