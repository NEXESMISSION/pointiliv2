"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { settle } from "@/lib/once";
import { enterPage, setScreen, startTracking } from "@/lib/track";

/** In the root layout: every page the visitor opens, and the listeners, once. */
export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    startTracking();
    settle();
  }, []);
  useEffect(() => {
    if (path) enterPage(path);
  }, [path]);
  return null;
}

/** A step inside a page, named for the traffic (the card's questions, the scan's answers). */
export function useScreen(name: string | null) {
  useEffect(() => {
    if (name) setScreen(name);
  }, [name]);
}

/** The same, from a server component: <Mark screen="welcome" />. */
export function Mark({ screen }: { screen: string }) {
  useScreen(screen);
  return null;
}
