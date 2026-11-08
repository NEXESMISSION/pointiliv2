# Going live with the systems, the packs and the golden ticket: protecting the shops that are already there

The founder's rule: the shops and customers already on Pointili, the paying ones first of all, must see no difference, no bug and nothing confusing. This file is the checklist. Nothing goes live until every line is green, and nothing goes live without the founder's own go-ahead.

## What is in this branch (`systems/split`)
- **The systems, one by one** (`supabase/systems-2026-11-08.sql`): an admin switch per shop for the link and for the golden ticket, beside the roulette, store and export switches that were already there. The admin page «الأنظمة» shows which shop has what.
- **The golden ticket**: the owner makes a draw (gifts, moment, who's in). Customers see the countdown and their tickets on their card and right after each tampon. The draw is random and weighted by tickets, and never the same customer twice. The result is shown once. Prizes are handed over at the counter's scan or from the draw page. Winners can be shared on WhatsApp.
- **The packs** (`supabase/packs-2026-11-09.sql`):
  - Every shop already open is **old**, frozen exactly as it is.
  - New shops start on **Pointili** (base): the card with a gift or the roulette, plus the link.
  - **Pointili Pro** adds the golden ticket, the store as the owner's choice, the customers' file and 3 staff phones. Prices: 55 / 200 / 300 (`lib/plans.ts`).
  - The founder sets a shop's pack in admin. He sees what it changes before saying yes.
- **The owner's «النظام متاعي»** (shops on a pack only): one reward at a time (gift, roulette, store) and the extras. Switching to or from the store first shows what it does to the customers, with their numbers; the promise is kept, so nothing collected is lost.
- **Staff phones (Pro)**: the owner invites with a link (one use, 24 h). The staff phone gets the shop's counter (code, number, camera, gifts, prizes) and nothing else. The owner or a pack downgrade signs it out.
- **The pay page** for shops on a pack: Pointili / Pointili Pro, with the pack written in the WhatsApp receipt. The public prices page has a Pro section.

## What protects the old shops by design
- Every shop already open is `pack = 'old'`. None of the new screens (the system page, staff, the Pro pay switch) appear for an old shop.
- The golden ticket and the store choice are off for every shop until the founder turns them on. The link stays on for all, as today.
- The database files add new things only. The one existing function changed is `link_new`, and only at release (below).
- The new code falls back to today's screens whenever a new answer is missing (`my_systems` failing, for example).
- A staff phone's calls run through one new function, `staff_act`, and only when the owner's own function answered «no shop». An owner never gets that answer, so an owner's counter takes exactly today's path.

## Testing without touching live: `localbase/`
Everything above was built and tested on a database on this computer:
- Postgres runs locally (PGlite), with Supabase's REST, sign-in and SQL door in front, on 127.0.0.1:54321.
- The private copies' `.env.local` hold **no live key**: `node localbase/keys.mjs` prints the local one.
- To start: `cd localbase && npm install && node server.mjs` (add `--reset` for a new, empty database), then `node founder.mjs`.
- The existing suite `scripts/test.mjs` passes there: 332/335. The 3 left need Storage's https logo and Realtime, which are not served locally.

## Proof (re-run all of it before any release)
- `node scripts/test.mjs`: the whole app's database rules.
- `node scripts/draw.mjs`: the golden ticket (67 checks).
- `node scripts/packs.mjs`: packs, store switching, staff phones (47 checks). It refuses any database but the local one.
- `node scripts/same-pages.mjs <main> <branch>`: the same pages for an old ordinary shop, an old roulette shop, an old store shop and their customer, on today's code and on the branch. Both must run on the same database, with their Next caches cleared (`rm -rf v2/.next`): settings are cached 24 h. On 9 Nov: **47/47 identical**, including the pay page, the counter and its scan screens.
- The live-data check (`scripts/real-check.sql`) asks the new functions, as every real owner and customer, what they would show, in a transaction never committed. On 8 Nov: 384 real shops (10 paying), 553 cards and 555 wallets showed nothing new. Run it again with the packs' functions once they are on the database.
- A fingerprint of every old database function, taken before and after the files are laid: none changed.
- `next build` passes.

## The day it goes live
1. **Merge the latest main** into `systems/split` (other sessions keep shipping), then re-run every check above, locally.
2. **Pick a quiet hour: 03:00–07:00 Tunis.** Over the last 30 days that window had 1 tampon, against 121 between 12:00 and 13:00.
3. **Apply the database first.** Run `node scripts/db.mjs` from the branch, with the live keys: schema.sql, then the systems and packs files, the KEPT switches guarded. Expected results:
   - `pack` comes as `'old'` for every shop already there.
   - `link_new` is the only old function that changes. It refuses a shop whose link is switched off (dry run on 8 Nov: off → refused, on → made). Before that, compare the live `link_new` with the one in main's schema.sql, as for every patch.
4. **Deploy** after `git fetch`, making sure origin/main is contained in what is deployed.
5. **Watch for 30 minutes:**
   - run `same-pages.mjs` against the live site;
   - run the live-data check;
   - watch Vercel's function logs for errors.
6. **If anything is wrong, roll back in one minute.**
   - Vercel's instant rollback restores the previous deployment.
   - The database needs nothing undone: the old site ignores the new pieces.
   - The only exception is `link_new`. Re-run main's version, or leave it: with every shop's link on, it behaves exactly as before.
7. **Turn things on one shop at a time.** Start with a shop whose owner knows it's new, ideally not a paying one: put it on Pro, watch one full draw and one staff phone. Old shops move to a pack only when their owner asks.
