import { CreditCard, Gift, CircleHelp, KeyRound, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Card, Divided, ListRow } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Stat";
import { NameForm } from "@/components/customer/NameForm";
import { InstallRow } from "@/components/InstallPrompt";
import { LanguageRow } from "@/components/i18n/LanguageSwitcher";
import { requireUser } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.common.profile };
}

export default async function ProfilePage() {
  const { t } = await getI18n();
  const ctx = await requireUser("/customer/profile");
  const u = ctx.user;
  return (
    <>
      <TopBar title={t.customer.profile.title} large back="/customer" />
      <Card className="flex flex-col items-center p-4 text-center">
        <Avatar label={initials(u.full_name, "P")} size={56} />
        <p className="mt-2 text-base font-semibold tracking-tight text-ink">{u.full_name || t.customer.profile.member}</p>
        {u.phone && (
          <p className="text-[13px] text-muted tabular" dir="ltr">
            {formatPhone(u.phone)}
          </p>
        )}
        <div className="mt-3 w-full">
          <NameForm defaultValue={u.full_name ?? ""} />
        </div>
      </Card>

      <Divided className="mt-3">
        <ListRow href="/customer/cards" icon={<CreditCard className="size-5" />} title={t.customer.cards.title} />
        <ListRow href="/customer/rewards" icon={<Gift className="size-5" />} title={t.customer.profile.myRewards} />
        <ListRow href="/customer/profile/password" icon={<KeyRound className="size-5" />} title={t.customer.profile.changePassword} subtitle="••••••••" />
      </Divided>

      <Divided className="mt-3">
        <InstallRow />
        <LanguageRow />
        <ListRow href="/how-it-works" icon={<CircleHelp className="size-5" />} title={t.customer.howItWorks} />
      </Divided>

      <form action={logout} className="mt-3">
        <Divided>
          <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 px-4 text-[15px] font-medium text-danger-600 hover:bg-danger-50/60">
            <LogOut className="size-[18px]" /> {t.common.logout}
          </button>
        </Divided>
      </form>
    </>
  );
}
