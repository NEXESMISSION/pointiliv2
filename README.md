# Pointili Tampon

A stamp card with no app. The café owner's phone shows a rotating, single-use
QR; the customer scans it with the stock camera app; one scan = one stamp,
landing on both screens within a second. No account, no PIN, no phone number
anywhere a QR can land.

Separate from v1 (`POINTILI`, frozen): its own repo, its own host
(`t.pointili.online`), its own two Supabase projects (`tampon-test` for
building, `tampon-prod` for the pilot). Files were copied from v1; nothing is
shared at runtime.

## Run

```
npm install
cp .env.example .env.local        # fill in tampon-test; never commit it
node scripts/migrate.mjs          # replays supabase/migrations against DATABASE_URL — twice is a no-op
npm run dev                       # http://localhost:3100
npm run typecheck                 # tsc --noEmit — must be clean before any push
```

Rules that cost v1 real incidents, so they are rules here:

- **The test database is the only database a script touches.** `DATABASE_URL`
  is tampon-test. `DATABASE_URL_PROD` is read only behind `--prod --i-know`
  (`scripts/db.mjs`), and `--reset` refuses on prod outright.
- **Never `next build` while `next dev` runs** in this folder — it corrupts
  `.next` and every route 500s. Build in a worktree at a short path, or with
  `NEXT_DIST_DIR=.next-verify npm run build` (then `git checkout tsconfig.json`).
- **Every revoke names PUBLIC.** `0002` sweeps every table and every
  security-definer function, sets default privileges so later functions arrive
  closed, and fails the migration if anything is still reachable by anon.
- **Every migration is re-runnable.** `if not exists`, `or replace`, `drop
  trigger if exists` before `create trigger`, `add column if not exists`.
- **Every user-facing string goes through `t()` with French as the key**, and
  lands in YOUR fragment under `lib/dict/`. Never edit `lib/dict.ts`.
- **Every count, slash, code and phone gets `dir="ltr"`.** Arabic headings
  must not fall back to Poppins (`.lang-tn h1..h4` in `globals.css` handles it).
- **Motion is transform/opacity only, respects `prefers-reduced-motion`, and
  nothing loops.**
- **No IP-keyed rate limit anywhere.** Limits key on shop, client or token
  (`rl_buckets`).

## Ownership map

Five owners build in parallel. Write ONLY the files in your row. If you need
something in another row, compile against `lib/types.ts` / the stubs and
report the gap — do not edit the other owner's file.

| Owner | Files |
| --- | --- |
| **scaffold** (this commit) | `package.json`, configs, `.claude/launch.json`, `README.md`, `proxy.ts` (skeleton — the pre-issue branch is identity-api's), `app/layout.tsx`, `app/globals.css` (tokens + base; add your own blocks below a comment naming your owner), `app/page.tsx`, `app/app/page.tsx`, `app/robots.ts`, `app/manifest.ts`, `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/api/version/`, `app/auth/callback/`, `app/owner/(auth)/**`, `app/owner/(setup)/layout.tsx`, `app/owner/(app)/layout.tsx`, `components/{BrandMark,ErrorScreen,InstallPrompt,LangToggle,PullToRefresh,RouteProgress,ServiceWorker,StayFresh,Tpl}.tsx`, `lib/{brand,data,dict,i18n,langAction,langClient,seal,seo,theme,token,types}.ts`, `lib/dict/base.ts`, `lib/auth/{crypto,owner}.ts`, `lib/supabase/*`, `public/*`, `scripts/{db,migrate}.mjs`, `supabase/migrations/{0001_tables,0002_rls_and_revokes}.sql` |
| **db** | `supabase/migrations/0003_functions.sql` (every RPC in the spec's api section: `rl_hit`, `mint_token`, `mint_deferred`, `redeem_token`, `screen_state`, `undo_stamp`, `adjust_stamp`, `ack_reward`, `recover_link_*`, `bump_token_version`, `set_client_*`, `client_wallet`, `create_shop`, `update_shop_settings`; mint/redeem refuse when `shop_is_open()` is false), `0004_sweep_and_roster.sql` (asserts authenticated EXECUTE == exactly `{mint_token, screen_state, undo_stamp, adjust_stamp, ack_reward}`), `scripts/{verify-db,test-db,test-race,attack,fixture}.mjs`, `lib/dict/db.ts` |
| **identity-api** | `lib/auth/client.ts` (replace the stubs), `lib/db.ts` (replace the stubs), the PRE-ISSUE branch in `proxy.ts`, `app/api/stamp/route.ts`, `app/api/stamp/code/route.ts`, `app/api/recovery/{new,use}/route.ts`, `app/api/lang/route.ts`, `lib/dict/identity.ts` |
| **owner-ui** | `app/owner/(app)/page.tsx` + the till client component, `app/owner/(app)/{reglages,tableau}/**`, `app/owner/(app)/abonnement/**` (reads `platform_settings`; "Abonnement expiré" links here), `app/owner/(setup)/nouveau/**`, `lib/qr.ts`, `components/` for the till, `lib/dict/owner.ts`, `scripts/{shot,test-tampon}.mjs` (owner half) |
| **client-ui** | `app/s/[token]/**`, `app/[slug]/**`, `app/moi/**`, `app/r/[code]/**`, `components/QrScanner.tsx` (v1 port, with `tokenFrom()`), the stamp animation, `lib/dict/client.ts`, `scripts/test-tampon.mjs` (client half) |
| **admin-console** | `app/admin/**` (subscriptions: plan/status/trial_ends_at/paid_until/admin_notes, `platform_settings`), `lib/admin.ts` (service role after `requireSuperAdmin()`), `lib/dict/admin.ts` |

### Contracts everybody compiles against

- `lib/types.ts` — every jsonb shape (`RedeemResult`, `ScreenState`, `MintResult`,
  `TokenView`, `ClientCard`, `WalletEntry`, `Shop`, `ShopPublic`,
  `SubscriptionStatus`, `PlatformSettings`…). snake_case = the RPC output as is.
- `lib/db.ts` — the service-role data layer. Stubs throw `identity-api: not
  implemented`; signatures are final.
- `lib/auth/client.ts` — `CLIENT_COOKIE`, `clientCookieOptions()` (real);
  `currentClient()`, `signClient()`, `verifyClient()` (stubs).
- `lib/auth/owner.ts` — `currentOwner()`, `ownerShop()`, `ownerHome()`,
  `requireSuperAdmin()`. Every owner page starts with `ownerShop()`.
- `lib/seal.ts` — the 16 emoji; `sealFor(n)`. Both screens read this table.
- `lib/token.ts` — `TOKEN_RE`, `CODE_RE`, `tokenFrom(url)`, `RESERVED_SLUGS`.
- `lib/i18n.ts` — `currentLang()` (cookie → Accept-Language `ar` → `fr`), `t()`.

### Decisions other owners must know

- **Super-admin list lives in the database.** `platform_settings.super_admin_emails text[]`,
  seeded by `scripts/migrate.mjs` from `SUPER_ADMIN_EMAILS` on every run.
  `handle_new_user()` reads it at signup; the migrate script also promotes
  already-existing profiles on the list.
- **`shop_is_open(shop uuid)`** is a security-definer SQL function in `0001`:
  `active AND ((trial AND trial_ends_at > now()) OR (active AND paid_until > now()))`.
  `MintResult`/`DeferredCode` refusal reasons: `trop_de_codes`, `suspendu`,
  `abonnement_expire`. The customer's side is always `shop_dark`.
- **Default privileges are closed** (`0002`): a function created after it is
  NOT executable by anon or authenticated unless a migration grants it. 0003
  must grant the five till functions to `authenticated` explicitly.
- **`x-pointili-client`** is the request header proxy.ts forwards the client
  sub in (pre-issued or existing). `currentClient()` reads it first.
- **DEFAULT_LANG is `fr`**; both `fr` and `tn` are live. First visit with no
  cookie and `Accept-Language` containing `ar` → `tn`.
- **Cookie roll** is at 133 days of a 400-day life, in `proxy.ts`.
- **The proxy matcher excludes `/api/version`** (StayFresh polls it) and any
  path with a file extension.
- **Dev server is port 3100** so it can coexist with v1 on 3000.
