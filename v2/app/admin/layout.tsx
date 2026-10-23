import { redirect } from "next/navigation";
import { AdminMain, AdminNav } from "@/components/AdminNav";
import { FounderMark } from "@/components/FounderMark";
import { getMe } from "@/lib/session";

export const metadata = { robots: { index: false } };

/**
 * The founder's console (remade 23 Oct 2026). The founder: «so much data,
 * browsing so slow, and I don't like it on the phone». Made for the phone
 * first — one column, a thin bar on top: the shops and their subscriptions,
 * the tools (⚙), the way back to the app — except a shop's whole page,
 * which is read on a computer and takes the width of the screen.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/admin");
  if (!me.admin) redirect("/");

  return (
    <div data-console className="min-h-dvh bg-canvas">
      <AdminNav />
      <AdminMain>{children}</AdminMain>
      <FounderMark />
    </div>
  );
}
