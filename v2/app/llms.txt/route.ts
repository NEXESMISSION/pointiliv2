import { FAQ, NICHES, PRICE, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;

/**
 * llms.txt (llmstxt.org): what Pointili is, in plain facts, for AI
 * assistants that answer "which loyalty card app for my shop in Tunisia?" —
 * the price, how it works, how to pay, how to reach us, and every page.
 */
export async function GET() {
  const { supportPhone } = await getSettings();
  const text = `# Pointili

> Pointili is a digital loyalty card ("carte de fidélité digitale", «كارط فيديليتي») for shops in Tunisia. Customers collect stamps on their phone and get a gift when the card is full. No paper cards, and customers install no app. ${PRICE} TND per year per shop, everything included.

## Key facts
- What: a stamp-based loyalty card for any local business in Tunisia (cafés, bakeries, barbers, hair and beauty salons, restaurants, pizzerias, perfume shops, clothing stores, gyms, car washes, and ${NICHES.length - 12}+ other kinds).
- How a customer collects a stamp: they scan the shop's QR code with their phone camera (it opens in the browser, no app), or the shop scans the customer's own code, or the shop types the customer's 6-digit code or phone number. The shop chooses how long a customer waits between two stamps (an hour by default, once a day, a number of hours, or no limit); the shop's QR code changes as soon as it is scanned and works once.
- The reward: the shop chooses the number of stamps (3 to 30) and the gift (free coffee, free brushing, a discount...). Customers already on their way keep the card they started. To collect the gift, the customer shows their code on their phone at the counter; the shop scans it (or types it) and confirms.
- For the owner: sign up in two minutes with a phone number; see every customer, their visits and who is close to a gift; add the shop's logo and colour to the card.
- Price: ${PRICE} TND per year per shop, unlimited customers and stamps. Paying within 48 hours of opening the account gives 3 extra months (15 months for the price of 12).
- Payment: D17, bank transfer (virement), bank deposit (versement) or postal money order (mandat), arranged with Pointili by phone or WhatsApp.
- Where: all of Tunisia (Tunis, Sfax, Sousse, Nabeul, Bizerte, Kairouan, Gabès, Monastir, Médenine...). Interface in Tunisian Arabic; support in Tunisian Arabic and French.
- Contact: ${supportPhone ? `+${supportPhone} (phone and WhatsApp)` : "via the website"}.
- Sign up: ${SITE}/shop/new

## Pages
- [Home](${SITE}/): the front door, for shop owners and customers
- [Price](${SITE}/prix): ${PRICE} TND/year, what is included, payment methods
- [Questions](${SITE}/faq): price, how it works, security, payment, support

## Kinds of shop it is used in
${NICHES.map((n) => `- ${n.en} (${n.fr})`).join("\n")}

## Questions (FR)
${FAQ.map((f) => `- ${f.fr.q} ${f.fr.a}`).join("\n")}

## Optional
- [Full text](${SITE}/llms-full.txt): every answer, in Tunisian Arabic and French
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
