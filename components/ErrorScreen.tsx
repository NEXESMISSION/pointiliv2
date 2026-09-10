"use client";

import Link from "next/link";

/**
 * The branded fallback for a caught render error.
 *
 * Every segment that reads Supabase can throw on a transient DB/network blip.
 * Without a boundary that lands here, the diner or owner sees Next's raw error
 * screen — at the till, mid-service. This gives them a calm message and a way
 * back: retry first (most blips are momentary), then a safe destination.
 *
 * ── WHAT A BROKEN SCREEN HAS TO SAY ────────────────────────────────────────
 *
 * It said "Un souci de notre côté / Quelque chose n'a pas répondu" over a black
 * "!" in a box, and that is a system dialog, not a message. Two things were
 * missing, and both matter more than the wording:
 *
 * FIRST, the fear. When a loyalty app breaks, the question in somebody's head
 * is not "what went wrong", it is "did I lose my points?". Nothing on the
 * screen answered it. `note` exists for that answer and every caller passes one.
 *
 * SECOND, the way out has to lead somewhere the reader wants. See the callers:
 * the app-wide boundary used to offer "Accueil", which is the B2B landing —
 * a customer whose card had just failed was handed a page selling shop
 * subscriptions. This product has made that exact mistake once before, on
 * /cartes, and fixed it there.
 */
export function ErrorScreen({
  title,
  message,
  note,
  reset,
  homeHref,
  homeLabel,
  retryLabel,
  tone = "light",
}: {
  title: string;
  message: string;
  /**
   * The reassurance. Small, under the buttons, and it should answer the fear
   * rather than describe the fault — "tes points sont bien là", not "erreur
   * 500".
   */
  note?: string;
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
  /**
   * The retry button's wording. Optional and French by default: the owner app
   * and the console are French-only, so only the diner boundary passes it.
   */
  retryLabel?: string;
  /**
   * "dark" for the diner app, whose shell is a deep-purple gradient — the light
   * palette rendered charcoal-on-purple there, i.e. barely readable.
   */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="w-full max-w-sm">
        {/*
          A CLOUD, NOT AN EXCLAMATION MARK.

          A bold "!" in a square is the visual language of a system error, and
          it makes a two-second network blip look like something the reader did.
          A struck-through cloud says the same thing in the register this
          actually belongs to: something did not arrive.
        */}
        <span
          aria-hidden
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
            dark ? "bg-white/12 text-white/80" : "bg-lilac text-royal"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <path d="M17.5 19H7a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.7 9.4a4.3 4.3 0 0 1 2.3 7.7" />
            <path d="m3 3 18 18" />
          </svg>
        </span>

        <h1 className={`mt-4 text-[21px] font-extrabold ${dark ? "text-white" : "text-charcoal"}`}>
          {title}
        </h1>
        <p
          className={`mx-auto mt-2 max-w-[32ch] text-[14px] leading-relaxed ${
            dark ? "text-white/70" : "text-slate"
          }`}
        >
          {message}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className={`w-full rounded-2xl py-3.5 text-[14.5px] font-bold active:scale-[0.99] ${
                dark ? "bg-white text-charcoal" : "bg-royal text-white"
              }`}
            >
              {retryLabel ?? "Réessayer"}
            </button>
          )}
          {homeHref && (
            <Link
              href={homeHref}
              className={`w-full rounded-2xl border py-3.5 text-[14px] font-bold active:scale-[0.99] ${
                dark
                  ? "border-white/25 text-white/85"
                  : "border-hair bg-white text-charcoal"
              }`}
            >
              {homeLabel ?? "Retour"}
            </Link>
          )}
        </div>

        {note && (
          <p
            className={`mx-auto mt-5 max-w-[30ch] text-[12px] leading-snug ${
              dark ? "text-white/55" : "text-slate"
            }`}
          >
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
