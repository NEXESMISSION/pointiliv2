export const PLANS = {
  six_month: { id: "six_month", price: 80 },
  yearly: { id: "yearly", price: 120 },
} as const;
export type PaidPlan = keyof typeof PLANS;

export const TRIAL_DAYS = 30;

export const PAYMENT_METHODS = {
  bank_transfer: "Bank transfer",
  d17: "D17",
  cash: "Cash",
  other: "Other",
} as const;

/** Card styles. Inline colours (not class names) so any value renders without a Tailwind safelist. */
export const CARD_COLORS = {
  indigo: { label: "Indigo", bg: "#EEEEFF", accent: "#6535E0", soft: "#DCDAFF" },
  emerald: { label: "Mint", bg: "#E6F8F0", accent: "#0E9F6E", soft: "#C5EEDD" },
  amber: { label: "Honey", bg: "#FFF4DE", accent: "#D97706", soft: "#FCE3B0" },
  orange: { label: "Peach", bg: "#FFEFE5", accent: "#EA580C", soft: "#FDD5BC" },
  rose: { label: "Rose", bg: "#FFEBEF", accent: "#E11D48", soft: "#FCCAD5" },
  violet: { label: "Lilac", bg: "#F2ECFF", accent: "#7C3AED", soft: "#DDD0FC" },
  sky: { label: "Sky", bg: "#E4F3FD", accent: "#0284C7", soft: "#BFE3F8" },
  slate: { label: "Slate", bg: "#EDF0F4", accent: "#334155", soft: "#D3D9E2" },
} as const;
export type CardColor = keyof typeof CARD_COLORS;

export function cardColor(name: string | null | undefined) {
  return CARD_COLORS[(name as CardColor) in CARD_COLORS ? (name as CardColor) : "indigo"];
}

export const CARD_ICONS = [
  "coffee",
  "croissant",
  "cake",
  "pizza",
  "burger",
  "utensils",
  "ice-cream",
  "scissors",
  "sparkles",
  "shopping-bag",
  "heart",
  "star",
] as const;
export type CardIconName = (typeof CARD_ICONS)[number];

export const CATEGORIES = {
  cafe: { label: "Café", icon: "coffee" },
  restaurant: { label: "Restaurant", icon: "utensils" },
  fast_food: { label: "Fast food", icon: "burger" },
  pizzeria: { label: "Pizzeria", icon: "pizza" },
  bakery: { label: "Bakery & pastry", icon: "croissant" },
  ice_cream: { label: "Ice cream & juice", icon: "ice-cream" },
  salon: { label: "Hair salon & barber", icon: "scissors" },
  beauty: { label: "Beauty & spa", icon: "sparkles" },
  retail: { label: "Shop", icon: "shopping-bag" },
  gym: { label: "Gym", icon: "dumbbell" },
  other: { label: "Other", icon: "star" },
} as const;


export const COOLDOWN_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "Once a day" },
] as const;

export const QR_ROTATE_BEFORE_MS = 15_000;
export const QR_POLL_MS = 900;
