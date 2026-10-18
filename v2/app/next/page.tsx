import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { NextHome } from "@/components/next/Home";
import { siteOrigin } from "@/lib/origin";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import type { CardView } from "@/lib/types";

export const metadata = { title: "Pointili", robots: { index: false } };

/** The new customer home: the cards, and the one thing a customer came to do. */
export default async function NextCustomerHome() {
  const me = await getMe();
  if (!me) redirect("/login?next=/next");
  const cards = (await call<CardView[]>("wallet")) ?? [];
  // the person's own code, drawn once here: it is the same at every counter, so
  // opening a card never waits on the server to draw it
  const svg = me.code
    ? await QRCode.toString(`${await siteOrigin()}/u/${me.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } })
    : null;
  return <NextHome name={me.name ?? ""} code={me.code ?? null} svg={svg} cards={cards} />;
}
