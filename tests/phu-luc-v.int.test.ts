// Phụ lục IV, V: file mẫu của trường + hiệu phó gửi Phụ lục V cho hiệu trưởng (luật ở server).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { resetDuLieuHeThong } from "@/app/(app)/admin/phan-viec/actions";
import { POST as apiPhuLucV } from "@/app/api/phu-luc-v/route";
import { db } from "@/lib/db";
import { PHU_LUC_IV, PHU_LUC_V } from "@/lib/templates";
import { dangNhapNhu, fileMau, kyDau, moFile, resetDb, user } from "./helpers";

let kyId: string;

function gui(files: File[], ky = kyId) {
  const fd = new FormData();
  fd.append("kyId", ky);
  files.forEach((f) => fd.append("file", f));
  return apiPhuLucV(new Request("http://localhost/api/phu-luc-v", { method: "POST", body: fd }));
}

async function banGhi() {
  const hp = await user("hp.tranthiphuong");
  return db.phuLucV.findUnique({ where: { kyId_userId: { kyId, userId: hp.id } }, include: { file: true } });
}

async function thongBaoHT() {
  const ht = await user("ht.nguyenvanhieu");
  return db.thongBao.findMany({ where: { userId: ht.id }, select: { noiDung: true, link: true } });
}

beforeAll(async () => {
  await resetDb();
  kyId = (await kyDau()).id;
});

describe("file mẫu Phụ lục IV, V", () => {
  it("nằm ở public/templates, giống hệt bản gốc trong docs/", () => {
    const bam = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
    const goc = readdirSync("docs").filter((f) => f.endsWith(".docx"));
    for (const [mau, ma] of [
      [PHU_LUC_IV, "PHỤ LỤC IV."],
      [PHU_LUC_V, "PHỤ LỤC V."],
    ] as const) {
      const tep = resolve("public", mau.tepPublic);
      expect(existsSync(tep), mau.tepPublic).toBe(true);
      const banGoc = goc.find((f) => f.normalize("NFC").startsWith(ma.normalize("NFC")))!;
      expect(bam(tep)).toBe(bam(resolve("docs", banGoc)));
      expect(mau.url).toBe(`/${mau.tepPublic}`);
      expect(mau.tieuDe.startsWith(ma)).toBe(true);
    }
  });
});

describe("Phụ lục V – hiệu phó gửi hiệu trưởng", () => {
  it("vai trò khác hiệu phó gọi API → bị chặn", async () => {
    for (const u of ["gv.nguyenvanan", "tbm.phamthibich", "tk.levankhoa", "ht.nguyenvanhieu", "admin.quantri"]) {
      await dangNhapNhu(u);
      expect((await gui([fileMau("phu-luc-v.pdf")])).status, u).toBe(403);
    }
    expect(await db.phuLucV.count()).toBe(0);
  });

  it("file sai định dạng, quá 20MB, không có file hoặc nhiều file → báo lỗi, không ghi gì", async () => {
    await dangNhapNhu("hp.tranthiphuong");
    const loi = async (files: File[]) => {
      const r = await gui(files);
      expect(r.status).toBe(400);
      return (await r.json()).error as string;
    };
    expect(await loi([fileMau("phieu.xlsx")])).toBe('File "phieu.xlsx" sai định dạng. Chỉ nhận PDF, DOC, DOCX.');
    expect(await loi([fileMau("anh.png")])).toMatch(/sai định dạng/);
    expect(await loi([fileMau("lon.pdf", "x".repeat(20 * 1024 * 1024 + 1))])).toBe('File "lon.pdf" vượt quá 20MB.');
    expect(await loi([])).toBe("Chọn đúng 1 file Phụ lục V đã điền.");
    expect(await loi([fileMau("a.pdf"), fileMau("b.pdf")])).toBe("Chọn đúng 1 file Phụ lục V đã điền.");
    expect(await db.phuLucV.count()).toBe(0);
  });

  it("gửi → lưu 1 bản, báo hiệu trưởng; hiệu phó, hiệu trưởng, admin mở được file; người khác bị chặn", async () => {
    await dangNhapNhu("hp.tranthiphuong");
    const r = await gui([fileMau("phu-luc-v.pdf")]);
    expect(r.status).toBe(201);
    const pl = (await banGhi())!;
    expect(pl.file.tenGoc).toBe("phu-luc-v.pdf");

    const hp = await user("hp.tranthiphuong");
    const tb = await thongBaoHT();
    expect(tb).toEqual([
      { noiDung: "Hiệu phó Trần Thị Phương đã gửi Phụ lục V – Kỳ 1 – 2026-2027", link: `/duyet/${hp.id}?kyId=${kyId}&tab=dang-ky` },
    ]);

    for (const [u, ma] of [
      ["hp.tranthiphuong", 200],
      ["ht.nguyenvanhieu", 200],
      ["admin.quantri", 200],
      ["gv.nguyenvanan", 403],
      ["tbm.phamthibich", 403],
      ["tk.levankhoa", 403],
    ] as const) {
      await dangNhapNhu(u);
      expect((await moFile(pl.fileId)).status, u).toBe(ma);
    }
  });

  it("gửi lại → thay bản cũ (vẫn 1 bản/kỳ), file cũ bị xóa, hiệu trưởng nhận thông báo mới", async () => {
    const cu = (await banGhi())!;
    await dangNhapNhu("hp.tranthiphuong");
    expect((await gui([fileMau("phu-luc-v-sua.docx")])).status).toBe(201);

    const moi = (await banGhi())!;
    expect(await db.phuLucV.count()).toBe(1);
    expect(moi.file.tenGoc).toBe("phu-luc-v-sua.docx");
    expect(moi.file.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(moi.guiLuc.getTime()).toBeGreaterThanOrEqual(cu.guiLuc.getTime());
    expect(await db.fileDinhKem.findUnique({ where: { id: cu.fileId } })).toBeNull();
    expect(existsSync(resolve("uploads-test", cu.file.duongDan))).toBe(false);
    expect(existsSync(resolve("uploads-test", moi.file.duongDan))).toBe(true);
    expect(await thongBaoHT()).toHaveLength(2);
  });

  it("hết deadline hoặc kỳ đã chốt → khóa", async () => {
    await dangNhapNhu("hp.tranthiphuong");
    const ky = await db.ky.findUniqueOrThrow({ where: { id: kyId } });
    await db.ky.update({ where: { id: kyId }, data: { ngayBatDau: new Date("2020-01-01"), ngayKetThuc: new Date("2020-06-30") } });
    let r = await gui([fileMau("tre.pdf")]);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("Đã hết deadline của kỳ, mọi thao tác đã bị khóa.");

    await db.ky.update({ where: { id: kyId }, data: { ngayBatDau: ky.ngayBatDau, ngayKetThuc: ky.ngayKetThuc, daChot: true } });
    r = await gui([fileMau("tre.pdf")]);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("Kỳ đã chốt, không thể thao tác.");
    await db.ky.update({ where: { id: kyId }, data: { daChot: false } });
    expect((await banGhi())!.file.tenGoc).toBe("phu-luc-v-sua.docx");
  });

  it("admin Reset dữ liệu → Phụ lục V bị xóa cùng file", async () => {
    await dangNhapNhu("admin.quantri");
    expect((await resetDuLieuHeThong()).ok).toBe(true);
    expect(await db.phuLucV.count()).toBe(0);
  });
});
