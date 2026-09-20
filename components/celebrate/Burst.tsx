/**
 * THE CELEBRATION VOCABULARY — sparks, confetti, shockwaves, a flash.
 *
 * The tampon landing (scan/StampDrop) set the tone; these are the same gestures
 * cut loose from it, so the counter screen and the two reward screens throw the
 * same party. CSS only (transform / opacity), one shot, no library.
 *
 * Every piece is decoration: aria-hidden, pointer-events-none, absolutely placed
 * in the middle of a `grid place-items-center` box that already has its size, so
 * nothing here can move the page. And every piece ENDS invisible: the
 * reduced-motion rule in globals.css flattens durations to 1 ms, so someone who
 * asked for no motion lands on the finished screen and never sees them.
 *
 * Lengths are written as multiples of `unit` (any CSS length): the gift passes
 * its pixel size, the counter screen passes the side of its QR card, and the
 * same burst scales from a phone to a tablet without a line of JS.
 */

export const AMBER = "#f59e0b";
export const GREEN = "#22c55e";
export const VIOLET = "#7c50ee";

/** Same value on the server and in the browser, so a burst can be server-rendered. */
const rnd = (i: number, n: number) => (Math.sin(i * 9301 + n * 49297) + 1) / 2;

const CSS = `
@keyframes cb-spark{0%{transform:rotate(var(--a)) translateX(var(--f)) scale(.2);opacity:0}18%{opacity:1}100%{transform:rotate(var(--a)) translateX(var(--d)) scale(.85);opacity:0}}
@keyframes cb-chip{0%{transform:rotate(var(--a)) translateX(var(--f)) rotate(0deg) scale(.3);opacity:0}14%{opacity:1}68%{opacity:1}100%{transform:rotate(var(--a)) translateX(var(--d)) rotate(var(--r)) scale(1);opacity:0}}
@keyframes cb-shock{0%{transform:scale(var(--k0));opacity:.6}100%{transform:scale(var(--k1));opacity:0}}
@keyframes cb-flash{0%{opacity:0}8%{opacity:.9}100%{opacity:0}}
@keyframes cb-fx{0%{transform:translate3d(0,0,0);opacity:0}6%{opacity:1}72%{opacity:1}100%{transform:translate3d(var(--x),0,0);opacity:0}}
@keyframes cb-fy{0%{transform:translate3d(0,0,0) rotateZ(0deg) rotateX(0deg);animation-timing-function:cubic-bezier(.2,.7,.4,1)}30%{transform:translate3d(0,var(--up),0) rotateZ(calc(var(--r)*.35)) rotateX(calc(var(--r)*.5));animation-timing-function:cubic-bezier(.5,0,.85,.6)}100%{transform:translate3d(0,var(--down),0) rotateZ(var(--r)) rotateX(calc(var(--r)*1.4))}}
.cb-spark{animation:cb-spark 720ms cubic-bezier(.2,.7,.3,1) both}
.cb-chip{animation:cb-chip 1100ms cubic-bezier(.15,.7,.3,1) both}
.cb-shock{animation:cb-shock 900ms cubic-bezier(.15,.7,.3,1) both}
.cb-flash{animation:cb-flash 520ms ease-out both}
.cb-fx{animation:cb-fx 2400ms cubic-bezier(.15,.6,.3,1) both}
.cb-fy{animation:cb-fy 2400ms linear both}
`;

/** The keyframes for everything below. Each moment renders it once, next to its own. */
export function BurstStyle() {
  return <style>{CSS}</style>;
}

type Throw = {
  /** One unit of length, as CSS: "104px", "min(80vw,52vh,34rem)"… */
  unit: string;
  count?: number;
  /** Where the pieces start and how far the nearest and the farthest fly, in units. */
  from?: number;
  near?: number;
  far?: number;
  colors: string[];
  delay?: number;
  duration?: number;
};

/** Round sparks thrown straight out of the centre — the ring of ink around the tampon. */
export function Sparks({ unit, count = 12, from = 0, near = 0.62, far = 0.98, dot = 0.06, colors, delay = 0, duration = 720 }: Throw & { dot?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const w = `calc(${unit} * ${(i % 3 === 0 ? dot * 1.5 : dot).toFixed(3)})`;
        return (
          <span
            key={i}
            className="cb-spark pointer-events-none absolute rounded-full"
            style={
              {
                width: w,
                height: w,
                background: colors[i % colors.length],
                "--a": `${Math.round((360 / count) * i)}deg`,
                "--f": `calc(${unit} * ${from})`,
                "--d": `calc(${unit} * ${(near + ((i % 4) / 3) * (far - near)).toFixed(2)})`,
                animationDuration: `${duration}ms`,
                animationDelay: `${delay + (i % 3) * 40}ms`,
              } as React.CSSProperties
            }
            aria-hidden
          />
        );
      })}
    </>
  );
}

/** Paper confetti thrown out like the sparks, but spinning, slower, and between them. */
export function Chips({ unit, count = 14, from = 0, near = 0.8, far = 1.25, chip = 0.07, colors, delay = 0, duration = 1100 }: Throw & { chip?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="cb-chip pointer-events-none absolute rounded-[2px]"
          style={
            {
              width: `calc(${unit} * ${chip})`,
              height: `calc(${unit} * ${(chip * (1.3 + rnd(i, 1) * 0.6)).toFixed(3)})`,
              background: colors[i % colors.length],
              "--a": `${Math.round((360 / count) * (i + 0.5))}deg`,
              "--f": `calc(${unit} * ${from})`,
              "--d": `calc(${unit} * ${(near + rnd(i, 2) * (far - near)).toFixed(2)})`,
              "--r": `${Math.round((rnd(i, 3) - 0.5) * 900)}deg`,
              animationDuration: `${Math.round(duration * (0.85 + rnd(i, 4) * 0.3))}ms`,
              animationDelay: `${delay + Math.round(rnd(i, 5) * 120)}ms`,
            } as React.CSSProperties
          }
          aria-hidden
        />
      ))}
    </>
  );
}

/** Rings that leave the impact. `radius` lets them hug a rounded card instead of a disc. */
export function Shockwaves({ count = 3, size, color, from = 0.34, to = 2.6, radius = "9999px", width = 2, delay = 0, gap = 120 }: { count?: number; size: string; color: string; from?: number; to?: number; radius?: string; width?: number; delay?: number; gap?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="cb-shock pointer-events-none absolute border-solid"
          style={{ width: size, height: size, borderWidth: width, borderColor: color, borderRadius: radius, "--k0": from, "--k1": to, animationDelay: `${delay + i * gap}ms` } as React.CSSProperties}
          aria-hidden
        />
      ))}
    </>
  );
}

/** The white blink of the impact itself. */
export function Flash({ size, delay = 0 }: { size: string; delay?: number }) {
  return (
    <span
      className="cb-flash pointer-events-none absolute rounded-full"
      style={{ width: size, height: size, background: "radial-gradient(circle,rgba(255,255,255,.92) 0%,rgba(255,255,255,0) 65%)", animationDelay: `${delay}ms` }}
      aria-hidden
    />
  );
}

/**
 * A confetti cannon: pieces shoot up and out of the centre, then gravity takes
 * them off the bottom of the screen.
 *
 * THE TRAP: they fall a whole screen, so the box they live in MUST clip
 * (overflow-hidden). Unclipped, a transform still counts as scrollable overflow
 * and the page grows a scrollbar for two seconds.
 *
 * Two elements per piece because CSS has one transform per element: the outer
 * one drifts sideways and slows down, the inner one goes up, then falls faster
 * and faster. Together that is a parabola.
 */
export function Fountain({ count = 44, colors, spread = 170, delay = 0 }: { count?: number; colors: string[]; spread?: number; delay?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const timing = { animationDuration: `${Math.round(1900 + rnd(i, 6) * 1100)}ms`, animationDelay: `${delay + Math.round(rnd(i, 7) * 180)}ms` };
        return (
          <span key={i} className="cb-fx pointer-events-none absolute" style={{ "--x": `${Math.round((rnd(i, 1) - 0.5) * 2 * spread)}px`, ...timing } as React.CSSProperties} aria-hidden>
            <span
              className="cb-fy block rounded-[2px]"
              style={
                {
                  width: Math.round(6 + rnd(i, 2) * 6),
                  height: Math.round(8 + rnd(i, 3) * 8),
                  background: colors[i % colors.length],
                  "--up": `${-Math.round(90 + rnd(i, 4) * 170)}px`,
                  "--down": "70vh",
                  "--r": `${Math.round(rnd(i, 5) * 720 - 360)}deg`,
                  ...timing,
                } as React.CSSProperties
              }
            />
          </span>
        );
      })}
    </>
  );
}
