import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { AdminBottomNav, AdminSideNav } from "@/components/admin/AdminNav";
import { getI18n } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t.admin.meta.title, template: t.admin.meta.template },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { t } = await getI18n();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <AdminSideNav
        footer={
          <form action={logout}>
            <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-[15px] font-medium text-danger-600 hover:bg-danger-50">
              <LogOut className="size-5" />
              {t.common.logout}
            </button>
          </form>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col lg:ps-64">
        <main className="app-main">
          <div className="app-center mx-auto w-full max-w-4xl px-4 pt-[calc(1rem+env(safe-area-inset-top))] bottom-nav-space lg:px-8 lg:pb-8">{children}</div>
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
