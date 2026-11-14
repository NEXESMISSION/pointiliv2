import { redirect } from "next/navigation";
import { HelpButton } from "@/components/Help";
import { PosterStudio } from "@/components/PosterStudio";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { kindIcon, stampsN, t } from "@/lib/t";

export const metadata = { title: "كود التسجيل", robots: { index: false } };

/**
 * «كود التسجيل» (10 Nov 2026): the shop's static code, to print and leave on the counter or the door, or to post
 * — a customer scans it and makes an account, and the shop's card is in their wallet, at zero. It never gives a
 * tampon. Since 13 Nov 2026 it is a poster (components/PosterStudio, lib/poster): three sizes, three looks,
 * downloaded, sent or printed. Only for a shop the founder turned it on for (the console's «كود التسجيل»); any
 * other shop goes back to «المحل», where there is no way in either.
 */
export default async function ShopJoin() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/join");
  if (!me.shop) redirect("/shop/setup");
  const [code, help] = await Promise.all([call<{ ok: boolean; on: boolean; token?: string; joined?: number; week?: number }>("my_join"), getHelp()]);
  if (!code?.on || !code.token) redirect("/shop/settings");
  const shop = me.shop;
  const link = `${await siteOrigin()}/j/${code.token}`;
  // what the customer gets, said the way the card works: a turn of the roulette, or the card's gift
  const offer = shop.wheel_on ? `${stampsN(shop.goal ?? 10)} = دورة في الروليت` : `${stampsN(shop.goal ?? 10)} = ${shop.gift ?? ""}`;
  const steps = ["سكاني الكود", "اعمل الكونت", "تامبون في كل زيارة"];
  return (
    <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <Top back="/shop/settings" end={<HelpButton help={help} />} title={t.joinCodeTitle} hint="الحريف يسكانيه وياخو الكارط متاعك" />
      <PosterStudio
        shop={{ name: shop.name, color: shop.color, logo: shop.logo ?? null, icon: kindIcon(shop.kind) }}
        link={link}
        offer={offer}
        steps={steps}
        joined={code.joined ?? 0}
        week={code.week ?? 0}
      />
    </Screen>
  );
}
