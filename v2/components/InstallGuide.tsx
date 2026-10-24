"use client";

import { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";
import { handoffPath } from "@/app/actions";
import { Sheet, SheetGo } from "@/components/Client";
import { installApp, useCanInstall } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/*
 * Putting Pointili on the home screen, filmed (the founder, 24 Oct 2026:
 * «add both videos, super optimised so they load super fast with no waiting,
 * for the owner to know what to do»). The films are the install videos'
 * phone alone, drawn (social/install-guide/make.py → public/clips): 5 kB and
 * 4 kB over the wire, sharp on any screen, nothing to buffer. The words of
 * each step are the app's own, under the phone; they keep time with it
 * because the film's style carries their timing too — its classes c0… and
 * d0…, drawn into the page with the film, so both start in the same frame.
 */

type Step = { title: string; chip: string | null; hint: string };
type Film = { file: string; prefix: string; label: string; steps: Step[] };
const DONE: Step = { title: t.guideDone, chip: null, hint: t.guideDoneHint };
const FILMS: Record<"ios" | "android", Film> = {
  // iOS 26's Safari: ⋯ → Partager → ⋯ (plus d'options) → Ajouter à l'écran d'accueil → Ajouter
  ios: {
    file: "/clips/install-ios-v1.svg",
    prefix: "igi-",
    label: t.guideIosFor,
    steps: [
      { title: t.guideTap, chip: "⋯", hint: t.guideIos1Hint },
      { title: t.guidePick, chip: "Partager", hint: t.guideIos2Hint },
      { title: t.guideTapOn, chip: "Plus d’options", hint: t.guideIos3Hint },
      { title: t.guidePick, chip: "Ajouter à l’écran d’accueil", hint: t.guideIos4Hint },
      { title: t.guideTapOn, chip: "Ajouter", hint: t.guideIos5Hint },
      DONE,
    ],
  },
  // Chrome: ⋮ → Ajouter à l'écran d'accueil → Installer
  android: {
    file: "/clips/install-android-v1.svg",
    prefix: "iga-",
    label: t.guideAndroidFor,
    steps: [
      { title: t.guideTap, chip: "⋮", hint: t.guideAnd1Hint },
      { title: t.guidePick, chip: "Ajouter à l’écran d’accueil", hint: t.guideAnd2Hint },
      { title: t.guideTapOn, chip: "Installer", hint: t.guideAnd3Hint },
      DONE,
    ],
  },
};

// each film fetched once a page, and ahead of the tap where it can be (public/clips: a year in the phone's cache)
const films = new Map<string, Promise<string>>();
export function preloadGuide(way: "ios" | "android"): Promise<string> {
  const { file } = FILMS[way];
  let got = films.get(file);
  if (!got) {
    got = fetch(file).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${file}: ${r.status}`))));
    // a failure is not kept: the next tap tries again
    got.catch(() => films.delete(file));
    films.set(file, got);
  }
  return got;
}

/** The app added from an iPhone opens signed in: its own cookies start empty there (app/api/manifest). */
export function useAppStartsSignedIn(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let gone = false;
    handoffPath("/")
      .then((to) => {
        const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
        if (!gone && link && to.startsWith("/auth/handoff?")) link.href = `/api/manifest?start=${encodeURIComponent(to)}`;
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [on]);
}

/**
 * «Latin words» inside an Arabic line — the phone's own labels — sealed left
 * to right with their own quotes: on the Arabic side the closing » would
 * otherwise turn into a second «.
 */
export function Mixed({ text }: { text: string }) {
  const parts = text.split(/(«[^»]*[A-Za-z][^»]*»)/);
  return <>{parts.map((p, i) => (i % 2 ? <bdi key={i} dir="ltr">{p}</bdi> : p))}</>;
}

/**
 * The guide: this phone's film, the step it is at said under it (a number,
 * what to do, the phone's own label in a pill, a word more), and the dots of
 * the steps. On Android, when Chrome offers its own dialog meanwhile, the
 * button opens it. Opening it and finishing it are counted, with where.
 */
export function InstallGuide({ way, where, onClose, onDone }: { way: "ios" | "android"; where: string; onClose: () => void; onDone?: () => void }) {
  const film = FILMS[way];
  const can = useCanInstall() && way === "android";
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useAppStartsSignedIn(way === "ios");
  useEffect(() => {
    let live = true;
    signal("pwa_guide_open", `${way} · ${where}`);
    preloadGuide(way)
      .then((s) => live && setSvg(s))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [way, where]);

  const done = () => {
    signal("pwa_guide_done", `${way} · ${where}`);
    onDone?.();
    onClose();
  };
  const install = async () => {
    if (await installApp(`guide · ${where}`)) done();
  };

  return (
    <Sheet
      label={t.installApp}
      onClose={onClose}
      icon={
        <>
          <p className="text-[0.8125rem] font-bold text-muted">
            {t.installApp} · <bdi>{film.label}</bdi>
          </p>
          {failed ? (
            // the film could not come (no network): the steps in words, one under the other
            <div className="mt-3">
              <Steps film={film} still />
            </div>
          ) : (
            // the phone, as tall as the screen allows with the words and the button under it
            <div className="mt-2 flex h-[clamp(9.5rem,calc(92dvh-22rem),25rem)] justify-center">
              {svg ? (
                <div className="h-full [&>svg]:block [&>svg]:h-full [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                // while the film comes (a moment, once): the phone's shape
                <div className="aspect-[463/962] h-full animate-pulse rounded-[12%/6%] bg-canvas ring-1 ring-line" />
              )}
            </div>
          )}
        </>
      }
      action={
        can ? (
          <SheetGo onClick={() => void install()}>
            <Download className="size-5" /> {t.guideInstallNow}
          </SheetGo>
        ) : (
          <SheetGo onClick={done}>{t.iosDone}</SheetGo>
        )
      }
    >
      {svg && <Steps film={film} />}
      {way === "ios" && (
        <p className="mt-1.5 text-[0.75rem] leading-snug text-faint">
          <Mixed text={t.guideIosOld} />
        </p>
      )}
    </Sheet>
  );
}

/**
 * The steps' words. With the film: one at a time, in the same place, each
 * coming and going as the film's style says (its class c<k>), and the dots
 * under them (d<i>). Without it (it could not come): all of them, one under
 * the other.
 */
function Steps({ film, still = false }: { film: Film; still?: boolean }) {
  const last = film.steps.length - 1;
  const step = (s: Step, k: number) => (
    <>
      <p className="flex items-center justify-center gap-2 text-[1.125rem] font-bold leading-tight">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[0.8125rem] text-white">{k === last ? <Check className="size-3.5" strokeWidth={3} /> : k + 1}</span>
        {s.title}
      </p>
      {s.chip && (
        <bdi dir="ltr" className="mt-1.5 inline-block rounded-full bg-brand-soft px-3 py-1 text-[0.9375rem] font-bold leading-tight text-brand-deep ring-1 ring-inset ring-[#D9CFFF]">
          {s.chip}
        </bdi>
      )}
      <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">
        <Mixed text={s.hint} />
      </p>
    </>
  );
  if (still) {
    return (
      <ol className="space-y-3">
        {film.steps.map((s, k) => (
          <li key={k}>{step(s, k)}</li>
        ))}
      </ol>
    );
  }
  return (
    <>
      <div className="relative mt-3 h-[6.25rem]">
        {film.steps.map((s, k) => (
          <div key={k} className={`${film.prefix}c${k} absolute inset-x-0 top-0 flex flex-col items-center opacity-0`}>
            {step(s, k)}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-center gap-1" aria-hidden>
        {film.steps.map((_, i) => (
          <span key={i} className="relative grid h-1.5 w-4 place-items-center">
            <span className="size-1.5 rounded-full bg-line" />
            <span className={`${film.prefix}d${i} absolute inset-0 rounded-full bg-brand opacity-0`} />
          </span>
        ))}
      </div>
    </>
  );
}
