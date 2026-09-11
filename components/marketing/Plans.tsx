import { Check } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PLANS } from "@/lib/constants";

export const PLAN_FEATURES = ["Unlimited customers", "Unlimited stamps", "Rotating secure QR", "Rewards", "Customer list", "Activity & analytics"];

const LIST = [
  { ...PLANS.six_month, suffix: "for 6 months", best: false },
  { ...PLANS.yearly, suffix: "per year", best: true },
];

/** The two paid plans. `compact` drops the per-plan feature list (shown once below instead). */
export function PlanCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {LIST.map((plan) => (
        <div key={plan.id} className={`flex flex-col rounded-2xl bg-white p-6 text-left shadow-card ${plan.best ? "border-2 border-brand-600" : "border border-line"}`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">{plan.name}</h3>
            {plan.best && <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">Best value</span>}
          </div>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-ink tabular">{plan.price}</span>
            <span className="text-base font-semibold text-ink">TND</span>
            <span className="text-sm text-muted">{plan.suffix}</span>
          </p>
          <p className={`mt-2 text-sm ${plan.best ? "font-medium text-brand-700" : "text-muted"}`}>≈ {plan.perMonth}</p>
          {!compact && (
            <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-body">
                  <Check className="size-4 shrink-0 text-brand-600" strokeWidth={2.6} aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-6">
            <LinkButton href="/register" variant={plan.best ? "primary" : "outline"} block>
              Start free trial
            </LinkButton>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One shared "everything included" checklist. */
export function PlanFeatures() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      {PLAN_FEATURES.map((feature) => (
        <li key={feature} className="inline-flex items-center gap-1.5 text-sm text-body">
          <Check className="size-4 text-brand-600" strokeWidth={2.6} aria-hidden />
          {feature}
        </li>
      ))}
    </ul>
  );
}
