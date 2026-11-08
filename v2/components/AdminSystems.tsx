"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { ShopMark } from "@/components/ShopMark";
import { D } from "@/lib/draw";

/** a shop and its systems (admin_systems_all) */
export type SystemsRow = {
  id: string;
  name: string;
  kind: string;
  color: string;
  logo: string | null;
  card: boolean;
  paused: boolean;
  paid: boolean;
  shut: boolean;
  wheel: boolean;
  wheel_on: boolean;
  store: boolean;
  items: boolean;
  export: boolean;
  links: boolean;
  links_made: number;
  draw: boolean;
  draw_open: string | null;
  week: number;
};

/** the systems, one by one: its name, which shops have it, and the chip a shop's line wears for it */
const SYSTEMS: { key: string; label: string; has: (s: SystemsRow) => boolean; tone: string }[] = [
  { key: "card", label: "الكارط (تامبون)", has: (s) => s.card && !s.store, tone: "bg-brand-soft text-brand" },
  { key: "wheel", label: "الروليت", has: (s) => s.wheel_on, tone: "bg-[#fde7f3] text-[#be185d]" },
  { key: "store", label: "الماغازة", has: (s) => s.store, tone: "bg-mint-soft text-mint" },
  { key: "draw", label: D.name, has: (s) => s.draw, tone: "bg-[#fff2c7] text-[#8a5a00]" },
  { key: "links", label: "تامبون برابط", has: (s) => s.links, tone: "bg-[#e0f2fe] text-[#0369a1]" },
  { key: "items", label: "شنوّة يبيع", has: (s) => s.items, tone: "bg-canvas text-body" },
  { key: "export", label: "تحميل البيانات", has: (s) => s.export, tone: "bg-canvas text-body" },
];

/**
 * The console's «الأنظمة» (8 Nov 2026, the founder: «separate the systems — all managed by the admin,
 * depending on the client»): how many shops have each system, the shops of one system at a tap, and
 * every shop's line with the systems it has — a tap opens the shop, where its switches are.
 */
export function AdminSystems({ shops }: { shops: SystemsRow[] }) {
  const [only, setOnly] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(false);
  const list = useMemo(() => {
    const sys = SYSTEMS.find((x) => x.key === only);
    const needle = q.trim().toLowerCase();
    return shops.filter((s) => (!sys || sys.has(s)) && (!active || s.week > 0) && (!needle || s.name.toLowerCase().includes(needle)));
  }, [shops, only, q, active]);

  return (
    <div className="space-y-3">
      <h1 className="text-[1.375rem] font-bold">الأنظمة</h1>
      {/* how many shops have each system (the ones with a tampon this week, beside) — a tap shows only them */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SYSTEMS.map((x) => {
          const all = shops.filter(x.has);
          const on = only === x.key;
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => setOnly(on ? null : x.key)}
              aria-pressed={on}
              className={`rounded-[1rem] p-3 text-start shadow-card transition-colors ${on ? "bg-ink text-white" : "bg-surface"}`}
            >
              <b className="num block text-[1.5rem] font-bold leading-tight">{all.length}</b>
              <span className={`block truncate text-[0.8125rem] font-semibold ${on ? "text-white/85" : "text-muted"}`}>{x.label}</span>
              <span className={`block text-[0.6875rem] ${on ? "text-white/70" : "text-faint"}`}>{all.filter((s) => s.week > 0).length} خدّامين الجمعة هذي</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-3.5 shadow-card">
          <Search className="size-4 shrink-0 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="إسم المحل" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none" />
        </label>
        <button type="button" onClick={() => setActive(!active)} aria-pressed={active} className={`h-10 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-bold shadow-card ${active ? "bg-ink text-white" : "bg-surface text-body"}`}>
          خدّامين برك
        </button>
      </div>

      <p className="px-1 text-[0.8125rem] text-muted">
        {list.length} محل{only ? ` · ${SYSTEMS.find((x) => x.key === only)?.label}` : ""}
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-[1.125rem] bg-surface shadow-card">
        {list.slice(0, 200).map((s) => (
          <li key={s.id}>
            <Link href={`/admin/shop/${s.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-canvas">
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: s.color }}>
                <ShopMark shop={s} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <b className="truncate text-[0.9375rem] text-ink">{s.name}</b>
                  {s.paid && <span className="shrink-0 rounded-full bg-mint-soft px-1.5 text-[0.625rem] font-bold text-mint">خالص</span>}
                  {(s.paused || s.shut) && <span className="shrink-0 rounded-full bg-coral-soft px-1.5 text-[0.625rem] font-bold text-coral">{s.paused ? "موقوف" : "مسكّر"}</span>}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {SYSTEMS.filter((x) => x.has(s)).map((x) => (
                    <span key={x.key} className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${x.tone}`}>
                      {x.key === "links" && s.links_made ? `${x.label} (${s.links_made})` : x.key === "draw" && s.draw_open ? `${x.label} ⏳` : x.label}
                    </span>
                  ))}
                </span>
              </span>
              <span className="num shrink-0 text-end text-[0.75rem] text-muted">
                <b className="block text-[0.9375rem] text-ink">{s.week}</b>
                تامبون
              </span>
              <ChevronLeft className="size-4 shrink-0 text-faint" />
            </Link>
          </li>
        ))}
      </ul>
      {list.length > 200 && <p className="text-center text-[0.8125rem] text-muted">… و{list.length - 200} آخرين: لوّج بالإسم</p>}
    </div>
  );
}
