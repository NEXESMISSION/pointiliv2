/** Shapes returned by the database functions (snake_case, exactly as returned). */

export type Role = "customer" | "merchant" | "admin";

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
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    category: string;
    phone: string | null;
    address: string | null;
    status: "active" | "suspended";
    created_at: string;
  } | null;
  card: {
    id: string;
    name: string;
    description: string | null;
    stamps_required: number;
    color: string;
    icon: string;
    cooldown_minutes: number;
    active: boolean;
    reward: { id: string; name: string; description: string | null } | null;
  } | null;
  subscription: SubscriptionState | null;
};

export type BusinessMini = { id?: string; name: string; logo_url: string | null; category: string; address?: string | null; status?: string };
export type CardStyle = { id?: string; name?: string; description?: string | null; stamps_required: number; color: string; icon: string; cooldown_minutes?: number; active?: boolean };

export type RewardItem = {
  id: string;
  name: string;
  description: string | null;
  stamps_required: number;
  is_primary: boolean;
  unlocked: boolean;
  pending: { id: string; code: string; expires_at: string } | null;
};

export type CardPayload = {
  customer: {
    id: string;
    code: number;
    balance: number;
    total_stamps: number;
    rewards_redeemed: number;
    first_stamp_at: string | null;
    last_stamp_at: string | null;
  };
  business: BusinessMini;
  card: CardStyle | null;
  rewards: RewardItem[];
  next_reward: { id: string; name: string; stamps_required: number; remaining: number } | null;
  newly_unlocked: { id: string; name: string; stamps_required: number }[];
};

export type HistoryItem = { type: "stamp" | "reward_redeemed"; at: string; reward_name?: string };

export type StampResult =
  | ({ ok: true; stamp_id: string } & CardPayload)
  | ({ ok: false; error: string; next_at?: string } & Partial<CardPayload>);

export type HomeCard = {
  customer_id: string;
  code: number;
  balance: number;
  total_stamps: number;
  last_stamp_at: string | null;
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
  data: { balance?: number; reward_name?: string; stamps_spent?: number; code?: number };
  business_name?: string | null;
  business_id?: string | null;
};

export type RedemptionView = {
  id: string;
  code: string;
  status: "pending" | "redeemed" | "cancelled" | "expired";
  reward_name: string;
  stamps_spent: number;
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
};

export type MerchantContext = SessionContext & { business: NonNullable<SessionContext["business"]> };

export type MerchantCustomerRow = {
  id: string;
  code: number;
  name: string | null;
  phone_masked: string | null;
  balance: number;
  total_stamps: number;
  rewards_redeemed: number;
  first_stamp_at: string | null;
  last_stamp_at: string | null;
  reward_ready: boolean;
};
