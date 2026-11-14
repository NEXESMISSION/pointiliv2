# The next version, without the points: what goes online, and how

The founder's rules: nothing goes online until he has tested it all himself and says so in chat; the shops and
customers already on Pointili, the paying ones first, get no bug and nothing confusing. This file is the checklist.

**14 Nov 2026, the founder: «I don't want to publish the new point system yet… remove it completely, keep the
notification thing and all the other updates — and the golden ticket also».** Branch `release/no-points` (worktree
`Desktop/pointili-systems`) is main + the updates below. The points version stays whole on branch `systems/split`
(commit f906c69), for the day he wants it.

## What changes for the people on Pointili

### The owners
- **🔔 The bell** (`/shop/inbox`): every note the founder writes is kept there, newest first, with a count of what is
  not read yet on the bell in the header of the home and of «المحل». Opening it marks everything read. The popup that
  shows a note once is unchanged; a note read in the bell never pops up afterwards.
- **«المحل» is shorter, one screen on a small phone** (main's is 11–12 rows with the clock on, cut at 548–640 px):
  the shop, the card, **«خيارات الكارط»** | التاريخ, الأرقام, الأبونمان | «الكونت» and «الكارطات متاعي» as two tiles;
  «حطّ Pointili في تليفونك» is an icon in its header, as on the home. «شكون رجع؟» is the big button inside «الأرقام».
- **«خيارات الكارط»** (`/shop/options`, new): the card's rules on one page — «الروليت», «الحريف يختار الكادو»,
  «شنوّة تبيع», «الكارط ترجع للصفر» — each says whether it is on and opens its own page as before. Its line in
  «المحل» says which are on («الروليت · شنوّة تبيع»). The rows show when main's «المحل» showed them (the roulette
  for a shop the founder allows it, the clock while his switch is on).
- **«الحريف يختار الكادو»** (`/shop/choices`, off by default): the owner lists 2 to 4 gifts; a customer whose card is
  full picks one on the phone, or at the counter when it is handed over. Written in the card's one gift text
  («قهوة · كرواسون»), so the card, the counter, the poster and the reminders all say it already.
- **Two short films**: «شنوّة تبيع؟» (on its page) and «الحريف يختار الكادو» — `public/clips/*-v2.mp4`.
- **«كود التسجيل» is a poster** (`/shop/join`, only for a shop the founder switched `join_on`): A4, story or post,
  three looks; download, send or print.
- **Removing customers**: 🗑 at the top of a customer's sheet, and «نحّي حرفاء» to pick several at once.
- **The name of a customer with no account yet** (14 Nov 2026, a client asked for it): a new number at the counter
  has a field «إسمو، كان تحب»; and in «الحرفاء», such a customer's sheet has «اكتب إسمو» / «بدّل الإسم». Only for
  the numbers this shop gave a tampon to (`people.made_by_shop`) whose person has not signed up; signing up, the
  person writes their own name. Never for an account somebody made, never from another shop
  (`app/actions-customers.ts` nameCustomer, `lib/nameable.ts`; no database change).
- «ارجع» goes back to where a page was opened from («المحل», «خيارات الكارط», «الأرقام»).
- A shop opened today does not get the «جديد» notes about the link, «شكون رجع؟» and the clock (they were news only to
  the owners already there).

### The customers
- A card whose shop lets them choose: «اختار الكادو متاعك» on the card when it is full. Nothing else moves.

### The founder (console)
- **«الإشعارات»** (`/admin/news`): write a note to every owner or to one; «ابعثلو إشعار» on a shop's study page writes to
  that owner's 🔔. The console's tabs slide on a narrow phone.

### Not in it (removed for good, or kept for later)
- The points: «التامبون | النقاط» at sign-up, «النظام متاعي», «عطي نقاط», «نقاط برابط», the roulette sold in a
  points store, switching a shop between systems — kept on branch `systems/split`, not here.
- Pointili Pro and the packs, the golden ticket, staff phones (removed 13 Nov, never on the live database).
- Exactly as live today: the pay page and the prices, `/prix`, the counter, the links, «التاريخ» / «فسّخ», the
  clock, the wheel, the store (founder-only, as on main).

## The database
`schema.sql` is **main's, unchanged**. After it, two files (`scripts/db.mjs` AFTER, `localbase/server.mjs` FILES):

| file | adds | replaces a main function |
| --- | --- | --- |
| `bell-2026-11-13.sql` | `bell_for`, `my_bell`, `my_inbox`, `bell_read` (over the existing `news` and `news_views`) | — |
| `choice-2026-11-13.sql` | `gift_options`, `set_gift_choices`, `choose_gift`, `card_choices` | — |

No table and no column change; nothing of main's is replaced. Both are `create or replace`, re-runnable, and end
with their grants (a new function needs its grant and a PostgREST reload, or the app gets nulls — db.mjs does
both).

## Testing without touching live: `localbase/`
- PGlite + Supabase-like REST, sign-in and SQL door on `127.0.0.1:54321`; no live key anywhere (`localbase/keys.mjs`).
- `start-local.cmd` at the worktree root starts it and the app on `http://localhost:3302` (with
  `NODE_OPTIONS=--max-http-header-size=262144`, or Edge answers HTTP 431). `node server.mjs --reset` for a new,
  empty database, then `node founder.mjs` (founder **20000001** / **founder-local-1**).
- Stop it gently (Ctrl+C): a killed PGlite can lose its data (`.data-last-good` keeps the last good copy).

## Proof (re-run all of it before any release)
- `npx tsc --noEmit`, `npm run lint`, `next build` (in a clean worktree: the root v1 `node_modules` turns it red).
- `node scripts/test.mjs` — main's suite on the local database.
- The screens, A→Z on the local database (`BASE=http://localhost:3302`, `NOLOGO=1`): `bell.mjs`, `choice.mjs`,
  `join.mjs`, `clock.mjs`, `new-tip.mjs`, `install.mjs`, `history.mjs`, `links.mjs`, `counter-items.mjs`, `walk.mjs`;
  `sizes.mjs` (every screen fits one screen from 548 px tall up; `ONLY=` to pick screens, slow on `next dev`).
- `scripts/real-check.sql` on the live database (read-only, writes nothing): `gift_with_dot` and
  `gifts_waiting_with_dot` must be 0 (a gift already holding « · » would read as a choice) — 0 and 0 on 13 Nov.
- **The old accounts** (`node scripts/legacy-check.mjs`, 14 Nov: 139 ✓ · 0 ✗): the database as live has it (the
  release's functions off), old shops and customers in every state live has — vouchers waiting and given, a roulette
  turn to spin and a prize waiting, «شنوّة تبيع», the clock running, the founder's store, a trial, a paid year, the
  old price, news seen and not seen, an owner who is a customer elsewhere. Then: the release's SQL changes **none of
  the 30 tables** (a fingerprint of every row, before and after); every page of the new version opens for each of
  them with their own numbers on it; the visits write none of their data (main's `my_payment()` still starts an
  unpaid shop's offer clock on its first visit, as live does today); their old vouchers are handed over, a tampon
  lands on an old card, an old roulette turn spins, the 🔔 opens.
- **The films** (`node scripts/films-check.mjs`, 6 ✓): «شنوّة تبيع؟» and «الحريف يختار الكادو» open with their poster
  and play, as an owner meets them.
- **Naming a customer** (`node scripts/name-customer.mjs`, 11 ✓): at the counter and from the sheet; one letter
  refused; another shop, or a customer with their own account, never gets the way to change the name.

## What live holds that this version meets (read-only, 14 Nov 2026)
No shop on the store and none with «كود التسجيل» on; **no gift and no waiting voucher holding « · »** — so
«الحريف يختار الكادو» cannot change any card until an owner turns it on. **The 🔔 on day one**: most owners will find
one to four of the notes already published that they never opened (the popup shows them one a visit today; every
button in them still leads to a live page); opening the bell marks them read, and the popups stop asking. (The
counts stay out of this file: the repository is public — `scripts/real-check.sql` gives them, read-only.)

## The films (`scripts/option-films.mjs`, 14 Nov 2026)
Re-filmed on the current screens («انزل على» at the counter, the page's own «شوف كيفاش يخدم»), from lossless frames;
the two soft lights behind the phone stay still (drifting, they changed every pixel of every frame); 540×960 like
the app's other clips, 24 images a second, H.264 veryslow + animation tune, CRF 30, no sound track, index first; a
WebP poster each (the title card): `shop-items-v2.mp4` 2.03 MB → **405 KB**, `gift-choice-v2.mp4` 1.41 MB →
**261 KB**, posters 8 KB and 7 KB, the type still clean. The cache keeps `/clips/*` a year (immutable): a film
changed once it is live gets a new name (`-v3`).

## The day it goes live (only on the founder's word)
1. `git fetch`; merge the latest `origin/main` into `release/no-points` (main also moves from the other computer);
   re-run every proof above.
2. Run `scripts/real-check.sql` on live.
3. A quiet hour, 03:00–07:00 Tunis.
4. **The database first, the two files only** (schema.sql is main's and already on live — it need not run again):
   `SCHEMA=supabase/bell-2026-11-13.sql node scripts/db.mjs`, then `SCHEMA=supabase/choice-2026-11-13.sql node
   scripts/db.mjs` (with the live keys; each run keeps the shops' switches — KEPT — and reloads PostgREST). The old
   site ignores the new functions, so this step alone changes nothing for anybody.
5. **Deploy**: the push to `main` is the deploy (Vercel project «pointidi», www.pointili.online).
6. Watch 30 minutes: Vercel's function logs; the tester account A→Z («المحل», «خيارات الكارط», a tampon, «فسّخ», the
   🔔, a gift to choose).
7. **Rollback in one minute**: Vercel's instant rollback. The database needs nothing undone.
8. **The first 🔔 note** (one short question, as every popup), for the shops on the roulette or the clock — their
   rows moved: «تلوّج على الروليت؟» — «توّا في «المحل» ← «خيارات الكارط»، مع الكارط ترجع للصفر وشنوّة تبيع.»
