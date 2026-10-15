import { redirect } from "next/navigation";
import { FirstLook } from "@/components/FirstLook";
import { getMe } from "@/lib/session";

export const metadata = { title: "هكّا يشوفها الحريف", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Tunis's hour now: 22:00 to 6:00 is the night, when the shop is shut. (It
 * was 19:00 to 8:00 at first: a café opened at 7:10 in the morning was told
 * its shop was shut — cafés open by six, and many shops close at ten.)
 */
const nightInTunis = () => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Tunis" }).format(new Date()));
  return h >= 22 || h < 6;
};

/** Step 3 of 3 for an owner: the customer's side, replayed — then the counter (or, at night, the morning). ?night=1 / 0 forces either (the checks). */
export default async function ShopStart({ searchParams }: { searchParams: Promise<{ night?: string }> }) {
  const [me, { night }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const s = me.shop;
  return <FirstLook shop={{ name: s.name, kind: s.kind, color: s.color, logo: s.logo, stamp_logo: s.stamp_logo, goal: s.goal, gift: s.gift }} night={night === "1" ? true : night === "0" ? false : nightInTunis()} />;
}
