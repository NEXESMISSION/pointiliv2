import { CreditCard, Gift, LayoutGrid, LogOut, Settings, Tag, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Divided, ListRow } from "@/components/ui/Card";
import { currentSystem, requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.more };
}

/** The only menu: one flat list, then log out. */
export default async function MorePage() {
  const [ctx, { t, count, fill }, system] = await Promise.all([requireMerchant("/more"), getI18n(), currentSystem()]);
  const card = ctx.card;
  const plans = t.data.plans as Record<string, string>;
  /* The same rule as the nav: this menu belongs to the door they came through,
     or an owner of a salle is offered "كارط الفيدليتي" and "أعطي كادو". */
  const a = t.merchant.abonili;
  const abonili = system === "abonili" || Boolean(ctx.systems?.memberships && !ctx.systems?.loyalty);

  return (
    <>
      <TopBar title={t.nav.merchant.more} large back={abonili ? "/members" : "/dashboard"} />
      {/* by how often an owner needs it: give a reward, who came, the card, then the rest */}
      <Divided>
        {abonili ? (
          <>
            <ListRow href="/members" icon={<Users className="size-5" />} title={a.title} subtitle={fill(a.planMembers, { n: ctx.systems?.members ?? 0 })} />
            <ListRow href="/formules" icon={<Tag className="size-5" />} title={a.plansTitle} subtitle={a.plansSubtitle} />
          </>
        ) : (
          <>
            <ListRow href="/redeem" icon={<Gift className="size-5" />} title={t.merchant.home.giveReward} />
            <ListRow href="/customers" icon={<Users className="size-5" />} title={t.nav.merchant.customers} />
            <ListRow
              href="/loyalty"
              icon={<CreditCard className="size-5" />}
              title={t.nav.merchant.card}
              subtitle={card ? `${count(t.common.stampsCount, card.stamps_required)} · ${card.reward?.name ?? ""}` : t.merchant.more.cardNone}
            />
          </>
        )}
        {ctx.systems?.both && <ListRow href="/lobby" icon={<LayoutGrid className="size-5" />} title={t.merchant.lobby.switch} />}
        <ListRow href="/settings" icon={<Settings className="size-5" />} title={t.nav.merchant.settings} subtitle={plans[ctx.subscription?.plan ?? ""] ?? t.merchant.more.settingsHint} />
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
