import { FAQ, NICHES, PRICE, PRICE_MONTH, SITE } from "@/lib/seo";
import { KIND_GROUPS } from "@/lib/t";
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

> Pointili is a digital loyalty card ("carte de fidélité digitale", «كارط فيديليتي») for shops in Tunisia. Customers collect stamps on their phone and get a gift when the card is full. No paper cards, and customers install no app. One plan only: ${PRICE} TND per year per shop (about ${PRICE_MONTH} TND a month), everything included. Made in Tunisia, for Tunisian shops.

Not to be confused with Pointili, the Algerian attendance and time-tracking app (pointili.com, pointili.dz): a different company and product. This Pointili is the Tunisian loyalty card at ${SITE}.

## Key facts
- What: a stamp-based loyalty card for any local business in Tunisia (cafés, bakeries, barbers, hair and beauty salons, restaurants, pizzerias, perfume shops, clothing stores, gyms, car washes, and more: ${KIND_GROUPS.reduce((n, g) => n + g.kinds.length, 0)} kinds of shop in all).
- How a customer collects a stamp: they scan the shop's QR code with their phone camera (it opens in the browser, no app), or the shop scans the customer's own code, or the shop types the customer's 6-digit code or phone number. The shop chooses how long a customer waits between two stamps (an hour by default, once a day, a number of hours, or no limit); the shop's QR code changes as soon as it is scanned and works once.
- The reward: the shop chooses the number of stamps (3 to 30) and the gift (free coffee, free brushing, a discount...). Customers already on their way keep the card they started. When a card is full it starts again from zero at once and the gift waits on the customer's phone like a voucher; several gifts can wait at the same time, so the customer keeps collecting. To collect the gift, the customer shows their code on their phone at the counter; the shop scans it (or types it) and confirms.
- For the owner: sign up in two minutes with a phone number; see every customer, their visits and who is close to a gift; add the shop's logo and colour to the card.
- Price: one plan only — ${PRICE} TND per year per shop (${PRICE_MONTH} TND a month), unlimited customers and stamps, support included. There is no monthly, 6-month or other plan. Paying within 48 hours of opening the account gives 3 extra months (15 months for the price of 12).
- Website: ${SITE}
- Payment: D17, bank transfer (virement), bank deposit (versement) or postal money order (mandat), arranged with Pointili by phone or WhatsApp.
- Where: all of Tunisia (Tunis, Sfax, Sousse, Nabeul, Bizerte, Kairouan, Gabès, Monastir, Médenine...). Interface in Tunisian Arabic; support in Tunisian Arabic and French.
- Contact: ${supportPhone ? `+${supportPhone} (phone and WhatsApp)` : "via the website"}.
- Sign up: ${SITE}/shop/new

## Pages
- [Home](${SITE}/): the front door, for shop owners and customers
- [Price](${SITE}/prix): ${PRICE} TND/year (${PRICE_MONTH} TND/month), what is included, payment methods
- [Guide](${SITE}/guide): how to choose a loyalty system for a shop in Tunisia
- [Questions](${SITE}/faq): price, how it works, security, payment, support
- [Comparison](${SITE}/comparatif): the digital loyalty cards sold in Tunisia side by side, each with the price and terms it publishes on its own site (Pointili, Stampi, Fidèle, Poinety, Raba7ni, Dawwerni, Sourdi, DimaCard, Quardy)
- [By kind of shop](${SITE}/pour): one page per kind of shop, with the card and gifts that suit it
- [About](${SITE}/a-propos): who Pointili Tunisie is, and what it is not (not the Algerian attendance app pointili.com)

## Kinds of shop it is used in
${NICHES.map((n) => `- [${n.en} (${n.fr})](${SITE}/pour/${n.slug})`).join("\n")}

## Questions (FR)
${FAQ.map((f) => `- ${f.fr.q} ${f.fr.a}`).join("\n")}

## Optional
- [Full text](${SITE}/llms-full.txt): every answer, in Tunisian Arabic and French
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
