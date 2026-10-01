/** Shapes returned by the database functions (snake_case, exactly as returned). */
import type { CardDesign } from "./card-design";

export type Role = "customer" | "merchant" | "admin";

/** A shop runs stamps (with or without levels) or points (0016). */
export type CardSystem = "stamps" | "points";

export type SubscriptionState = {
  status: "active" | "expiring_soon" | "expired" | "cancelled" | "none";
  open: boolean;
  plan: "trial" | "six_month" | "yearly" | null;
  price: number | null;
  currency: string;
  starts_at: string | null;
  expires_at: string | null;
  days_left: number;
};

export type SessionContext = {
  user: { id: string; full_name: string | null; phone: string | null; email: string | null; role: Role; created_at: string };
  member_role: "owner" | "staff" | null;
  /** the founder inside this shop («ادخل كمحل», 0013), with the owner's powers */
  acting?: boolean;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    cover_url: string | null;
    category: string;
    phone: string | null;
    address: string | null;
    instagram: string | null;
    status: "active" | "suspended";
    created_at: string;
    join_code: string;
    /** null until the owner has been through the welcome (0011) */
    onboarded_at: string | null;
  } | null;
  card: {
    id: string;
    name: string;
    description: string | null;
    stamps_required: number;
    color: string;
    icon: string;
    cooldown_minutes: number;
    valid_days: number;
    active: boolean;
    design: Partial<CardDesign> | null;
    reward: { id: string; name: string; description: string | null } | null;
    /** gifts on the way to the goal: taking one costs no stamps (0012) */
    levels: CardLevel[];
    /** bumped by every save: a save made against an older one is refused (0015) */
    version: number;
    system: CardSystem;
    /** points: how many dinars paid make one point */
    dinars_per_point: number;
    points_expire: boolean;
  } | null;
  subscription: SubscriptionState | null;
};

export type CardLevel = { id: string; name: string; stamps: number };

export type BusinessMini = { id?: string; name: string; logo_url: string | null; cover_url?: string | null; category: string; address?: string | null; instagram?: string | null; status?: string };
/** stamps_required is THIS customer's goal (see reward_cost in SQL); card_stamps_required is today's setting. */
export type CardStyle = { id?: string; name?: string; description?: string | null; stamps_required: number; levels?: number[]; card_stamps_required?: number; color: string; icon: string; cooldown_minutes?: number; valid_days?: number; active?: boolean; design?: Partial<CardDesign> | null; system?: CardSystem; dinars_per_point?: number; points_expire?: boolean };

/** merchant_card_impact(): customers mid-card grouped by (their goal, their stamps). */
export type CardImpact = {
  stamps_required: number | null;
  customers: number;
  pending_redemptions: number;
  progress: { target: number; balance: number; n: number }[];
};

export type RewardItem = {
  id: string;
  name: string;
  description: string | null;
  stamps_required: number;
  is_primary: boolean;
  /** a gift on the way to the goal: taking it costs no stamps */
  level?: boolean;
  /** a level already taken on this card */
  claimed?: boolean;
  unlocked: boolean;
  pending: { id: string; code: string; expires_at: string } | null;
  /** points: the price in force, a rise to come (a price rise waits 14 days), the end of a gift taken off */
  points?: number;
  next_points?: number | null;
  next_at?: string | null;
  ends_at?: string | null;
};

export type CardPayload = {
  system?: CardSystem;
  customer: {
    id: string;
    code: number;
    /** stamps, or points on a points card */
    balance: number;
    total_stamps: number;
    total_points?: number;
    rewards_redeemed: number;
    first_stamp_at: string | null;
    last_stamp_at: string | null;
    /** when this card dies and goes back to zero; null = it never does */
    expires_at?: string | null;
  };
  business: BusinessMini;
  card: CardStyle | null;
  rewards: RewardItem[];
  next_reward: { id: string; name: string; stamps_required: number; remaining: number; points?: number } | null;
  newly_unlocked: { id: string; name: string; stamps_required: number; level?: boolean; points?: number }[];
};

/** points: a purchase (+), a gift (−), an expiry, a conversion; stamps: a stamp, a gift */
export type HistoryItem = { type: "stamp" | "reward_redeemed" | "points" | "expire" | "convert" | "adjust"; at: string; reward_name?: string | null; points?: number; amount?: number | null };

export type StampResult =
  | ({ ok: true; stamp_id?: string; points_id?: string; earned?: { points: number; amount: number } } & CardPayload)
  | ({ ok: false; error: string; next_at?: string } & Partial<CardPayload>);

export type HomeCard = {
  customer_id: string;
  code: number;
  system?: CardSystem;
  balance: number;
  total_stamps: number;
  total_points?: number;
  last_stamp_at: string | null;
  expires_at?: string | null;
  business: BusinessMini;
  card: CardStyle;
  next_reward: { name: string; stamps_required: number; remaining: number } | null;
  unlocked: string[];
  primary_reward: string | null;
};

export type ActivityItem = {
  id: number;
  type: "stamp" | "reward_redeemed" | string;
  at: string;
  customer_id: string | null;
  customer_code: number | null;
  data: { balance?: number; reward_name?: string; stamps_spent?: number; points_spent?: number; points?: number; amount?: number; code?: number };
  business_name?: string | null;
  business_id?: string | null;
};

export type RedemptionView = {
  id: string;
  code: string;
  status: "pending" | "redeemed" | "cancelled" | "expired";
  reward_name: string;
  stamps_spent: number;
  points_spent?: number;
  system?: CardSystem;
  expires_at: string;
  redeemed_at: string | null;
  customer: { id: string; code: number; balance: number; name: string | null; phone_masked: string | null };
};

export type RedemptionStatus = {
  id: string;
  status: "pending" | "redeemed" | "cancelled" | "expired";
  code: string;
  reward_name: string;
  business_name: string;
  expires_at: string;
  redeemed_at: string | null;
  customer_id: string;
  system?: CardSystem;
  points_spent?: number;
  /** the customer's balance now: points on a points card */
  balance?: number;
};

export type MerchantContext = SessionContext & { business: NonNullable<SessionContext["business"]> };

export type MerchantCustomerRow = {
  id: string;
  code: number;
  name: string | null;
  phone_masked: string | null;
  balance: number;
  total_stamps: number;
  total_points?: number;
  rewards_redeemed: number;
  first_stamp_at: string | null;
  last_stamp_at: string | null;
  reward_ready: boolean;
  target?: number | null;
};
