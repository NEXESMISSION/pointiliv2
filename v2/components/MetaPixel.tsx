"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { drainPixel, pixel, pixelHere, pixelOnce, startPixel } from "@/lib/pixel";
import { PRICE } from "@/lib/seo";

/**
 * Facebook's pixel on the pages (lib/pixel). It starts on the first page that
 * may use it, then sends a PageView on each page after, plus the step a page
 * means: the price, the sign-up, the account made. A tap on WhatsApp or a
 * call is a Contact, from any page. With no pixel number set in the console's
 * settings, nothing runs at all.
 */
export function MetaPixel({ id }: { id: string | null }) {
  const path = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !pixelHere(path)) return;
    startPixel(id);
    if (last.current === path) return;
    last.current = path;
    pixel("PageView");
    if (path === "/prix") pixel("ViewContent", { content_name: "prix", value: PRICE, currency: "TND" });
    else if (path === "/guide" || path === "/faq") pixel("ViewContent", { content_name: path.slice(1) });
    else if (path === "/shop/new") pixelOnce("Lead");
    // the shop just made: our server told Facebook already (lib/meta) and left its event_id in the
    // `pl-reg` cookie, so this browser's step is the same one, counted once — and only here, right
    // after making it (never an owner coming back to change the shop, nor from a second browser)
    const reg = document.cookie.match(/(?:^|;\s*)pl-reg=([\w-]+)/)?.[1];
    if (reg) {
      document.cookie = "pl-reg=; max-age=0; path=/";
      pixelOnce("CompleteRegistration", undefined, reg);
    }
    // what a popup asked for while the page was still opening (the card made, the subscription on)
    drainPixel();
  }, [id, path]);

  useEffect(() => {
    if (!id) return;
    const onClick = (e: MouseEvent) => {
      const href = (e.target instanceof Element ? e.target.closest("a[href]") : null)?.getAttribute("href") ?? "";
      if (/^tel:|^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(href)) pixel("Contact", { content_name: href.startsWith("tel:") ? "call" : "whatsapp" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [id]);

  return null;
}
