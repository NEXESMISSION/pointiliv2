import Link from "next/link";
import { InstallApp, InstallPopup, OpenOutside } from "@/components/InstallApp";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { NameForm } from "@/components/NameForm";
import { PasswordForm } from "@/components/PasswordForm";
import { Heading, Top } from "@/components/Top";
import { Icon3D, Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { spaced } from "@/lib/phone";
import { kindIcon, t } from "@/lib/t";

export const metadata = { title: "الكونت" };

/** The account: the name, the number, a new password — and the other side of Pointili, one tap away. */
export default async function Account({ searchParams }: { searchParams: Promise<{ install?: string }> }) {
  const [me, { install }] = await Promise.all([getMe(), searchParams]);
  // come out of Facebook's browser to install (/me?install=1): the address survives the login
  if (!me) redirect(install === "1" ? "/login?next=%2Fme%3Finstall%3D1" : "/login?next=/me");
  // a customer may open a shop; an owner (or the founder) also collects stamps elsewhere;
  // the founder's own shop, if any, is one tap away from the console
  const links = [
    ...(me.admin && me.shop ? [{ href: "/shop", icon: kindIcon(me.shop.kind), title: me.shop.name, hint: t.shopTitle }] : []),
    me.shop || me.admin ? { href: "/wallet", icon: "ticket", title: t.myCards, hint: t.myCardsHint } : { href: "/shop/setup", icon: "shop", title: t.openShop, hint: t.openShopHint },
  ];
  return (
    <Screen>
      <Top back={me.admin ? "/admin" : me.shop ? "/shop" : "/"} />
      <Middle>
      <Heading title={t.account} />
      <div className="mt-[3dvh] space-y-[2dvh]">
        <NameForm name={me.name ?? ""} />
        {me.phone && (
          <div>
            <p className="mb-1.5 px-1 text-[0.875rem] font-semibold text-muted">{t.phone}</p>
            <p className="rounded-[1.125rem] bg-surface px-4 py-4 text-[1.0625rem] shadow-card">
              <span dir="ltr" className="num inline-block" data-clarity-mask="true">
                +216 {spaced(me.phone)}
              </span>
            </p>
          </div>
        )}
        <PasswordForm />
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="press flex items-center gap-3 rounded-[1.375rem] bg-surface p-4 shadow-card">
            <Icon3D name={l.icon} size={40} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1.0312rem] font-bold">{l.title}</span>
              <span className="block truncate text-[0.8438rem] text-muted">{l.hint}</span>
            </span>
            <ChevronLeft className="size-5 shrink-0 text-faint" />
          </Link>
        ))}
      </div>
      <InstallApp where="account" look="row" className="mt-[2dvh]" />
      {/* never both: Facebook's browser offers no install */}
      <OpenOutside where="account" className="mt-[2dvh]" />
      {/* out of Facebook's browser to install: Chrome's offer asked at once */}
      <InstallPopup where="account" who={me.id} show={install === "1"} force={install === "1"} />
      {/* out: this phone's push word taken back first (components/LogoutButton.tsx) */}
      <LogoutButton />
      </Middle>
    </Screen>
  );
}
