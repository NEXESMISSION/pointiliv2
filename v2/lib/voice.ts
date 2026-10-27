import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getMe } from "@/lib/session";
import { service } from "@/lib/supabase";

/*
 * The founder's voice notes on a shop (27 Oct 2026: «notes as a vocal, but
 * super secure — I don't want to get hacked one day and all the vocals get
 * out»). Each lock is its own, so one that gives does not open the rest:
 *
 *  1. Sealed here, on the server, before the sound leaves it: AES-256-GCM,
 *     a fresh nonce each time, the note's id bound in (a file moved under
 *     another note's name does not open). The key (VOICE_KEY) lives only in
 *     the server's environment — Vercel marks it sensitive, the repository
 *     and the database never hold it. A copy of the database or of the
 *     bucket is noise without it.
 *  2. Kept in a private bucket («voices», scripts/db.mjs makes it private on
 *     every run): no address opens a file, no account is let in — only this
 *     server, with the service key.
 *  3. Every way in asks twice: the signed-in person is an admin (here), and
 *     the database's own functions refuse anybody else (require_admin).
 *  4. Played through the server only, to the founder's own page: no link to
 *     a file anywhere, nothing kept by the browser or on the way.
 */

export const BUCKET = "voices";
/** the longest a note may be, and the most a sealed note may weigh */
export const MAX_SECS = 180;
export const MAX_BYTES = 3_000_000;
/** the sounds a phone records in (Chrome and Android: webm/ogg; Safari: mp4) */
export const MIMES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/aac", "audio/mpeg"] as const;

// the file: what it is (and which key sealed it, for the day it changes), the nonce, the tag, the sound
const MAGIC = Buffer.from("PV1");
const IV = 12;
const TAG = 16;

function key(): Buffer {
  const k = Buffer.from(process.env.VOICE_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("VOICE_KEY is missing or not 32 bytes");
  return k;
}

/** The sound sealed under its note's id. */
export function seal(id: string, sound: Buffer): Buffer {
  const iv = randomBytes(IV);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(id, "utf8"));
  const body = Buffer.concat([c.update(sound), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}

/** The sound back, or a throw: a file touched, under another id, or sealed with another key never opens. */
export function unseal(id: string, file: Buffer): Buffer {
  if (file.length < MAGIC.length + IV + TAG || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("not a sealed voice note");
  const at = MAGIC.length;
  const d = createDecipheriv("aes-256-gcm", key(), file.subarray(at, at + IV));
  d.setAuthTag(file.subarray(at + IV, at + IV + TAG));
  d.setAAD(Buffer.from(id, "utf8"));
  return Buffer.concat([d.update(file.subarray(at + IV + TAG)), d.final()]);
}

/** where a note's sealed file lies in the bucket: by its id alone (no shop, no date in the name) */
export const pathOf = (id: string) => `v/${id}`;

/** The bucket, as the server alone reaches it. */
export const store = () => service().storage.from(BUCKET);

/** Only the founder (an admin, signed in): null for anybody else. */
export async function founder() {
  const me = await getMe();
  return me?.admin ? me : null;
}

/** A request that comes from our own pages — not a form or a script on another site carrying the founder's cookies. */
export function ours(req: Request): boolean {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  if (!origin) return site === "same-origin";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** what every answer about a voice note carries: never kept, never read by another site, never guessed at */
export const PRIVATE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
};
