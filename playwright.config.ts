import { defineConfig } from "@playwright/test";

// E2E chạy trên Chrome cài sẵn trong máy (không tải trình duyệt), với DB riêng crm_kpi_v14_test
// và server riêng ở cổng 3100 → không đụng tới DB dev.
// Chuẩn bị: npm run db:start && npm run build. Mỗi file spec tự dọn DB test + seed lại.
// Chạy song song với một lượt E2E khác (tránh dùng chung DB, cổng, thư mục build) bằng biến môi trường:
//   E2E_PORT, E2E_DATABASE_URL, E2E_UPLOAD_DIR, NEXT_DIST_DIR (xem NOTES.md, mục Nghiệm thu).
const PORT = Number(process.env.E2E_PORT || 3100);
export const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/crm_kpi_v14_test";
export const TEST_UPLOAD_DIR = process.env.E2E_UPLOAD_DIR || "./uploads-test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    // Lưu trace khi test lỗi để chẩn đoán (npx playwright show-trace test-results/…/trace.zip).
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/dang-nhap`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      UPLOAD_DIR: TEST_UPLOAD_DIR,
      ...(process.env.NEXT_DIST_DIR ? { NEXT_DIST_DIR: process.env.NEXT_DIST_DIR } : {}),
    },
  },
});
