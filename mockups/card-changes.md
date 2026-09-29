# When a shop changes its card: the rules and how to build them

Board 8 (`8-change.html`) shows the owner's side and the table of every case. This file is the
engineering side: what the database must hold so that no change ever takes something away
from a customer, and what is wrong in today's code.

## The four rules

1. **A promise is a promise.** A card a customer has started keeps the terms it started with,
   unless the new terms are better for them; then they apply at once.
2. **A gift earned is kept.** Reaching a gift (a level or the goal) creates a voucher with its
   own name and deadline. No later edit, system switch, suspension or new card removes it.
3. **One live card per shop, one code per shop.** The counter QR and the join code belong to
   the shop, never to a card, so printed stickers survive every change.
4. **Preview before, undo after.** Every rules change shows its impact (counted on the server)
   before it is saved, can be restored later, and is logged with who made it.

## Data model (the remake)

- `card_versions` — immutable rows: `business_id`, `version` (1, 2, 3…), `system`
  (`stamps` | `points`; levels are stamps with milestones), `goal`, `reward`, `levels`
  (`[{stamps, name}]`), `valid_days`, `points_per_dinar`, `catalog` (`[{points, name}]`),
  `created_by`, `created_at`. Cosmetics (name, colours, logo, cover, stamp mark) live on the
  shop and change in place: they carry no promise.
- `businesses.live_version` — the version new cards start on.
- `customers.version_id` — the version this customer's current card follows. Set on the first
  stamp of a card; the goal, levels and deadline are read from it (this generalises today's
  `card_target`).
- `vouchers` — `customer_id`, `business_id`, `version_id`, `kind` (`level` | `goal` |
  `points`), `title` (a snapshot), `expires_at`, `used_at`, `status`. A redemption uses a
  voucher; the 15-minute code at the till is bound to the voucher, not to today's rules.
- `points_ledger` — `customer_id`, `delta`, `reason` (`purchase` | `redeem` | `convert` |
  `expire`), `amount_paid`, `version_id`. The balance is the sum; nothing is ever edited.

## What a save does

The owner (or the founder, acting as the shop) sends the new terms with the version they
loaded. The server:

1. Rejects the save if `live_version` moved since (someone else saved) → «الكارط تبدّلت توّا».
2. Computes the impact for the preview, per customer with a card in progress:
   - goal lowered → customers now at or past it get their voucher now (count + cost shown);
   - goal raised → they keep the old goal (count shown);
   - level moved earlier → customers already past the new point get it now;
   - level moved later, removed, or levels switched off → customers in progress keep the
     levels of their version;
   - level added → counts only for customers who reach it from now on (a customer already
     past it gets it on their next card);
   - validity shortened → new cards only; lengthened → everyone's deadline moves out;
   - reward renamed → customers in progress keep the reward they were promised, unless the
     owner ticks «للكل» (only offered as an upgrade).
3. On confirm, in one transaction: inserts the version, moves `live_version`, applies the
   "better for the customer" parts to cards in progress (new version pin, vouchers created),
   logs `card_version_created` with the actor, and invalidates live stamp/points QR tokens.

Stamps are counted with the customer row locked (`select … for update`), so a scan and a
save can never interleave: the stamp lands on one clear version.

## Switching systems

- **Stamps → points.** Every stamp in progress converts at the value it carried:
  `points_per_stamp = ceil(catalog price of the goal reward ÷ goal)` (100-point coffee on a
  10-stamp card → 10 points a stamp), rounded in the customer's favour. Vouchers stay
  vouchers. The customer sees one banner: «السبعة تامبونات متاعك ولّاو 70 نقطة».
- **Points → stamps.** The owner picks: convert (points ÷ points-per-stamp, rounded up; every
  full goal becomes a voucher) or freeze the catalog and let points be spent until a date.
- Stamps ↔ levels is not a switch: it is a card edit and follows the rules above.

## Other cases the board lists

- Suspension pauses every clock: on reactivation, `card_expires_at` and voucher deadlines move
  out by the time the shop was suspended. Scanning is refused while suspended; cards and
  vouchers stay visible.
- A shop is never deleted: `businesses.status = 'closed'` keeps every card and voucher in the
  customers' history («المحل سكّر»). Today `on delete cascade` would erase them.
- Points: a new rate applies to future purchases; a catalog price rise waits 14 days (shown to
  customers), a drop applies at once; turning expiry on counts from that day.
- Vouchers get a clear deadline (default 30 days) and a reminder 3 days before; the owner can
  extend one.
- Stats join on `version_id`, so totals add up across versions and the owner can compare
  before and after a change.

## Wrong in today's code (to fix during the remake)

| Where | What happens | Fix |
| --- | --- | --- |
| `save_loyalty_card` (0012) | Renaming the main reward renames it for customers mid-card | Pin to the version |
| `save_loyalty_card` levels | Moving a level later or switching it off takes it from customers who reached it | Vouchers at crossing + version pin |
| Level availability | A level added below customers' balances can be claimed by all at once | Levels count on crossing, from the save on |
| `save_loyalty_card` validity | Shortening `valid_days` shortens cards already running | New cards only |
| `merchant_confirm_redemption` | A level code shown at the till can fail if the level moved meanwhile | Honour the code for its 15 minutes |
| Suspension | Card deadlines keep running while a shop is suspended | Pause and shift on reactivation |
| Business delete | `on delete cascade` would erase customers' cards | Status `closed`, never delete |
| Concurrent saves | The last save silently overwrites | Version check on save |

## Tests to add (e2e)

Raise the goal mid-card; lower it past some balances; add/move/remove a level with customers on
both sides of it; shorten and lengthen validity; switch stamps → points and back; confirm a
level code after the level moved; suspend for 10 days and check deadlines moved by 10; two
saves on the same loaded version (the second must fail).
