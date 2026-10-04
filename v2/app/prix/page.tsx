import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { BankMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { Icon3D } from "@/components/ui";
import { orgJsonLd, PRICE, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata: Metadata = {
  title: `Prix — ${PRICE} DT par an · السوم: ${PRICE} د في العام`,
  description: `Pointili coûte ${PRICE} dinars par an et par commerce, tout compris. Paiement par D17, virement, versement ou mandat. — ${PRICE} د في العام، الكل داخل.`,
  alternates: { canonical: `${SITE}/prix` },
};

/** One price, everything in it, and the four ways to pay — finished by a call or a WhatsApp. */
export default async function Prix() {
  const { supportPhone } = await getSettings();
  return (
    <SiteFrame support={supportPhone}>
      <JsonLd data={orgJsonLd(supportPhone)} />
      <h1 className="text-[2rem] font-bold leading-tight">السوم</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr">
        Prix de la carte de fidélité Pointili
      </p>

      <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#7c4dff,#6c47ff_45%,#3f22c9)] p-7 text-white">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgb(255_255_255/0.25),transparent_60%)]" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.9375rem] font-semibold text-white/80">{t.payPlan}</p>
            <p className="mt-1 flex items-end gap-2">
              <span className="num text-[3.5rem] font-bold leading-none">{PRICE}</span>
              <span className="pb-2 text-[1.125rem] font-bold">
                {t.payCurrency} <span className="font-semibold text-white/80">{t.payPer}</span>
              </span>
            </p>
          </div>
          <Icon3D name="crown" size={64} />
        </div>
        <ul className="relative mt-5 space-y-2">
          {[...t.payPerks, "اللوغو متاعك واللون متاعك على كارط كل حريف", "تبدا في دقيقتين، من التليفون متاعك"].map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[1rem]">
              <Check className="mt-1 size-4 shrink-0" strokeWidth={3} /> {p}
            </li>
          ))}
        </ul>
        <p className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[0.9375rem] font-bold backdrop-blur">
          <Sparkles className="size-4" /> كي تخلّص في 48 ساعة بعد ما تحلّ المحل: 3 شهور زايدين بلاش
        </p>
      </section>

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
          Pointili coûte {PRICE} dinars tunisiens par an et par commerce, tout compris : clients illimités, tampons illimités, votre logo sur la carte, et notre accompagnement. Si vous payez dans les 48 heures après l&apos;ouverture de votre compte, vous recevez 3 mois offerts (15 mois pour le prix de 12). Paiement par D17, virement, versement ou mandat postal : appelez-nous ou écrivez-nous sur WhatsApp et on finalise ensemble.
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
