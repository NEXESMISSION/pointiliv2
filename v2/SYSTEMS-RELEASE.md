# Going live with the systems, the packs and the golden ticket: protecting the shops that are already there

The founder's rule: the shops and customers already on Pointili, the paying ones first of all, must see no difference, no bug and nothing confusing. This file is the checklist. Nothing goes live until every line is green, and nothing goes live without the founder's own go-ahead.

## What is in this branch (`systems/split`)
- **The systems, one by one** (`supabase/systems-2026-11-08.sql`): an admin switch per shop for the link and for the golden ticket, beside the roulette, store and export switches that were already there. The admin page «الأنظمة» shows which shop has what.
- **The golden ticket**: the owner makes a draw (gifts, moment, who's in). Customers see the countdown and their tickets on their card and right after each tampon. The draw is random and weighted by tickets, and never the same customer twice. The result is shown once. Prizes are handed over at the counter's scan or from the draw page. Winners can be shared on WhatsApp.
  - Winners are told on their phone when the draw is made, once (`draw_tell`, `draws.told_at`): by the first look after the moment (a card, the owner's page), or else by the morning job, which also makes any draw nobody looked at (`draw_settle_all`).
  - At zero the card and the owner's page ask again by themselves until the result is in, then offer a button.
- **The packs** (`supabase/packs-2026-11-09.sql`):
  - Every shop already open is **old**, frozen exactly as it is.
  - New shops start on **Pointili** (base): the card with a gift or the roulette, plus the link.
  - **Pointili Pro** adds the golden ticket, the store as the owner's choice, the customers' file and 3 staff phones. Prices: 55 / 200 / 300 (`lib/plans.ts`).
  - The founder sets a shop's pack in admin, and sees what it changes before saying yes.
- **The owner's «النظام متاعي»** (shops on a pack only): one reward at a time (gift, roulette, store) and the extras. Switching to or from the store first shows what it does to the customers, with their numbers; the promise is kept, so nothing collected is lost.
  - Choosing the store with nothing in it yet: the owner writes the list first, and the store opens with it, in one go (`store_open`). The customers never meet an empty store.
  - In Pointili, the golden ticket's row says Pro; with prizes of an earlier draw still to hand over, it leads to them.
- **Staff phones (Pro)**: the owner invites with a link (one use, 24 h). The staff phone gets the shop's counter (code, number, camera, gifts, prizes, what the clock took from the card in front of it) and nothing else. The owner or a pack downgrade signs it out.
  - The owner sees what each phone gave, today and these 7 days: the customers who scanned the code it showed, tampons by number, gifts and prizes handed over, tampons taken back (`staff_log`, `codes.staff_id`).
  - The owner's Excel file says who gave each tampon («شكون عطاه», and the counts in its summary): the staff phone that showed the code or gave it by number (`codes.staff_id`, `moments.staff_id`, written by `staff_act` only), or the owner. A shop with no staff gets no such column.
  - Invites not used yet show on the owner's page and can be called off.
  - Each phone has its own try limits (60 looks and 30 tampons by number in 10 minutes, as the owner has), never the owner's own.
  - A staff phone's counter looks back 12 hours at most, never the shop's whole past.
  - Staff are not in the shop's golden ticket, as its owner is not.
  - A staff member who opens a shop of their own stops being staff.
  - The founder naming a Pro shop «old» again signs its staff out too (an old shop has no staff page).
- **The pay page** for shops on a pack: Pointili / Pointili Pro, with the pack written in the WhatsApp receipt. The public prices page (`/prix`) shows Pro only once `PRO_PUBLIC=1` is set on Vercel; until then it is exactly today's page. The founder's choice: hidden at launch.
- **A Pointili shop already paid that comes for Pro** gets an upgrade page: Pro's lengths and the ways to pay, its paid months acknowledged (the founder settles them by hand).
- **A staff phone whose shop is stopped** (paused, or its subscription over) says to tell the owner, never to call Pointili or to pay. A phone signed out by its owner goes back to its home, which says so.
- **The founder's payment form** names the pack paid for. Choosing another pack there first lists what it changes (the same list as the pack's own line), and the button waits for it.

## What protects the old shops by design
- Every shop already open is `pack = 'old'`. None of the new screens (the system page, staff, the Pro pay switch) appear for an old shop.
- The golden ticket and the store choice are off for every shop until the founder turns them on. The link stays on for all, as today.
- The database files add new things only. The existing functions that change are `link_new` and `my_export`, and only at release (below).
- `schema.sql` itself gets five small additions, none of which changes what an old shop does:
  - `link_new` refuses a shop whose link the founder switched off;
  - the `links_allowed` column is made there too (`add column if not exists`), so `schema.sql` run on its own never leaves `link_new` reading a column that is not there;
  - after its «who may call what», it gives the new files' functions their grants back when they are in the database (`systems_grants()`, `packs_grants()`). Without that, a run of `schema.sql` alone took them away: staff phones stopped and winners stopped seeing their prizes.
  - two empty columns, `codes.staff_id` and `moments.staff_id` (who gave it, in a shop with staff phones), made beside their tables so `my_export` can read them even where the packs' file never ran;
  - `my_export` (the owner's file) adds `staff` and `by` to each tampon. Like `link_new`, it is an old function that changes: compare the live one with main's before laying it, as for every patch. For a shop without staff, both are always false and empty, and its file is as before.
- `scripts/db.mjs` keeps every switch it can read before a run. On the first run with a column that does not exist yet, it used to fall back to six switches; it now keeps all the others.
- The screens old shops share (the counter, give-by-number, the store editor, the pay page, the card page) changed only where a staff phone, a pack shop or a golden ticket is involved; the old-shop comparison is 47/47 again.
- The morning job (`/api/cron/remind`) also makes the draws whose moment came and tells their winners; with no draw anywhere, it does nothing more than today.
- The store page of a customer whose shop moved to the store still shows a gift or a roulette turn won before. A customer whose shop moved back to the card sees their waiting order. On live today no shop is on the store and none has such a gift or order (read-only check, 9 Nov), so no old shop's page changes.
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
- `node scripts/draw.mjs`: the golden ticket (73 checks).
- `node scripts/packs.mjs`: packs, store switching, staff phones, who gave each tampon (74 checks). It refuses any database but the local one.
- `node scripts/same-pages.mjs <main> <branch>`: the same pages for an old ordinary shop, an old roulette shop, an old store shop and their customer, on today's code and on the branch. Both must run on the same database, with their Next caches cleared (`rm -rf v2/.next`): settings are cached 24 h. On 9 Nov: **47/47 identical**, including the pay page, the counter and its scan screens.
- The live-data check (`scripts/real-check.sql`) asks the new functions, as every real owner and customer, what they would show, in a transaction never committed. On 8 Nov: 384 real shops (10 paying), 553 cards and 555 wallets showed nothing new. Run it again with the packs' functions once they are on the database.
- A fingerprint of every old database function, taken before and after the files are laid: none changed.
- `next build` passes.

## The day it goes live
1. **Merge the latest main** into `systems/split` (other sessions keep shipping), then re-run every check above, locally.
2. **Pick a quiet hour: 03:00–07:00 Tunis.** Over the last 30 days that window had 1 tampon, against 121 between 12:00 and 13:00.
3. **Apply the database first.** Run `node scripts/db.mjs` from the branch, with the live keys: schema.sql, then the systems and packs files, the KEPT switches guarded. Expected results:
   - `pack` comes as `'old'` for every shop already there.
   - `link_new` and `my_export` are the only old functions that change. `link_new` refuses a shop whose link is switched off (dry run on 8 Nov: off → refused, on → made); `my_export` adds who gave each tampon (nothing for a shop without staff). Before that, compare the live `link_new` and `my_export` with the ones in main's schema.sql, as for every patch.
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
8. **Pro stays off the public prices page at launch** (the founder, 9 Nov 2026: «keep it hidden»). Do not set `PRO_PUBLIC` on Vercel: `/prix` stays exactly as today. Set `PRO_PUBLIC=1` and redeploy only when the founder says to show it.
