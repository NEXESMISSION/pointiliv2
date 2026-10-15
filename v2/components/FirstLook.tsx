"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PushAsk } from "@/components/PushAsk";
import { useScreen } from "@/components/Tracker";
import { TryIt, type DemoShop } from "@/components/TryIt";
import { Icon3D } from "@/components/ui";
import { pixelOnce } from "@/lib/pixel";
import { fill, t } from "@/lib/t";

/** The three steps over the dark screen: all three lit, the last one long. */
function Bars() {
  return (
    <div className="mb-5 flex w-full max-w-[19rem] gap-1.5" aria-label="3/3">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i === 3 ? "bg-white" : "bg-white/45"}`} />
      ))}
    </div>
  );
}

/**
 * A new owner's third step: the customer's side, replayed in four beats on
 * their own phone (a phone cannot scan its own screen) — then the counter,
 * where the code is. Opened at night (`night`: 22:00 to 6:00 in Tunis), the
 * shop is shut and nobody is there to scan it: the last word is for the
 * morning instead — put the phone on the counter and give the first tampon —
 * with the offer to be reminded then.
 */
export function FirstLook({ shop, night }: { shop: DemoShop; night: boolean }) {
  const router = useRouter();
  const [over, setOver] = useState(false);
  useScreen(over ? "start-night" : "start");
  // the card is made: for Facebook's pixel, the owner is in for real
  useEffect(() => pixelOnce("CardCreated"), []);
  const done = useCallback(() => (night ? setOver(true) : router.push("/shop/qr?tip=1")), [night, router]);

  if (!over) return <TryIt shop={shop} onClose={done} finish={night ? t.next : t.startDone} top={<Bars />} />;

  return (
    <main className="safe-t safe-b fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center bg-ink/95 px-5 text-center text-white">
      <Bars />
      <Icon3D name="bell" size={72} className="animate-float" />
      <h1 className="mt-3 text-balance text-[1.5rem] font-bold leading-tight">{t.nightTitle}</h1>
      <p className="mt-2 max-w-[20rem] text-balance text-[0.9375rem] leading-relaxed text-white/80">{t.nightBody}</p>
      <div className="mt-4 w-full max-w-[20rem] text-ink">
        <PushAsk shop={shop.name} title={t.pushOwnerAskTitle} body={fill(t.pushOwnerAskBody, { shop: shop.name })} compact />
      </div>
      <Link href="/shop" className="press mt-5 flex h-12 w-full max-w-[19rem] items-center justify-center rounded-full bg-white text-[0.9375rem] font-bold text-ink">
        {t.nightOk}
      </Link>
      <Link href="/shop/qr?tip=1" className="press mt-1 flex h-11 items-center px-4 text-[0.9375rem] font-semibold text-white/75">
        {t.nightCode}
      </Link>
    </main>
  );
}
