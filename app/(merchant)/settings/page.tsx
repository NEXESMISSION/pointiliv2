import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, Divided, ListRow, SectionTitle } from "@/components/ui/Card";
import { BusinessForm } from "@/components/merchant/SettingsForms";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { NameForm } from "@/components/customer/NameForm";
import { LanguageRow } from "@/components/i18n/LanguageSwitcher";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.settings.title };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  const ctx = await requireMerchant("/settings");
  const isOwner = ctx.member_role === "owner";
  const b = ctx.business;
  const w = t.ops.settings;

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <TopBar title={w.title} large back="/more" />

      <section>
        <SectionTitle>{w.yourShop}</SectionTitle>
        {/* the shop form is the long part: it scrolls inside its own card, so the rest of the page stays put */}
        <Card className="max-h-[19rem] overflow-y-auto p-3.5">
          <BrandingEditor bare logo={b.logo_url} cover={b.cover_url} icon={ctx.card?.icon} color={ctx.card?.color} disabled={!isOwner} />
          <div className="my-3.5 h-px bg-line" />
          <BusinessForm business={b} disabled={!isOwner} />
        </Card>
      </section>

      <section>
        <SectionTitle>{w.you}</SectionTitle>
        <Card className="space-y-3 p-3.5">
          {/* relative: the form's sr-only label is absolute, and without this it stretches the page */}
          <div className="relative">
            <p className="mb-1.5 text-[13px] font-medium text-body">{t.common.yourName}</p>
            <NameForm defaultValue={ctx.user.full_name ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <div>
              <p className="text-muted">{w.loginPhone}</p>
              <p className="font-medium text-ink tabular">
                <span dir="ltr" className="inline-block">{formatPhone(ctx.user.phone) || "—"}</span>
              </p>
            </div>
            <div>
              <p className="text-muted">{w.email}</p>
              <p className="truncate font-medium text-ink">
                <span dir="ltr" className="inline-block">{ctx.user.email || "—"}</span>
              </p>
            </div>
          </div>
        </Card>
        <Divided className="mt-2.5">
          <ListRow href="/settings/password" icon={<KeyRound className="size-5" />} title={w.changePassword} />
          <LanguageRow />
        </Divided>
      </section>
    </div>
  );
}
