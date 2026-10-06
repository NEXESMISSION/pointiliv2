/**
 * Facebook's pixel, in the browser (client components only).
 *
 * It tells Facebook what someone who came from an ad did here, so the ads
 * learn who to show themselves to and Ads Manager counts what each ad
 * brought. The steps of an owner's way in:
 * - PageView: every page of the shop side.
 * - ViewContent: the price, the guide, the questions.
 * - Lead: the sign-up opened.
 * - CompleteRegistration: the account made.
 * - CardCreated: the card made (a custom event).
 * - Contact: WhatsApp or a call.
 * - Purchase: the subscription turned on, with what came in.
 * Each "once" step is sent once per browser.
 *
 * It runs only on the real address (never a test, a preview or a computer of
 * ours), never in the founder's console nor in a browser the founder uses,
 * and never on a customer's screens: the ads are for shop owners.
 */

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push: unknown; loaded: boolean; version: string };
type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

const FOUNDER = "pt_founder";
const ONCE = "pt_px_";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");
// a customer's screens (the scan, a stamp, a card, a person's code, the wallet, the account, joining),
// signing in (people who already have an account), a forgotten password and the privacy page:
// none of them is about the ads
const AWAY = /^\/(?:s|c|u)\/|^\/(?:scan|wallet|me|join|login|forgot|privacy)(?:\/|$)/;
const STANDARD = new Set(["PageView", "ViewContent", "Lead", "CompleteRegistration", "Contact", "Purchase"]);

type Params = Record<string, string | number | boolean>;
let ready: string | null = null;
// steps asked for before the pixel started (a popup opens before the page's own step): sent right after it
let waiting: [string, Params | undefined, boolean][] = [];

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
    /* a private window: the step may be sent again, nothing worse */
  }
};

/** The founder's browser: set by the console, and the pixel never runs in it again. */
export function markFounder() {
  write(FOUNDER, "1");
}

/** www.pointili.online or pointili.online: the only places the ads lead. */
function live() {
  const host = new URL(SITE).hostname;
  return location.hostname === host || location.hostname === host.replace(/^www\./, "");
}

/** Whether this page of this browser may talk to Facebook. */
export function pixelHere(path: string): boolean {
  if (typeof window === "undefined" || !live() || read(FOUNDER)) return false;
  if (path.startsWith("/admin") || AWAY.test(path)) return false;
  // the front door is the welcome for a stranger, but the wallet for a customer
  return path !== "/" || !!document.querySelector("[data-welcome]");
}

/** Facebook's own loader (its snippet), once; then the pixel's number, once. */
export function startPixel(id: string) {
  if (ready === id) return;
  const w = window as PixelWindow;
  if (!w.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    } as Fbq;
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    w.fbq = n;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  // only the steps named here: no buttons read, no page scanned by Facebook on its own
  w.fbq!("set", "autoConfig", false, id);
  w.fbq!("init", id);
  ready = id;
}

/** One step, if the pixel runs on this page. */
export function pixel(event: string, params?: Params) {
  const w = window as PixelWindow;
  if (!pixelHere(location.pathname)) return;
  if (!ready) return void waiting.push([event, params, false]);
  if (!w.fbq) return;
  w.fbq(STANDARD.has(event) ? "track" : "trackCustom", event, params ?? {});
}

/** A step that counts once per browser (a sign-up opened twice is one lead). */
export function pixelOnce(event: string, params?: Params) {
  if (!pixelHere(location.pathname)) return;
  if (!ready) return void waiting.push([event, params, true]);
  if (read(ONCE + event)) return;
  write(ONCE + event, "1");
  pixel(event, params);
}

/** The steps that waited for the pixel to start, after the page's own. */
export function drainPixel() {
  const q = waiting;
  waiting = [];
  for (const [event, params, once] of q) (once ? pixelOnce : pixel)(event, params);
}
