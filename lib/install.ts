"use client";

import { useSyncExternalStore } from "react";

/**
 * "Install app" state, shared by every install button.
 *
 * Android (Chrome, Edge, Samsung Internet) fires `beforeinstallprompt` once the
 * app is installable; we keep that event so a button can open the native install
 * sheet later. iPhone has no such event — Safari installs through
 * Share → "Add to Home Screen", so we show those steps instead.
 */
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own, calmer button
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export type InstallMode = "android" | "ios" | "installed" | "none";

function snapshot(): InstallMode {
  if (typeof window === "undefined") return "none";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (installed || standalone) return "installed";
  if (deferred) return "android";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return "ios";
  return "none";
}

export function useInstall() {
  const mode = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot,
    () => "none" as InstallMode,
  );
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    return outcome === "accepted";
  };
  return { mode, install };
}
