import { Activity, LogOut, Server, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Divided, ListRow } from "@/components/ui/Card";

export const metadata = { title: "More" };

export default function AdminMorePage() {
  return (
    <div className="animate-fade space-y-5">
      <TopBar back="/admin" title="More" large />
      <Divided>
        <ListRow href="/admin/customers" icon={<Users className="size-5" />} title="Customers" subtitle="Search accounts, reset passwords" />
        <ListRow href="/admin/activity" icon={<Activity className="size-5" />} title="Activity" subtitle="Everything happening on the platform" />
        <ListRow href="/admin/system" icon={<Server className="size-5" />} title="System" subtitle="Database health and cleanup" />
      </Divided>
      <Divided>
        <form action={logout}>
          <button type="submit" className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas/70">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-danger-50 text-danger-600">
              <LogOut className="size-5" />
            </span>
            <span className="text-[15px] font-medium text-danger-600">Log out</span>
          </button>
        </form>
      </Divided>
    </div>
  );
}
