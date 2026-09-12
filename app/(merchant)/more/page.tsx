import { Activity, CreditCard, LogOut, Printer, Receipt, Settings, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Divided, ListRow } from "@/components/ui/Card";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.more };
}

/** The only menu: one flat list, then log out. */
export default async function MorePage() {
  const [ctx, { t, count }] = await Promise.all([requireMerchant("/more"), getI18n()]);
  const card = ctx.card;
  const plans = t.data.plans as Record<string, string>;

  return (
    <>
      <TopBar title={t.nav.merchant.more} large back="/dashboard" />
      <Divided>
        <ListRow href="/customers" icon={<Users className="size-5" />} title={t.nav.merchant.customers} />
        <ListRow href="/activity" icon={<Activity className="size-5" />} title={t.nav.merchant.activity} />
        <ListRow
          href="/loyalty"
          icon={<CreditCard className="size-5" />}
          title={t.nav.merchant.card}
          subtitle={card ? `${count(t.common.stampsCount, card.stamps_required)} · ${card.reward?.name ?? ""}` : t.merchant.more.cardNone}
        />
        <ListRow href="/counter-qr" icon={<Printer className="size-5" />} title={t.nav.merchant.counterQr} subtitle={t.merchant.more.counterQrHint} />
        <ListRow href="/billing" icon={<Receipt className="size-5" />} title={t.nav.merchant.billing} subtitle={plans[ctx.subscription?.plan ?? ""] ?? t.data.plans.none} />
        <ListRow href="/settings" icon={<Settings className="size-5" />} title={t.nav.merchant.settings} subtitle={t.merchant.more.settingsHint} />
      </Divided>

      <form action={logout} className="mt-4">
        <Divided>
          <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 px-4 text-[15px] font-medium text-danger-600 hover:bg-danger-50/60">
            <LogOut className="size-[18px]" /> {t.common.logout}
          </button>
        </Divided>
      </form>
    </>
  );
}
