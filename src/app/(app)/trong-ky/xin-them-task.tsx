"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHanhDong } from "@/components/chung/use-hanh-dong";
import { xinThemTask } from "./actions";

export type TaskMoRong = {
  id: string;
  ten: string;
  moTa: string | null;
  nhiemVu: string;
  tinhTrang: "CHUA_XIN" | "DANG_CHO" | "TU_CHOI" | "DA_GIAO";
  nhanXet: string | null;
};

export function XinThemTask({
  tasks,
  lyDoKhoa,
  chucDanhDuyet,
}: {
  tasks: TaskMoRong[];
  lyDoKhoa: string | null;
  /** Chức danh người duyệt viết thường, vd "trưởng bộ môn". */
  chucDanhDuyet: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Xin thêm task (làm vượt)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Các task mở rộng thuộc nhiệm vụ bạn đã được duyệt. Khi {chucDanhDuyet} duyệt, task được thêm vào danh sách của bạn; phải được chốt mới tính là làm vượt.
        </p>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có task mở rộng nào.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tasks.map((t) => (
              <DongTask key={t.id} t={t} lyDoKhoa={lyDoKhoa} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DongTask({ t, lyDoKhoa }: { t: TaskMoRong; lyDoKhoa: string | null }) {
  const { pending, chay } = useHanhDong();
  const coTheXin = !lyDoKhoa && (t.tinhTrang === "CHUA_XIN" || t.tinhTrang === "TU_CHOI");
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" data-xin-them={t.ten}>
      <div className="min-w-0 text-sm">
        <div className="font-medium">{t.ten}</div>
        <div className="text-xs text-muted-foreground">Thuộc: {t.nhiemVu}</div>
        {t.tinhTrang === "TU_CHOI" && t.nhanXet && (
          <div className="mt-1 text-xs text-red-700">Bị từ chối: {t.nhanXet}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {t.tinhTrang === "DA_GIAO" && <Badge className="bg-primary text-primary-foreground">Đã được giao</Badge>}
        {t.tinhTrang === "DANG_CHO" && <Badge variant="outline">Đang chờ duyệt</Badge>}
        {coTheXin && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => chay(() => xinThemTask(t.id), { thanhCong: `Đã gửi yêu cầu làm thêm "${t.ten}".` })}
          >
            <Plus className="size-4" /> {t.tinhTrang === "TU_CHOI" ? "Xin lại" : "Xin làm"}
          </Button>
        )}
      </div>
    </li>
  );
}
