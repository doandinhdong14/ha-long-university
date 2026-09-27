"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Nút mở hộp xác nhận trước khi thực hiện. */
export function NutXacNhan({
  children,
  tieuDe,
  moTa,
  nhanXacNhan = "Đồng ý",
  onXacNhan,
  disabled,
  nguyHiem,
  variant = "outline",
  size = "default",
  title,
  className,
}: {
  children: React.ReactNode;
  tieuDe: string;
  moTa?: React.ReactNode;
  nhanXacNhan?: string;
  onXacNhan: () => void;
  disabled?: boolean;
  nguyHiem?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  title?: string;
  className?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled} title={title} className={className}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tieuDe}</AlertDialogTitle>
          {moTa && <AlertDialogDescription>{moTa}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction variant={nguyHiem ? "destructive" : "default"} onClick={onXacNhan}>
            {nhanXacNhan}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
