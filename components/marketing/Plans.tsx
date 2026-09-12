import { Check } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PLANS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";

/** Keys of marketing.plans, in the order they are listed. */
const FEATURE_KEYS = ["unlimitedCustomers", "unlimitedStamps", "rotatingQr", "rewards", "customerList", "analytics"] as const;

export function planFeatures(t: Messages): string[] {
  return FEATURE_KEYS.map((key) => t.marketing.plans[key]);
}

const LIST = [
  { ...PLANS.six_month, id: "six_month" as const, months: 6, best: false },
  { ...PLANS.yearly, id: "yearly" as const, months: 12, best: true },
];

/** The two paid plans. `compact` drops the per-plan feature list (shown once below instead). */
export async function PlanCards({ compact = false }: { compact?: boolean }) {
  const { t, locale, fill } = await getI18n();
  const features = planFeatures(t);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {LIST.map((plan) => (
        <div key={plan.id} className={`flex flex-col rounded-2xl bg-white p-6 text-start shadow-card ${plan.best ? "border-2 border-brand-600" : "border border-line"}`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">{t.data.plans[plan.id]}</h3>
            {plan.best && <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">{t.marketing.plans.best}</span>}
          </div>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-ink tabular">{formatNumber(plan.price, locale)}</span>
            <span className="text-base font-semibold text-ink">{t.formats.currency}</span>
            <span className="text-sm text-muted">{t.data.planPeriod[plan.id]}</span>
          </p>
          <p className={`mt-2 text-sm ${plan.best ? "font-medium text-brand-700" : "text-muted"}`}>
            ≈ {fill(t.formats.perMonth, { price: formatNumber(Math.round((plan.price / plan.months) * 10) / 10, locale) })}
          </p>
          {!compact && (
            <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-body">
                  <Check className="size-4 shrink-0 text-brand-600" strokeWidth={2.6} aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-6">
            <LinkButton href="/register" variant={plan.best ? "primary" : "outline"} block>
              {t.marketing.plans.start}
            </LinkButton>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One shared "everything included" checklist. */
export async function PlanFeatures() {
  const { t } = await getI18n();
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      {planFeatures(t).map((feature) => (
        <li key={feature} className="inline-flex items-center gap-1.5 text-sm text-body">
          <Check className="size-4 text-brand-600" strokeWidth={2.6} aria-hidden />
          {feature}
        </li>
      ))}
    </ul>
  );
}
