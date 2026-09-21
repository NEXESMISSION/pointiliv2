"use client";

import { useT } from "@/components/i18n/Provider";

const APP = /Android|iPhone|iPad|iPod/i;

/**
 * The one ask we make of a customer, at the only moment they are happy to hear
 * it: the stamp just landed. On a phone it opens the Instagram app itself, on a
 * computer the profile page — and if the app is not installed, the web page
 * still comes up a moment later.
 */
export function FollowInstagram({ handle, shop }: { handle: string; shop: string }) {
  const { t, fill } = useT();
  const web = `https://instagram.com/${handle}`;

  return (
    <a
      href={web}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!APP.test(navigator.userAgent)) return; // a computer: just open the page
        e.preventDefault();
        // if the app answers, the page is hidden before the fallback fires
        const fallback = setTimeout(() => window.open(web, "_blank", "noopener"), 1200);
        addEventListener("pagehide", () => clearTimeout(fallback), { once: true });
        addEventListener("visibilitychange", () => document.hidden && clearTimeout(fallback), { once: true });
        location.href = `instagram://user?username=${handle}`;
      }}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F9A03F] via-[#E1306C] to-[#A02D9E] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgb(225_48_108/0.9)] transition active:scale-[0.99]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[18px] shrink-0" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
      </svg>
      {fill(t.scan.success.follow, { shop })}
    </a>
  );
}
