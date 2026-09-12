import { INTL, type Locale } from "./config";

/** A phrase that changes with a number. Only `other` is required. */
export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Leaf = string | Plural;
export type Tree = { [key: string]: Leaf | Tree };

/**
 * Declares one namespace. The French tree defines the shape; the Tunisian one
 * must match it, so a forgotten key is a type error, not a missing sentence.
 */
export function ns<T extends Tree>(messages: { fr: T; tn: NoInfer<T> }): { fr: T; tn: T } {
  return messages as { fr: T; tn: T };
}

/** Marks a plural entry (and keeps the literal type readable). */
export function p(forms: Plural): Plural {
  return forms;
}

/** "Bonjour {name}" + { name: "Sarah" } → "Bonjour Sarah". */
export function fmt(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));
}

const RULES = new Map<string, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  const tag = INTL[locale];
  let r = RULES.get(tag);
  if (!r) {
    r = new Intl.PluralRules(tag);
    RULES.set(tag, r);
  }
  return r;
}

/** Picks the right form for `n` and fills {n} (plus any extra vars). */
export function plural(entry: Plural | string, n: number, locale: Locale, vars?: Record<string, string | number>): string {
  if (typeof entry === "string") return fmt(entry, { n, ...vars });
  const category = rulesFor(locale).select(n) as keyof Plural;
  const form = entry[category] ?? (n === 0 ? entry.zero : undefined) ?? entry.other;
  return fmt(form, { n, ...vars });
}
