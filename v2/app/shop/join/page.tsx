import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { HelpButton } from "@/components/Help";
import { JoinCode } from "@/components/JoinCode";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "كود التسجيل", robots: { index: false } };

/**
 * «كود التسجيل» (10 Nov 2026): the shop's static code, to print and leave on
 * the counter or the door — a customer scans it and makes an account, and the
 * shop's card is in their wallet, at zero. It never gives a tampon. Only for a
 * shop the founder turned it on for (the console's «كود التسجيل»); any other
 * shop goes back to «المحل», where there is no way in either.
 */
export default async function ShopJoin() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/join");
  if (!me.shop) redirect("/shop/setup");
  const [code, help] = await Promise.all([call<{ ok: boolean; on: boolean; token?: string; joined?: number; week?: number }>("my_join"), getHelp()]);
  if (!code?.on || !code.token) redirect("/shop/settings");
  const link = `${await siteOrigin()}/j/${code.token}`;
  const svg = await QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "H", color: { dark: "#0F0E17", light: "#FFFFFF" } });
  return (
    // shorter than a phone ever is (under 548px): the page scrolls as a whole, nothing is cut
    <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <div className="print:hidden">
        <Top back="/shop/settings" end={<HelpButton help={help} />} title={t.joinCodeTitle} hint={t.joinCodeHint} />
      </div>
      <JoinCode shop={me.shop} svg={svg} link={link} joined={code.joined ?? 0} week={code.week ?? 0} />
    </Screen>
  );
}
