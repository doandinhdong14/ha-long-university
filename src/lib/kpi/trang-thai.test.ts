import { describe, expect, it } from "vitest";
import { hanhDongDuocPhep, luatChuyen, lyDoKhongChuyen, nhanChoNguoiLam, nhanChoQuanLy } from "./trang-thai";

describe("máy trạng thái task GV/TBM/TK (người duyệt ≠ người chốt) – bảng 5.3, v1.6 mục 7.2", () => {
  const gop = false;
  it("người làm KPI: nộp khi Chưa làm / Bị từ chối, sửa khi Chờ duyệt", () => {
    expect(hanhDongDuocPhep("LAM", "CHUA_LAM", gop)).toEqual(["NOP"]);
    expect(hanhDongDuocPhep("LAM", "TU_CHOI", gop)).toEqual(["NOP"]);
    expect(hanhDongDuocPhep("LAM", "CHO_DUYET", gop)).toEqual(["SUA_BAI_NOP"]);
    for (const tt of ["DA_DUYET", "CHO_CHOT", "DA_CHOT", "TRA_VE"] as const) {
      expect(hanhDongDuocPhep("LAM", tt, gop)).toEqual([]);
    }
  });

  it("người duyệt: Duyệt/Từ chối; Hủy duyệt khi Chờ chốt (không còn Gửi lên); xử lý task bị trả về", () => {
    expect(hanhDongDuocPhep("DUYET", "CHO_DUYET", gop)).toEqual(["DUYET", "TU_CHOI"]);
    expect(hanhDongDuocPhep("DUYET", "CHO_CHOT", gop)).toEqual(["HUY_DUYET"]);
    expect(hanhDongDuocPhep("DUYET", "TRA_VE", gop)).toEqual(["TRA_LAM_LAI", "DUYET_LAI"]);
    expect(hanhDongDuocPhep("DUYET", "DA_DUYET", gop)).toEqual([]);
    expect(hanhDongDuocPhep("DUYET", "DA_CHOT", gop)).toEqual([]);
  });

  it("người chốt: chỉ Chốt / Trả về khi Chờ chốt", () => {
    expect(hanhDongDuocPhep("CHOT", "CHO_CHOT", gop)).toEqual(["CHOT", "TRA_VE"]);
    for (const tt of ["CHUA_LAM", "CHO_DUYET", "DA_DUYET", "DA_CHOT", "TRA_VE", "TU_CHOI"] as const) {
      expect(hanhDongDuocPhep("CHOT", tt, gop)).toEqual([]);
    }
  });

  it("đích chuyển và nhận xét bắt buộc", () => {
    // Duyệt → lên thẳng Chờ chốt, lịch sử ghi DUYET (không ghi GUI_CHOT).
    expect(luatChuyen("DUYET", gop)).toMatchObject({ tu: ["CHO_DUYET"], sang: "CHO_CHOT", lichSu: "DUYET", canNhanXet: false });
    expect(luatChuyen("TRA_VE", gop)).toMatchObject({ sang: "TRA_VE", canNhanXet: true, lichSu: "TRA_VE" });
    expect(luatChuyen("TRA_LAM_LAI", gop)).toMatchObject({ sang: "TU_CHOI", canNhanXet: true, lichSu: "TU_CHOI" });
    expect(luatChuyen("DUYET_LAI", gop)).toMatchObject({ tu: ["TRA_VE"], sang: "CHO_CHOT", lichSu: "DUYET" });
    expect(luatChuyen("HUY_DUYET", gop)).toMatchObject({ tu: ["CHO_CHOT"], sang: "CHO_DUYET", lichSu: "HUY_DUYET" });
    expect(luatChuyen("CHOT", gop)).toMatchObject({ tu: ["CHO_CHOT"], sang: "DA_CHOT", ai: "CHOT" });
  });

  it("hủy duyệt được khi Chờ chốt; đã chốt → bị chặn, không ai sửa được", () => {
    expect(lyDoKhongChuyen("HUY_DUYET", "CHO_CHOT", gop)).toBeNull();
    expect(lyDoKhongChuyen("HUY_DUYET", "DA_CHOT", gop)).toBe("Task đã chốt, không ai sửa được.");
    expect(lyDoKhongChuyen("TRA_VE", "DA_CHOT", gop)).toBe("Task đã chốt, không ai sửa được.");
    expect(lyDoKhongChuyen("DUYET", "CHO_CHOT", gop)).toBe('Task đang ở trạng thái "Chờ chốt", không thể duyệt.');
    expect(lyDoKhongChuyen("CHOT", "CHO_CHOT", gop, "DUYET")).toBe("Bạn không có quyền thực hiện thao tác này trên task.");
  });
});

describe("máy trạng thái task HP (HT vừa duyệt vừa chốt, 2 nút)", () => {
  const gop = true;
  it("HT: Duyệt/Từ chối, rồi Chốt / Hủy duyệt (giữ nguyên ở v1.6); không có Trả về", () => {
    expect(hanhDongDuocPhep("DUYET", "CHO_DUYET", gop)).toEqual(["DUYET", "TU_CHOI"]);
    expect(hanhDongDuocPhep("DUYET", "DA_DUYET", gop)).toEqual(["HUY_DUYET", "CHOT"]);
    expect(hanhDongDuocPhep("CHOT", "DA_DUYET", gop)).toEqual([]);
    expect(luatChuyen("DUYET", gop)).toMatchObject({ sang: "DA_DUYET" });
    expect(luatChuyen("HUY_DUYET", gop)).toMatchObject({ tu: ["DA_DUYET"], sang: "CHO_DUYET" });
    expect(luatChuyen("CHOT", gop)).toMatchObject({ tu: ["DA_DUYET"], sang: "DA_CHOT", ai: "DUYET" });
    expect(luatChuyen("TRA_VE", gop)).toBeNull();
    expect(lyDoKhongChuyen("TRA_VE", "DA_DUYET", gop)).toBe("Thao tác này không áp dụng cho task của hiệu phó.");
  });
});

describe("nhãn trạng thái", () => {
  it("người làm KPI thấy (ví dụ mục 5.3)", () => {
    expect(nhanChoNguoiLam("DA_DUYET", "GV")).toBe("Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt");
    expect(nhanChoNguoiLam("CHO_CHOT", "GV")).toBe("Trưởng bộ môn đã duyệt – chờ trưởng khoa chốt");
    expect(nhanChoNguoiLam("DA_DUYET", "TBM")).toBe("Trưởng khoa đã duyệt – chờ hiệu phó chốt");
    expect(nhanChoNguoiLam("CHO_CHOT", "TK")).toBe("Hiệu phó đã duyệt – chờ hiệu trưởng chốt");
    expect(nhanChoNguoiLam("DA_DUYET", "HP")).toBe("Hiệu trưởng đã duyệt – chờ chốt");
    expect(nhanChoNguoiLam("TRA_VE", "GV")).toBe("Trưởng khoa trả về – chờ trưởng bộ môn xử lý");
    expect(nhanChoNguoiLam("DA_CHOT", "HP")).toBe("Đã chốt – hoàn thành");
    expect(nhanChoNguoiLam("TU_CHOI", "GV")).toBe("Bị từ chối");
  });

  it("cấp quản lý thấy", () => {
    // v1.6: không còn nhãn "Đã duyệt, chưa gửi lên".
    expect(nhanChoQuanLy("DA_DUYET")).toBe("Đã duyệt, chưa chốt");
    expect(nhanChoQuanLy("CHO_CHOT")).toBe("Chờ chốt");
  });
});
