import Link from "next/link";
import { BrandLockup } from "@/components/BrandMark";
import { LangToggle } from "@/components/LangToggle";
import { currentLang, dir, translator } from "@/lib/i18n";
import { MARKETING_URL } from "@/lib/seo";

/**
 * The minimal landing on the product host: what this is, and a link out to
 * the sales site. Static in spirit, dynamic only because it reads the
 * language cookie.
 *
 * THE TRAP: this page NEVER redirects on a cookie. A shared phone with a
 * client cookie and an owner session must be able to reach a neutral page —
 * /app is the switchboard, and it is the only route that decides.
 */
export default async function Landing() {
  const lang = await currentLang();
  const t = translator(lang);

  return (
    <div
      lang={lang === "tn" ? "ar-TN" : "fr"}
      dir={dir(lang)}
      className={`safe-t safe-b flex min-h-dvh flex-col ${lang === "tn" ? "lang-tn" : ""}`}
    >
      <header className="mx-auto flex w-full max-w-[560px] items-center justify-between px-5">
        <BrandLockup size={34} accent="#5b3fd1" />
        <LangToggle current={lang} />
      </header>

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-12">
        <h1 className="text-[30px] leading-tight text-ink">{t("Scanne l'écran, c'est tamponné.")}</h1>
        <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-slate">
          {t(
            "Une carte à tampons sans application : le commerce affiche un QR, tu le scannes avec ton appareil photo, le tampon se pose.",
          )}
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/moi"
            className="rounded-2xl bg-royal px-5 py-3.5 text-center text-[14.5px] font-bold text-white"
          >
            {t("Voir mes cartes")}
          </Link>
          <Link
            href="/owner/login"
            className="rounded-2xl border border-hair bg-white px-5 py-3.5 text-center text-[14.5px] font-bold text-ink"
          >
            {t("Je tiens un commerce")}
          </Link>
        </div>

        <a
          href={MARKETING_URL}
          className="mt-8 text-[13px] font-semibold text-slate underline underline-offset-4"
        >
          {t("En savoir plus sur Pointili")} →
        </a>
      </main>

      <footer className="mx-auto w-full max-w-[560px] px-5">
        <p dir="ltr" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
          ✦ pointili.online
        </p>
      </footer>
    </div>
  );
}
