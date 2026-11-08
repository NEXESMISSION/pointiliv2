# Going live with the systems and the golden ticket: protecting the shops that are already there

The founder's rule: the shops and customers already on Pointili, the paying ones first of all, must see no difference, no bug and nothing confusing. This file is the checklist. Nothing goes live until every line is green.

## What protects them by design
- Every new thing is **off** for every shop until the founder turns it on in the admin page.
  - The golden ticket is off for all 384 real shops.
  - The link stays on for all of them, as it is today.
- The new database pieces sit next to the old ones; none of the old ones are replaced. The old site never calls the new ones.
- The new code falls back to today's screens whenever a new answer is missing (for example, `my_systems` failing).

## Proof gathered on 8 Nov 2026
Before every release, run these checks again:
- `node scripts/draw.mjs`: the golden ticket's rules, on throwaway robot accounts (67/67).
- `node scripts/same-pages.mjs <main> <branch>`: 44 pages compared between main and the branch, for an ordinary shop, a roulette shop, a store shop and their customer (44/44 identical).
- The live-data check (`scripts/real-check.sql`) asks the new functions, as every real owner and every real customer, what they would show. It runs in a transaction that is never committed. On 8 Nov:
  - 384 real shops (10 paying) returned today's screens.
  - 553 cards (338 at paying shops) showed nothing new.
  - 555 wallets showed nothing new.
- A fingerprint of every old database function, taken before and after: none changed.
- `next build` passes.

## The day it goes live
1. **Merge the latest main** into `systems/split` (other sessions keep shipping), then re-run every check above.
2. **Pick a quiet hour: 03:00–07:00 Tunis.** Over the last 30 days that window had 1 tampon, against 121 between 12:00 and 13:00.
3. **Apply the database first.** Run `node scripts/db.mjs` from the branch: schema.sql, then the systems file, with the KEPT switches guarded. The only old function it changes is `link_new`, which refuses a shop whose link is switched off (dry-run on 8 Nov: off → refused, on → made). Before that, compare the live `link_new` with the one in main's schema.sql, as for every patch.
4. **Deploy** after `git fetch`, making sure origin/main is contained in what is deployed.
5. **Watch for 30 minutes:**
   - run `same-pages.mjs` against the live site;
   - run the live-data check again;
   - watch Vercel's function logs for errors.
6. **If anything is wrong, roll back in one minute.**
   - Vercel's instant rollback restores the previous deployment.
   - The database needs nothing undone: the old site ignores the new pieces.
   - The only exception is `link_new`. Re-run main's version of it, or simply leave it: with every shop's link on, it behaves exactly as before.
7. **Turn the golden ticket on for one shop first,** one whose owner knows it is new, ideally not a paying one. Watch one full draw: the countdown, the draw itself, the hand-over at the counter. Only then offer it to others, paying shops included, and only one shop at a time, when that owner asks for it.
