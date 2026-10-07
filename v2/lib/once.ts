"use client";

import { markSeen } from "@/app/actions";

/**
 * The one-time notes (the bravo after the first card, the card's hello, the
 * logo tip). The person's list in the database decides — the page only shows
 * a note the list does not have — and the note is written there the moment
 * it shows, so a reload or another phone never shows it again. This phone
 * also remembers it, for a page the browser brings back from its history
 * (it would carry the list as it was).
 */
export type Note = "coach" | "logo_tip" | "card_hello" | "offer" | "push" | "install";

const here = new Set<string>();
/** false while the first page wakes up (it shows what the server decided), true after */
let settled = false;

/** Called once the first page is awake: from then on, a page this phone already showed a note on stays without it. */
export function settle() {
  settled = true;
}

/** For a page drawn here, not by the server (the back button): did this phone show the note already? */
export function seenBefore(note: Note, who: string): boolean {
  return settled && seenHere(note, who);
}

export function seenHere(note: Note, who: string): boolean {
  const key = `pt_seen:${note}:${who}`;
  if (here.has(key)) return true;
  try {
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

/** A piece of news (components/NewsPopup): did this phone show it already? */
export function newsSeenHere(id: string, who: string): boolean {
  const key = `pt_news:${id}:${who}`;
  if (here.has(key)) return true;
  try {
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

/** A piece of news just showed on this phone (the popup writes it on the person too). */
export function newsShownHere(id: string, who: string) {
  const key = `pt_news:${id}:${who}`;
  here.add(key);
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* private mode: the database still knows */
  }
}

/** The note just showed: never again, here or anywhere. */
export function shown(note: Note, who: string) {
  const key = `pt_seen:${note}:${who}`;
  if (here.has(key)) return;
  here.add(key);
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* private mode: the database still knows */
  }
  void markSeen(note).catch(() => {});
}
