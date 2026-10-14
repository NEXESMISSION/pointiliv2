import { KIND_GROUPS } from "@/lib/t";

/**
 * A first card that is right before the owner touches it: how many tampons
 * and which colour, from what the shop sells. A café's customer comes every
 * day (8), a barber's twice a month (6), a shop of things now and then (5).
 * The gift is the kind's first idea (t.ideas). The wait between two tampons
 * starts at an hour. All of it changes later from «المحل».
 */
const GOAL_BY_GROUP: Record<string, number> = { food: 8, house: 10, beauty: 6, things: 5, services: 6 };
const GOAL: Record<string, number> = { bakery: 10, grocery: 10, gym: 10, books: 8, pets: 8, hardware: 8, laundry: 8, print: 8, courses: 8, pitch: 8, games: 8, other: 8 };

const COLOR_BY_GROUP: Record<string, string> = { food: "#D7141A", house: "#12B76A", beauty: "#E0457B", things: "#6C47FF", services: "#1D5FA8" };
const COLOR: Record<string, string> = {
  cafe: "#B45309",
  roastery: "#B45309",
  bakery: "#B45309",
  viennoiserie: "#B45309",
  pastry: "#E0457B",
  juice: "#FF6B4A",
  barber: "#1F1B2E",
  parapharmacy: "#0891B2",
  hammam: "#0891B2",
  optics: "#0891B2",
  gym: "#1D5FA8",
  carwash: "#0891B2",
  other: "#6C47FF",
};

const groupOf = (kind: string) => KIND_GROUPS.find((g) => g.kinds.includes(kind))?.id ?? "services";

export function cardDefaults(kind: string): { goal: number; color: string } {
  const g = groupOf(kind);
  return { goal: GOAL[kind] ?? GOAL_BY_GROUP[g] ?? 8, color: COLOR[kind] ?? COLOR_BY_GROUP[g] ?? "#6C47FF" };
}
