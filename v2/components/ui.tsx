import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** The two kinds of button the app has: the one big thing to do, and the quiet second one. */
const look = {
  main: "bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]",
  soft: "bg-surface text-ink shadow-card",
  coral: "bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] text-white shadow-[0_14px_30px_-12px_rgb(255_107_74/0.6)]",
  ghost: "text-muted",
} as const;
type Look = keyof typeof look;
const base = "press inline-flex h-[3.5rem] w-full select-none items-center justify-center gap-2 rounded-[1.25rem] px-6 text-[1.0625rem] font-semibold disabled:opacity-50";

export function Btn({ kind = "main", className = "", children, ...rest }: ComponentProps<"button"> & { kind?: Look }) {
  return (
    <button className={`${base} ${look[kind]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function LinkBtn({ kind = "main", className = "", children, href }: { kind?: Look; className?: string; children: ReactNode; href: string }) {
  return (
    <Link href={href} className={`${base} ${look[kind]} ${className}`}>
      {children}
    </Link>
  );
}

/** The look of every text box: white, rounded, a ring when typing in it. */
export const boxLook = "rounded-[1.125rem] bg-surface shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)]";
export const boxFocus = "focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]";

export function Field({ label, error, className = "", ...rest }: ComponentProps<"input"> & { label: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[0.875rem] font-semibold text-muted">{label}</span>
      <input
        className={`block h-[3.5rem] w-full px-4 text-[17px] text-ink outline-none placeholder:text-faint ${boxLook} ${boxFocus} ${className}`}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className="mt-1.5 block px-1 text-[0.8438rem] font-medium text-coral">{error}</span>}
    </label>
  );
}

/** A Fluent 3D picture (WebP, a sixth of the PNG's weight). `lazy`: only when it scrolls into view. */
export function Icon3D({ name, size = 32, className = "", lazy }: { name: string; size?: number; className?: string; lazy?: boolean }) {
  // sized in rem: the picture grows and shrinks with the screen like the text beside it
  const r = `${size / 16}rem`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/3d/${name}.webp`} alt="" width={size} height={size} style={{ width: r, height: r }} decoding="async" loading={lazy ? "lazy" : undefined} className={`e3d ${className}`} />;
}

/**
 * A phone screen: one screen tall and never more — the page itself does not
 * scroll (a long list scrolls inside its own box). Centred, never wider than
 * a phone, room for the notch and the home bar; the side margin follows the
 * screen's width. Sideways it clips, so a card that pops bigger never widens
 * the page (a phone would zoom out).
 */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-x-clip overflow-y-auto px-[clamp(1rem,5vw,1.5rem)] ${className}`}>{children}</main>;
}

/** The middle of a screen: whatever it holds sits centred in the room left, the button right under it. */
export function Middle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-h-0 flex-1 flex-col justify-center py-[2.5dvh] ${className}`}>{children}</div>;
}

/** Pointili's mark — two loyalty cards, the front one with a sparkle — and the name. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[1.3125rem] font-bold text-ink ${className}`} dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand-mark.svg" alt="" width={40} height={29} style={{ width: "2.5rem", height: "1.8125rem" }} className="drop-shadow-[0_6px_10px_rgb(80_40_200/0.25)]" />
      Pointili
    </span>
  );
}
