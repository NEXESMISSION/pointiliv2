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
    // A phone shows both doors at once, even a small one (375×667): each is a
    // row there. From a tablet up they stand side by side, and a computer gets
    // them big and centred instead of two stamps in an empty screen.
    <div className="mx-auto flex w-full max-w-md flex-col px-4 text-center sm:max-w-2xl sm:px-6 lg:min-h-[calc(100dvh-7.5rem)] lg:max-w-4xl lg:justify-center">
      <JsonLd />
      <span className="lg:hidden">
        <Logo size={30} />
      </span>
      <span className="hidden lg:block">
        <Logo size={40} />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-ink sm:mt-5 lg:mt-6 lg:text-3xl lg:font-bold lg:tracking-tight">{m.choose.title}</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-10 lg:gap-6">
        {doors.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-3.5 text-start shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:translate-y-0 sm:flex-col sm:gap-0 sm:px-5 sm:pb-5 sm:pt-6 sm:text-center lg:rounded-3xl lg:px-10 lg:pb-9 lg:pt-10"
          >
            {/* the renders carry a faint frame at their edges: the tile crops it off */}
            <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white sm:size-36 lg:size-52">
              <Image src={d.image} alt={d.alt} width={512} height={512} className="size-full scale-[1.08] object-cover" priority />
            </span>
            <span className="flex min-w-0 flex-1 flex-col sm:w-full">
              <span className="block text-[17px] font-bold text-ink sm:mt-3 lg:mt-5 lg:text-2xl">{d.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted sm:text-sm lg:mt-1 lg:text-base">{d.text}</span>
              <span className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition-colors group-hover:bg-brand-700 sm:mt-5 lg:mt-7 lg:h-12 lg:text-base">
                {d.button}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted lg:mt-10 lg:text-base">
        {m.contact.owner}{" "}
        <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
          {m.contact.whatsapp}
        </a>
      </p>
    </div>
  );
}
