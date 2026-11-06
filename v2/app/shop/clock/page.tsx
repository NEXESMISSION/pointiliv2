import { redirect } from "next/navigation";
import { Check, Hourglass } from "lucide-react";
import { ClockControls } from "@/components/ClockControls";
import { ClockDays } from "@/components/ClockDays";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { daysN, fill, t } from "@/lib/t";

export const dynamic = "force-dynamic";
export const metadata = { title: "الكارط ترجع للصفر", robots: { index: false } };

type Clock = { ok: boolean; days: number | null; paused: boolean; running: boolean; soon: number; taken: number; taken_stamps: number };

/**
 * The card's clock, all of it on one page (the founder, 7 Nov 2026: «a way to pause it so he does not
 * mess it up, and safeguards for the owner and his customers»): how it stands, the pause, the days
 * changed or the clock taken off, what it takes soon and what it took lately (given back in a tap), and
 * what protects every customer. Only while the founder's switch is on: off, there is no clock to show.
 */
export default async function ShopClock() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  if (!me.shop.clock_on || me.shop.store_on) redirect("/shop/settings");
  const c = await call<Clock>("my_clock");

  const safe = [t.clockSafe1, t.clockSafe2, t.clockSafe3, t.clockSafe4, t.clockSafe5];
  return (
    <Screen>
      <Top back="/shop/settings" title={t.clockTitle} />
      {!c?.ok ? (
        <p className="mt-8 text-center text-[0.9375rem] text-muted">{t.errNetwork}</p>
      ) : !c.days ? (
        // no clock (every shop until its owner turns it on): what it would do, the days, and the one button
        <section className="mt-[3dvh] flex shrink-0 flex-col items-center rounded-[1.5rem] bg-surface px-4 py-5 text-center shadow-card">
          <Icon3D name="hourglass" size={56} />
          <h2 className="mt-2.5 text-[1.25rem] font-bold">{t.clockOffTitle}</h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{t.clockOffBody}</p>
          <div className="mt-3.5 w-full">
            <ClockDays current={null} />
          </div>
        </section>
      ) : (
        <>
          {/* how it stands: the days, and whether it runs, is paused, or waits for the shop itself */}
          <section className="mt-[2dvh] flex shrink-0 items-center gap-3.5 rounded-[1.5rem] bg-[linear-gradient(140deg,#8f75ff_0%,#6c47ff_55%,#4a2ad6_100%)] p-4 text-white shadow-[0_18px_40px_-20px_rgb(74_42_214/0.9)]">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/18">
              <Hourglass className="size-7" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1.25rem] font-bold leading-tight">{fill(t.clockEvery, { days: daysN(c.days) })}</span>
              <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${c.paused ? "bg-coral text-white" : c.running ? "bg-white text-brand" : "bg-white/20 text-white"}`}>
                {c.paused ? t.clockPausedChip : c.running ? t.clockRunning : t.clockWaiting}
              </span>
            </span>
          </section>
          <ClockControls clock={{ days: c.days, paused: c.paused, soon: c.soon, taken: c.taken, taken_stamps: c.taken_stamps }} />
        </>
      )}

      {/* what protects every customer, said plainly */}
      <section className="mb-[2dvh] mt-[2dvh] shrink-0 rounded-[1.375rem] bg-surface px-3.5 py-3 shadow-card">
        <h2 className="text-[0.9375rem] font-bold">{t.clockSafe}</h2>
        <ul className="mt-2 space-y-2">
          {safe.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[0.8125rem] leading-snug text-body">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-mint-soft text-mint">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {line}
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
