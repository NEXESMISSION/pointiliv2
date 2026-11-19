"use client";

import { useState } from "react";
import { Check, HandHelping } from "lucide-react";
import { adminHelpSent } from "@/app/admin/actions";
import { agoSaid, fill, t } from "@/lib/t";

/**
 * The founder's help message to an owner, in one tap: WhatsApp opens with it written, nothing to copy (18 Nov 2026:
 * «a button next to each client box, outside and inside, that sends that message on WhatsApp, no copy paste»). The
 * founder's own words, signed «l'équipe Pointili», and no selling in them: an owner who likes Pointili goes on and
 * pays on their own. The greeting follows the hour of the tap («Sbe7 el khir» before noon, «Bonjour» in the day,
 * «Bonsoir» from 18:00), so it is written at the tap; the page draws a fixed «Bonjour», the same on the server and
 * the phone.
 */
export function helpMsgHref(phone: string, at?: Date): string {
  const h = at ? at.getHours() : 12;
  const hi = h >= 5 && h < 12 ? "Sbe7 el khir" : h >= 12 && h < 18 ? "Bonjour" : "Bonsoir";
  return `https://wa.me/216${phone}?text=${encodeURIComponent(fill(t.aHelpMsg, { hi }))}`;
}

/**
 * The button: `phone` is the owner's 8 digits, as the console keeps them. A tap counts as sent (19 Nov 2026: «a way
 * to know if I sent the help message»): kept in the database (admin_help_sent), so on the board, on the shop's page
 * and on any phone it then reads «بعثتلو ميساج المعاونة · من …», paler, with a ✓. It still sends again.
 * `at` is the last tap (admin_board.help_at), `now` the page's clock.
 */
export function HelpMsg({ shop, phone, at, now, className = "" }: { shop: string; phone: string; at?: string | null; now: number; className?: string }) {
  const [sent, setSent] = useState<{ at: string; now: number } | null>(at ? { at, now } : null);
  return (
    <a
      href={helpMsgHref(phone)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        const tap = new Date();
        e.currentTarget.href = helpMsgHref(phone, tap);
        const before = sent;
        setSent({ at: tap.toISOString(), now: tap.getTime() });
        // not kept (no network, signed out): the button says what the database says
        void adminHelpSent(shop)
          .catch(() => null)
          .then((kept) => {
            if (!kept) setSent(before);
          });
      }}
      className={`${className} ${sent ? "bg-[#25D366]/15 text-[#128C4B]" : "bg-[#25D366] text-white"}`}
    >
      {sent ? (
        <>
          <Check className="size-4 shrink-0" /> {fill(t.aHelpSent, { ago: agoSaid(sent.now - Date.parse(sent.at)) })}
        </>
      ) : (
        <>
          <HandHelping className="size-4 shrink-0" /> {t.aHelpBtn}
        </>
      )}
    </a>
  );
}
