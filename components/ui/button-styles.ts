/**
 * Button class names. A plain module (no "use client") so Server Components can
 * style a <Link> as a button too — a function exported from a client file cannot
 * be called on the server.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "dark";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-brand hover:bg-brand-700",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line bg-white text-ink hover:bg-canvas",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "border border-danger-500/40 bg-white text-danger-600 hover:bg-danger-50",
  success: "bg-success-500 text-white hover:bg-success-600",
  dark: "bg-ink text-white hover:bg-black",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base",
  xl: "h-16 px-7 text-lg rounded-3xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", block = false, extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${extra}`;
}
