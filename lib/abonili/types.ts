/** The shapes the public.ab_* functions return. Nothing here is shared with Pointili. */

export type AbStatus = "active" | "soon" | "upcoming" | "expired" | "none";
export type AbKind = "gym" | "salon" | "terrain" | "academy" | "pool" | "other";
export type AbMethod = "cash" | "d17" | "transfer" | "card" | "other";

export const AB_KINDS: AbKind[] = ["gym", "salon", "terrain", "academy", "pool", "other"];
export const AB_METHODS: AbMethod[] = ["cash", "d17", "transfer", "card", "other"];

/** abonili.member_json(): what every screen knows about one person. */
export type AbMember = {
  id: string;
  code: number;
  name: string;
  phone: string | null;
  note: string | null;
  card_token: string;
  created_at: string;
  status: AbStatus;
  plan_name: string | null;
  plan_id: string | null;
  period_id: string | null;
  /** last day they are covered, queued renewals included */
  until: string | null;
  /** days they can still come, today included */
  days_left: number | null;
  sessions_left: number | null;
  sessions_total: number | null;
  next_starts: string | null;
  ended_on: string | null;
  last_visit: string | null;
  visited_today: boolean;
};

export type AbPlan = {
  id: string;
  name: string;
  price: number;
  days: number | null;
  sessions: number | null;
  active: boolean;
  members: number;
};

export type AbClub = {
  id: string;
  name: string;
  kind: AbKind;
  phone: string | null;
  address: string | null;
  status: "active" | "suspended";
  paid_until: string | null;
  created_at: string;
};

export type AbContext = {
  user: { id: string; name: string | null; phone: string | null };
  club: AbClub;
  today: string;
  counts: { plans: number; members: number };
};

export type AbPeriod = {
  id: string;
  plan_name: string;
  starts_on: string;
  ends_on: string | null;
  sessions: number | null;
  used: number;
  cancelled: boolean;
  state: "current" | "upcoming" | "done" | "cancelled";
  paid: number;
};

export type AbMemberDetail = {
  ok: true;
  member: AbMember;
  periods: AbPeriod[];
  visits: string[];
  visits_total: number;
  paid_total: number;
};

export type AbFilter = "all" | "active" | "soon" | "expired";
export type AbMembersPage = { counts: Record<AbFilter, number>; items: AbMember[] };

export type AbDoor = { ok: true; kind: "empty" | "card" | "number" | "name"; matches: AbMember[] };

export type AbCheckin =
  | { ok: true; member: AbMember }
  | { ok: false; error: string; member?: AbMember; at?: string };

export type AbToday = {
  visits: { at: string; member_id: string; name: string; code: number }[];
  visits_today: number;
  active: number;
  ending_week: number;
};

export type AbMoney = {
  month: string;
  total: number;
  count: number;
  previous: number;
  by_method: Partial<Record<AbMethod, number>>;
  payments: { id: string; amount: number; method: AbMethod; at: string; member_id: string; name: string; code: number; plan_name: string | null }[];
  due: { member_id: string; name: string; code: number; phone: string | null; until: string; plan_name: string; price: number | null }[];
};

export type AbCard =
  | {
      ok: true;
      club: { name: string; kind: AbKind; phone: string | null; address: string | null };
      member: Omit<AbMember, "phone" | "note">;
      visits: string[];
    }
  | { ok: false; error: string };

export type AbResult = { ok: true; [k: string]: unknown } | { ok: false; error: string; [k: string]: unknown };
