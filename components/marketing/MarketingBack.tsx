"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/nav/BackButton";

/** Back on marketing sub-pages (phones only — desktop has the full header nav). */
export function MarketingBack() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <span className="md:hidden">
      <BackButton fallback="/" tone="dark" />
    </span>
  );
}
