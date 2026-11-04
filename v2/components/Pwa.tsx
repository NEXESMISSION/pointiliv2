"use client";

import { useEffect } from "react";
import { AndroidInstall } from "@/components/AndroidInstall";
import { startPwa } from "@/lib/pwa";

/**
 * In the layout: the worker, Android's install prompt kept, the installed
 * app's visits counted, and the floating install button of Android's browser
 * (components/AndroidInstall: Chrome's own dialog, nothing heavier). A file of
 * its own, so every page does not carry the install guides and their button
 * for them (components/InstallApp, 26 Oct 2026).
 */
export function Pwa() {
  useEffect(() => startPwa(), []);
  return <AndroidInstall />;
}
