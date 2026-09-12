"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/nav/BackButton";
import { useT } from "@/components/i18n/Provider";
import { splitLocalePath } from "@/lib/i18n/config";

/** Back on marketing sub-pages (phones only — desktop has the full header nav). */
export function MarketingBack() {
  const pathname = usePathname();
  const { path } = useT();
  const home = path("/") || "/";
  if (splitLocalePath(pathname).path === "/") return null;
  return (
    <span className="md:hidden">
      <BackButton fallback={home} />
    </span>
  );
}
