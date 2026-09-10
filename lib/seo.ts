/**
 * One source of truth for how Pointili Tampon describes itself: the site name,
 * the tagline, and the ORIGIN that is baked into every QR.
 *
 * THE TRAP: SITE_URL is the exact host the till encodes in the QR
 * (`${SITE_URL}/s/<token>`). It must be the host that does NOT redirect — a
 * 308 on the QR's URL costs a customer a round trip on Tunisian 4G before the
 * page even starts, and with the default t.pointili.online the URL is 40 bytes,
 * which is what keeps the QR at version 3 (29×29) rather than 4.
 */

/** The canonical origin, no trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://t.pointili.online").replace(/\/$/, "");

export const SITE_NAME = "Pointili";

/** Where the sales pitch lives. This host only serves the product. */
export const MARKETING_URL = "https://www.pointili.online";

/** The one-sentence answer to "what is this". */
export const TAGLINE = "Scanne l'écran, c'est tamponné.";

export const DESCRIPTION =
  "Pointili Tampon est une carte à tampons sans application pour les cafés et commerces tunisiens. " +
  "Le commerce affiche un QR sur son téléphone, le client le scanne avec son appareil photo, " +
  "et le tampon se pose sur sa carte — sans compte, sans numéro, sans code.";
