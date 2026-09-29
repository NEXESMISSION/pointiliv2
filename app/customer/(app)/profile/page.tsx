import { KeyRound, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Card, Divided, ListRow, SectionTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Stat";
import { Icon3D } from "@/components/ui/Icon3D";
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

/** The account: who you are, your cards and gifts, the settings, the way out. */
export default async function ProfilePage() {
  const { t } = await getI18n();
  const ctx = await requireUser("/customer/profile");
  const u = ctx.user;
  return (
    <div className="space-y-4">
      <div className="px-0.5">
        <p className="text-sm text-muted">{u.full_name || t.customer.profile.member}</p>
        <h1 className="text-[30px] font-bold leading-tight text-ink">{t.nav.customer.profile}</h1>
      </div>

      <Card className="flex items-center gap-3.5 p-4">
        <Avatar label={initials(u.full_name, "P")} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-ink">{u.full_name || t.customer.profile.member}</p>
          {u.phone && <p className="num text-[13px] text-muted">{formatPhone(u.phone)}</p>}
        </div>
      </Card>
      <NameForm defaultValue={u.full_name ?? ""} />

      <Divided>
        <ListRow href="/customer/cards" icon={<Icon3D name="ticket" size={26} />} title={t.customer.cards.title} />
        <ListRow href="/customer/rewards" icon={<Icon3D name="trophy" size={26} />} title={t.customer.profile.myRewards} />
        <ListRow href="/customer/profile/password" icon={<KeyRound className="size-5" />} title={t.customer.profile.changePassword} subtitle="••••••••" />
      </Divided>

      <div>
        <SectionTitle className="!mb-2 [&_h2]:text-[15px] [&_h2]:text-muted">{t.nav.merchant.settings}</SectionTitle>
        <Divided>
          <InstallRow />
          <LanguageRow />
        </Divided>
      </div>

      <form action={logout}>
        <Divided>
          <button type="submit" className="flex min-h-[54px] w-full items-center justify-center gap-2 px-4 text-[15px] font-semibold text-coral-600 hover:bg-coral-50/60">
            <LogOut className="size-[18px]" /> {t.common.logout}
          </button>
        </Divided>
      </form>
    </div>
  );
}
