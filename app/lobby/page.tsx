import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, DoorOpen } from "lucide-react";
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
 * THE TRAP: the artwork is optional on purpose. The files are commissioned
 * separately, and a missing .webp must not leave a broken frame on the screen
 * an owner opens every morning — so the card falls back to its icon until the
 * picture is there, and picks it up the moment it lands.
 */
export default async function LobbyPage() {
  const [ctx, { t }] = await Promise.all([requireMerchant("/lobby"), getI18n()]);
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
      note: ctx.systems.members > 0 ? `${ctx.systems.members} ${w.members}` : null,
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-8 text-center">
      <Logo size={28} className="mx-auto" />
      <h1 className="mt-5 text-xl font-semibold text-ink">{w.title}</h1>
      <p className="mt-1 text-sm text-muted">{ctx.business.name}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {systems.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col items-center rounded-2xl border border-line bg-white px-5 pb-4 pt-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:translate-y-0"
          >
            {existsSync(path.join(process.cwd(), "public", s.image)) ? (
              <Image src={s.image} alt={s.alt} width={512} height={512} className="size-28 sm:size-32" priority />
            ) : (
              <span className="grid size-28 place-items-center rounded-2xl bg-brand-50 text-brand-600 sm:size-32" aria-label={s.alt} role="img">
                <s.icon className="size-12" strokeWidth={1.6} />
              </span>
            )}
            <span className="mt-3 block text-[17px] font-bold text-ink">{s.title}</span>
            <span className="mt-0.5 block text-sm text-muted">{s.text}</span>
            <span className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition-colors group-hover:bg-brand-700">
              {s.note ?? w.open}
            </span>
          </Link>
        ))}
      </div>

      <form action={logout} className="mt-8">
        <button type="submit" className="text-sm font-medium text-muted transition-colors hover:text-danger-600">
          {t.common.logout}
        </button>
      </form>
    </main>
  );
}
