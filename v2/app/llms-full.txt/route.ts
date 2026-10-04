import { FAQ, giftsOf, NICHES, PRICE, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const revalidate = 3600;

/** Everything an AI assistant may quote about Pointili, in Tunisian Arabic and French, one shop kind after another. */
export async function GET() {
  const { supportPhone } = await getSettings();
  const text = `# Pointili — carte de fidélité digitale en Tunisie / كارط فيديليتي ديجيتال في تونس

Site: ${SITE}
Prix / السوم: ${PRICE} TND par an et par commerce (${PRICE} د في العام)
Contact: ${supportPhone ? `+${supportPhone} (téléphone, WhatsApp)` : SITE}

## Questions — أسئلة
${FAQ.map((f) => `### ${f.q}\n${f.a}\n\n### ${f.fr.q}\n${f.fr.a}`).join("\n\n")}

## Par type de commerce — لكل نوع محل
${NICHES.map((n) => `### ${n.fr} — ${t.kinds[n.kind]}\nCarte de fidélité digitale pour ${n.fr} en Tunisie. Cadeaux courants: ${giftsOf(n.kind).join(", ")}.\nكارط فيديليتي ${n.tn}: الحريف يلمّ التامبونات في تليفونو وياخو ${giftsOf(n.kind)[0] ?? "كادو"}.`).join("\n\n")}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
