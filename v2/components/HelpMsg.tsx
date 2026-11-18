"use client";

import { HandHelping } from "lucide-react";
import { fill, t } from "@/lib/t";

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

/** The button: `phone` is the owner's 8 digits, as the console keeps them. */
export function HelpMsg({ phone, className }: { phone: string; className?: string }) {
  return (
    <a
      href={helpMsgHref(phone)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        e.currentTarget.href = helpMsgHref(phone, new Date());
      }}
      className={className}
    >
      <HandHelping className="size-4 shrink-0" /> {t.aHelpBtn}
    </a>
  );
}
