import { notFound, redirect } from "next/navigation";
import { Gift, Phone } from "lucide-react";
import { AdminShopActions } from "@/components/AdminShopActions";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { kindIcon, stampsN, t } from "@/lib/t";

export const metadata = { title: "محل", robots: { index: false } };

type Shop = {
  id: string; name: string; kind: string; color: string; goal: number | null; gift: string | null; paused: boolean; created_at: string;
  owner: { name: string; phone: string | null } | null;
  customers: number; stamps: number; today: number; given: number; waiting: number;
  recent: { at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; phone: string | null }[];
  top: { name: string | null; phone: string | null; stamps: number; gifts: number; goal: number | null }[];
};

const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * One shop, as the founder sees it, on one screen: the shop and its card in
 * a line, the owner with a call button, four numbers in a row, the best
 * customers and the latest moments scrolling inside one box, and the two
 * switches at the bottom.
 */
export default async function AdminShop({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, getMe()]);
  if (!me?.admin) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await call<Shop | null>("admin_shop", { p_id: id });
  if (!s) notFound();
  const tiles = [
    { icon: "people", value: s.customers, label: t.aCustomers },
    { icon: "fire", value: s.today, label: t.aToday },
    { icon: "star", value: s.stamps, label: t.aStamps },
    { icon: "gift", value: s.given, label: t.aGiven },
  ];

  return (
    <Screen>
      <Top back="/admin" />

      {/* the shop and its card, in one line */}
      <div className="mt-[1.8dvh] flex shrink-0 items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-[1.125rem] shadow-card" style={{ background: s.color }}>
          <Icon3D name={kindIcon(s.kind)} size={34} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[1.5rem] font-bold leading-tight">{s.name}</span>
            {s.paused && <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[0.6875rem] font-bold text-coral">{t.aPaused}</span>}
          </span>
          <span className="block truncate text-[0.8125rem] text-muted">
            {s.goal ? `${stampsN(s.goal)} ← ${s.gift}` : t.aNoCard} · {t.aCreated} {when(s.created_at)}
          </span>
        </span>
      </div>

      <div className="mt-[1.6dvh] flex shrink-0 items-center gap-3 rounded-[1.25rem] bg-surface px-3.5 py-3 shadow-card">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9688rem] font-bold">{s.owner?.name || t.someone}</span>
          {s.owner?.phone && (
            <span dir="ltr" className="num inline-block text-[0.875rem] text-body">
              {pretty(s.owner.phone)}
            </span>
          )}
        </span>
        {s.owner?.phone && (
          <a href={`tel:+216${digits(s.owner.phone)}`} className="press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[0.875rem] font-bold text-brand">
            <Phone className="size-4" /> {t.aCall}
          </a>
        )}
      </div>

      {/* four numbers, one row */}
      <div className="mt-[1.6dvh] grid shrink-0 grid-cols-4 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[1rem] bg-surface px-1.5 py-2 text-center shadow-card">
            <Icon3D name={x.icon} size={22} className="mx-auto" />
            <p className="num mt-0.5 text-[1.125rem] font-bold leading-tight">{x.value}</p>
            <p className="truncate text-[0.6875rem] text-muted">{x.label}</p>
          </div>
        ))}
      </div>

      {/* the best customers, then the latest moments: one box, scrolling inside */}
      <div className="mt-[1.8dvh] min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
        {s.top.length === 0 && s.recent.length === 0 && <p className="p-4 text-center text-[0.9375rem] text-muted">{t.aNothing}</p>}
        {s.top.length > 0 && (
          <>
            <h2 className="sticky top-0 z-10 bg-surface/95 px-3.5 pb-1 pt-2.5 text-[0.8125rem] font-bold text-muted backdrop-blur">{t.aTop}</h2>
            <ul className="divide-y divide-line">
              {s.top.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5 px-3.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-[0.9062rem] font-medium">
                    {c.name ?? t.someone} {c.phone && <span dir="ltr" className="num inline-block text-[0.75rem] text-muted">{c.phone}</span>}
                  </span>
                  {c.gifts > 0 && (
                    <span className="num flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5 text-[0.75rem] font-bold text-coral">
                      <Gift className="size-3.5" /> {c.gifts}
                    </span>
                  )}
                  {(c.goal ?? s.goal) && (
                    <span className="num shrink-0 text-[0.8438rem] font-bold text-body">
                      {Math.min(c.stamps, c.goal ?? s.goal ?? 0)}/{c.goal ?? s.goal}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {s.recent.length > 0 && (
          <>
            <h2 className="sticky top-0 z-10 bg-surface/95 px-3.5 pb-1 pt-2.5 text-[0.8125rem] font-bold text-muted backdrop-blur">{t.aRecent}</h2>
            <ul className="divide-y divide-line">
              {s.recent.map((r, i) => (
                <li key={i} className="flex items-center gap-2.5 px-3.5 py-2">
                  <span className={`num grid size-7 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold ${r.kind === "stamp" ? "bg-brand-soft text-brand" : "bg-coral-soft text-coral"}`}>{r.kind === "stamp" ? "+1" : "🎁"}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem]">{r.name ?? (r.phone ? <span dir="ltr" className="num inline-block">{r.phone}</span> : t.someone)}</span>
                  <span className="num shrink-0 text-[0.7188rem] text-muted">{when(r.at)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AdminShopActions id={s.id} paused={s.paused} />
    </Screen>
  );
}
