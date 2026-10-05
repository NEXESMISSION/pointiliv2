import { NextResponse } from "next/server";
import { getMe } from "@/lib/session";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/**
 * The owner's card as the database has it now. The card's screen asks when a
 * save's answer is slow to come back: was it saved, or not?
 */
export async function GET() {
  const shop = (await getMe())?.shop;
  if (!shop) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  return NextResponse.json({ ok: true, goal: shop.goal, gift: shop.gift, gap: shop.stamp_gap ?? 60, color: shop.color }, { headers: noStore });
}
