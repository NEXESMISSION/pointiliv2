import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base",
} as const;

/** Light outline button for dark backgrounds (hero, CTA panels). */
export function DarkOutlineLink({
  size = "lg",
  block = false,
  icon,
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link> & { size?: keyof typeof sizes; block?: boolean; icon?: ReactNode }) {
  return (
    <Link
      className={`inline-flex select-none items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 font-semibold text-white transition hover:border-white/35 hover:bg-white/10 active:scale-[0.98] ${sizes[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
      {icon}
    </Link>
  );
}
