/**
 * Button class names. A plain module (no "use client") so Server Components can
 * style a <Link> as a button too — a function exported from a client file cannot
 * be called on the server.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "dark" | "coral" | "sea";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,filter,background-color] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[linear-gradient(150deg,var(--color-brand-400)_-30%,var(--color-brand-600)_50%,var(--color-brand-800)_130%)] text-white shadow-brand hover:brightness-105",
  secondary: "bg-brand-100 text-brand-700 hover:bg-brand-200/70",
  outline: "bg-surface text-ink shadow-card hover:bg-surface-2",
  ghost: "text-body hover:bg-black/[0.04] hover:text-ink",
  danger: "bg-danger-50 text-danger-600 hover:brightness-95",
  success: "bg-success-500 text-white hover:brightness-105",
  dark: "bg-ink text-white hover:bg-black",
  coral: "bg-[linear-gradient(150deg,var(--color-coral-400),var(--color-coral-500))] text-white shadow-[0_12px_24px_-10px_var(--color-coral-500)] hover:brightness-105",
  sea: "bg-[linear-gradient(150deg,var(--color-sea-300)_-20%,var(--color-sea-500)_60%)] text-white shadow-[0_12px_24px_-10px_var(--color-sea-500)] hover:brightness-105",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3.5 text-[13.5px]",
  md: "h-11 rounded-2xl px-4 text-[14.5px]",
  lg: "h-[50px] rounded-[18px] px-5 text-[15.5px]",
  xl: "h-[54px] rounded-[18px] px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", block = false, extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${extra}`;
}
