import type { Metadata } from "next";
import Link from "@/components/Link";
import { Check, Sparkles } from "lucide-react";
import { BankMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { Icon3D } from "@/components/ui";
import { perMonth, PLANS } from "@/lib/plans";
import { GIFT, orgJsonLd, PRICES, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { fill, monthsSaid, t } from "@/lib/t";

export const metadata: Metadata = {
  title: `Prix — ${PRICES.fr} · السوم: ${PRICES.tn}`,
  description: `Pointili coûte ${PRICES.fr}, par commerce et tout compris. ${GIFT.fr} Paiement par D17, virement, versement ou mandat. — ${PRICES.tn}، الكل داخل.`,
  alternates: { canonical: `${SITE}/prix` },
};

/**
 * The three lengths side by side (the founder, 7 Nov 2026): a month 35, six
 * months 120, a year 180 — each with what a month comes to, the year marked
 * the best — the same «everything included» under all three, the two months
 * of the trial's first 3 days, and the four ways to pay, finished by a call or
 * a WhatsApp.
 */
export default async function Prix() {
  const { supportPhone, social } = await getSettings();
  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <h1 className="text-[2rem] font-bold leading-tight">السوم</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr">
        Prix de la carte de fidélité Pointili
      </p>

      {/* the three lengths, in their order (a month, six months, a year), the year lit and marked the best;
          each card in one language — the French is said in full under «En bref» */}
      <ul className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-3">
        {PLANS.map((p) => {
          const best = p.id === "year";
          return (
            <li
              key={p.id}
              className={`relative flex flex-col rounded-[1.75rem] p-6 ${best ? "bg-[linear-gradient(140deg,#7c4dff,#6c47ff_45%,#3f22c9)] text-white shadow-[0_24px_50px_-28px_rgb(74_42_214/0.8)]" : "bg-surface shadow-card"}`}
            >
              {best && (
                <span className="absolute -top-3 start-6 inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-[0.8125rem] font-bold text-white">
                  <Sparkles className="size-3.5" /> {t.planBest}
                </span>
              )}
              <p className={`text-[1.0625rem] font-bold ${best ? "text-white/90" : "text-body"}`}>{monthsSaid(p.months)}</p>
              <p className="mt-2 flex items-end gap-1.5">
                <span className={`num text-[3rem] font-bold leading-none ${best ? "" : "text-brand"}`}>{p.price}</span>
                <span className="pb-1.5 text-[1.0625rem] font-bold">{t.payCurrency}</span>
              </p>
              <p className={`mt-1.5 text-[0.9375rem] font-semibold ${best ? "text-white/85" : "text-muted"}`}>{p.months === 1 ? t.planFree : fill(t.planPerMonth, { n: perMonth(p) })}</p>
              {p.gift > 0 && (
                <p className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.8125rem] font-bold ${best ? "bg-white/20" : "bg-mint-soft text-mint"}`}>
                  {t.payOfferPlus} في أوّل 3 أيّام
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* what every length has in it */}
      <section className="mt-4 flex items-start gap-4 rounded-[1.75rem] bg-surface p-6 shadow-card">
        <ul className="min-w-0 flex-1 space-y-2">
          {[...t.payPerks, "اللوغو متاعك واللون متاعك على كارط كل حريف", "تبيع أونلاين؟ تامبونات بالرابط في واتساب", "تبدا في دقيقتين، من التليفون متاعك"].map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[1rem]">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint text-white">
                <Check className="size-3" strokeWidth={3.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <Icon3D name="crown" size={64} className="hidden shrink-0 sm:block" />
      </section>

      <p className="mt-4 flex items-start gap-2.5 rounded-[1.25rem] bg-brand-soft px-5 py-4 text-[0.9375rem] font-bold leading-relaxed text-brand">
        <Sparkles className="mt-1 size-4 shrink-0" /> {GIFT.tn}
      </p>

      <section className="mt-10">
        <h2 className="text-[1.375rem] font-bold">كيفاش تخلّص</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { mark: <D17Mark />, title: "", sub: t.payD17Sub },
            { mark: <BankMark />, title: t.payVirement, sub: t.payVirementSub },
            { mark: <CashMark />, title: t.payVersement, sub: t.payVersementSub },
            { mark: <PostMark />, title: t.payMandat, sub: t.payMandatSub },
          ].map((m, i) => (
            <li key={i} className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-3.5 shadow-card">
              <span className="grid size-11 shrink-0 place-items-center [&>svg]:size-11">{m.mark}</span>
              <span className="min-w-0 flex-1">
                {m.title ? <b className="block text-[1rem]">{m.title}</b> : null}
                <span className={`block truncate ${m.title ? "text-[0.8125rem] text-muted" : "text-[1rem] font-bold"}`}>{m.sub}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-body">{t.payHow}</p>
      </section>

      <section className="mt-10 rounded-[1.25rem] bg-surface p-5 shadow-card" dir="ltr" lang="fr">
        <h2 className="text-[1.125rem] font-bold">En bref</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
          Pointili coûte {PRICES.fr}, par commerce. Tout est compris dans chacun : clients illimités, tampons illimités, votre logo sur la carte, et notre accompagnement. {GIFT.fr} Paiement par D17, virement, versement ou mandat postal : appelez-nous ou écrivez-nous sur WhatsApp et on finalise ensemble.
        </p>
      </section>

      <p className="mt-8 text-center">
        <Link href="/shop/new" className="press inline-flex h-12 items-center rounded-[1rem] bg-brand px-6 text-[1rem] font-bold text-white">
          حلّ محلّك في دقيقتين
        </Link>
      </p>
    </SiteFrame>
  );
}
