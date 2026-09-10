import "server-only";
import type {
  ClientCard,
  ClientProfile,
  DeferredCode,
  OwnerBootstrap,
  RecoveryUse,
  RedeemResult,
  ShopPublic,
  StampIntent,
  TokenView,
  WalletEntry,
} from "./types";

/**
 * The data layer — service role, one RPC per write, throws on `error`.
 *
 * Every value-changing call is a Postgres RPC (0003_functions.sql) that is
 * `security definer` and executable by service_role only, so the key used
 * here is the ONLY way to reach it and it never leaves the server. The browser
 * sends a token and a cookie; the database decides everything else.
 *
 * STUBS — owned by identity-api. Every function carries its final signature
 * and its contract; each throws until implemented. Callers compile today.
 *
 * THE TRAP: `throw new Error(error.message)` on every `error`, never `?? 0` or
 * `?? []`. A swallowed error reads as "you have nothing" to the customer.
 */

/* ── the customer's screens (read) ─────────────────────────────────────── */

/**
 * GET /s/[token]. Service role: the token row + its shop, and this client's
 * balance at that shop. Never writes. `client` is the sub from the cookie or
 * the proxy header — may be a uuid with no row yet (balance 0).
 * Unknown token → {state:"gone", shop:null}. Used by this client < 120 s ago →
 * {state:"spent", result}. Lowercases the token before the lookup.
 */
export async function tokenView(_token: string, _client: string): Promise<TokenView> {
  throw new Error("identity-api: not implemented");
}

/** The public projection of a shop, or null if the slug is unknown/inactive. */
export async function shopBySlug(_slug: string): Promise<ShopPublic | null> {
  throw new Error("identity-api: not implemented");
}

/**
 * GET /[slug]: balance, history (stamps/rewards/undo/adjust rows, newest
 * first, 50 max) and the shop. Null if the slug is unknown. Checks
 * token_version: a mismatch throws a SignedOutError the page maps to the
 * blank card + "Retrouver ma carte".
 */
export async function clientCard(
  _client: string,
  _version: number,
  _slug: string,
): Promise<ClientCard | null> {
  throw new Error("identity-api: not implemented");
}

/** GET /moi: rpc client_wallet(p_client, p_version) → WalletEntry[], sorted
 *  by last_at desc. Empty array means a real "no cards", never an error. */
export async function clientWallet(_client: string, _version: number): Promise<WalletEntry[]> {
  throw new Error("identity-api: not implemented");
}

/** GET /moi: name + lang for the identity chores. Null when no row exists yet. */
export async function clientProfile(_client: string, _version: number): Promise<ClientProfile | null> {
  throw new Error("identity-api: not implemented");
}

/* ── the stamp path (write) ────────────────────────────────────────────── */

/**
 * POST /api/stamp: rpc redeem_token(p_token, p_client, p_version, p_intent).
 * ONE transaction: conditional UPDATE consumes the token (or replays), lazy
 * client insert, advisory lock per (shop, client), cooldown + daily cap (a
 * refusal leaves the token live), ledger insert, seal draw, successor mint.
 * The RPC RAISEs 'signed_out' / 'shop_dark'; this maps those to
 * {ok:false, reason} so the handler can clear the cookie on signed_out.
 */
export async function redeemToken(
  _token: string,
  _client: string,
  _version: number,
  _intent: StampIntent,
): Promise<RedeemResult> {
  throw new Error("identity-api: not implemented");
}

/**
 * POST /api/stamp/code: the typed 6-digit code de rattrapage on /[slug].
 * rl_hit('deferred-guess:'||shop, 30, 3600) FIRST (counts before judging),
 * then redeem_token(code, ...). Over the bucket → {ok:false, reason:"rescan"}
 * with the same timing as a wrong code.
 */
export async function redeemCode(
  _code: string,
  _slug: string,
  _client: string,
  _version: number,
): Promise<RedeemResult> {
  throw new Error("identity-api: not implemented");
}

/* ── the owner's till (server side) ────────────────────────────────────── */

/**
 * What /owner's Server Component hands to the till after ownerShop(): the shop,
 * shop_is_open() and server_now. The till then mints and polls PostgREST
 * directly with the owner JWT — no Vercel function sits in the loop.
 */
export async function ownerScreenBootstrap(_shopId: string): Promise<OwnerBootstrap> {
  throw new Error("identity-api: not implemented");
}

/**
 * Server action behind the ⋮ menu: rpc mint_deferred(p_shop, p_screen).
 * Refuses above 10 live codes per shop and when shop_is_open() is false.
 */
export async function mintDeferred(_shopId: string, _screen: string): Promise<DeferredCode> {
  throw new Error("identity-api: not implemented");
}

/* ── identity chores ───────────────────────────────────────────────────── */

/**
 * POST /api/recovery/new: node randomBytes(10) → 16-char lowercase base32,
 * sha256 stored via rpc recover_link_mint(p_client, p_hash), the code itself
 * returned ONCE as `${SITE_URL}/r/<code>`. rl_hit('recover:'||client, 10/h).
 */
export async function recoveryMint(_client: string, _version: number): Promise<{ url: string }> {
  throw new Error("identity-api: not implemented");
}

/**
 * POST /api/recovery/use: rpc recover_link_use(sha256(code), p_current).
 * Single conditional UPDATE on used_at; bumps the recovered client's
 * token_version; merges `current`'s stamps INTO it when there are any. The
 * handler then signs a fresh cookie for client_id and mints a new link.
 */
export async function recoveryUse(_code: string, _current: string): Promise<RecoveryUse> {
  throw new Error("identity-api: not implemented");
}

/** rpc set_client_name(p_client, p_version, p_name) — trimmed, <= 40 chars, "" clears. */
export async function setClientName(_client: string, _version: number, _name: string): Promise<void> {
  throw new Error("identity-api: not implemented");
}

/** rpc set_client_lang(p_client, p_version, p_lang) — 'fr' | 'tn'. */
export async function setClientLang(_client: string, _version: number, _lang: "fr" | "tn"): Promise<void> {
  throw new Error("identity-api: not implemented");
}

/** "Déconnecter partout": rpc bump_token_version(p_client) → the new version.
 *  Every cookie signed with the old one answers signed_out from then on. */
export async function bumpTokenVersion(_client: string): Promise<number> {
  throw new Error("identity-api: not implemented");
}

/* ── shop lifecycle (owner-ui calls these after ownerShop()) ───────────── */

/**
 * rpc create_shop(p_owner, p_slug, p_name, p_colour) → the new shop id.
 * Refuses RESERVED_SLUGS (lib/token.ts) and taken slugs with
 * {ok:false, reason:'slug_reserved'|'slug_taken'|'slug_invalid'}.
 */
export async function createShop(
  _ownerId: string,
  _slug: string,
  _name: string,
  _colour: string,
): Promise<{ ok: true; id: string } | { ok: false; reason: "slug_invalid" | "slug_reserved" | "slug_taken" }> {
  throw new Error("identity-api: not implemented");
}

/** Live feedback while typing: legal, not reserved, not taken. */
export async function slugAvailable(_slug: string): Promise<boolean> {
  throw new Error("identity-api: not implemented");
}

/**
 * rpc update_shop_settings(p_shop, ...) — the five numbers and the look. The
 * CHECK constraints are the last line of defence; a violation throws with the
 * constraint name in the message for /owner/reglages to map to French.
 */
export async function updateShopSettings(
  _shopId: string,
  _patch: Partial<{
    name: string;
    colour: string;
    stamps_required: number;
    reward_label: string;
    cooldown_seconds: number;
    daily_cap: number;
    hand_mode: boolean;
  }>,
): Promise<void> {
  throw new Error("identity-api: not implemented");
}
