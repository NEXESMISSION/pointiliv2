import "server-only";
import { D } from "@/lib/draw";
import { sendPush } from "@/lib/push";
import { service } from "@/lib/supabase";
import { fill } from "@/lib/t";

/** a winner of a draw just made, to tell (draw_tell) */
type Told = { user_id: string; card: string | null; gift: string; shop: string; draw: string };

/**
 * The winners of the draws just made, told on their phones (9 Nov 2026): a draw is made by the first look after
 * its moment — whoever looks, the winners hear it then, each on their own phone, once (draw_tell marks a draw
 * told as it reads it: two looks at once never tell anyone twice). The daily job tells the ones nobody looked at.
 */
export async function tellWinners(): Promise<number> {
  const { data, error } = await service().rpc("draw_tell");
  if (error) {
    console.error("[draw_tell]", error.message);
    return 0;
  }
  let sent = 0;
  for (const w of (data ?? []) as Told[]) {
    sent += await sendPush(w.user_id, {
      title: fill(D.pushTitle, { gift: w.gift }),
      body: fill(D.pushBody, { shop: w.shop }),
      url: w.card ? `/c/${w.card}` : "/",
      tag: `draw-${w.draw}`,
    });
  }
  return sent;
}

/** a draw made within the hour: the look that saw it may be the one that made it — its winners told, if not yet */
export const justDrawn = (drawnAt: string | null | undefined, now: number) => !!drawnAt && now - Date.parse(drawnAt) < 3_600_000;
