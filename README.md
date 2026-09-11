# Pointidi

Mobile-first PWA loyalty cards for local businesses.
**Customer:** Scan → Stamp → Done. **Merchant:** Open QR → leave it running.

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage).

## Run

```bash
npm install
cp .env.example .env.local     # fill in; never commit .env.local
npm run migrate                # applies supabase/migrations (idempotent), promotes admins, sets auth config
npm run dev                    # http://localhost:3100
```

| Script | What it does |
| --- | --- |
| `npm run migrate` | Replays every migration over the Supabase Management API (HTTPS), promotes `ADMIN_PHONES` / `ADMIN_EMAILS`, closes public sign-up |
| `npm run test:e2e` | Spec §50 acceptance scenario + replay, race, claim and authorization checks against the real database (throwaway users, cleaned up) |
| `node scripts/demo.mjs` | Ensures the demo merchant **Café Bonheur** (phone `20 000 001`, password in `.env.local` → `DEMO_MERCHANT_PASSWORD`) and prints a fresh scan URL |
| `node scripts/reward-flow.mjs` | Real two-browser test of the reward QR: 10 stamps → "Use reward" → staff scans the QR on `/redeem` → confirm → both screens update; a used QR is refused |
| `node scripts/shots.mjs` | Phone-size screenshots of every screen with a sideways-overflow check (needs `npm run dev` and Chrome) |
| `npm run sql -- "select 1"` | Run SQL over HTTPS |
| `npm run icons` | Regenerate PWA icons |

## Routes

- **Public:** `/`, `/how-it-works`, `/pricing`
- **Customer:** `/customer/register`, `/customer/login`, `/customer/forgot-password`, `/customer` (home), `/customer/cards/:id`, `/customer/rewards`, `/customer/rewards/use/:id`, `/customer/profile`, `/customer/scan`
- **Scan link (what the QR encodes):** `/scan/:token`
- **Merchant:** `/register`, `/login`, `/dashboard`, `/qr`, `/loyalty`, `/rewards`, `/customers`, `/customers/:id`, `/redeem`, `/activity`, `/analytics`, `/billing`, `/settings`
- **Admin:** `/admin`, `/admin/businesses`, `/admin/subscriptions`, `/admin/payments`, `/admin/customers`, `/admin/activity`, `/admin/system`

## How it works

**Accounts.** Everyone signs in with a Tunisian phone number + password (merchants and admins may also use their email). Supabase Auth stores the password; the auth identity of a phone account is a synthetic address `216XXXXXXXX@phone.pointidi.app`, because Supabase's phone provider would need an SMS provider just to create accounts. Public sign-up through the Auth API is **disabled** — accounts are created only by the server (validated number, rate-limited).

**The QR.** `/qr` mints a single-use token (`mint_qr_token`: 24 random bytes, only the SHA-256 is stored, 60 s life). The screen polls every 2 s and rotates as soon as the token is used or 15 s before it expires; each stamp flashes "+1 STAMP · #code". A Wake Lock keeps the screen on.

**The stamp** (`collect_stamp`, one transaction, row locks on token and card): token exists → not used/expired → business active and subscribed → not the merchant's own business → card active → per-customer cooldown (default 1 h) → insert stamp, mark token used, bump balance → return progress and newly unlocked rewards. Two phones scanning one QR, or one phone double-submitting, yields exactly one stamp.

**Signed-out scans.** The scan page POSTs (never a GET side-effect, so link previews can't burn tokens). Signed out, the server reserves the token for that browser with an httpOnly claim cookie for 20 minutes, so a first-time customer can register and still get the stamp; the merchant screen rotates immediately.

**Rewards.** Unlocked when balance ≥ reward stamps. The customer taps "Use reward" → a 6-digit code (15 min) → the merchant confirms at the counter (`/redeem`, live list) or from the customer page. Stamps are deducted only on merchant confirmation, under a lock, so a reward can't be redeemed twice or remotely.

**Changing the card later is fair.** Each customer's card remembers the goal it started with (`customers.card_target`). Raising the stamps required never takes a reward away from someone mid-card — they finish at their old goal and the next card uses the new one. Lowering it helps everyone immediately (`reward_cost` = the lower of the two). Extra stamps past a full card carry over. The loyalty page shows who a change affects (`merchant_card_impact`) and asks for confirmation before saving.

**Branding.** Owners upload a logo and a cover photo (loyalty page or settings). The browser crops and compresses them (logo 512², cover 1600×700, WebP/JPEG) before upload; they appear on customers' cards and behind the QR screen.

**Billing.** New businesses get a 30-day trial. Plans: 6 Months 80 TND, Yearly 120 TND. The merchant requests a plan (pending payment with a `PTD-XXXXXX` reference); an admin confirms the payment, which adds the period after any time still covered. An expired subscription pauses the QR; customers keep their stamps.

## Security model

- Every value-changing operation is a `security definer` function identifying the caller with `auth.uid()`; ids, roles and business ids from the browser are never trusted.
- RLS is enabled and forced on every table; signed-in users can only `select` their own rows (or their business's). No table is writable by `anon` or `authenticated`.
- Function `EXECUTE` is revoked by default and granted one by one; `0003_security.sql` fails the migration if `anon` can execute anything.
- Service-role key is server-only (`import "server-only"`), used for account creation, the anonymous claim, password resets, logo uploads, and admin password resets after an admin check.
- Rate limits live in Postgres (`rate_limits`): login per phone and IP, registration, stamps per user, QR minting per business, code lookups, password reset requests and verification attempts.

## Deploy (Vercel)

Live: **https://pointidi.vercel.app** — Vercel project `pointidi` (team `nexesmissions-projects`, Hobby), functions in `dub1` next to Supabase `eu-west-1`.

Production env vars on the project: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (type *config*, it is public by design), `SUPABASE_SERVICE_ROLE_KEY` (secret). QR and reward-QR links use the request's own host, so no site URL variable is needed.

Deploy the committed branch from a **git-free export** — on the Hobby plan Vercel blocks CLI deployments whose git commit author isn't a member of the Vercel account (`TEAM_ACCESS_REQUIRED`), and an export has no commit metadata:

```bash
rm -rf ../pointidi-deploy && mkdir ../pointidi-deploy && git archive pointidi-v1 | tar -x -C ../pointidi-deploy
cd ../pointidi-deploy && npx vercel link --yes --project pointidi --scope nexesmissions-projects && rm -f .env.local
npx vercel deploy --prod --yes --archive=tgz
```

Then check it: `SHOTS_BASE=https://pointidi.vercel.app node scripts/shots.mjs` and `SHOTS_BASE=https://pointidi.vercel.app node scripts/reward-flow.mjs`. (Do not use `vercel deploy --temporary`: anonymous deployments are capped at 20 functions.)

## Needs an external account before launch

- **SMS for password reset.** Set `SMS_PROVIDER=twilio` + `TWILIO_*`. Without it, codes are shown on screen in development only; in production an admin can issue a temporary password from `/admin/customers`.
- **Hosting.** Deploy on Vercel (or any Node host) with the variables from `.env.example`, set `NEXT_PUBLIC_SITE_URL` to the public origin, and re-run `npm run migrate` so Supabase Auth's site URL matches.
- **Payment details.** Optionally set `NEXT_PUBLIC_SUPPORT_PHONE` / `NEXT_PUBLIC_SUPPORT_EMAIL` so merchants see who to pay on `/billing`.
