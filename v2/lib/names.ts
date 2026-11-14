/**
 * A customer's name as an owner types it (14 Nov 2026, a client: «give me an access to write the customer's name
 * by hand while he has no account yet»): trimmed, one space between words, no control or direction marks, 2 to 30
 * letters. Null when it is not a name.
 */
export function cleanName(raw: string | null | undefined): string | null {
  const v = String(raw ?? "")
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return v.length >= 2 && v.length <= 30 ? v : null;
}
