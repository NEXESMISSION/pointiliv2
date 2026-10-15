import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Wallet } from "@/components/Wallet";
import { JsonLd } from "@/components/SiteFrame";
import { Welcome } from "@/components/Welcome";
import { getMe, homeOf } from "@/lib/session";
import { faqJsonLd, FAQ, orgJsonLd } from "@/lib/seo";
import { getHelp, getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";
import type { CardView } from "@/lib/types";

/** Facebook's check that the domain is Pointili's reads its code here, on the front door (set in the console). */
export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getSettings();
  return meta.domainCode ? { other: { "facebook-domain-verification": meta.domainCode } } : {};
}

const fromAd = (q: Record<string, string | string[] | undefined>) => !!(q.fbclid || q.utm_source || q.utm_campaign);

/** Home: the welcome for a stranger, the counter for a shop, the wallet for a customer. */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await getMe();
  if (!me) {
    const [help, settings, q] = await Promise.all([getHelp(), getSettings(), searchParams]);
    return (
      <>
        <JsonLd data={orgJsonLd(settings.supportPhone, settings.social)} />
        <JsonLd data={faqJsonLd(FAQ.slice(0, 5).flatMap((f) => [{ q: f.q, a: f.a }, f.fr]))} />
        {/* somebody who has signed in on this phone before is offered the way back in first */}
        {/* from an ad (Facebook's click id, or the ad's utm): an owner, most likely — the shop's door alone */}
        <Welcome video={help.video1} known={(await cookies()).get("pl-known")?.value === "1"} ad={fromAd(q)} client={"client" in q} />
      </>
    );
  }
  if (me.shop) redirect(homeOf(me));
  const cards = (await call<CardView[]>("wallet")) ?? [];
  return <Wallet me={me} cards={cards} />;
}
