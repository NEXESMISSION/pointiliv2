import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Next's <Link>, without the background preload to the app's own pages.
 *
 * Next preloads every link the moment it is on screen. For a page drawn on the
 * server for each person (nearly all of them here: they read the session), that
 * preload is a request to the server — two on Vercel, with the session's proxy —
 * and with no loading.js to stop at it brings almost nothing the click would not.
 * The owner's home alone has a dozen such links: on the Hobby plan, preloads
 * were one of the largest costs (Nov 2026). A tap fetches the page as before.
 *
 * The public pages built once (STATIC, from `next build`) still preload: they
 * come from Vercel's CDN, not from a server function. A link that wants the
 * preload anyway says so (`prefetch`, as Go does for a customer's two or three places).
 */
const STATIC = /^\/(?:a-propos|comparatif|faq|guide|next|pour|privacy|prix|scan)(?:[/?#]|$)/;

export default function Link({ prefetch, ...rest }: ComponentProps<typeof NextLink>) {
  const href = typeof rest.href === "string" ? rest.href : (rest.href.pathname ?? "");
  return <NextLink prefetch={prefetch ?? (STATIC.test(href) ? null : false)} {...rest} />;
}
