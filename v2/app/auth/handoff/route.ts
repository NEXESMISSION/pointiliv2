import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * The way out of Facebook's browser, signed in. Inside Facebook, «افتحها في
 * Chrome» asks the server for a one-time sign-in (handoffPath in
 * app/actions.ts) and opens Chrome here with it: the session is made in this
 * new browser and the owner lands where they were going — no phone and
 * password to type again (three of the first five owners of 15 Oct had to,
 * and two got it wrong). Used once; a link used or too old just leads to
 * the sign-in, with the way on kept.
 */
export async function GET(request: NextRequest) {
  const th = request.nextUrl.searchParams.get("th") ?? "";
  const raw = request.nextUrl.searchParams.get("next") ?? "/";
  // only paths inside the app
  const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
  if (/^[A-Za-z0-9_-]{20,200}$/.test(th)) {
    const { error } = await (await db()).auth.verifyOtp({ token_hash: th, type: "magiclink" });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url));
}
