"use client";

import { useState, type ComponentType } from "react";
import { AlarmClock, Check, HandHelping } from "lucide-react";
import { adminHelpSent, adminRemindSent } from "@/app/admin/actions";
import { agoSaid, fill, t } from "@/lib/t";

/** The greeting by the hour of the tap: «Sbe7 el khir» before noon, «Bonjour» in the day, «Bonsoir» from 18:00. */
const hiAt = (at?: Date) => {
  const h = at ? at.getHours() : 12;
  return h >= 5 && h < 12 ? "Sbe7 el khir" : h >= 12 && h < 18 ? "Bonjour" : "Bonsoir";
};

/**
 * The founder's help message to an owner, in one tap: WhatsApp opens with it written, nothing to copy (18 Nov 2026:
 * «a button next to each client box, outside and inside, that sends that message on WhatsApp, no copy paste»). The
 * founder's own words, signed «l'équipe Pointili», and no selling in them: an owner who likes Pointili goes on and
 * pays on their own. The greeting follows the hour of the tap, so it is written at the tap; the page draws a fixed
 * «Bonjour», the same on the server and the phone.
 */
export function helpMsgHref(phone: string, at?: Date): string {
  return `https://wa.me/216${phone}?text=${encodeURIComponent(fill(t.aHelpMsg, { hi: hiAt(at) }))}`;
}

const TN = "Africa/Tunis";
const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TN }).format(d);
const timeOf = (d: Date) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TN }).format(d);
const dateOf = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: TN }).format(d);

/** When the trial ends, said the founder's way, from the moment of the tap: «twafa lyoum 20:40», «twafa ghodwa 9:15», «twafa nhar 24/11 18:00», or «twafet». */
export function trialEndSaid(end: string, at: Date): string {
  const e = new Date(end);
  if (Number.isNaN(e.getTime()) || e <= at) return "twafet";
  const day = dayOf(e);
  if (day === dayOf(at)) return `twafa lyoum ${timeOf(e)}`;
  if (day === dayOf(new Date(at.getTime() + 86_400_000))) return `twafa ghodwa ${timeOf(e)}`;
  return `twafa nhar ${dateOf(e)} ${timeOf(e)}`;
}

/**
 * The founder's reminder of the trial's end (19 Nov 2026, the message he wrote to Kossay, then «make this a
 * message, not for help but for the reminder»): the greeting of the hour, the owner's first name, when the trial
 * ends (or that it ended), and that the tampons already given stay. No 👋: a wa.me link breaks it.
 */
export function remindMsgHref(phone: string, name: string | null | undefined, end: string, at?: Date): string {
  const tap = at ?? new Date(end);
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const text = fill(t.aRemindMsg, { hi: hiAt(at), name: first ? ` ${first}` : "", ends: trialEndSaid(end, tap) });
  return `https://wa.me/216${phone}?text=${encodeURIComponent(text)}`;
}

type Look = { on: string; done: string; Icon: ComponentType<{ className?: string }>; label: string; short: string; sent: string };
const LOOKS: Record<"help" | "remind", Look> = {
  help: { on: "bg-[#25D366] text-white", done: "bg-[#25D366]/15 text-[#128C4B]", Icon: HandHelping, label: t.aHelpBtn, short: t.aHelpShort, sent: t.aHelpSent },
  remind: { on: "bg-coral text-white", done: "bg-coral-soft text-coral", Icon: AlarmClock, label: t.aRemindBtn, short: t.aRemindShort, sent: t.aRemindSent },
};

/**
 * One of the founder's WhatsApp messages, as a button. A tap counts as sent (19 Nov 2026: «a way to know if I sent
 * the help message»): kept in the database, so on the board, on the shop's page and on any phone it then reads
 * «بعثتلو … · من …», paler, with a ✓. It still sends again. `at` is the last tap, `now` the page's clock; `href`
 * writes the message at the tap; `short`: two side by side, the words cut down to the message's name.
 */
function WaMsg({ look, href, keep, at, now, short = false, className = "" }: { look: Look; href: (tap?: Date) => string; keep: () => Promise<string | null>; at?: string | null; now: number; short?: boolean; className?: string }) {
  const [sent, setSent] = useState<{ at: string; now: number } | null>(at ? { at, now } : null);
  const ago = sent ? agoSaid(sent.now - Date.parse(sent.at)) : "";
  return (
    <a
      href={href()}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        const tap = new Date();
        e.currentTarget.href = href(tap);
        const before = sent;
        setSent({ at: tap.toISOString(), now: tap.getTime() });
        // not kept (no network, signed out): the button says what the database says
        void keep()
          .catch(() => null)
          .then((kept) => {
            if (!kept) setSent(before);
          });
      }}
      className={`${className} ${sent ? look.done : look.on}`}
    >
      {sent ? <Check className="size-4 shrink-0" /> : <look.Icon className="size-4 shrink-0" />}
      {sent && short ? (
        // half the width: the message's name, and when, under it
        <span className="flex min-w-0 flex-col items-center leading-tight">
          <span className="max-w-full truncate">{look.short}</span>
          <span className="max-w-full truncate text-[0.6875rem] font-semibold opacity-80">{ago}</span>
        </span>
      ) : (
        <span className="min-w-0 truncate">{sent ? fill(look.sent, { ago }) : look.label}</span>
      )}
    </a>
  );
}

/** The help message: `phone` is the owner's 8 digits, as the console keeps them. */
export function HelpMsg({ shop, phone, at, now, short, className }: { shop: string; phone: string; at?: string | null; now: number; short?: boolean; className?: string }) {
  return <WaMsg look={LOOKS.help} href={(tap) => helpMsgHref(phone, tap)} keep={() => adminHelpSent(shop)} at={at} now={now} short={short} className={className} />;
}

/** The reminder of the trial's end (`end`: the trial's end, as the board has it), to the owner by his first name. */
export function RemindMsg({ shop, phone, name, end, at, now, short, className }: { shop: string; phone: string; name?: string | null; end: string; at?: string | null; now: number; short?: boolean; className?: string }) {
  return <WaMsg look={LOOKS.remind} href={(tap) => remindMsgHref(phone, name, end, tap)} keep={() => adminRemindSent(shop)} at={at} now={now} short={short} className={className} />;
}
