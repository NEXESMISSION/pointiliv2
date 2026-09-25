import type { Metadata } from "next";
import Image from "next/image";
import { ImageIcon, KeyRound, MessageCircle, Store, UserRound } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card, Divided, ListRow } from "@/components/ui/Card";
import { LanguageRow } from "@/components/i18n/LanguageSwitcher";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { whatsappNumber } from "@/lib/support";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.settings.title };
}

/**
 * One screen, no scrolling inside anything. The shop and the plan are the two
 * things an owner opens this page to check, so they are the first thing on it;
 * everything that needs typing lives one tap away on a screen of its own.
 */
export default async function SettingsPage() {
  const { t, count, fill } = await getI18n();
  const ctx = await requireMerchant("/settings");
  const b = ctx.business;
  const s = ctx.subscription;
  const w = t.ops.settings;
  const plans = t.data.plans as Record<string, string>;
  const categories = t.data.categories as Record<string, string>;

  const number = whatsappNumber();
  const message = fill(t.ops.billing.whatsappMessage, { shop: b.name });

  return (
    <div className="mx-auto w-full max-w-md space-y-2.5">
      <TopBar title={w.title} large back="/more" />

      {/* the shop, and what it is paying — the two answers this page exists for */}
      <Card className="p-3.5">
        <div className="flex items-center gap-3">
          {b.logo_url ? (
            <Image src={b.logo_url} alt="" width={52} height={52} className="size-13 shrink-0 rounded-2xl object-cover" unoptimized />
          ) : (
            <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Store className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold text-ink">{b.name}</p>
            <p className="truncate text-[13px] text-muted">{categories[b.category] ?? categories.other}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-canvas px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">{t.ops.billing.title}</p>
            <p className="truncate text-[15px] font-semibold text-ink">{plans[s?.plan ?? "none"] ?? plans.none}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <SubscriptionBadge status={s?.status} plan={s?.plan} />
            {s?.open && <span className="text-[12px] text-muted tabular">{count(t.formats.daysLeft, s.days_left)}</span>}
          </div>
        </div>

        {number && (
          <a
            href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-[15px] font-semibold text-white transition active:scale-[0.99]"
          >
            <MessageCircle className="size-[18px]" /> {t.ops.billing.whatsapp}
          </a>
        )}
      </Card>

      <Divided>
        <ListRow href="/settings/shop" icon={<Store className="size-5" />} title={w.shopInfo} subtitle={b.phone || w.shopInfoHint} />
        <ListRow href="/settings/branding" icon={<ImageIcon className="size-5" />} title={w.branding} subtitle={w.brandingHint} />
        <ListRow href="/settings/you" icon={<UserRound className="size-5" />} title={w.account} subtitle={ctx.user.full_name || undefined} />
        <ListRow href="/settings/password" icon={<KeyRound className="size-5" />} title={w.changePassword} />
        <LanguageRow />
      </Divided>
    </div>
  );
}
