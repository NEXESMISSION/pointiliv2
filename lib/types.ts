/**
 * THE CONTRACT between the five owners. Every jsonb an RPC returns, every row a
 * page renders, in the exact shape the spec's api section describes — snake_case
 * on purpose, so a Postgres result is the TypeScript value with no mapping layer
 * that can drift.
 *
 * THE TRAP: do not add a field here that the RPC does not return. A type that is
 * wider than the data is how `?? 0` creeps back in and "you have nothing" gets
 * shown for "I could not ask".
 */

/* ── subscriptions (ADMIN REQUIREMENT) ─────────────────────────────────── */

export type Plan = "essai" | "annuel";
export type SubscriptionStatus = "trial" | "active" | "suspended" | "expired";

/** platform_settings, the single row. */
export type PlatformSettings = {
  yearly_price_tnd: number;
  trial_days: number;
  payment_instructions: string;
  super_admin_emails: string[];
};

/* ── shop ──────────────────────────────────────────────────────────────── */

/** shops, as the owner and the console see it. Never sent to a client page. */
export type Shop = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  /** #rrggbb, lowercase — CHECKed by the database. */
  colour: string;
  stamps_required: number;
  reward_label: string;
  cooldown_seconds: number;
  daily_cap: number;
  /** Opt-in: the QR appears after a tap, for one customer. */
  hand_mode: boolean;
  active: boolean;
  plan: Plan;
  status: SubscriptionStatus;
  trial_ends_at: string;
  paid_until: string | null;
  created_at: string;
};

/** What a customer's screen may know about a shop. Nothing else crosses. */
export type ShopPublic = Pick<
  Shop,
  "id" | "slug" | "name" | "colour" | "stamps_required" | "reward_label"
>;

/* ── redeem_token result (stored on stamp_tokens.result, returned by /api/stamp) */

export type StampIntent = "stamp" | "reward";

/**
 * Unknown, used, expired, superseded: one sentence, one timing ("rescan"). The
 * route handler adds signed_out (cookie version mismatch), shop_dark (inactive,
 * suspended or subscription closed) and cookie (no valid cookie — the page
 * reloads once and proxy.ts re-issues).
 */
export type RedeemRefusal = {
  ok: false;
  reason: "rescan" | "signed_out" | "shop_dark" | "cookie";
};

/** Cooldown or daily cap. The token was put back live; nothing landed. */
export type RedeemRefused = {
  ok: true;
  kind: "refused";
  reason: "cooldown" | "daily_cap";
  retry_in_s: number;
  balance: number;
  required: number;
};

/** A stamp or a reward landed. The same object is painted on both screens. */
export type RedeemLanded = {
  ok: true;
  kind: StampIntent;
  /** 0..15, an index into lib/seal.ts — the presence check. */
  seal: number;
  name: string | null;
  balance: number;
  required: number;
  full: boolean;
  /** Stamps this token carried (the ×N chip). */
  stamps: number;
  stamp_id: number;
  first_time: boolean;
  label: string;
  /** The successor QR token, minted in the same transaction; null for a deferred code. */
  successor: string | null;
  expires_at: string;
  server_now: string;
  /** The same client re-sent the same token within 120 s: the stored result. */
  replayed?: true;
};

export type RedeemResult = RedeemRefusal | RedeemRefused | RedeemLanded;

/** What POST /api/stamp answers: the RPC jsonb plus the slug to replaceState to. */
export type StampResponse = RedeemResult & { slug?: string };

/* ── the owner's till ──────────────────────────────────────────────────── */

export type MintResult =
  | { ok: true; token: string; expires_at: string; server_now: string }
  | {
      ok: false;
      /**
       * trop_de_codes      rl_hit('mint:'+shop, 600/h) said no
       * suspendu           status = 'suspended' (or active = false)
       * abonnement_expire  shop_is_open() false for any other reason
       */
      reason: "trop_de_codes" | "suspendu" | "abonnement_expire";
    };

export type ScanOutcome =
  | "cooldown"
  | "daily_cap"
  | "used"
  | "expired"
  | "superseded"
  | "shop_dark"
  | "signed_out"
  | "bad_intent";

/** screen_state(p_screen, p_since): the whole owner poll in one call. */
export type ScreenState = {
  server_now: string;
  live: { token: string; expires_at: string; stamps: number } | null;
  landings: { token: string; result: RedeemLanded; used_at: string }[];
  refusals: { outcome: ScanOutcome; created_at: string }[];
  to_serve: {
    stamp_id: number;
    name: string | null;
    seal: number;
    label: string;
    created_at: string;
  }[];
  today: { stamps: number; rewards: number };
};

/** mint_deferred: the 6-digit code de rattrapage, 24 h, at most 10 live per shop. */
export type DeferredCode =
  | { ok: true; code: string; expires_at: string }
  | { ok: false; reason: "trop_de_codes" | "suspendu" | "abonnement_expire" };

/** What the /owner Server Component hands to the till client component. */
export type OwnerBootstrap = {
  shop: Shop;
  /** shop_is_open() — false paints "Abonnement expiré" over the tile. */
  open: boolean;
  server_now: string;
};

/* ── the customer's screens ────────────────────────────────────────────── */

/** GET /s/[token]: what the Server Component renders before the POST fires. */
export type TokenView = {
  token: string;
  kind: "qr" | "deferred";
  /**
   * live      — a POST can land it
   * spent     — used by THIS client within 120 s: paint `result`, no POST
   * gone      — unknown, used by someone else, expired or superseded: the
   *             "rescanne l'écran" state. One word for all four, on purpose.
   */
  state: "live" | "spent" | "gone";
  /** null only when state is "gone" for an unknown token. */
  shop: ShopPublic | null;
  /** This client's balance at this shop (0 for a first scan). */
  balance: number;
  full: boolean;
  result: RedeemLanded | null;
};

/** One ledger row as the card's history shows it. */
export type CardHistoryRow = {
  id: number;
  delta: number;
  kind: "stamp" | "reward" | "undo" | "adjust";
  created_at: string;
};

/** GET /[slug]: the resting card at one shop. */
export type ClientCard = {
  shop: ShopPublic;
  balance: number;
  required: number;
  label: string;
  full: boolean;
  last_at: string | null;
  history: CardHistoryRow[];
};

/** One row of client_wallet(): every shop with a balance or activity in 90 d. */
export type WalletEntry = {
  slug: string;
  name: string;
  colour: string;
  balance: number;
  required: number;
  label: string;
  last_at: string | null;
};

/** What /moi needs beyond the wallet. */
export type ClientProfile = {
  name: string | null;
  lang: "fr" | "tn" | null;
};

/* ── recovery ──────────────────────────────────────────────────────────── */

export type RecoveryUse =
  | { ok: true; client_id: string; merged: number }
  | { ok: false; reason: "used" | "expired" | "unknown" };
