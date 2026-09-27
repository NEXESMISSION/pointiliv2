import { Activity, LogOut, Server, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Divided, ListRow } from "@/components/ui/Card";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.admin.more };
}

export default async function AdminMorePage() {
  const { t } = await getI18n();
  const w = t.admin.more;

  return (
    <div className="animate-fade space-y-5">
      <TopBar back="/admin" title={t.nav.admin.more} large />
      <Divided>
        <ListRow href="/admin/customers" icon={<Users className="size-5" />} title={t.nav.admin.customers} subtitle={w.customersSub} />
        <ListRow href="/admin/activity" icon={<Activity className="size-5" />} title={t.nav.admin.activity} subtitle={w.activitySub} />
        <ListRow href="/admin/system" icon={<Server className="size-5" />} title={t.nav.admin.system} subtitle={w.systemSub} />
      </Divided>
      <Divided>
        <form action={logout}>
          <button type="submit" className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-canvas/70">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-danger-50 text-danger-600">
              <LogOut className="size-5" />
            </span>
            <span className="text-[15px] font-medium text-danger-600">{t.common.logout}</span>
          </button>
        </form>
      </Divided>
    </div>
  );
}
