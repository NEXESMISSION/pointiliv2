import { AdminMoney } from "@/components/AdminMoney";
import type { FixedCost, MoneyLine } from "@/lib/money";
import { payWayLabel } from "@/lib/plans";
import { call } from "@/lib/supabase";
import { monthsSaid, t } from "@/lib/t";

export const metadata = { title: "الفلوس" };

/** a line the founder wrote himself, either side */
type Hand = { id: number; side: "in" | "out"; on: string; amount: number; what: string; kind: string; fixed: number | null };
/** a shop's access turned on, with what came in */
type Sub = { id: number; at: string; kind: string; months: number | null; amount: number | null; method: string | null; shop: { id: string; name: string } };
type Ledger = { today: string; lines: Hand[]; rows: Sub[] };

const tunisDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The money, on its own page (the founder, 19 Nov 2026: «make sure the money has its own page, more filters,
 * something advanced, super clear, very modern», and «stuff I pay monthly, the fixed costs, with a countdown»).
 * Everything that came in — every subscription a shop paid, every line written by hand — and everything that
 * went out, as one list of days in Tunis, and the fixed costs with the day each is due. The page sums and
 * filters on the phone: one read, then no wait.
 */
export default async function Money() {
  const [books, fixed] = await Promise.all([call<Ledger>("admin_ledger"), call<FixedCost[]>("admin_fixed")]);
  const today = books?.today ?? tunisDay(new Date().toISOString());
  const lines: MoneyLine[] = [
    // what the shops paid (a month added for nothing is no money, and stays out)
    ...(books?.rows ?? [])
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({
        key: `s${r.id}`,
        day: tunisDay(r.at),
        side: "in" as const,
        amount: Number(r.amount),
        label: r.shop.name,
        detail: [r.months ? monthsSaid(r.months) : null, payWayLabel(r.method)].filter(Boolean).join(" · "),
        kind: "shop",
        hand: null,
        fixed: null,
      })),
    ...(books?.lines ?? []).map((l) => ({
      key: `h${l.id}`,
      day: l.on,
      side: l.side,
      amount: Number(l.amount),
      label: l.what,
      detail: t.aBookKinds[l.kind] ?? "",
      kind: l.kind,
      hand: l.id,
      fixed: l.fixed ?? null,
    })),
  ].sort((a, b) => b.day.localeCompare(a.day) || b.key.localeCompare(a.key));
  return <AdminMoney lines={lines} fixed={(fixed ?? []).map((f) => ({ ...f, amount: Number(f.amount), usd: f.usd == null ? null : Number(f.usd) }))} today={today} />;
}
