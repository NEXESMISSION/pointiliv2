"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ANALYTICS_ENDPOINT, ANALYTICS_ID_RE, SESSION_COOKIE, VISITOR_COOKIE, cleanPath } from "@/lib/analytics/shared";

/**
 * Pointili's own analytics, read in the console (/admin/traffic): which pages
 * are opened, for how long, from where, and where people tap. Mounted once in
 * the root layout. No third party, no IP kept, and nothing typed into a field
 * is ever read — a tap on a field records its name only.
 *
 * The console itself is not tracked, and neither is a page shown inside the
 * console's click map.
 */

const SESSION_S = 30 * 60; // a visit ends after 30 quiet minutes
const IDLE_MS = 3 * 60_000; // no touch for 3 minutes: the clock stops
const PING_MS = 60_000;
const FLUSH_MS = 4_000;

type Ev = { k: "view" | "time" | "click"; p: string; pv: string; t: number } & Record<string, unknown>;
type Page = { raw: string; path: string; pv: string; engaged: number; since: number | null; sentMs: number };

const queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sid: string | null = null;
let page: Page | null = null;
let lastInput = Date.now();
let lastPing = 0;
let lastClick = 0;
let firstView = true;

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function rid(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += ABC[b & 63];
  return s;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

/** This browser, for a year (the cookie is read by the server on sign-in too). */
function visitorId(): string {
  let v = readCookie(VISITOR_COOKIE);
  if (!v || !ANALYTICS_ID_RE.test(v)) v = rid(16);
  writeCookie(VISITOR_COOKIE, v, 400 * 86_400);
  return v;
}

const visible = () => document.visibilityState === "visible";

/* ── engaged time: counted only while the page is on screen and touched ───── */

function engagedMs(p: Page, now = Date.now()): number {
  if (p.since == null) return p.engaged;
  return p.engaged + Math.max(0, Math.min(now, lastInput + IDLE_MS) - p.since);
}

function pause(now = Date.now()) {
  if (!page || page.since == null) return;
  page.engaged = engagedMs(page, now);
  page.since = null;
}

function resume(now = Date.now()) {
  if (page && page.since == null && visible()) page.since = now;
}

function reportTime(force = false) {
  if (!page) return;
  const ms = Math.min(3_600_000, Math.round(engagedMs(page)));
  if (ms < 1000 || ms === page.sentMs || (!force && ms - page.sentMs < 5000)) return;
  page.sentMs = ms;
  push({ k: "time", p: page.path, pv: page.pv, ms });
}

function onInput() {
  const now = Date.now();
  if (page && page.since != null && now - lastInput > IDLE_MS) {
    // back after a pause: keep what counted, restart the clock now
    page.engaged = engagedMs(page, now);
    page.since = now;
  }
  lastInput = now;
  resume(now);
}

/* ── the queue ──────────────────────────────────────────────────────────── */

function push(ev: Omit<Ev, "t">) {
  let s = readCookie(SESSION_COOKIE);
  if (!s || !ANALYTICS_ID_RE.test(s)) s = rid(16);
  writeCookie(SESSION_COOKIE, s, SESSION_S);
  if (s !== sid) {
    const renewed = sid !== null;
    if (queue.length) flush(false);
    sid = s;
    // a visit that begins on a page already open begins with that page
    if (renewed && ev.k !== "view" && page) {
      page.pv = rid(10);
      page.engaged = 0;
      page.sentMs = 0;
      page.since = visible() ? Date.now() : null;
      queue.push({ k: "view", p: page.path, pv: page.pv, t: Date.now() });
      if (ev.k === "time") return schedule();
      ev = { ...ev, pv: page.pv };
    }
  }
  queue.push({ ...ev, t: Date.now() } as Ev);
  schedule();
}

function schedule() {
  if (queue.length >= 20) return flush(false);
  if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
}

function flush(closing: boolean) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length || !sid) return;
  const now = Date.now();
  const batch = queue.splice(0, 40).map(({ t, ...ev }) => ({ ...ev, a: Math.max(0, now - t) }));
  const body = JSON.stringify({
    v: visitorId(),
    s: sid,
    e: batch,
    l: navigator.language,
    w: window.innerWidth,
    h: window.innerHeight,
    tp: navigator.maxTouchPoints || 0,
    ...(navigator.webdriver ? { wd: 1 } : {}),
  });
  let sent = false;
  if (closing && typeof navigator.sendBeacon === "function") {
    try {
      sent = navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: "text/plain" }));
    } catch {
      sent = false;
    }
  }
  if (!sent) {
    fetch(ANALYTICS_ENDPOINT, { method: "POST", body, keepalive: true, credentials: "same-origin", headers: { "Content-Type": "text/plain" } }).catch(() => {});
  }
  if (queue.length) schedule();
}

/* ── pages and taps ─────────────────────────────────────────────────────── */

function leavePage() {
  if (!page) return;
  pause();
  reportTime(true);
}

function openPage(raw: string) {
  if (page?.raw === raw) return;
  leavePage();
  const now = Date.now();
  page = { raw, path: cleanPath(raw), pv: rid(10), engaged: 0, since: visible() ? now : null, sentMs: 0 };
  lastInput = now;
  const ev: Omit<Ev, "t"> = { k: "view", p: page.path, pv: page.pv };
  if (firstView) {
    // only the page the browser loaded knows where the visit came from
    firstView = false;
    try {
      const ref = document.referrer ? new URL(document.referrer).hostname : "";
      if (ref && ref !== location.hostname) ev.r = ref;
    } catch {
      /* an odd referrer is no referrer */
    }
    const q = new URLSearchParams(location.search);
    const source = q.get("utm_source") || (q.has("fbclid") ? "facebook" : q.has("gclid") ? "google" : q.has("ttclid") ? "tiktok" : null);
    if (source) ev.us = source;
    if (q.get("utm_medium")) ev.um = q.get("utm_medium");
    if (q.get("utm_campaign")) ev.uc = q.get("utm_campaign");
  }
  push(ev);
}

/**
 * What was tapped, in a few words: "link /pricing «الأسوام»", "button «ادخل»",
 * "field phone". A field gives its name, never its value; a link into a
 * customer's page gives its address, never the name printed on it.
 */
function describe(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("a,button,[role=button],[role=tab],[role=link],input,select,textarea,label,summary,[data-track]");
  if (!el) return target.tagName.toLowerCase() === "img" ? "image" : target.tagName.toLowerCase();
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    const f = el as HTMLInputElement;
    return `field ${f.name || f.type || tag.toLowerCase()}`.slice(0, 60);
  }
  let where = "";
  if (el instanceof HTMLAnchorElement && el.getAttribute("href")) {
    try {
      const u = new URL(el.href, location.href);
      where = u.origin === location.origin ? cleanPath(u.pathname) : /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, "") : u.protocol.replace(":", "");
    } catch {
      where = "";
    }
  }
  const named = el.getAttribute("data-track") || el.getAttribute("aria-label");
  // a card that is one big link reads "title · line · button": its title is enough
  const lines = (named || (el as HTMLElement).innerText || el.textContent || "")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const whole = lines.join(" · ");
  const text = whole.length <= 40 ? whole : (lines[0] ?? "").length <= 40 ? lines[0]! : "";
  const label = named ? named.replace(/\s+/g, " ").trim().slice(0, 40) : where.includes(":") ? "" : text;
  const kind = tag === "A" ? "link" : tag === "LABEL" ? "label" : "button";
  return [kind, where, label && `«${label}»`].filter(Boolean).join(" ").slice(0, 120);
}

function onClick(e: MouseEvent) {
  onInput();
  if (!page) return;
  const now = Date.now();
  if (now - lastClick < 150) return;
  lastClick = now;
  const doc = document.documentElement;
  const width = window.innerWidth || doc.clientWidth || 1;
  push({
    k: "click",
    p: page.path,
    pv: page.pv,
    x: Math.round(Math.min(1, Math.max(0, e.clientX / width)) * 10_000) / 10_000,
    y: Math.round(e.clientY + window.scrollY),
    dh: Math.round(Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0)),
    tg: describe(e.target),
  });
}

const untracked = (path: string) => path === "/admin" || path.startsWith("/admin/");

export function Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.top !== window.self) return;
    const hide = () => {
      if (visible()) {
        lastInput = Date.now();
        resume();
        return;
      }
      pause();
      reportTime(true);
      flush(true);
    };
    const gone = () => {
      leavePage();
      flush(true);
    };
    const tick = setInterval(() => {
      const now = Date.now();
      if (!page || !visible() || now - lastInput > IDLE_MS || now - lastPing < PING_MS) return;
      lastPing = now;
      reportTime();
    }, 15_000);
    const opts = { passive: true, capture: true } as const;
    document.addEventListener("click", onClick, opts);
    document.addEventListener("keydown", onInput, opts);
    document.addEventListener("pointerdown", onInput, opts);
    document.addEventListener("scroll", onInput, opts);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", gone);
    return () => {
      clearInterval(tick);
      document.removeEventListener("click", onClick, opts);
      document.removeEventListener("keydown", onInput, opts);
      document.removeEventListener("pointerdown", onInput, opts);
      document.removeEventListener("scroll", onInput, opts);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", gone);
    };
  }, []);

  useEffect(() => {
    if (window.top !== window.self) return;
    if (untracked(pathname)) {
      // into the console: close the page that was open, track nothing here
      leavePage();
      flush(false);
      page = null;
      return;
    }
    openPage(pathname);
  }, [pathname]);

  return null;
}
