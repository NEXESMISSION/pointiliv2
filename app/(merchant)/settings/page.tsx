import { CreditCard, Gift, KeyRound, LogOut, Receipt, Smartphone } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Card, Divided, ListRow, SectionTitle } from "@/components/ui/Card";
import { BusinessForm } from "@/components/merchant/SettingsForms";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { NameForm } from "@/components/customer/NameForm";
import { requireMerchant } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { PLAN_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireMerchant("/settings");
  const isOwner = ctx.member_role === "owner";
  const b = ctx.business;

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <TopBar title="Settings" large />

      <section>
        <SectionTitle>Business</SectionTitle>
        <Card className="p-5">
          <BrandingEditor bare logo={b.logo_url} cover={b.cover_url} icon={ctx.card?.icon} color={ctx.card?.color} disabled={!isOwner} />
          <div className="my-5 h-px bg-line" />
          <BusinessForm business={b} disabled={!isOwner} />
        </Card>
      </section>

      <section>
        <SectionTitle>Loyalty</SectionTitle>
        <Divided>
          <ListRow href="/loyalty" icon={<CreditCard className="size-5" />} title="Loyalty card & branding" subtitle={ctx.card ? `${ctx.card.stamps_required} stamps · ${ctx.card.reward?.name ?? ""}` : "Not created yet"} />
          <ListRow href="/rewards" icon={<Gift className="size-5" />} title="Rewards" />
        </Divided>
      </section>

      <section>
        <SectionTitle>Account</SectionTitle>
        <Card className="space-y-4 p-5">
          <div>
            <p className="mb-1.5 text-sm font-medium text-body">Your name</p>
            <NameForm defaultValue={ctx.user.full_name ?? ""} />
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted">Phone (login)</p>
              <p className="font-semibold text-ink tabular">{formatPhone(ctx.user.phone) || "—"}</p>
            </div>
            <div>
              <p className="text-muted">Email</p>
              <p className="truncate font-semibold text-ink">{ctx.user.email || "—"}</p>
            </div>
          </div>
        </Card>
        <Divided className="mt-3">
          <ListRow href="/settings/password" icon={<KeyRound className="size-5" />} title="Change password" />
          <ListRow href="/customer" icon={<Smartphone className="size-5" />} title="My customer cards" subtitle="Collect stamps at other businesses" />
        </Divided>
      </section>

      <section>
        <SectionTitle>Billing</SectionTitle>
        <Divided>
          <ListRow
            href="/billing"
            icon={<Receipt className="size-5" />}
            title={`Current plan: ${PLAN_LABEL[ctx.subscription?.plan ?? ""] ?? "None"}`}
            subtitle={ctx.subscription?.expires_at ? `${ctx.subscription.open ? "Expires" : "Ended"} ${formatDate(ctx.subscription.expires_at)}` : undefined}
          />
        </Divided>
      </section>

      <form action={logout}>
        <button type="submit" className="mx-auto flex h-12 items-center gap-2 rounded-2xl border border-danger-500/40 bg-white px-6 font-semibold text-danger-600 hover:bg-danger-50">
          <LogOut className="size-5" /> Log out
        </button>
      </form>
    </div>
  );
}
