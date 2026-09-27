import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canhBaoThieuNguoi, tenDonVi } from "@/lib/co-cau";
import { TEN_VAI_TRO } from "@/lib/roles";
import { layCoCau } from "@/lib/services/co-cau";

/** Tab Tài khoản + cơ cấu (khoa, bộ môn, ai là TBM/TK/HP phụ trách) + cảnh báo đơn vị thiếu người duyệt/chốt. */
export async function TabTaiKhoan() {
  const cc = await layCoCau();
  const canhBao = canhBaoThieuNguoi(cc);
  const ten = (id: string | null | undefined) => {
    const u = cc.users.find((x) => x.id === id);
    return u ? `${u.hoTen} (${u.username})` : null;
  };
  const ht = cc.users.find((u) => u.role === "HT");

  return (
    <div className="space-y-6">
      {canhBao.length ? (
        <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-4" data-testid="canh-bao-thieu-nguoi">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="size-5" /> Đơn vị đang thiếu người duyệt / chốt
          </div>
          <ul className="list-inside list-disc text-sm">
            {canhBao.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-4 text-sm" data-testid="du-nguoi">
          <CheckCircle2 className="size-5 text-primary" /> Mọi đơn vị đã có đủ người duyệt và người chốt.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cơ cấu tổ chức</CardTitle>
          <p className="text-sm text-muted-foreground">Hiệu trưởng: {ten(ht?.id) ?? <span className="text-destructive">chưa có</span>}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {cc.khoas.map((k) => (
            <div key={k.id} className="rounded-md border p-3" data-khoa={k.ten}>
              <div className="font-medium">{k.ten}</div>
              <div className="mt-1 grid gap-1 text-sm md:grid-cols-2">
                <div>
                  Trưởng khoa:{" "}
                  {ten(cc.users.find((u) => u.role === "TK" && u.khoaId === k.id)?.id) ?? <span className="text-destructive">chưa có</span>}
                </div>
                <div>
                  Hiệu phó phụ trách:{" "}
                  {(k.hieuPhoId && ten(k.hieuPhoId)) || <span className="text-destructive">chưa có hiệu phó</span>}
                </div>
              </div>
              <ul className="mt-2 space-y-1 border-l pl-3 text-sm">
                {cc.boMons
                  .filter((b) => b.khoaId === k.id)
                  .map((b) => (
                    <li key={b.id}>
                      <span className="font-medium">{b.ten}</span> · Trưởng bộ môn:{" "}
                      {ten(cc.users.find((u) => u.role === "TBM" && u.boMonId === b.id)?.id) ?? (
                        <span className="text-destructive">chưa có</span>
                      )}{" "}
                      · {cc.users.filter((u) => u.role === "GV" && u.boMonId === b.id).length} giáo viên
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Đơn vị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cc.users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.username}</TableCell>
                <TableCell>{u.hoTen}</TableCell>
                <TableCell>{TEN_VAI_TRO[u.role]}</TableCell>
                <TableCell className="text-sm">{tenDonVi(u, cc)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
