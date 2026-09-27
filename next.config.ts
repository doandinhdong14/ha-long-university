import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Thư viện xuất báo cáo chạy thẳng từ node_modules (không đóng gói), đọc font ở assets/fonts.
  serverExternalPackages: ["pdfmake", "exceljs"],
  // Mặc định .next; đặt NEXT_DIST_DIR để build/chạy E2E riêng mà không đụng bản build đang dùng.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Chi tiết task đã chuyển từ Cuối kỳ sang Trong kỳ; thông báo cũ trong DB vẫn trỏ về đường dẫn cũ.
  async redirects() {
    return [{ source: "/cuoi-ky/task/:kpiTaskId", destination: "/trong-ky/task/:kpiTaskId", permanent: false }];
  },
};

export default nextConfig;
