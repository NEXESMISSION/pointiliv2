import "server-only";
import webPush from "web-push";
import { service } from "@/lib/supabase";

/** One notification: a title, a line, where a tap lands; `tag` folds repeats of the same kind into one. */
export type Note = { title: string; body: string; url: string; tag: string };

/** The keys are set once per process; without them (a machine without the pair) nothing is sent, quietly. */
let ready: boolean | null = null;
function vapid(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  ready = !!pub && !!priv;
  if (ready) webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@pointili.online", pub!, priv!);
  return ready;
}

/**
 * A word to a customer's phones: every device that said «إيه، فكّروني» gets
 * it. A device gone (its subscription dead: 404, 410) is forgotten. Returns
 * how many phones took it.
 */
export async function sendPush(userId: string, note: Note): Promise<number> {
  if (!vapid()) return 0;
  const { data: subs } = await service().from("push_subs").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webPush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(note), { TTL: 24 * 3600, urgency: "normal" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await service().from("push_subs").delete().eq("id", s.id);
      else console.error("[push]", code ?? (e as Error).message);
    }
  }
  return sent;
}
