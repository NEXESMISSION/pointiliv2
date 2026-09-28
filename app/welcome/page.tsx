import { Check, Phone, Store, Tag } from "lucide-react";
import { WelcomeForm, WelcomeSteps } from "@/components/merchant/Welcome";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { requireMerchant } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.welcome.steps.shop };
}

/**
 * Step one of three. What the founder already set up is shown, ticked, and
 * never asked again; the owner adds only his logo, his address, his Instagram.
 */
export default async function WelcomePage() {
  const [ctx, { t, fill }] = await Promise.all([requireMerchant("/welcome"), getI18n()]);
  const w = t.merchant.welcome;
  const b = ctx.business;
  const first = ctx.user.full_name?.trim().split(/\s+/)[0];
  const categories = t.data.categories as Record<string, string>;
  const prepared = [
    { icon: <Store className="size-4" />, value: b.name },
    { icon: <Tag className="size-4" />, value: categories[b.category] ?? b.category },
    ...(ctx.user.phone ? [{ icon: <Phone className="size-4" />, value: formatPhone(ctx.user.phone), ltr: true }] : []),
  ];

  return (
    <div className="animate-fade space-y-4">
      <WelcomeSteps step={1} />
      <div className="text-center">
        <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-ink">{first ? fill(w.hello, { name: first }) : w.helloNoName}</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{w.intro}</p>
      </div>

      <div className="rounded-2xl bg-canvas p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success-600">
          <Check className="size-3.5" strokeWidth={3} /> {w.prepared}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {prepared.map((p) => (
            <span key={p.value} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[13px] font-medium text-ink ring-1 ring-inset ring-line">
              <span className="shrink-0 text-muted">{p.icon}</span>
              <span className="truncate" dir={"ltr" in p && p.ltr ? "ltr" : undefined}>
                {p.value}
              </span>
            </span>
          ))}
        </div>
      </div>

      <WelcomeForm address={b.address} instagram={b.instagram} logo={b.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} />
    </div>
  );
}
