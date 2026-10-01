import { notFound, redirect } from "next/navigation";
import { Gift, Phone } from "lucide-react";
import { AdminShopActions } from "@/components/AdminShopActions";
import { Pass } from "@/components/Pass";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { kindIcon, t } from "@/lib/t";

export const metadata = { title: "محل", robots: { index: false } };

type Shop = {
  id: string; name: string; kind: string; color: string; goal: number | null; gift: string | null; paused: boolean; created_at: string;
  owner: { name: string; phone: string | null } | null;
  customers: number; stamps: number; today: number; given: number; waiting: number;
  recent: { at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; phone: string | null }[];
  top: { name: string | null; phone: string | null; stamps: number; gifts: number; goal: number | null }[];
};

const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** One shop, as the founder sees it: its card, its numbers, its people, and the two switches. */
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
    <Screen className="pb-10">
      <Top back="/admin" title={s.name} hint={`${t.kinds[s.kind] ?? ""} · ${t.aCreated} ${when(s.created_at)}`} />

      <div className="mt-5">
        {s.goal ? (
          <Pass shop={s} stamps={0} />
        ) : (
          <div className="flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-card">
            <Icon3D name={kindIcon(s.kind)} size={36} />
            <span className="text-[15px] font-semibold text-muted">{t.aNoCard}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-card">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-muted">{t.aOwner}</span>
          <span className="mt-0.5 block truncate text-[17px] font-bold">{s.owner?.name || t.someone}</span>
          {s.owner?.phone && (
            <span dir="ltr" className="num inline-block text-[15px] text-body">
              {pretty(s.owner.phone)}
            </span>
          )}
        </span>
        {s.owner?.phone && (
          <a href={`tel:+216${digits(s.owner.phone)}`} className="press flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-4 text-[14.5px] font-bold text-brand">
            <Phone className="size-4" /> {t.aCall}
          </a>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[20px] bg-surface p-3 shadow-card">
            <Icon3D name={x.icon} size={26} />
            <p className="num mt-0.5 text-[22px] font-bold">{x.value}</p>
            <p className="truncate text-[12.5px] text-muted">{x.label}</p>
          </div>
        ))}
      </div>

      {s.top.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 px-0.5 text-[16px] font-bold">{t.aTop}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
            {s.top.map((c, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {c.name ?? t.someone} {c.phone && <span dir="ltr" className="num inline-block text-[12.5px] text-muted">{c.phone}</span>}
                </span>
                {c.gifts > 0 && (
                  <span className="num flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-[12.5px] font-bold text-coral">
                    <Gift className="size-3.5" /> {c.gifts}
                  </span>
                )}
                {(c.goal ?? s.goal) && (
                  <span className="num shrink-0 text-[14px] font-bold text-body">
                    {Math.min(c.stamps, c.goal ?? s.goal ?? 0)}/{c.goal ?? s.goal}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.recent.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 px-0.5 text-[16px] font-bold">{t.aRecent}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
            {s.recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`num grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${r.kind === "stamp" ? "bg-brand-soft text-brand" : "bg-coral-soft text-coral"}`}>{r.kind === "stamp" ? "+1" : "🎁"}</span>
                <span className="min-w-0 flex-1 truncate text-[14.5px]">{r.name ?? (r.phone ? <span dir="ltr" className="num inline-block">{r.phone}</span> : t.someone)}</span>
                <span className="num shrink-0 text-[12px] text-muted">{when(r.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdminShopActions id={s.id} paused={s.paused} />
    </Screen>
  );
}
