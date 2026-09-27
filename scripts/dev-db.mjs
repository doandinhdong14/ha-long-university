// Chạy PostgreSQL cục bộ cho môi trường dev (máy không cài sẵn Postgres/Docker).
// Dùng binary của gói @embedded-postgres, khởi động qua pg_ctl (pg_ctl tự hạ quyền
// khi chạy bằng tài khoản Administrator trên Windows).
// Dữ liệu lưu ở .devdb/ (đã gitignore).
//   node scripts/dev-db.mjs start   → khởi động (tự initdb + tạo DB lần đầu)
//   node scripts/dev-db.mjs stop    → dừng
// Kết nối: postgresql://postgres:postgres@localhost:5433/crm_kpi_v14 (test dùng crm_kpi_v14_test).
// DB crm_kpi / crm_kpi_test của bản v1.1 (nếu có) được giữ nguyên, không dùng nữa.
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import pg from "pg";

const platformPkg = {
  win32: "@embedded-postgres/windows-x64",
  linux: "@embedded-postgres/linux-x64",
  darwin: process.arch === "arm64" ? "@embedded-postgres/darwin-arm64" : "@embedded-postgres/darwin-x64",
}[process.platform];
const BIN = join(process.cwd(), "node_modules", platformPkg, "native", "bin");
const exe = (name) => join(BIN, process.platform === "win32" ? `${name}.exe` : name);

const DATA_DIR = join(process.cwd(), ".devdb");
const PORT = 5433;
// _test dùng cho test tích hợp + E2E; _nt_test cho lượt nghiệm thu chạy riêng (song song lượt E2E khác).
const DB_NAMES = ["crm_kpi_v14", "crm_kpi_v14_test", "crm_kpi_v14_nt_test"];

const lenh = process.argv[2] ?? "start";

if (lenh === "stop") {
  execFileSync(exe("pg_ctl"), ["-D", DATA_DIR, "stop", "-m", "fast"], { stdio: "inherit" });
  process.exit(0);
}

const lanDau = !existsSync(join(DATA_DIR, "PG_VERSION"));
if (lanDau) {
  const tmp = mkdtempSync(join(tmpdir(), "pgpw-"));
  const pwFile = join(tmp, "pw");
  writeFileSync(pwFile, "postgres\n");
  execFileSync(
    exe("initdb"),
    ["-D", DATA_DIR, "-U", "postgres", "--pwfile", pwFile, "-A", "scram-sha-256", "--encoding=UTF8", "--locale=C"],
    { stdio: "inherit" },
  );
  rmSync(tmp, { recursive: true, force: true });
}

let dangChay = true;
try {
  execFileSync(exe("pg_ctl"), ["-D", DATA_DIR, "status"], { stdio: "ignore" });
} catch {
  dangChay = false;
}
if (!dangChay) {
  // stdio "ignore": tiến trình server không giữ stdout của terminal.
  execFileSync(
    exe("pg_ctl"),
    ["-D", DATA_DIR, "-o", `-p ${PORT}`, "-l", join(DATA_DIR, "server.log"), "-w", "start"],
    { stdio: "ignore" },
  );
}

const client = new pg.Client({ host: "localhost", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
await client.connect();
for (const ten of DB_NAMES) {
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [ten]);
  if (!rowCount) await client.query(`CREATE DATABASE ${ten}`);
}
await client.end();

console.log(`PostgreSQL dev đang chạy: postgresql://postgres:postgres@localhost:${PORT}/${DB_NAMES[0]} (E2E: ${DB_NAMES[1]})`);
