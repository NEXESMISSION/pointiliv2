import { Check, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PLANS } from "@/lib/constants";

export const PLAN_FEATURES = ["Unlimited customers", "Unlimited stamps", "Rotating secure QR", "Rewards", "Customer list", "Activity & analytics"];

const LIST = [
  { ...PLANS.six_month, suffix: "for 6 months", best: false },
  { ...PLANS.yearly, suffix: "per year", best: true },
];

/** The two paid plans, full detail (pricing page). */
export function PlanCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {LIST.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col rounded-3xl bg-white p-6 sm:p-8 ${plan.best ? "order-first border-2 border-brand-600 shadow-lift md:order-none" : "border border-line/80 shadow-card"}`}
        >
          {plan.best && (
            <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-brand">
              <Sparkles className="size-3.5" aria-hidden />
              Best value
            </span>
          )}
          <h2 className="text-lg font-bold text-ink">{plan.name}</h2>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
            <span className="tabular text-5xl font-extrabold tracking-tight text-ink">{plan.price}</span>
            <span className="text-lg font-bold text-ink">TND</span>
            <span className="text-[15px] text-muted">{plan.suffix}</span>
          </p>
          <p className={`mt-1 text-sm font-semibold ${plan.best ? "text-brand-600" : "text-muted"}`}>≈ {plan.perMonth}</p>
          <ul className="mt-6 space-y-3 border-t border-line pt-6">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-[15px] text-body">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-50 text-success-600">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <LinkButton href="/register" variant={plan.best ? "primary" : "secondary"} block>
              Start free
            </LinkButton>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Compact side-by-side prices (landing teaser). */
export function PlanTeaser() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {LIST.map((plan) => (
        <div key={plan.id} className={`relative rounded-3xl bg-white p-4 sm:p-6 ${plan.best ? "border-2 border-brand-600 shadow-lift" : "border border-line/80 shadow-card"}`}>
          {plan.best && <span className="absolute -top-2.5 right-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Best value</span>}
          <p className="text-sm font-semibold text-muted">{plan.name}</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="tabular text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{plan.price}</span>
            <span className="text-sm font-bold text-ink">TND</span>
          </p>
          <p className={`mt-1 text-xs font-medium sm:text-sm ${plan.best ? "text-brand-600" : "text-muted"}`}>≈ {plan.perMonth}</p>
        </div>
      ))}
    </div>
  );
}
