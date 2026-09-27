import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { yeuCauVaiTro } from "@/lib/auth/dal";
import { MENU } from "@/lib/menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await yeuCauVaiTro();
  return (
    <>
      <AppHeader user={user} />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b bg-background p-3 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-60 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-5">
          <div className="mb-3 hidden px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">
            Chức năng
          </div>
          <AppSidebar menu={MENU[user.role]} />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </>
  );
}
