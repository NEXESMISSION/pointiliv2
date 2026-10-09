import { Icon3D } from "@/components/ui";

/** The moment the tampon hits the page. Everything after it on a screen waits for this. */
export const IMPACT_MS = 430;
const SPARKS = 16;

/**
 * THE TAMPON LANDING — the half-second a scan is about. A big stamp in the
 * shop's colour falls from above the screen, slams down hard enough to shake
 * everything, throws three shockwaves and a ring of sparks, splashes its ink,
 * and a «+1» jumps out. CSS only, one shot; the reduced-motion rule flattens
 * it to the final frame for whoever asked their phone for less movement.
 * `size` is its width on a phone of 844px and more; a shorter screen gets a
 * smaller tampon (it follows the rem and the height), so the answer under it
 * always fits.
 */
/** `logo`: the shop chose its own logo as its stamp — the tampon lands with it on its face (on a white disc, so any logo reads). */
export function StampLand({ color = "#6c47ff", icon = "star", size = 112, label = "+1", logo = null }: { color?: string; icon?: string; size?: number; label?: string; logo?: string | null }) {
  const k = (n: number) => `calc(var(--sl) * ${n})`;
  const box = { "--sl": `min(${size / 16}rem, ${+(size / 8.44).toFixed(2)}dvh)`, width: k(1.9), height: k(1.6) } as React.CSSProperties;
  return (
    <div className="sl-shake relative grid shrink-0 place-items-center" style={box} aria-hidden>
      <style>{`
        @keyframes sl-drop {
          0% { transform: translate3d(0,-260px,0) scale(2.1) rotate(-32deg); opacity: 0; }
          16% { opacity: 1; }
          50% { transform: translate3d(0,0,0) scale(0.8) rotate(6deg); }
          63% { transform: translate3d(0,-20px,0) scale(1.1) rotate(-4deg); }
          77% { transform: translate3d(0,0,0) scale(0.96) rotate(1.5deg); }
          100% { transform: translate3d(0,0,0) scale(1) rotate(0); opacity: 1; }
        }
        @keyframes sl-shake {
          0%, 46% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,9px,0); }
          56% { transform: translate3d(-6px,-4px,0); }
          62% { transform: translate3d(5px,3px,0); }
          70% { transform: translate3d(-3px,0,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes sl-wave { 0% { transform: scale(0.3); opacity: 0.6; } 100% { transform: scale(2.9); opacity: 0; } }
        @keyframes sl-spark {
          0% { transform: rotate(var(--a)) translateX(0) scale(0.2); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: rotate(var(--a)) translateX(var(--d)) scale(0.9); opacity: 0; }
        }
        @keyframes sl-ink { 0% { transform: scale(0.2); opacity: 0; } 30% { opacity: 0.55; } 100% { transform: scale(1.35); opacity: 0.22; } }
        @keyframes sl-plus {
          0% { transform: translate3d(0,24px,0) scale(0.3); opacity: 0; }
          55% { transform: translate3d(0,-10px,0) scale(1.25); opacity: 1; }
          72% { transform: translate3d(0,0,0) scale(0.94); }
          100% { transform: translate3d(0,0,0) scale(1); opacity: 1; }
        }
        @keyframes sl-halo { 0%, 100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(1.14); opacity: 0.8; } }
        .sl-shake { animation: sl-shake 900ms ease-out both; }
      `}</style>

      {/* the ink left on the page, breathing after the hit */}
      <span
        className="absolute rounded-full"
        style={{ width: k(1.35), height: k(1.35), background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, animation: `sl-ink 900ms ease-out ${IMPACT_MS - 40}ms both, sl-halo 2.6s ease-in-out ${IMPACT_MS + 900}ms infinite` }}
      />

      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute rounded-full border-[3px]"
          style={{ width: k(1), height: k(1), borderColor: color, animation: `sl-wave 900ms cubic-bezier(0.1,0.7,0.3,1) ${IMPACT_MS + i * 130}ms both` }}
        />
      ))}

      {Array.from({ length: SPARKS }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={
            {
              width: i % 3 === 0 ? 11 : 7,
              height: i % 3 === 0 ? 11 : 7,
              background: i % 2 ? color : "#ff6b4a",
              "--a": `${(360 / SPARKS) * i}deg`,
              "--d": k(0.72 + (i % 4) * 0.14),
              animation: `sl-spark 760ms cubic-bezier(0.15,0.75,0.3,1) ${IMPACT_MS + (i % 3) * 40}ms both`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* the tampon itself */}
      <span
        className="relative grid place-items-center rounded-full text-white"
        style={{
          width: k(1),
          height: k(1),
          background: `linear-gradient(150deg, color-mix(in oklab, ${color} 70%, white) -10%, ${color} 50%, color-mix(in oklab, ${color} 65%, black) 120%)`,
          boxShadow: `0 22px 44px -14px ${color}, inset 0 2px 0 rgb(255 255 255 / 0.35), inset 0 -6px 14px rgb(0 0 0 / 0.18)`,
          animation: "sl-drop 900ms cubic-bezier(0.3,0,0.2,1) both",
        }}
      >
        <span className="absolute inset-[9%] rounded-full border-2 border-dashed border-white/55" />
        {logo ? (
          <span className="grid place-items-center overflow-hidden rounded-full bg-white" style={{ width: k(0.62), height: k(0.62) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" decoding="async" className="size-[82%] object-contain" />
          </span>
        ) : (
          <span className="grid place-items-center" style={{ width: k(0.5), height: k(0.5) }}>
            <Icon3D name={icon} size={size * 0.5} className="size-full!" />
          </span>
        )}
      </span>

      <span
        className="num absolute -top-1 rounded-full bg-ink px-3.5 py-1.5 text-[1.0625rem] font-bold text-white shadow-lift"
        style={{ animation: `sl-plus 620ms cubic-bezier(0.2,0.9,0.3,1.3) ${IMPACT_MS + 60}ms both`, insetInlineEnd: k(0.12) }}
      >
        {label}
      </span>
    </div>
  );
}

/** A one-shot rain of confetti in the app's colours. Deterministic, so the server and the phone agree. */
export function Confetti({ count = 40, delay = 0 }: { count?: number; delay?: number }) {
  const colors = ["#6c47ff", "#ff6b4a", "#12b76a", "#9b7bff", "#0891b2", "#ffa183"];
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      <style>{`@keyframes cf-fall { 0% { transform: translate3d(0,-12vh,0) rotate(0); opacity: 0; } 8% { opacity: 1; } 100% { transform: translate3d(var(--dx),105vh,0) rotate(var(--r)); opacity: 0.9; } }`}</style>
      {Array.from({ length: count }, (_, i) => {
        // rounded: Node's Math.sin and the phone's differ in the last digits, and the
        // page must draw the same confetti the server wrote, or React complains
        const r = (n: number) => Math.round((((Math.sin(i * 9301 + n * 49297) + 1) / 2) % 1) * 1e4) / 1e4;
        return (
          <span
            key={i}
            className="absolute top-0 block rounded-[0.125rem]"
            style={
              {
                left: `${r(1) * 100}%`,
                width: 7 + r(2) * 6,
                height: 9 + r(3) * 9,
                background: colors[i % colors.length],
                "--dx": `${(r(4) - 0.5) * 160}px`,
                "--r": `${r(5) * 900 - 450}deg`,
                animation: `cf-fall ${2.2 + r(6) * 1.6}s cubic-bezier(.2,.6,.4,1) ${delay + r(7) * 600}ms both`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
