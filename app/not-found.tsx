import Link from "next/link";
import { currentLang, dir, translator } from "@/lib/i18n";
import { cafeVars } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * The 404, which is almost always somebody's customer: a mistyped slug, a
 * link that lost its last character. Its exit is their wallet, never the
 * sales page — nobody arrives at a 404 wanting to buy software.
 *
 * THE TRAP: it does not guess which shop they meant. A near-miss search from
 * an unauthenticated error page sends somebody to a stranger's shop convinced
 * it is theirs. The QR on the counter is right there and is never wrong.
 */
export default async function NotFound() {
  const lang = await currentLang();
  const t = translator(lang);

  return (
    <div
      lang={lang === "tn" ? "ar-TN" : "fr"}
      dir={dir(lang)}
      className={`app-shell safe-t safe-b flex min-h-dvh flex-col items-center justify-center px-6 text-center [--safe-pb:2rem] [--safe-pt:2rem] ${lang === "tn" ? "lang-tn" : ""}`}
      style={cafeVars(null)}
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-2xl text-[26px]"
        style={{ background: "var(--cafe-soft)" }}
        aria-hidden
      >
        🔎
      </span>

      <h1 className="mt-5 text-[24px] leading-tight text-ink">{t("Cette adresse ne mène nulle part")}</h1>
      <p className="mx-auto mt-2 max-w-[30ch] text-[13.5px] leading-relaxed text-slate">
        {t("Le lien est peut-être incomplet. Le QR du comptoir ouvre toujours la bonne carte.")}
      </p>

      <div className="mt-7 w-full max-w-[320px]">
        <Link
          href="/moi"
          className="block w-full rounded-2xl py-3.5 text-[14.5px] font-bold"
          style={{ background: "var(--cafe)", color: "var(--cafe-ink)" }}
        >
          {t("Mes cartes")}
        </Link>
      </div>

      <p dir="ltr" className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
        ✦ pointili.online
      </p>
    </div>
  );
}
