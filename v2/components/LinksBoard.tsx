"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, Eye, Link2, Send, Share2, X } from "lucide-react";
import { cancelLink, myLinks, newLink, type LinkRow, type Links } from "@/app/actions-links";
import { Ago } from "@/components/Ago";
import { Back } from "@/components/Back";
import { Sheet, SheetGo } from "@/components/Client";
import { useScreen } from "@/components/Tracker";
import { Btn, Field, Icon3D } from "@/components/ui";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

type Item = { id: number; name: string };
type Made = { url: string; label: string };

const ERR: Record<string, string> = {
  slow_down: t.linkErrSlow,
  too_many: t.linkErrMany,
  shut: t.linkErrShut,
  paused: t.errPaused,
  pick_item: t.linkErrPick,
};

/** The link said short, the way a person reads it: no «https://». */
const short = (url: string) => url.replace(/^https?:\/\//, "");

/** Copied to the phone's clipboard, with the old way for a browser that refuses the new one. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.append(box);
      box.select();
      const ok = document.execCommand("copy");
      box.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * «تامبون برابط»: for an owner who sells online, a tampon sent instead of
 * shown. One tap makes a new link (who it is for, if he likes; which thing,
 * in a shop that says what it sells), and a sheet sends it — WhatsApp, a
 * copy, or the phone's own share. Under it, every link sent and where it
 * stands, kept fresh while the page is open; one that waits can be cancelled.
 */
export function LinksBoard({ shop, items, first }: { shop: { name: string; color: string }; items: Item[]; first: Links }) {
  useScreen("links");
  const [list, setList] = useState<Links>(first);
  const [label, setLabel] = useState("");
  const [item, setItem] = useState<number | null>(items.length === 1 ? items[0]!.id : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [asking, setAsking] = useState<LinkRow | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const fresh = await myLinks().catch(() => null);
    if (fresh) setList(fresh);
  }, []);

  // kept fresh while it is open: a link taken shows who took it
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = window.setInterval(tick, 8000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const need = items.length > 0 && item === null;
  const make = async () => {
    if (busy || need) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await newLink(label.trim(), items.length ? item : null);
      if (r.ok) {
        signal("link_made", label.trim() ? "label" : "none");
        setMade({ url: r.url, label: label.trim() });
        setLabel("");
        void refresh();
      } else {
        signal("form_error", `link · ${r.error}`);
        setErr(ERR[r.error] ?? t.errNetwork);
      }
    } catch {
      setErr(t.errNetwork);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (row: LinkRow) => {
    setAsking(null);
    // said at once on the screen, then the database's word
    setList((l) => ({ ...l, waiting: Math.max(0, l.waiting - 1), links: l.links.map((x) => (x.id === row.id ? { ...x, state: "cancelled" } : x)) }));
    signal("link_cancel");
    await cancelLink(row.id).catch(() => false);
    void refresh();
  };

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col px-5">
      <header className="flex shrink-0 items-center gap-3 pt-3">
        <Back home="/shop" />
        <h1 className="min-w-0 flex-1 truncate text-[1.25rem] font-bold">{t.linksTitle}</h1>
      </header>
      <p className="mt-2 shrink-0 px-0.5 text-[0.8125rem] leading-snug text-muted">{t.linksSub}</p>

      {/* the one thing to do here: a new link */}
      <section className="mt-[2dvh] shrink-0 rounded-[1.5rem] bg-surface p-4 shadow-card">
        {items.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 px-1 text-[0.8125rem] font-semibold text-muted">{t.linkPick}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setItem(it.id)}
                  aria-pressed={item === it.id}
                  className={`press h-9 max-w-full truncate rounded-full px-3.5 text-[0.9375rem] font-bold ${item === it.id ? "bg-brand text-white" : "bg-canvas text-body"}`}
                >
                  {it.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <Field
          ref={labelRef}
          label={t.linkFor}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.linkForPh}
          maxLength={40}
          autoComplete="off"
          enterKeyHint="go"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void make();
            }
          }}
          className="!h-[3.25rem]"
        />
        <p className="mt-1 px-1 text-[0.75rem] text-faint">{t.linkForHint}</p>
        {err && <p className="mt-2 rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.8125rem] font-medium text-coral">{err}</p>}
        <Btn type="button" onClick={() => void make()} disabled={busy || need} className="mt-3 h-[3.25rem] font-bold">
          <Link2 className="size-5" strokeWidth={2.4} /> {busy ? t.linkMaking : t.linkMake}
        </Btn>
      </section>

      {/* every link sent: who it was for, where it stands */}
      <section className="mt-[2dvh] flex min-h-[9rem] flex-1 flex-col pb-3">
        <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-[0.9375rem] font-bold">{t.linksList}</h2>
          {list.links.length > 0 && <span className="num text-[0.75rem] text-muted">{fill(t.linksCount, { waiting: String(list.waiting), used: String(list.used) })}</span>}
        </div>
        <div data-list className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
          {list.links.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-5 text-center">
              <Icon3D name="gift" size={44} className="animate-float" />
              <p className="mt-2 text-balance text-[0.8125rem] leading-snug text-muted">{t.linksEmpty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {list.links.map((row) => (
                <Row key={row.id} row={row} onCancel={() => setAsking(row)} />
              ))}
            </ul>
          )}
        </div>
        {list.links.some((l) => l.state === "waiting") && <p className="mt-1.5 shrink-0 px-1 text-[0.75rem] text-faint">{t.linkLost}</p>}
      </section>

      {made && (
        <SendSheet
          made={made}
          shop={shop.name}
          onClose={() => setMade(null)}
          onAnother={() => {
            setMade(null);
            // the next customer's name, straight away
            window.setTimeout(() => labelRef.current?.focus(), 250);
          }}
        />
      )}
      {asking && (
        <Sheet
          label={t.linkCancelAsk}
          tone="coral"
          title={t.linkCancelAsk}
          under={t.linkCancelBody}
          onClose={() => setAsking(null)}
          action={
            <SheetGo tone="coral" onClick={() => void cancel(asking)}>
              {t.linkCancelYes}
            </SheetGo>
          }
          dismiss={t.linkCancelNo}
        >
          <p className="mt-2 truncate text-[0.9375rem] font-bold">{asking.label ?? t.linkNoLabel}</p>
        </Sheet>
      )}
    </main>
  );
}

/** A link sent: who it was for (or the hour), where it stands, and «بطّل» while it waits. */
function Row({ row, onCancel }: { row: LinkRow; onCancel: () => void }) {
  const live = row.state === "waiting" || row.state === "opened" || row.state === "soon";
  const look = {
    waiting: { icon: Clock, tone: "bg-brand-soft text-brand", line: t.linkWaiting },
    opened: { icon: Eye, tone: "bg-brand-soft text-brand", line: t.linkOpened },
    soon: { icon: Clock, tone: "bg-brand-soft text-brand", line: t.linkSoon },
    used: { icon: Check, tone: "bg-mint-soft text-mint", line: row.name ? fill(t.linkUsed, { name: row.name }) : t.linkUsedNone },
    cancelled: { icon: X, tone: "bg-canvas text-faint", line: t.linkCancelled },
  }[row.state];
  const Icon = look.icon;
  return (
    <li className={`flex items-center gap-3 px-3.5 py-3 ${row.state === "cancelled" ? "opacity-60" : ""}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${look.tone}`}>
        <Icon className="size-5" strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <b className="truncate text-[0.9375rem] font-bold">{row.label ?? t.linkNoLabel}</b>
          {row.item && <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[0.75rem] font-semibold text-muted">{row.item}</span>}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.75rem] text-muted">
          <span className={`truncate ${row.state === "used" ? "font-semibold text-mint" : ""}`}>{look.line}</span>
          <span aria-hidden>·</span>
          <Ago at={row.used_at ?? row.at} className="shrink-0" />
        </span>
      </span>
      {live && (
        <button type="button" onClick={onCancel} className="press h-9 shrink-0 rounded-full bg-canvas px-3 text-[0.8125rem] font-bold text-muted">
          {t.linkCancel}
        </button>
      )}
    </li>
  );
}

/**
 * The link just made, and the ways to send it: WhatsApp (where most of these
 * customers are), a copy for Messenger or Instagram, and the phone's own
 * share when it has one. «رابط آخر» goes straight on to the next customer.
 */
function SendSheet({ made, shop, onClose, onAnother }: { made: Made; shop: string; onClose: () => void; onAnother: () => void }) {
  const [copied, setCopied] = useState(false);
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const text = `${fill(t.linkWaText, { shop })}\n${made.url}`;
  const doCopy = async () => {
    if (await copy(made.url)) {
      signal("link_copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: fill(t.linkWaText, { shop }), url: made.url });
      signal("link_share");
    } catch {
      /* the person closed it */
    }
  };
  return (
    <Sheet
      label={t.linkReady}
      tone="mint"
      icon={<Icon3D name="gift" size={64} className="mx-auto animate-pop" />}
      title={t.linkReady}
      under={t.linkReadyBody}
      onClose={onClose}
      action={<SheetGo onClick={onAnother}>{t.linkAnother}</SheetGo>}
      dismiss={t.done}
    >
      {made.label && <p className="mt-2 truncate text-[0.9375rem] font-bold text-brand">{made.label}</p>}
      {/* the link itself, left to right, a tap copies it */}
      <button type="button" onClick={() => void doCopy()} dir="ltr" className="press mt-3 flex w-full items-center gap-2 rounded-[1rem] bg-canvas px-3.5 py-3 text-start ring-1 ring-inset ring-line">
        <Link2 className="size-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-body">{short(made.url)}</span>
        {copied ? <Check className="size-4 shrink-0 text-mint" strokeWidth={3} /> : <Copy className="size-4 shrink-0 text-muted" />}
      </button>
      <p className="mt-1.5 text-[0.75rem] font-semibold text-muted">{t.linkOnce}</p>
      <div className={`mt-3 grid gap-2 ${canShare ? "grid-cols-3" : "grid-cols-2"}`}>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => signal("link_wa")}
          className="press flex h-12 items-center justify-center gap-1.5 rounded-[1rem] bg-[#25D366] text-[0.9375rem] font-bold text-white"
        >
          <Send className="size-4" /> {t.linkWa}
        </a>
        <button type="button" onClick={() => void doCopy()} className="press flex h-12 items-center justify-center gap-1.5 rounded-[1rem] bg-brand-soft text-[0.9375rem] font-bold text-brand">
          {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" />} {copied ? t.linkCopied : t.linkCopy}
        </button>
        {canShare && (
          <button type="button" onClick={() => void share()} className="press flex h-12 items-center justify-center gap-1.5 rounded-[1rem] bg-brand-soft text-[0.9375rem] font-bold text-brand">
            <Share2 className="size-4" /> {t.linkShare}
          </button>
        )}
      </div>
    </Sheet>
  );
}
