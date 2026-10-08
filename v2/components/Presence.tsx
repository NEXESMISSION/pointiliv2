"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { digits, pretty } from "@/lib/phone";
import { agoSaid } from "@/lib/t";

/**
 * Who is on the site right now, in the console (admin_online, through
 * /api/admin/online). One question for the whole page, asked again every 15
 * seconds while the console is on the screen, and at once when it comes back.
 *
 *   here — a page of the site on their screen, touched in the last 90 seconds
 *   idle — on their screen, left alone (the counter open on the till)
 *   gone — not now, but seen in the last half hour
 *
 * The server decides every state with its own clock (a ping in the last 75
 * seconds that was not «away»), so a wrong clock on a phone or here changes
 * nothing; the «since» words are counted against the server's time too.
 */

type State = "here" | "idle" | "gone";
export type Live = { user: string; state: State; path: string | null; since: string | null; at: string; name: string | null; phone: string | null; shop: { id: string; name: string } | null };
type Online = { now: string; people: Live[]; strangers: number };

let data: Online | null = null;
let by = new Map<string, Live>();
let skew = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let loading = false;
const listeners = new Set<() => void>();
const EVERY_MS = 15_000;

async function load() {
  if (loading || document.visibilityState !== "visible") return;
  loading = true;
  try {
    const res = await fetch("/api/admin/online", { cache: "no-store" });
    if (res.ok) {
      const next = (await res.json()) as Online;
      data = next;
      by = new Map(next.people.map((p) => [p.user, p]));
      skew = Date.parse(next.now) - Date.now();
      listeners.forEach((l) => l());
    }
  } catch {
    /* the next round tries again; what is shown stays */
  } finally {
    loading = false;
  }
}
const onVisible = () => void load();

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    void load();
    timer = setInterval(() => void load(), EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

/**
 * The page's live list. A component hears about a new round only once it is
 * on the screen (its effect subscribes it, its cleanup lets go), so nothing
 * ever updates a component that is not mounted; the first paint is what the
 * server drew (nothing), the dots arrive with the first answer.
 */
function useOnline() {
  const [, setRound] = useState(0);
  useEffect(() => subscribe(() => setRound((n) => n + 1)), []);
  return data;
}

/** The server's now, as close as this browser can tell. */
const serverNow = () => Date.now() + skew;

/** Where on the site, said the way one says it. */
export function whereSaid(path: string | null): string {
  if (!path) return "";
  const p = path.split("?")[0]!;
  const places: [RegExp, string][] = [
    [/^\/shop\/qr/, "في الكود"],
    [/^\/shop\/collect/, "يسكاني حريف"],
    [/^\/shop\/customers/, "في الحرفاء"],
    [/^\/shop\/stats/, "في الأرقام"],
    [/^\/shop\/card/, "في الكارط"],
    [/^\/shop\/pay/, "في الخلاص"],
    [/^\/shop\/items/, "في الحاجات"],
    [/^\/shop\/settings/, "في الإعدادات"],
    [/^\/shop\/setup/, "في المحل متاعو"],
    [/^\/shop\/new/, "يسجّل"],
    [/^\/shop\/?$/, "في المحل"],
    [/^\/me\b/, "في الكونت"],
    [/^\/wallet/, "في الكارطات متاعو"],
    [/^\/c\//, "يشوف كارط"],
    [/^\/(s\/|scan)/, "يسكاني كود"],
    [/^\/prix/, "يشوف الأسوام"],
    [/^\/(faq|guide)/, "يقرا الأسئلة"],
    [/^\/u\//, "يشوف صفحة محل"],
    [/^\/privacy/, "يقرا الخصوصية"],
    [/^\/(login|forgot)/, "يدخل للكونت"],
    [/^\/join/, "يحلّ كونت"],
    [/^\/$/, "الصفحة الأولى"],
  ];
  // a page with no name yet: its path, sealed, so its slash does not jump to the end of the Arabic line
  return places.find(([re]) => re.test(p))?.[1] ?? `⁨${p}⁩`;
}

/** The dot: green and beating (here), amber (open, left alone), grey (gone). */
function Dot({ state }: { state: State }) {
  if (state === "here") {
    return (
      <span className="relative inline-flex size-2.5 shrink-0" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-mint/60" />
        <span className="relative inline-block size-2.5 rounded-full bg-mint" />
      </span>
    );
  }
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${state === "idle" ? "bg-amber-400" : "bg-faint"}`} aria-hidden />;
}

/** «متّصل توّا · في الكود» for one person (an owner on the shops list, a customer on the people list); nothing when not seen lately. */
export function Presence({ user, className = "" }: { user: string | null | undefined; className?: string }) {
  useOnline();
  const p = user ? by.get(user) : undefined;
  if (!p) return null;
  const where = whereSaid(p.path);
  const since = p.since ? agoSaid(serverNow() - Date.parse(p.since)).replace(/^من /, "") : null;
  const words = p.state === "here" ? "متّصل توّا" : p.state === "idle" ? "مفتوحة عندو" : `كان هنا ${agoSaid(serverNow() - Date.parse(p.at))}`;
  const tone = p.state === "here" ? "text-mint" : p.state === "idle" ? "text-amber-700" : "text-muted";
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-[0.75rem] font-semibold ${tone} ${className}`} title={since && p.state !== "gone" ? `من ${since}` : undefined}>
      <Dot state={p.state} />
      <span className="min-w-0 truncate">
        {words}
        {where && p.state !== "gone" ? ` · ${where}` : ""}
      </span>
    </span>
  );
}

/** How many are on a page of the site right now (accounts and strangers) — or, `owners`, how many shops' owners: a number for a tile. */
export function OnlineCount({ owners = false }: { owners?: boolean }) {
  const d = useOnline();
  if (!d) return <span className="text-faint">…</span>;
  const n = d.people.filter((p) => p.state !== "gone" && (!owners || p.shop)).length;
  return <>{owners ? n : n + d.strangers}</>;
}

/** Call and WhatsApp, side by side: the founder's two ways to reach someone at once. */
export function Reach({ phone, size = "sm" }: { phone: string | null | undefined; size?: "sm" | "md" }) {
  if (!phone) return null;
  const d = digits(phone);
  const box = size === "md" ? "size-9" : "size-8";
  return (
    <span className="relative z-[2] inline-flex shrink-0 items-center gap-1.5">
      <a href={`tel:+216${d}`} title={`عيّط · ${pretty(phone)}`} aria-label={`عيّط ${pretty(phone)}`} className={`press grid ${box} place-items-center rounded-full bg-brand text-white hover:bg-brand-deep`}>
        <Phone className="size-4" />
      </a>
      <a href={`https://wa.me/216${d}`} target="_blank" rel="noreferrer" title="واتساب" aria-label={`واتساب ${pretty(phone)}`} className={`press grid ${box} place-items-center rounded-full bg-[#25D366] text-white hover:opacity-90`}>
        <MessageCircle className="size-4" />
      </a>
    </span>
  );
}

/**
 * The live panel: everyone on the site right now — the shop (or the
 * person), where they are, since when — with a call and a WhatsApp beside
 * each, the people on the till at the top. Those who left in the last half
 * hour follow, quieter. Strangers (no account) are only counted.
 */
export function OnlineNow({ className = "" }: { className?: string }) {
  const d = useOnline();
  if (!d) return null;
  const on = d.people.filter((p) => p.state !== "gone");
  const gone = d.people.filter((p) => p.state === "gone").slice(0, 6);
  return (
    <section className={`overflow-hidden rounded-[1rem] border border-line bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-[0.9375rem] font-bold text-ink">
          <Dot state={on.length ? "here" : "gone"} />
          متّصلين توّا
          <span className="text-[0.875rem] font-semibold text-muted">
            <bdi className="tabular-nums">{on.length}</bdi>
            {d.strangers > 0 && (
              <>
                {" "}
                · و <bdi className="tabular-nums">{d.strangers}</bdi> زوّار بلا كونت
              </>
            )}
          </span>
        </h2>
        <span className="shrink-0 text-[0.75rem] text-faint">يتبدّل وحدو</span>
      </div>
      {!on.length && !gone.length ? (
        <p className="px-4 py-5 text-center text-[0.875rem] text-muted">حتى حد ما هو على السيت توّا</p>
      ) : (
        <ul className="divide-y divide-line">
          {[...on, ...gone].map((p) => {
            const href = p.shop ? `/admin/shops/${p.shop.id}` : `/admin/people/${p.user}`;
            const title = p.shop?.name ?? (p.name || "بلا اسم");
            const since = p.since && p.state !== "gone" ? agoSaid(serverNow() - Date.parse(p.since)) : null;
            return (
              <li key={p.user} className={`relative flex items-center gap-3 px-4 py-2.5 ${p.state === "gone" ? "opacity-70" : ""}`}>
                <Link href={href} className="absolute inset-0 z-[1]" aria-label={title} />
                <Dot state={p.state} />
                <span className="min-w-0 flex-1">
                  {/* each name sealed: «3RH Coffe» and «ridha» side by side, not run together into one Latin word.
                      The gap is a plain space, not a margin on the bdi: a Latin bdi reads left to right, so its
                      inline-start is the outer side here and the two names would touch. */}
                  <span className="block truncate text-[0.9062rem] font-semibold text-ink">
                    <bdi>{title}</bdi>
                    {p.shop && p.name ? (
                      <>
                        {" "}
                        <bdi className="text-[0.8125rem] font-normal text-muted">{p.name}</bdi>
                      </>
                    ) : null}
                  </span>
                  <span className="block truncate text-[0.75rem] text-muted">
                    {p.state === "gone" ? `كان هنا ${agoSaid(serverNow() - Date.parse(p.at))}` : `${p.state === "here" ? "متّصل" : "مفتوحة عندو"} · ${whereSaid(p.path)}${since ? ` · ${since}` : ""}`}
                  </span>
                </span>
                <Reach phone={p.phone} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
