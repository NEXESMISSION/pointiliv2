import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";
import { AdminBookAdd, AdminBookDelete, AdminFind, AdminRobots, AdminTester } from "@/components/AdminTools";
import { LogoutButton } from "@/components/LogoutButton";
import { getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { testerState } from "@/lib/tester";
import { monthsSaid, t } from "@/lib/t";

export const metadata = { title: "الأدوات" };

/** a line the founder wrote himself, either side */
type Hand = { id: number; side: "in" | "out"; on: string; amount: number; what: string; kind: string };
/** a shop's access turned on, with what came in */
type Sub = { id: number; at: string; kind: string; months: number | null; amount: number | null; shop: { name: string } };
type Ledger = { today: string; month: number; all: number; out_month: number; out_all: number; lines: Hand[]; rows: Sub[] };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
// 1 440, not 1440; 47,35 when there are millimes
const dt = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 3 }).format(Math.round(n * 1000) / 1000);

/** One of the tools: its name and a few words, open on a tap (closed, the page is a short list). */
function Part({ title, hint, open = false, children }: { title: string; hint?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-[1.125rem] bg-surface shadow-card ring-1 ring-line/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <b className="block text-[1rem] text-ink">{title}</b>
          {hint && <span className="block truncate text-[0.75rem] text-muted">{hint}</span>}
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}

/** A stretch of time: what is left once what went out is taken off, and both under it. */
function Period({ title, inn, out }: { title: string; inn: number; out: number }) {
  const left = inn - out;
  return (
    <div className="rounded-[0.875rem] bg-canvas/70 p-3">
      <p className="text-[0.75rem] font-semibold text-muted">{title}</p>
      <p className={`mt-1 text-[1.5rem] font-bold leading-none ${left > 0 ? "text-mint" : left < 0 ? "text-coral" : "text-ink"}`}>
        <bdi dir="ltr" className="num">{`${left > 0 ? "+" : left < 0 ? "−" : ""}${dt(Math.abs(left))}`}</bdi> <span className="text-[0.875rem] font-semibold text-muted">{t.payCurrency}</span>
      </p>
      <p className="mt-1.5 text-[0.75rem] text-muted">
        دخل {dt(inn)} · خرج {dt(out)}
      </p>
    </div>
  );
}

/**
 * Everything the founder does that is not about one shop, each closed until
 * he needs it: a new password for someone who forgot theirs, the money (and
 * a line in the books), the app's settings, the test account. Then the way
 * out.
 */
export default async function AdminTools() {
  const [settings, b, tester, robots] = await Promise.all([getSettings(true), call<Ledger>("admin_ledger"), testerState(), call<{ accounts: number }>("admin_robots")]);
  const books = b ?? { today: new Date().toISOString().slice(0, 10), month: 0, all: 0, out_month: 0, out_all: 0, lines: [], rows: [] };
  // the subscriptions paid and the lines by hand, in one order, the last ones
  const lines = [
    ...books.rows.filter((r) => r.amount).map((r) => ({ key: `s${r.id}`, at: r.at, side: "in" as const, what: `${r.shop.name} · ${r.months ? monthsSaid(r.months) : t.aBookKinds.sub}`, amount: r.amount ?? 0, hand: null as number | null })),
    ...books.lines.map((l) => ({ key: `h${l.id}`, at: l.on, side: l.side, what: `${l.what} · ${t.aBookKinds[l.kind] ?? ""}`, amount: Number(l.amount), hand: l.id })),
  ]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 12);
  const phone = tester.phone.length === 8 ? `${tester.phone.slice(0, 2)} ${tester.phone.slice(2, 5)} ${tester.phone.slice(5)}` : "—";

  return (
    <div className="space-y-3">
      <h1 className="text-[1.5rem] font-bold text-ink">الأدوات</h1>

      <Part title="كلمة سر جديدة" hint="واحد نسى كلمة السر متاعو: لوّج عليه بالاسم ولا بالنومرو" open>
        <AdminFind />
      </Part>

      <Part title="الفلوس" hint={`هالشهر: دخل ${dt(books.month)} · خرج ${dt(books.out_month)} ${t.payCurrency}`}>
        <div className="grid grid-cols-2 gap-2">
          <Period title="هالشهر" inn={books.month} out={books.out_month} />
          <Period title="من الأوّل" inn={books.all} out={books.out_all} />
        </div>
        <AdminBookAdd today={books.today} />
        {lines.length > 0 && (
          <ul className="divide-y divide-line/70">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-2 py-2 text-[0.8438rem]">
                <bdi dir="ltr" className={`num w-[4.75rem] shrink-0 text-start font-bold ${l.side === "in" ? "text-mint" : "text-coral"}`}>
                  {`${l.side === "in" ? "+" : "−"}${dt(l.amount)}`}
                </bdi>
                <span className="min-w-0 flex-1 truncate text-ink">
                  <bdi>{l.what}</bdi>
                </span>
                <span className="shrink-0 text-[0.75rem] text-muted">{day(l.at)}</span>
                {l.hand !== null && <AdminBookDelete id={l.hand} />}
              </li>
            ))}
          </ul>
        )}
      </Part>

      <Part title={t.aSettings} hint={t.aSettingsHint}>
        <AdminSettingsForm raw={settings.raw} />
      </Part>

      <Part
        title={t.aTester}
        hint={
          <>
            <bdi dir="ltr" className="num">
              {phone}
            </bdi>{" "}
            · {tester.state === "shop" ? t.aTesterShop : tester.state === "account" ? t.aTesterAccount : t.aTesterNone}
          </>
        }
      >
        {tester.state === "none" && !tester.canMake && <p className="rounded-[0.75rem] bg-brand-soft px-3 py-2 text-[0.8125rem] font-medium text-brand-deep">{t.aTesterNoAccount}</p>}
        {tester.ready ? <AdminTester /> : <p className="text-[0.875rem] text-coral">{t.aTesterMissing}</p>}
        <div className="border-t border-line/70 pt-3">
          <p className="mb-2 text-[0.75rem] text-muted">{t.aRobotsHint}</p>
          <AdminRobots left={robots?.accounts ?? 0} />
        </div>
      </Part>

      <LogoutButton className="mt-2" />
    </div>
  );
}
