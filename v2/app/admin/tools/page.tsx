import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { AdminClock } from "@/components/AdminClock";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";
import { AdminFind, AdminRobots, AdminTester } from "@/components/AdminTools";
import { LogoutButton } from "@/components/LogoutButton";
import { getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { testerState } from "@/lib/tester";
import { t } from "@/lib/t";

export const metadata = { title: "الأدوات" };

/** this month, in and out (the whole books are on /admin/money) */
type Ledger = { month: number; out_month: number };

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

/**
 * Everything the founder does that is not about one shop, each closed until
 * he needs it: a new password for someone who forgot theirs, the money (and
 * a line in the books), the app's settings, the test account. Then the way
 * out.
 */
export default async function AdminTools({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, settings, b, tester, robots] = await Promise.all([searchParams, getSettings(true), call<Ledger>("admin_ledger"), testerState(), call<{ accounts: number }>("admin_robots")]);
  const books = b ?? { month: 0, out_month: 0 };
  const phone = tester.phone.length === 8 ? `${tester.phone.slice(0, 2)} ${tester.phone.slice(2, 5)} ${tester.phone.slice(5)}` : "—";

  return (
    <div className="space-y-3">
      <h1 className="text-[1.5rem] font-bold text-ink">الأدوات</h1>

      <Part title="كلمة سر جديدة" hint="واحد نسى كلمة السر متاعو: لوّج عليه بالاسم ولا بالنومرو" open>
        <AdminFind initial={String(q ?? "").replace(/\D/g, "").slice(0, 11)} />
      </Part>

      {/* the money has its own page since 19 Nov 2026 (/admin/money): the books, the fixed costs, the filters */}
      <Link href="/admin/money" className="press flex items-center gap-3 rounded-[1.125rem] bg-surface px-4 py-3.5 shadow-card ring-1 ring-line/70">
        <span className="min-w-0 flex-1">
          <b className="block text-[1rem] text-ink">الفلوس</b>
          <span className="block truncate text-[0.75rem] text-muted">{`هالشهر: دخل ${dt(books.month)} · خرج ${dt(books.out_month)} ${t.payCurrency}`}</span>
        </span>
        <ChevronLeft className="size-5 shrink-0 text-muted" />
      </Link>

      {/* the card's clock, for every shop at once: off until the founder turns it on (components/AdminClock) */}
      <Part title="الكارط ترجع للصفر" hint={settings.raw.clock_on === "1" ? "يخدم للمحلات الكل" : "مطفي للكل"}>
        <AdminClock on={settings.raw.clock_on === "1"} />
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
