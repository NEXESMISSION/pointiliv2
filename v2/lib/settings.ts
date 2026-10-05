import "server-only";
import { unstable_cache } from "next/cache";
import { service } from "@/lib/supabase";

/** A YouTube link as the app plays it: the video's id, and whether it stands up (a Short). */
export type Video = { id: string; label: string; vertical: boolean; url: string };
/** Where the owners pay: the card page (Dodo Payments), D17, the bank account, the post office. */
export type PayDetails = { card: string | null; d17: string | null; name: string | null; bank: string | null; rib: string | null; mandat: string | null };
/** Pointili's own pages (the footer links them; search engines and AI assistants learn they are Pointili's). */
export type Social = { facebook: string | null; instagram: string | null; tiktok: string | null };
export type Settings = { supportPhone: string | null; video1: Video | null; video2: Video | null; pay: PayDetails; social: Social; raw: Record<string, string> };

/** An https link on that site only (facebook.com, instagram.com, tiktok.com), else null. */
export function socialUrl(raw: string | undefined, host: "facebook.com" | "instagram.com" | "tiktok.com"): string | null {
  const url = String(raw ?? "").trim();
  if (!/^https:\/\/\S+$/.test(url)) return null;
  try {
    const h = new URL(url).hostname.replace(/^(www|m)\./, "");
    return h === host || h.endsWith(`.${host}`) ? url : null;
  } catch {
    return null;
  }
}

/** youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID → ID (11 letters), else null. */
export function youtubeId(url: string): string | null {
  const m = String(url ?? "").match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : null;
}

function video(url: string | undefined, label: string | undefined, fallback: string): Video | null {
  const id = youtubeId(url ?? "");
  if (!id) return null;
  return { id, label: (label ?? "").trim() || fallback, vertical: /\/shorts\//.test(url ?? ""), url: url ?? "" };
}

/** Digits only, country code first — what tel: and wa.me want; 8 digits get +216. */
function phone(raw: string | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length < 8) return null;
  return d.length === 8 ? `216${d}` : d;
}

/** What the help button and the video pill need, nothing more (no raw links). */
export function helpOf(s: Settings) {
  const v = (x: Video | null) => (x ? { id: x.id, label: x.label, vertical: x.vertical } : null);
  return { phone: s.supportPhone, video1: v(s.video1), video2: v(s.video2) };
}

/** The help button's settings, for an owner's page. */
export async function getHelp() {
  return helpOf(await getSettings());
}

async function load(): Promise<Record<string, string>> {
  const { data, error } = await service().from("settings").select("key, value");
  if (error) throw new Error(error.message);
  const raw: Record<string, string> = {};
  for (const row of data ?? []) raw[row.key as string] = row.value as string;
  return raw;
}
/** Read once and kept (every owner page shows the help button); saving in the console clears it. */
const cached = unstable_cache(load, ["settings"], { tags: ["settings"], revalidate: 600 });

/**
 * The founder's settings, as the founder left them in the console: the number
 * owners call with a question, and the two videos. A number never set falls
 * back on SUPPORT_WHATSAPP, then on the first founder phone. `fresh` skips the
 * kept copy (the console itself).
 */
export async function getSettings(fresh = false): Promise<Settings> {
  const raw = await (fresh ? load() : cached()).catch((): Record<string, string> => ({}));
  return {
    supportPhone: phone(raw.support_phone) ?? phone(process.env.SUPPORT_WHATSAPP) ?? phone(process.env.ADMIN_PHONES?.split(",")[0]),
    video1: video(raw.video1_url, raw.video1_label, "كيفاش تخدم Pointili؟"),
    video2: video(raw.video2_url, raw.video2_label, "فيديو ثاني"),
    pay: {
      card: /^https:\/\//.test(raw.pay_card_url ?? "") ? raw.pay_card_url! : null,
      d17: raw.pay_d17?.trim() || null,
      name: raw.pay_name?.trim() || null,
      bank: raw.pay_bank?.trim() || null,
      rib: raw.pay_rib?.trim() || null,
      mandat: raw.pay_mandat?.trim() || null,
    },
    social: { facebook: socialUrl(raw.facebook_url, "facebook.com"), instagram: socialUrl(raw.instagram_url, "instagram.com"), tiktok: socialUrl(raw.tiktok_url, "tiktok.com") },
    raw,
  };
}
