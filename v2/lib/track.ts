/**
 * First-party traffic, in the browser (client components only).
 *
 * A visitor is this browser (localStorage); a visit is one sitting — thirty
 * quiet minutes end it, and so does a new ad (other utm_* or an fbclid); a
 * view is one screen: a page, or a step inside one (the card's questions, the
 * scan's answers) that the page names with setScreen(). For every view: when
 * it opened, how long it was really looked at (hidden time does not count, nor
 * a phone left on the table — 90 seconds without a touch stops the clock,
 * unless a video is playing), and where the visitor went next — or that they
 * left. Every tap: where on the screen (0..1 across and down — one screen, no
 * scroll, so the same place on every phone), what was tapped (the button's
 * words, a field's label — never what was typed), whether it hit nothing (a
 * dead tap) or came three in a row on one spot (a rage tap), and whether it
 * led out of the site (WhatsApp, a call, YouTube). The first view of a visit
 * carries where it came from: the referrer and the ad's utm_* and fbclid.
 *
 * Everything goes out in batches to /api/beacon — every few seconds, and the
 * moment the page is hidden or closed — and the founder's own pages (/admin)
 * are not followed at all.
 */

type View = { id: string; path: string; route: string; screen: string | null; entered_at: string; left_at: string | null; active_ms: number; vw: number; vh: number; next: string | null };
type Tap = { view: string; at: string; x: number; y: number; target: string | null; kind: string | null; rage: boolean; dead: boolean; external: boolean };
type Signal = { view: string | null; route: string | null; screen: string | null; at: string; name: string; detail: string | null };
type Visit = { id: string; last: number; info: Record<string, string | boolean | null> };
type Live = View & { since: number | null };

const VISITOR = "pt_v";
const VISIT = "pt_s";
const QUIET_MS = 30 * 60_000;
const IDLE_MS = 90_000;
const FLUSH_MS = 8_000;

let started = false;
let landed = false;
let visitor = "";
let visit: Visit | null = null;
let view: Live | null = null;
let lastInput = Date.now();
let video = false;
const dirty = new Map<string, View>();
let taps: Tap[] = [];
let signals: Signal[] = [];
let recent: { t: number; x: number; y: number }[] = [];

const now = () => new Date().toISOString();
const id = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16)));
const visible = () => document.visibilityState === "visible";
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: the visit lives in memory */
  }
};

/** /s/AbC…, /c/<uuid> and the founder's pages → one name per kind of page. */
export function routeOf(path: string): string {
  return path
    .replace(/^\/s\/[^/]+$/, "/s/[token]")
    .replace(/^\/c\/[0-9a-f-]{36}$/i, "/c/[id]")
    .replace(/^\/admin\/shops\/[0-9a-f-]{36}$/i, "/admin/shops/[id]")
    .replace(/^\/admin\/people\/[0-9a-f-]{36}$/i, "/admin/people/[id]");
}
const quiet = (path: string) => path.startsWith("/admin");

/** This page's own arrival: where from, and which ad — only the first visit of a page load has one. */
function arrival(): Record<string, string | boolean | null> {
  const q = new URLSearchParams(location.search);
  const first = !landed;
  landed = true;
  return {
    landing: (location.pathname + location.search).slice(0, 300),
    referrer: first ? document.referrer.slice(0, 300) || null : null,
    utm_source: first ? q.get("utm_source") : null,
    utm_medium: first ? q.get("utm_medium") : null,
    utm_campaign: first ? q.get("utm_campaign") : null,
    utm_content: first ? q.get("utm_content") : null,
    utm_term: first ? q.get("utm_term") : null,
    fbclid: first && q.has("fbclid"),
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language,
  };
}

/** A page opened from an ad other than the one this visit came from starts a visit of its own. */
function newAd(v: Visit): boolean {
  if (landed) return false;
  const q = new URLSearchParams(location.search);
  if (!q.has("utm_source") && !q.has("fbclid")) return false;
  return q.get("utm_source") !== v.info.utm_source || q.get("utm_campaign") !== v.info.utm_campaign || q.get("utm_content") !== v.info.utm_content || (q.has("fbclid") && !v.info.fbclid);
}

function ensureVisit(): Visit {
  if (!visitor) {
    visitor = read(VISITOR) ?? id().replace(/-/g, "");
    write(VISITOR, visitor);
  }
  if (!visit) {
    try {
      visit = JSON.parse(read(VISIT) ?? "null");
    } catch {
      visit = null;
    }
  }
  const t = Date.now();
  if (!visit || t - visit.last > QUIET_MS || newAd(visit)) {
    if (visit) {
      // what the old sitting still owes goes out under its own name
      if (view) {
        settle(view);
        view.left_at ??= now();
        mark(view);
      }
      flush(true);
    }
    visit = { id: id(), last: t, info: arrival() };
    // a screen left open through the quiet goes on as the new sitting's first one
    if (view) {
      view = { ...view, id: id(), entered_at: now(), left_at: null, active_ms: 0, next: null, since: visible() ? t : null };
      mark(view);
    }
  }
  landed = true;
  visit.last = t;
  write(VISIT, JSON.stringify(visit));
  return visit;
}

/**
 * The time a view has really been looked at, up to now. Ninety seconds
 * without a touch (and no video playing) stop the clock where the last touch
 * left it; the next touch starts it again.
 */
function settle(v: Live) {
  if (v.since == null) return;
  const t = Date.now();
  const end = video ? t : Math.min(t, lastInput + IDLE_MS);
  v.active_ms += Math.max(0, end - v.since);
  v.since = visible() && end === t ? t : null;
}

/** Any touch, key or scroll: the visitor is here (the clock starts again if it had stopped). */
function onInput() {
  lastInput = Date.now();
  if (view && view.since == null && visible()) view.since = lastInput;
}

function mark(v: Live) {
  const { since: _since, ...plain } = v;
  void _since;
  dirty.set(v.id, { ...plain });
}

/** A new screen: the page's path, and the step inside it when the page names one. */
function enter(path: string, screen: string | null) {
  if (quiet(path)) {
    leave(null);
    view = null;
    return;
  }
  ensureVisit();
  const route = routeOf(path);
  if (view && view.path === path && view.screen === screen) return;
  // a page that names its screen a moment after it opened (its content came after the router): the same view, named
  if (view && view.path === path && view.screen === null && screen && Date.now() - Date.parse(view.entered_at) < 1500) {
    view.screen = screen;
    mark(view);
    return;
  }
  leave(`${route}${screen ? `:${screen}` : ""}`);
  lastInput = Date.now();
  view = { id: id(), path, route, screen, entered_at: now(), left_at: null, active_ms: 0, vw: innerWidth, vh: innerHeight, next: null, since: visible() ? Date.now() : null };
  mark(view);
}

function leave(next: string | null) {
  if (!view) return;
  settle(view);
  view.since = null;
  view.left_at = now();
  view.next = next;
  mark(view);
}

/** Called by the router on every page. */
export function enterPage(path: string) {
  // a page that named its screen before this ran (children's effects run first) keeps it
  if (view && view.path === path) return;
  enter(path, null);
}

/** Called by a page for a step inside it: the card's questions, the scan's answers, the welcome, the wallet. */
export function setScreen(screen: string) {
  enter(location.pathname, screen);
}

/** Anything worth counting that is not a tap: a form refused, a video played. */
export function signal(name: string, detail?: string | null) {
  if (!view && quiet(location.pathname)) return;
  ensureVisit();
  signals.push({ view: view?.id ?? null, route: view?.route ?? routeOf(location.pathname), screen: view?.screen ?? null, at: now(), name: name.slice(0, 40), detail: detail ? String(detail).slice(0, 200) : null });
}

/** A video is playing (inside its frame no touch reaches the page): the clock keeps going. */
export function watching(on: boolean) {
  video = on;
  onInput();
}

/** What a tap landed on, in words: a button's or a link's text, a field's label — never its value. */
function describe(hit: Element): string | null {
  const el = hit as HTMLElement;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    const label = el.closest("label")?.querySelector("span")?.textContent;
    return (el.getAttribute("aria-label") || label || el.getAttribute("placeholder") || el.getAttribute("name") || el.tagName.toLowerCase()).trim().slice(0, 80);
  }
  const words = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").replace(/\s+/g, " ").trim();
  return words.slice(0, 80) || null;
}

function onTap(e: MouseEvent) {
  if (!view || !e.isTrusted) return;
  onInput();
  ensureVisit();
  const x = Math.min(1, Math.max(0, e.clientX / innerWidth));
  const y = Math.min(1, Math.max(0, e.clientY / innerHeight));
  const hit = (e.target as Element | null)?.closest?.('a,button,input,textarea,select,label,summary,[role="button"],[role="link"],[role="tab"],[role="dialog"]') ?? null;
  const t = Date.now();
  recent = recent.filter((r) => t - r.t < 800 && Math.hypot((r.x - x) * innerWidth, (r.y - y) * innerHeight) < 30);
  recent.push({ t, x, y });
  const anchor = hit?.tagName === "A" ? (hit as HTMLAnchorElement) : null;
  const away = !!anchor && (/^(tel|mailto|sms):/i.test(anchor.href) || (!!anchor.host && anchor.host !== location.host));
  taps.push({
    view: view.id,
    at: now(),
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
    target: hit && hit.getAttribute("role") !== "dialog" ? describe(hit) : null,
    kind: hit ? (hit.getAttribute("role") === "dialog" ? "backdrop" : hit.tagName.toLowerCase()) : null,
    rage: recent.length >= 3,
    // a tap on a sheet's backdrop closes it: not dead
    dead: !hit,
    external: away,
  });
  // a tap that leaves the site (WhatsApp, a call, YouTube) is sent right away
  if (away) flush(true);
}

function flush(beacon: boolean) {
  if (!visit || (!dirty.size && !taps.length && !signals.length)) return;
  if (view) {
    settle(view);
    mark(view);
  }
  const body = JSON.stringify({ visit: { id: visit.id, visitor, ...visit.info }, views: [...dirty.values()], taps, signals });
  dirty.clear();
  taps = [];
  signals = [];
  try {
    if (beacon && navigator.sendBeacon?.("/api/beacon", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/beacon", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {
    /* the next batch carries on */
  }
}

/** Once per page load: the listeners and the clock. */
export function startTracking() {
  if (started || typeof window === "undefined") return;
  started = true;
  document.addEventListener("click", onTap, { capture: true, passive: true });
  for (const type of ["pointerdown", "keydown", "scroll", "touchstart"]) document.addEventListener(type, onInput, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!view) return;
    if (!visible()) {
      settle(view);
      view.since = null;
      view.left_at = now();
      mark(view);
      flush(true);
    } else {
      ensureVisit();
      if (!view) return;
      lastInput = Date.now();
      view.since = lastInput;
      view.left_at = null;
      mark(view);
    }
  });
  addEventListener("pagehide", () => {
    if (view) {
      settle(view);
      view.since = null;
      view.left_at = now();
      mark(view);
    }
    flush(true);
  });
  // a heartbeat while someone is looking: the time on screen gets there even if the phone kills the page
  setInterval(() => {
    if (view && view.since != null) {
      settle(view);
      mark(view);
    }
    flush(false);
  }, FLUSH_MS);
}
