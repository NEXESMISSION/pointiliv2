/** Error codes returned by the database functions → words a person reads. */
const MESSAGES: Record<string, string> = {
  // scanning
  invalid: "This QR code isn't valid.",
  expired: "This QR code has expired. Please scan the current QR code.",
  already_used: "This QR code was just used. Please scan the current QR code on the screen.",
  already_processed: "This scan has already been processed.",
  too_soon: "You already collected a stamp here recently. See you on your next visit!",
  business_paused: "This business's loyalty program is paused right now.",
  business_unavailable: "This business isn't available on Pointili right now.",
  own_business: "You can't collect stamps at your own business.",
  card_inactive: "This business hasn't set up its loyalty card yet.",
  not_authenticated: "Create your Pointili account to collect your stamp.",
  // merchant
  subscription_expired: "Your Pointili subscription has expired.",
  business_suspended: "Your business is suspended. Please contact Pointili support.",
  no_card: "Create your loyalty card first.",
  not_merchant: "This page is for businesses.",
  already_has_business: "This account already has a business.",
  invalid_name: "Please enter a name (2–60 characters).",
  invalid_stamps: "Please choose a valid number of stamps.",
  invalid_reward: "Please enter the reward name.",
  too_many_rewards: "You can have up to 10 rewards.",
  // rewards
  not_enough_stamps: "Not enough stamps for this reward yet.",
  reward_not_found: "This reward isn't available anymore.",
  not_found: "We couldn't find that. Check the code and try again.",
  already_redeemed: "This reward has already been redeemed.",
  cancelled: "This request was cancelled.",
  // billing
  invalid_plan: "Please choose a plan.",
  already_paid: "This payment is already confirmed.",
  not_pending: "This payment is not pending anymore.",
  // auth
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  resend_wait: "Please wait a minute before requesting a new code.",
  invalid_code: "That code isn't right. Please check it and try again.",
  too_many_attempts: "Too many wrong codes. Request a new code.",
  network: "Something went wrong. Please try again.",
};

export function message(code: string | null | undefined, fallback = MESSAGES.network): string {
  if (!code) return fallback;
  return MESSAGES[code] ?? fallback;
}
