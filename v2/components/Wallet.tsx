import QRCode from "qrcode";
import { Cards } from "@/components/Cards";
import { Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import type { Me } from "@/lib/session";
import { call } from "@/lib/supabase";
import type { CardView } from "@/lib/types";

/**
 * The customer's cards, fetched: the cards themselves and the person's own
 * code, drawn once here — it is the same code at every counter, so opening a
 * card never waits on a server to draw one.
 *
 * It is its own component and not part of the two pages that show it (`/` for
 * a customer, `/wallet` for an owner who shops elsewhere too) so that both can
 * put it behind a Suspense of their own: the screen's shape paints at once and
 * the cards arrive into it, instead of a white page while they are asked for.
 * The look itself is components/Cards.tsx.
 */
export async function Wallet({ me, back }: { me: Me; back?: string }) {
  const cards = (await call<CardView[]>("wallet")) ?? [];
  const svg = me.code
    ? await QRCode.toString(`${await siteOrigin()}/u/${me.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } })
    : null;
  return <Cards me={me.id} name={me.name ?? ""} code={me.code ?? null} svg={svg} cards={cards} seen={me.seen ?? []} passwordSet={me.password_set !== false} back={back} />;
}

/**
 * Arriving is never a blank screen: the shape of the cards screen, in grey,
 * while they come. With the links around it prefetched it is rarely seen —
 * which is the point, since the one thing worse than waiting is not knowing
 * you are.
 */
export function WalletWait() {
  return (
    <Screen className="animate-pulse">
      <div className="flex shrink-0 items-center justify-between pt-2" aria-hidden>
        <span className="size-11 rounded-full bg-surface" />
        <span className="h-4 w-20 rounded-full bg-surface" />
      </div>
      <div className="mt-[2dvh] min-h-0 flex-1 space-y-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[4.5rem] rounded-[1.5rem] bg-surface" />
        ))}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 pb-[2dvh] pt-[1.5dvh]">
        <span className="h-[3.5rem] rounded-[1.25rem] bg-surface" />
        <span className="h-[3.5rem] rounded-[1.25rem] bg-surface" />
      </div>
    </Screen>
  );
}
