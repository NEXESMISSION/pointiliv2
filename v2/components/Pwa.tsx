"use client";

import { useEffect } from "react";
import { startPwa } from "@/lib/pwa";

/**
 * In the layout: the worker, Android's install prompt kept, the installed
 * app's visits counted. A file of its own, so every page does not carry the
 * install guides and their button for it (components/InstallApp, 26 Oct 2026).
 */
export function Pwa() {
  useEffect(() => startPwa(), []);
  return null;
}
