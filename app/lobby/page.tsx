import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, CreditCard, DoorOpen } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { getI18n } from "@/lib/i18n/server";
import { homeFor, requireMerchant } from "@/lib/session";

export const metadata = { robots: { index: false, follow: false } } satisfies Metadata;

/**
 * The lobby, for an owner who bought both systems. It exists ONLY then: with
 * one system there is nothing to choose, so homeFor() sends them straight in
 * and this page bounces anyone who arrives by URL. A chooser that always shows
 * is a tax on the 90% who only ever open one thing.
 *
 * THE WHOLE CARD IS THE BUTTON. An inner "open" button under each one cost
 * fifty vertical pixels each and pushed the second door under the fold on a
 * phone — and a chooser you have to scroll is not a chooser.
 *
 * THE TRAP: the artwork is optional on purpose. The files are commissioned
 * separately, and a missing .webp must not leave a broken frame on the screen
 * an owner opens every morning — so the card falls back to its icon until the
 * picture is there, and picks it up the moment it lands.
 */
export default async function LobbyPage() {
  const [ctx, { t, fill }] = await Promise.all([requireMerchant("/lobby"), getI18n()]);
  if (!ctx.systems?.both) redirect(homeFor(ctx));
  const w = t.merchant.lobby;

  const systems = [
    {
      href: ctx.card ? "/qr" : "/dashboard",
      image: "/systems/fidelite.webp",
      icon: CreditCard,
      alt: w.loyaltyAlt,
      title: w.loyalty,
      text: w.loyaltyText,
      note: null as string | null,
    },
    {
      href: "/members",
      image: "/systems/abonili.webp",
      icon: DoorOpen,
      alt: w.aboniliAlt,
      title: w.abonili,
      text: w.aboniliText,
      note: ctx.systems.members > 0 ? fill(t.merchant.abonili.planMembers, { n: ctx.systems.members }) : null,
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-6 text-center">
      <Logo size={26} className="mx-auto" />
      <h1 className="mt-4 text-[19px] font-semibold tracking-tight text-ink">{w.title}</h1>
      <p className="mt-0.5 text-sm text-muted">{ctx.business.name}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {systems.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative flex flex-col items-center rounded-2xl border border-line bg-white px-4 pb-4 pt-3 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:translate-y-0"
          >
            {s.note && (
              <span className="absolute end-3 top-3 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{s.note}</span>
            )}
            {existsSync(path.join(process.cwd(), "public", s.image)) ? (
              <Image src={s.image} alt={s.alt} width={512} height={512} className="size-24 sm:size-28" priority />
            ) : (
              <span className="grid size-24 place-items-center rounded-2xl bg-brand-50 text-brand-600 sm:size-28" aria-label={s.alt} role="img">
                <s.icon className="size-10" strokeWidth={1.6} />
              </span>
            )}
            <span className="mt-1.5 flex items-center gap-1 text-[17px] font-bold text-ink">
              {s.title}
              <ChevronLeft className="size-4 text-faint transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5" aria-hidden />
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{s.text}</span>
          </Link>
        ))}
      </div>

      <form action={logout} className="mt-6">
        <button type="submit" className="text-sm font-medium text-muted transition-colors hover:text-danger-600">
          {t.common.logout}
        </button>
      </form>
    </main>
  );
}
