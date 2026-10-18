import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ConsoleNav } from "@/components/ConsoleNav";
import { FounderMark } from "@/components/FounderMark";
import { LogoutButton } from "@/components/LogoutButton";
import { getMe } from "@/lib/session";

export const metadata = { robots: { index: false } };

/**
 * The founder's console.
 *
 * It is the one place in Pointili made for a screen, not a phone: a white rail
 * that never moves on the start side — the places, then the founder himself at
 * its foot — and one wide column of work beside it, on the soft grey, that
 * scrolls on its own. Under 1024px the rail lies down on top as a strip, so
 * the console still opens on a phone — it is simply not what it is for.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/admin");
  if (!me.admin) redirect("/");

  return (
    <div data-console className="min-h-dvh bg-canvas lg:flex">
      <aside className="z-10 shrink-0 border-b border-line/80 bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-[16rem] lg:border-b-0 lg:border-e">
        {/* on a phone, a strip that scrolls sideways: a list, not the page */}
        <div data-list className="flex items-center gap-3 overflow-x-auto px-4 py-3 lg:h-full lg:flex-col lg:items-stretch lg:overflow-y-auto lg:overflow-x-visible lg:px-4 lg:py-5">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5 px-2 lg:mb-6" dir="ltr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.svg" alt="" width={32} height={23} style={{ width: "2rem", height: "1.4375rem" }} />
            <span className="text-[1.1875rem] font-bold text-ink">Pointili</span>
            <span className="rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold text-white">admin</span>
          </Link>

          <ConsoleNav />

          {/* the founder himself, and the way back to the app */}
          <div className="ms-auto flex shrink-0 items-center gap-2 lg:ms-0 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-1 lg:border-t lg:border-line lg:pt-3">
            <Link href="/me" className="flex h-11 items-center gap-2.5 rounded-[0.75rem] px-2.5 text-[0.875rem] transition-colors hover:bg-canvas">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[0.8125rem] font-bold text-white">{(me.name?.[0] ?? "A").toUpperCase()}</span>
              <span className="hidden min-w-0 lg:block">
                <span className="block truncate font-bold text-ink">{me.name || "إنت"}</span>
                <span className="block text-[0.75rem] text-muted">الكونت متاعي</span>
              </span>
            </Link>
            <Link href="/" className="flex h-10 items-center gap-2.5 rounded-[0.75rem] px-3 text-[0.875rem] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink">
              <ArrowUpRight className="size-4 shrink-0" />
              <span className="hidden lg:block">ارجع للأبليكاسيون</span>
            </Link>
            {/* the way out: the console had none, so leaving it meant finding «اخرج» on a phone screen */}
            <LogoutButton kind="rail" className="" />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[84rem]">{children}</div>
      </main>
      <FounderMark />
    </div>
  );
}
