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
          <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 px-4 text-[15px] font-medium text-danger-600 hover:bg-danger-50/60">
            <LogOut className="size-[18px]" /> Log out
          </button>
        </Divided>
      </form>
    </>
  );
}
