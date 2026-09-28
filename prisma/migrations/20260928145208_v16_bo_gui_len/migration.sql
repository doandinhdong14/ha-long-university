-- v1.6 (docs/spec-v1.6.md mục 7.2): bỏ bước "Gửi lên". Dữ liệu cũ không reset: task của GV, TBM, TK
-- đang Đã duyệt (chờ người duyệt gửi lên) chuyển thẳng sang Chờ chốt. Task HP giữ nguyên (HT duyệt rồi chốt).
-- Kỳ đã chốt giữ nguyên để không đổi dữ liệu lịch sử.
UPDATE "KpiTask" k
SET "trangThai" = 'CHO_CHOT',
    "guiChotLuc" = COALESCE(k."guiChotLuc", k."capNhatLuc")
FROM "User" u, "Ky" ky
WHERE u.id = k."userId"
  AND ky.id = k."kyId"
  AND k."trangThai" = 'DA_DUYET'
  AND u.role IN ('GV', 'TBM', 'TK')
  AND ky."daChot" = false;
