"use client";

import { useEffect, useState } from "react";
import { agoSaid } from "@/lib/t";

const full = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * «من 5 سوايع»: how long ago, said the way one says it, and kept true — it
 * moves on by itself every minute while the page stays open. The full date
 * and hour are in its title (a mouse over it). The server's first word and
 * the browser's may differ by a minute: the browser's wins, quietly.
 */
export function Ago({ at, className = "" }: { at: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time dateTime={at} title={full(at)} className={className} suppressHydrationWarning>
      {agoSaid(now - Date.parse(at))}
    </time>
  );
}
