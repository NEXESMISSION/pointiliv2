import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Settings } from "lucide-react";
import { FounderMark } from "@/components/FounderMark";
import { getMe } from "@/lib/session";

export const metadata = { robots: { index: false } };

/**
 * The founder's console (remade 23 Oct 2026). The founder: «so much data,
 * browsing so slow, and I don't like it on the phone». Now it is made for the
 * phone first: one column, a thin bar on top — the shops, the tools (⚙), the
 * way back to the app — and nothing else on the way.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/admin");
  if (!me.admin) redirect("/");

  return (
    <div data-console className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-surface/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-[46rem] items-center gap-2 px-4">
          <Link href="/admin" className="flex items-center gap-2" dir="ltr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.svg" alt="" width={28} height={20} style={{ width: "1.75rem", height: "1.25rem" }} />
            <span className="text-[1.0625rem] font-bold text-ink">Pointili</span>
            <span className="rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold text-white">admin</span>
          </Link>
          <Link href="/admin/tools" aria-label="الأدوات" className="ms-auto grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink">
            <Settings className="size-5" />
          </Link>
          <Link href="/" aria-label="ارجع للأبليكاسيون" className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink">
            <ArrowUpRight className="size-5" />
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[46rem] px-4 pb-16 pt-4">{children}</main>
      <FounderMark />
    </div>
  );
}
