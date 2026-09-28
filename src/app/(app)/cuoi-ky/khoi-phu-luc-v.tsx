// Khối Phụ lục V ở cuối trang Cuối kỳ của hiệu phó: tải mẫu, gửi / gửi lại bản đã điền cho hiệu trưởng.
// Gửi được đến hết deadline kỳ; hết deadline hoặc kỳ đã chốt → khóa (luật ở src/lib/rules.ts, server chặn lại).
import { ClipboardList, Lock } from "lucide-react";
import { NutTaiMauPhuLucV, PhuLucVDaGui } from "@/components/kpi/phu-luc-v";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Ky } from "@/generated/prisma/client";
import { coFileMau } from "@/lib/phu-luc";
import { lyDoKhongThaoTacTask } from "@/lib/rules";
import { layPhuLucV } from "@/lib/services/phu-luc-v";
import { PHU_LUC_V } from "@/lib/templates";
import { FormPhuLucV } from "./form-phu-luc-v";

export async function KhoiPhuLucV({ ky, userId }: { ky: Ky; userId: string }) {
  const pl = await layPhuLucV(ky.id, userId);
  const lyDoKhoa = lyDoKhongThaoTacTask(ky);

  return (
    <Card data-testid="khoi-phu-luc-v">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-primary" /> {PHU_LUC_V.tieuDe}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <NutTaiMauPhuLucV coFile={coFileMau(PHU_LUC_V)} />
        <PhuLucVDaGui pl={pl} />
        {lyDoKhoa ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="phu-luc-v-khoa">
            <Lock className="size-4" /> {lyDoKhoa}
          </p>
        ) : (
          <FormPhuLucV kyId={ky.id} daGui={!!pl} />
        )}
      </CardContent>
    </Card>
  );
}
