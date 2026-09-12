import { Activity, CreditCard, LogOut, Printer, Receipt, Settings, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Divided, ListRow } from "@/components/ui/Card";
import { requireMerchant } from "@/lib/session";
import { PLAN_LABEL } from "@/lib/constants";

export const metadata = { title: "More" };

/** The only menu: one flat list, then log out. */
export default async function MorePage() {
  const ctx = await requireMerchant("/more");
  const card = ctx.card;

  return (
    <>
      <TopBar title="More" large back="/dashboard" />
      <Divided>
        <ListRow href="/customers" icon={<Users className="size-5" />} title="Customers" />
        <ListRow href="/activity" icon={<Activity className="size-5" />} title="Activity" />
        <ListRow
          href="/loyalty"
          icon={<CreditCard className="size-5" />}
          title="Loyalty card"
          subtitle={card ? `${card.stamps_required} stamps · ${card.reward?.name ?? ""}` : "Not created yet"}
        />
        <ListRow href="/counter-qr" icon={<Printer className="size-5" />} title="Counter QR" subtitle="Print it for your counter" />
        <ListRow href="/billing" icon={<Receipt className="size-5" />} title="Billing" subtitle={PLAN_LABEL[ctx.subscription?.plan ?? ""] ?? "No plan"} />
        <ListRow href="/settings" icon={<Settings className="size-5" />} title="Settings" subtitle="Shop details, logo, password" />
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
