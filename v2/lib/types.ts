/** A customer's card as every screen shows it (v2.card_view). */
export type CardView = {
  id: string;
  stamps: number;
  gifts: number;
  last_at: string | null;
  /** the card has reached its goal */
  ready: boolean;
  /** a gift waits for the shop to hand it over */
  waiting: boolean;
  /** the shop, with this card's own goal and gift (the promise it started with) */
  shop: { id: string; name: string; kind: string; goal: number | null; gift: string | null; color: string; logo?: string | null };
  /** the shop's card of today when it differs: this customer's next card, after this gift */
  next?: { goal: number; gift: string } | null;
};

export type ScanResult =
  | { kind: "stamped"; card: CardView; gift: boolean }
  | { kind: "held"; shop: string; color: string; shopKind: string }
  | { kind: "error"; code: string; card?: CardView; next_at?: string; shop?: string };

export type FormState = { error?: string | null; field?: string } | null;
