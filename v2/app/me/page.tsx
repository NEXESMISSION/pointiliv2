import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { NameForm } from "@/components/NameForm";
import { PasswordForm } from "@/components/PasswordForm";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { spaced } from "@/lib/phone";
import { kindIcon, t } from "@/lib/t";

export const metadata = { title: "الكونت" };

/** The account: the name, the number, a new password — and the other side of Pointili, one tap away. */
export default async function Account() {
  const me = await getMe();
  if (!me) redirect("/login?next=/me");
  // a customer may open a shop; an owner (or the founder) also collects stamps elsewhere;
  // the founder's own shop, if any, is one tap away from the console
  const links = [
    ...(me.admin && me.shop ? [{ href: "/shop", icon: kindIcon(me.shop.kind), title: me.shop.name, hint: t.shopTitle }] : []),
    me.shop || me.admin ? { href: "/wallet", icon: "ticket", title: t.myCards, hint: t.myCardsHint } : { href: "/shop/setup", icon: "shop", title: t.openShop, hint: t.openShopHint },
  ];
  return (
    <Screen>
      <Top back={me.admin ? "/admin" : me.shop ? "/shop" : "/"} title={t.account} />
      <div className="mt-6 space-y-5 [@media(max-height:680px)]:mt-4 [@media(max-height:680px)]:space-y-3">
        <NameForm name={me.name ?? ""} />
        {me.phone && (
          <div>
            <p className="mb-1.5 px-1 text-[14px] font-semibold text-muted">{t.phone}</p>
            <p className="rounded-[18px] bg-surface px-4 py-4 text-[17px] shadow-card">
              <span dir="ltr" className="num inline-block">
                +216 {spaced(me.phone)}
              </span>
            </p>
          </div>
        )}
        <PasswordForm />
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="press flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-card">
            <Icon3D name={l.icon} size={40} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16.5px] font-bold">{l.title}</span>
              <span className="block truncate text-[13.5px] text-muted">{l.hint}</span>
            </span>
            <ChevronLeft className="size-5 shrink-0 text-faint" />
          </Link>
        ))}
      </div>
      <form action={logout} className="mt-auto pt-8">
        <button type="submit" className="press flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-surface text-[17px] font-semibold text-coral shadow-card">
          <LogOut className="size-5" /> {t.logout}
        </button>
      </form>
    </Screen>
  );
}
