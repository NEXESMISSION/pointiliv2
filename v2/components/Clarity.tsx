"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { clarityHere, clarityTag, startClarity } from "@/lib/clarity";

/**
 * Microsoft Clarity on the pages (lib/clarity): it starts on the first page
 * that may be recorded, and tags the video with this visit's id, the same id
 * the console's traffic shows, so one visit can be found in both. With no
 * project id in the console's settings, nothing runs at all.
 */
export function Clarity({ id }: { id: string | null }) {
  const path = usePathname();
  useEffect(() => {
    if (!id || !clarityHere(path)) return;
    startClarity(id);
    try {
      const visit = JSON.parse(localStorage.getItem("pt_s") ?? "null") as { id?: string } | null;
      if (visit?.id) clarityTag("visit", visit.id);
    } catch {
      /* no storage: the video has no tag */
    }
  }, [id, path]);
  return null;
}
