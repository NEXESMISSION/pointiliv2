/**
 * Microsoft Clarity: every visit kept as a video the founder can watch —
 * where the finger went, what was scrolled, where someone stopped — and the
 * heat of each page. Its project id comes from the console's settings.
 *
 * It runs only on the real address (never a test, a preview or a computer of
 * ours), never in the founder's console nor in a browser the founder uses.
 * What is typed is never recorded (Clarity hides every field), and the
 * phone numbers and names on a page carry data-clarity-mask, hidden too.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
type ClarityWindow = Window & { clarity?: ClarityFn };

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");
let started: string | null = null;

const founder = () => {
  try {
    return !!localStorage.getItem("pt_founder");
  } catch {
    return false;
  }
};

/** May this page be recorded: the real address, not the console, not the founder. */
export function clarityHere(path: string): boolean {
  if (typeof window === "undefined" || founder() || path.startsWith("/admin")) return false;
  const host = new URL(SITE).hostname;
  return location.hostname === host || location.hostname === host.replace(/^www\./, "");
}

/** Clarity's own loader, once: the calls made before it arrives wait in its queue. */
export function startClarity(id: string) {
  if (started === id) return;
  started = id;
  const w = window as ClarityWindow;
  w.clarity ??= Object.assign((...args: unknown[]) => void (w.clarity!.q ??= []).push(args), { q: [] as unknown[][] });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${id}`;
  document.head.appendChild(s);
}

/** A tag on this visit's video (Clarity's filters find it): the visit's own id, the shop's name… */
export function clarityTag(key: string, value: string) {
  const w = window as ClarityWindow;
  if (started && w.clarity) w.clarity("set", key, value);
}
