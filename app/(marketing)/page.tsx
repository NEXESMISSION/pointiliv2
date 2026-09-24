import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { JsonLd } from "@/components/marketing/JsonLd";
import { INSTAGRAM_HANDLE } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";
import { whatsappLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const { t, path } = await getI18n();
  return {
    title: { absolute: t.marketing.meta.homeTitle },
    description: t.marketing.meta.homeDescription,
    alternates: { canonical: path("/"), languages: { "ar-TN": "/", fr: "/fr", "x-default": "/" } },
  };
}

/**
 * The front door is two doors. Nobody arrives here to be convinced: the
 * customer comes for their card, the owner for their counter. The selling
 * happens on Instagram and at the counter, so this page only asks who you are.
 */
export default async function HomePage() {
  const { t } = await getI18n();
  const m = t.marketing;
  const wa = whatsappLink(m.contact.message) ?? `https://ig.me/m/${INSTAGRAM_HANDLE}`;
  const doors = [
    { href: "/customer/login", image: "/choose/customer.webp", alt: m.choose.customerAlt, title: m.choose.customer, text: m.choose.customerText, button: m.choose.customerButton },
    { href: "/login", image: "/choose/business.webp", alt: m.choose.businessAlt, title: m.choose.business, text: m.choose.businessText, button: m.choose.businessButton },
  ];

  return (
    <div className="mx-auto w-full max-w-xl px-5 text-center">
      <JsonLd />
      <Logo size={30} className="mx-auto" />
      <h1 className="mt-5 text-xl font-semibold text-ink">{m.choose.title}</h1>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {doors.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group flex flex-col items-center rounded-2xl border border-line bg-white px-5 pb-4 pt-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:translate-y-0"
          >
            <Image src={d.image} alt={d.alt} width={512} height={512} className="size-28 sm:size-36" priority />
            <span className="mt-3 block text-[17px] font-bold text-ink">{d.title}</span>
            <span className="mt-0.5 block text-sm text-muted">{d.text}</span>
            <span className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition-colors group-hover:bg-brand-700">
              {d.button}
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">
        {m.contact.owner}{" "}
        <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
          {m.contact.whatsapp}
        </a>
      </p>
    </div>
  );
}
