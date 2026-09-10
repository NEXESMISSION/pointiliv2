/**
 * The seal: sixteen emoji, one drawn per landing, shown at 96 px on the till
 * and in the corner of the customer's card at the same moment. It is the
 * cheapest presence check there is — a forwarded screenshot lands a stamp on
 * a phone nobody at the counter is holding, and the owner sees a seal with no
 * face behind it.
 *
 * THE TRAP: this table is shared by BOTH screens. Reorder it and every stored
 * stamp_tokens.seal points at a different picture on the two phones.
 */
export const SEALS = [
  "☕", "🥐", "🍋", "🌿", "🍓", "🐟", "🌙", "⭐",
  "🍉", "🫒", "🐪", "🌸", "🍪", "🔑", "🎈", "🐚",
] as const;

export type Seal = (typeof SEALS)[number];

/** The emoji for a seal index. Anything outside 0..15 wraps rather than
 *  throws: a bad index must never blank the till mid-service. */
export function sealFor(n: number): Seal {
  const i = ((Math.trunc(n) % SEALS.length) + SEALS.length) % SEALS.length;
  return SEALS[i];
}
