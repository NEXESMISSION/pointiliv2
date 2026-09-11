import { Activity, ChartColumn, CreditCard, Gift, LogOut, Palette, Receipt, Settings, Ticket } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Divided, ListRow } from "@/components/ui/Card";

export const metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <TopBar title="More" large back="/dashboard" />
      <Divided>
        <ListRow href="/redeem" icon={<Ticket className="size-5" />} title="Redeem a reward" />
        <ListRow href="/activity" icon={<Activity className="size-5" />} title="Activity" />
        <ListRow href="/analytics" icon={<ChartColumn className="size-5" />} title="Analytics" />
      </Divided>
      <Divided className="mt-4">
        <ListRow href="/loyalty" icon={<CreditCard className="size-5" />} title="Loyalty card" subtitle="Reward, stamps and rules" />
        <ListRow href="/loyalty/design" icon={<Palette className="size-5" />} title="Design your card" subtitle="Style, colours, stamps, logo" />
        <ListRow href="/rewards" icon={<Gift className="size-5" />} title="Rewards" />
        <ListRow href="/billing" icon={<Receipt className="size-5" />} title="Billing" />
        <ListRow href="/settings" icon={<Settings className="size-5" />} title="Settings" />
      </Divided>
      <form action={logout} className="mt-4">
        <Divided>
          <button type="submit" className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas/70">
            <span className="grid size-10 place-items-center rounded-2xl bg-danger-50 text-danger-600">
              <LogOut className="size-5" />
            </span>
            <span className="text-[15px] font-medium text-danger-600">Log out</span>
          </button>
        </Divided>
      </form>
    </>
  );
}
