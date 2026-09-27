"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dangNhap, type TrangThaiDangNhap } from "./actions";

export function FormDangNhap() {
  const [state, action, pending] = useActionState<TrangThaiDangNhap, FormData>(dangNhap, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Tên đăng nhập</Label>
        <Input id="username" name="username" placeholder="vd: gv.nguyenvanan" defaultValue={state.username}
          autoComplete="username" autoFocus required className="h-11 px-3.5 text-base md:text-sm" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="matKhau">Mật khẩu</Label>
        <Input id="matKhau" name="matKhau" type="password" autoComplete="current-password" required
          className="h-11 px-3.5 text-base md:text-sm" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="h-11 w-full text-[15px] font-semibold" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
