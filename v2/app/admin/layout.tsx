import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ConsoleNav } from "@/components/ConsoleNav";
import { getMe } from "@/lib/session";

export const metadata = { robots: { index: false } };

/**
 * The founder's console.
 *
 * It is the one place in Pointili made for a screen, not a phone: a rail that
 * never moves on the start side, and one wide column of work beside it that
 * scrolls on its own. Under 1024px the rail lies down on top as a strip, so
 * the console still opens on a phone — it is simply not what it is for.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/admin");
  if (!me.admin) redirect("/");

  return (
    <div data-console className="min-h-dvh bg-canvas lg:flex">
      <aside className="z-10 shrink-0 border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-[15rem] lg:border-b-0 lg:border-s lg:border-e lg:border-s-transparent">
        {/* on a phone, a strip that scrolls sideways: a list, not the page */}
        <div data-list className="flex items-center gap-3 overflow-x-auto px-4 py-3 lg:h-full lg:flex-col lg:items-stretch lg:overflow-visible lg:px-3 lg:py-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 px-1 text-[1.1875rem] font-bold text-ink lg:mb-5" dir="ltr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.svg" alt="" width={32} height={23} style={{ width: "2rem", height: "1.4375rem" }} />
            Pointili
          </Link>

          <ConsoleNav />

          <div className="ms-auto flex shrink-0 items-center gap-2 lg:ms-0 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-1">
            <Link href="/me" className="flex h-10 items-center gap-2.5 rounded-[0.75rem] px-3 text-[0.875rem] font-semibold text-body transition-colors hover:bg-canvas">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[0.75rem] font-bold text-white">{(me.name?.[0] ?? "A").toUpperCase()}</span>
              <span className="hidden min-w-0 truncate lg:block">{me.name || "الأدمين"}</span>
            </Link>
            <Link href="/" className="flex h-10 items-center gap-2.5 rounded-[0.75rem] px-3 text-[0.875rem] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink">
              <ExternalLink className="size-4 shrink-0" />
              <span className="hidden lg:block">الأبليكاسيون</span>
            </Link>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[80rem]">{children}</div>
      </main>
    </div>
  );
}
