/** A customer's card as every screen shows it (v2.card_view). */
export type CardView = {
  id: string;
  stamps: number;
  gifts: number;
  last_at: string | null;
  /** the card has reached its goal */
  ready: boolean;
  /** how many gifts wait on it: every full card not yet taken (the stamps past the goal are kept) */
  waiting_n?: number;
  /** a gift waits for the shop to hand it over */
  waiting: boolean;
  /** the shop, with this card's own goal and gift (the promise it started with) */
  shop: { id: string; name: string; kind: string; goal: number | null; gift: string | null; color: string; logo?: string | null; stamp_logo?: boolean; store?: boolean; wheel?: boolean; /** minutes between two tampons here */ gap?: number | null; /** the shop is stopped: no tampon will land */ paused?: boolean };
  /** a wheel shop: the turn waiting to be spun (a gift moment's id) */
  spin?: number | null;
  /** a wheel shop: how many turns («دورات») wait to be spun */
  spins_n?: number;
  /** the gift waiting, by its own name (a wheel's prize once spun) */
  won?: string | null;
  /** every gift waiting, by name and how many of each, oldest first (lib/t giftsSaid says them) */
  won_list?: { gift: string; n: number }[];
  /** a shop with a store: the orders this customer made and has not taken yet */
  orders_n?: number;
  /** the shop's card of today when it differs: this customer's next card, after this gift */
  next?: { goal: number; gift: string } | null;
};

export type ScanResult =
  /** `prizes`: a wheel shop whose card this scan filled — the turn is spun here, on the scan's own screen */
  | { kind: "stamped"; card: CardView; gift: boolean; item?: string | null; prizes?: { id?: number; name: string; chance: number }[] | null }
  | { kind: "held"; shop: string; color: string; shopKind: string }
  | { kind: "error"; code: string; card?: CardView; next_at?: string; shop?: string };

/** a customer's answers to the shop's forms of identification: each form, its fields as label and value */
/** a shop as its card shows it: the name, the kind, the colour, the logo, the goal and the gift */
export type DemoShop = { name: string; kind: string; color: string; logo?: string | null; goal: number | null; gift: string | null; stamp_logo?: boolean };

export type Said = { form: string; fields: { label: string; value: string }[] }[];

/** the store of a shop switched to it (v2.store_list, orders_waiting, card_store) */
export type StoreItem = { id: number; name: string; cost: number };
export type Order = { batch: string; at: string; lines: { name: string; qty: number; cost: number }[]; total: number };
export type CardStore = { ok: boolean; error?: string; balance: number; items: StoreItem[]; waiting: Order[] };

export type FormState = { error?: string | null; field?: string } | null;
