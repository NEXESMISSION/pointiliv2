import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Phone } from "lucide-react";
import { AdminPersonActions } from "@/components/AdminPersonActions";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { kindIcon, t } from "@/lib/t";

export const metadata = { title: "كونت", robots: { index: false } };

type Person = {
  id: string; name: string; phone: string | null; admin: boolean; created_at: string;
  shop: { id: string; name: string; kind: string; color: string } | null;
  cards: { shop: string; kind: string; color: string; stamps: number; goal: number | null; gifts: number; last_at: string | null }[];
};

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** One account, as the founder sees it: who, their shop, their cards — and the two tools. */
export default async function AdminPerson({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, getMe()]);
  if (!me?.admin) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await call<Person | null>("admin_person", { p_id: id });
  if (!p) notFound();

  return (
    <Screen className="pb-10">
      <Top back="/admin?tab=people" title={p.name || t.someone} hint={`${t.aCreated} ${day(p.created_at)}`} />

      {p.phone && (
        <div className="mt-5 flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-card">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-muted">{t.phone}</span>
            <span dir="ltr" className="num inline-block text-[17px] font-bold">
              {pretty(p.phone)}
            </span>
          </span>
          <a href={`tel:+216${digits(p.phone)}`} className="press flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-4 text-[14.5px] font-bold text-brand">
            <Phone className="size-4" /> {t.aCall}
          </a>
        </div>
      )}

      {p.shop && (
        <Link href={`/admin/shops/${p.shop.id}`} className="press mt-3 flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-card">
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px]" style={{ background: p.shop.color }}>
            <Icon3D name={kindIcon(p.shop.kind)} size={28} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-muted">{t.aShopOf}</span>
            <span className="block truncate text-[16.5px] font-bold">{p.shop.name}</span>
          </span>
          <ChevronLeft className="size-5 shrink-0 text-faint" />
        </Link>
      )}

      <section className="mt-4">
        <h2 className="mb-2 px-0.5 text-[16px] font-bold">{t.aCardsOf}</h2>
        {p.cards.length === 0 ? (
          <p className="rounded-[20px] bg-surface p-4 text-[15px] text-muted shadow-card">{t.aNoCardsOf}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
            {p.cards.map((c, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[12px]" style={{ background: c.color }}>
                  <Icon3D name={kindIcon(c.kind)} size={22} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{c.shop}</span>
                {c.gifts > 0 && <span className="num shrink-0 rounded-full bg-coral-soft px-2.5 py-1 text-[12.5px] font-bold text-coral">🎁 {c.gifts}</span>}
                <span className="num shrink-0 text-[14px] font-bold text-body">
                  {Math.min(c.stamps, c.goal ?? c.stamps)}/{c.goal ?? "–"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.admin ? (
        <p className="mt-6 rounded-2xl bg-ink/[0.05] px-4 py-3 text-center text-[14.5px] font-medium text-muted">{t.aIsAdmin}</p>
      ) : (
        <AdminPersonActions id={p.id} name={p.name} phone={p.phone} />
      )}
    </Screen>
  );
}
