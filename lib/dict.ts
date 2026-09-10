/**
 * ── TWO LANGUAGES, AND ONE OF THEM IS NOT MODERN STANDARD ARABIC ──────────
 *
 * The second language is TUNISIAN — derja, written in Arabic script, in the
 * words used across a counter in Tunis: متاعي, برشا, باش, هوني, شنوة, تنجم,
 * ما…ش. Fusha (فصحى) is the language of the news and of school forms; nobody
 * says «رصيدك من النقاط» to a person holding a loyalty card. If a sentence
 * would make a Tunisian smile at how formal it is, it is wrong.
 *
 * ── FRENCH WORDS STAY IN FRENCH, IN LATIN LETTERS ─────────────────────────
 *
 * This is how the language is actually written here: application, écran,
 * connecté, caisse, virement, Programme fidélité. Transliterating them into
 * Arabic script — أبليكاسيون — reads as a foreigner's guess at derja. The test
 * is whether the word arrived in Tunisia in French: قهوة and كارت are Arabic
 * here and stay Arabic; application never was.
 *
 * Words this product commits to, because the near-synonym is the tell:
 *
 *   باقيلك    not متبقي and not just باقي — "you have N left" is one word here
 *   طابع      the stamp on the card (تامبون is what people SAY; on screen طابع)
 *   زيارة     not خرجة for a visit to a shop
 *   هدية      not مكافأة for a reward
 *   قهوة هدية not قهوة مجانية / offerte
 *   كارت      not بطاقة
 *   الڨارسون  not النادل
 *
 * ── HOW THIS FILE IS OWNED ────────────────────────────────────────────────
 * FRENCH IS THE KEY. Each owner writes its own fragment in lib/dict/<owner>.ts
 * and this file only spreads them. Nobody edits this file to add a string —
 * add it to your fragment. A duplicate key across fragments is not an error;
 * the later spread wins, in the order below, so keep your keys yours.
 *
 * THE TRAP: a Tunisian string never contains a raw "+" or a "/" next to a
 * figure without the caller wrapping that figure in dir="ltr" — the neutral
 * jumps to the other end of the word in RTL.
 */

import { adminDict } from "./dict/admin";
import { baseDict } from "./dict/base";
import { clientDict } from "./dict/client";
import { dbDict } from "./dict/db";
import { identityDict } from "./dict/identity";
import { ownerDict } from "./dict/owner";

export type Lang = "fr" | "tn";

export const LANG_COOKIE = "pointili_lang";

/**
 * Both languages are live from day one on this product — the toggles render,
 * the cookie is honoured. A language is removed by taking it out of this list,
 * never by flipping DEFAULT_LANG: removing an entry leaves everybody's cookie
 * in place so a later return restores their own choice.
 */
export const LIVE_LANGS: readonly Lang[] = ["fr", "tn"];

/**
 * The fallback when nothing says otherwise. lib/i18n.ts consults the cookie,
 * then Accept-Language (ar → tn), then this. lib/langClient.ts reads the same
 * constant so the error boundary and the page can never disagree.
 */
export const DEFAULT_LANG: Lang = "fr";

/** True while there is a choice to offer — the guard every toggle reads. */
export function langChoiceOffered(): boolean {
  return LIVE_LANGS.length > 1;
}

/** Arabic script runs right to left; French does not. Everything else follows. */
export function dir(lang: Lang): "rtl" | "ltr" {
  return lang === "tn" ? "rtl" : "ltr";
}

/* ══ COUNTED NOUNS ═══════════════════════════════════════════════════════
   Arabic counts in bands, not in a plural flag: 1 singular, 2–10 PLURAL,
   11+ SINGULAR again (٣ طوابع but ٣٠ طابع), 0 plural. A boolean `n >= 2`
   gets it backwards above ten. So counted phrases are whole sentences with a
   {slot}, and the slot is filled by t.n(), which knows the bands. Nothing in
   a JSX file decides grammar. Two is numeral + plural («2 كوارط»), never the
   dual: a digit in front of a dual says two twice. */

type Unit = "tampon" | "carte" | "commerce" | "code" | "minute" | "heure" | "jour";

const FR_PLURAL: Record<Unit, [one: string, many: string]> = {
  tampon: ["tampon", "tampons"],
  carte: ["carte", "cartes"],
  commerce: ["commerce", "commerces"],
  code: ["code", "codes"],
  minute: ["min", "min"],
  heure: ["h", "h"],
  jour: ["j", "j"],
};

/** [singular, plural] — the plural is the 2–10 form, the singular covers 11+. */
const TN_PLURAL: Record<Unit, [one: string, many: string]> = {
  tampon: ["طابع", "طوابع"],
  carte: ["كارت", "كوارط"],
  commerce: ["محلّ", "محلاّت"],
  code: ["كود", "كودات"],
  minute: ["دقيقة", "دقايق"],
  heure: ["ساعة", "سوايع"],
  jour: ["نهار", "أيام"],
};

/*
  THE MONTHS, AND WHY Intl IS WRONG HERE. ar-TN in ICU gives the Modern
  Standard names (أغسطس, يناير) — correct Arabic, wrong country. Tunisia uses
  the French-derived set. Hardcoded because no locale produces these.
*/
const TN_MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/**
 * The shops are in Tunisia, so the clock is Tunisia's. The server is UTC and
 * Tunisia is UTC+1, so a stamp just after midnight would otherwise land on
 * yesterday. Africa/Tunis by name, not a +1 offset: Tunisia has adopted DST
 * before and may again.
 */
export const TZ = "Africa/Tunis";

export function monthYear(lang: Lang, iso: string): string {
  const d = new Date(iso);
  if (lang === "tn") {
    const p = new Intl.DateTimeFormat("en", { timeZone: TZ, month: "numeric", year: "numeric" }).formatToParts(d);
    const month = Number(p.find((x) => x.type === "month")?.value ?? "1");
    const year = p.find((x) => x.type === "year")?.value ?? "";
    return `${TN_MONTHS[month - 1]} ${year}`;
  }
  const s = d.toLocaleDateString("fr-FR", { timeZone: TZ, month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "12 juin" · "12 جوان" — a day that can be PLACED. No year: the month
 *  heading above the row carries it. */
export function dayMonth(lang: Lang, iso: string): string {
  const d = new Date(iso);
  if (lang === "tn") {
    const p = new Intl.DateTimeFormat("en", { timeZone: TZ, day: "numeric", month: "numeric" }).formatToParts(d);
    const day = p.find((x) => x.type === "day")?.value ?? "";
    const month = Number(p.find((x) => x.type === "month")?.value ?? "1");
    return `${day} ${TN_MONTHS[month - 1]}`;
  }
  return d.toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "long" });
}

/** "14:32" in Tunis, both languages — figures stay Latin. */
export function hourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** Just the noun, agreeing with `count` — "طابع", "طوابع", "tampon", "tampons". */
function unitWord(lang: Lang, count: number, unit: Unit): string {
  const n = Math.abs(Math.round(count));
  const [one, many] = (lang === "fr" ? FR_PLURAL : TN_PLURAL)[unit];
  if (lang === "fr") return n >= 2 ? many : one;
  /* 2–10 take the plural; 1 and 11-and-up take the singular; 0 reads as a
     plural ("ما عندك حتى طوابع" is what a person says about none). */
  return n === 0 || (n >= 2 && n <= 10) ? many : one;
}

/** "30 طابع", "10 طوابع", "3 tampons", "1 tampon". Stamps are whole numbers;
 *  the figure is printed as is, never with a decimal. */
function counted(lang: Lang, count: number, unit: Unit): string {
  return `${Math.round(count)} ${unitWord(lang, count, unit)}`;
}

/**
 * The strings: every owner's fragment, spread in a fixed order. A key
 * containing {braces} is a template: the caller passes the values and the two
 * languages are free to put them in different places.
 */
const TN: Record<string, string> = {
  ...baseDict,
  ...identityDict,
  ...ownerDict,
  ...clientDict,
  ...adminDict,
  ...dbDict,
};

/** Anything a caller drops into a {slot}. */
type Vars = Record<string, string | number>;

/**
 * Split a template into literal text and named slots — see components/Tpl.
 * [^{}]+ rather than \w+ so this and t(fr, vars) agree on what a slot is;
 * one being stricter than the other is how "{vie privée}" once rendered its
 * braces on screen.
 */
export function parts(tpl: string): { text: string; slot?: string }[] {
  const out: { text: string; slot?: string }[] = [];
  const re = /\{([^{}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tpl))) {
    if (m.index > last) out.push({ text: tpl.slice(last, m.index) });
    out.push({ text: m[0], slot: m[1] });
    last = m.index + m[0].length;
  }
  if (last < tpl.length) out.push({ text: tpl.slice(last) });
  return out;
}

export type T = ((fr: string, vars?: Vars) => string) & {
  /** A number with its unit, agreeing correctly in both languages. */
  n: (count: number, unit: Unit) => string;
  /** The unit WORD on its own, still agreeing with the count — for the one
   *  place the figure is animated separately from its noun. */
  unit: (count: number, unit: Unit) => string;
  /** Which language this translator speaks — for the rare branch that needs it. */
  lang: Lang;
};

/**
 * Translate one sentence. `t("Ma carte")` in French returns "Ma carte". A
 * missing Tunisian string falls back to the French, deliberately and silently:
 * a half-translated screen is a working screen.
 */
export function translator(lang: Lang): T {
  const t = ((fr: string, vars?: Vars): string => {
    let s = lang === "tn" ? (TN[fr] ?? fr) : fr;
    if (vars) {
      for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    }
    return s;
  }) as T;
  t.n = (count: number, unit: Unit) => counted(lang, count, unit);
  t.unit = (count: number, unit: Unit) => unitWord(lang, count, unit);
  t.lang = lang;
  return t;
}
