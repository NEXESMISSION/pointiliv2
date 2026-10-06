"use client";

import { useEffect } from "react";
import { markFounder } from "@/lib/pixel";

/** The console marks the founder's browser: from then on Facebook's pixel never counts it, on any page. */
export function FounderMark() {
  useEffect(() => markFounder(), []);
  return null;
}
