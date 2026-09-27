import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test tích hợp: gọi thẳng server action / service trên DB crm_kpi_v14_test.
// Kiểm chứng các luật quyền + hạn thời gian được chặn ở server.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stub-server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.int.test.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: process.env.INT_DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/crm_kpi_v14_test",
      UPLOAD_DIR: "./uploads-test",
      AUTH_SECRET: "test-secret-chi-dung-cho-kiem-thu",
      CRON_SECRET: "test-cron-secret",
    },
  },
});
