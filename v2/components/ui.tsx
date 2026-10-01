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
const base = "press inline-flex h-[56px] w-full select-none items-center justify-center gap-2 rounded-[20px] px-6 text-[17px] font-semibold disabled:opacity-50";

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

export function Field({ label, error, ...rest }: ComponentProps<"input"> & { label: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[14px] font-semibold text-muted">{label}</span>
      <input
        className="block h-[56px] w-full rounded-[18px] bg-surface px-4 text-[17px] text-ink shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className="mt-1.5 block px-1 text-[13.5px] font-medium text-coral">{error}</span>}
    </label>
  );
}

export function Icon3D({ name, size = 32, className = "" }: { name: string; size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/3d/${name}.png`} alt="" width={size} height={size} className={`e3d ${className}`} />;
}

/** A phone screen: centred, never wider than a phone, room for the notch and the home bar. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`safe-t safe-b mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 ${className}`}>{children}</main>;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[20px] font-bold text-ink ${className}`} dir="ltr">
      <span className="grid size-9 place-items-center rounded-[12px] bg-[linear-gradient(150deg,#9b7bff,#6c47ff_55%,#4a2ad6)] text-white shadow-[0_8px_18px_-8px_rgb(108_71_255/0.8)]">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
        </svg>
      </span>
      Pointili
    </span>
  );
}
