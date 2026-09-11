/**
 * Button class names. A plain module (no "use client") so Server Components can
 * style a <Link> as a button too — a function exported from a client file cannot
 * be called on the server.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "dark";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors active:opacity-90 disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-brand hover:bg-brand-700",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line bg-white text-ink shadow-card hover:bg-canvas",
  ghost: "text-body hover:bg-black/[0.04] hover:text-ink",
  danger: "border border-line bg-white text-danger-600 hover:bg-danger-50",
  success: "bg-success-600 text-white hover:bg-success-500",
  dark: "bg-ink text-white hover:bg-black",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
  xl: "h-14 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", block = false, extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${extra}`;
}
