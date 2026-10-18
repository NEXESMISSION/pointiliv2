import Link from "next/link";
import { ChevronLeft, ScanLine, Stamp, Store, WalletCards } from "lucide-react";
import { InstallApp } from "@/components/InstallApp";
import { VideoPill, type HelpVideo } from "@/components/Help";
import { Pass } from "@/components/Pass";
import { Mark } from "@/components/Tracker";
import { Icon3D, Logo } from "@/components/ui";
import { t } from "@/lib/t";

/*
 * Four front doors, for a phone (the founder, 19 Oct 2026: «let come up with
 * new 4 designs for the landing pages mainly for the mobile design»).
 *
 * /?v=1|2|3|4, beside the one that is live. They are not four paint jobs: each
 * answers «what does a stranger need first?» differently.
 *   1 — the card alone. No jasmine, no tea, no Sidi Bou Said: one card, one
 *       line, two doors. What it is, in one look.
 *   2 — the proof first. The counter plays across the top, real and filmed,
 *       and the doors sit under it. Believe it before reading it.
 *   3 — two doors and nothing else. The screen is the choice: the shop above,
 *       the customer below, each half of it. Fastest to act on.
 *   4 — the three beats: سكاني, تامبون, كادو — then the doors. For somebody
 *       who has never heard of it, which is most of an ad's traffic.
 *
 * All four keep the one-screen rule, the same words, the same two doors and
 * the same way back in for anybody who already has an account.
 */

const RED = "#D7141A";
const CARD = { name: "Café El Medina", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: RED, logo: null, stamp_logo: false };
const SCREEN = "safe-t safe-b mx-auto flex min-h-dvh max-w-md flex-col px-5 max-[448px]:max-w-none";
const TAGLINE = t.tagline.split("، ");

/** The tagline, broken where it is said rather than where it fits. */
function Tagline({ className = "text-[1.5rem]" }: { className?: string }) {
  return (
    <h1 className={`text-center font-bold leading-snug ${className}`}>
      {TAGLINE.map((part, i, all) => (
        <span key={i} className="block">
          {part}
          {i < all.length - 1 ? "،" : ""}
        </span>
      ))}
    </h1>
  );
}

/** The two doors, as every design shows them: the owner's, then the customer's. */
function Doors({ ad, known, compact }: { ad?: boolean; known?: boolean; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-[1.2dvh]"}>
      <Link
        href="/shop/new"
        className="press relative flex h-[4rem] items-center gap-3 overflow-hidden rounded-[1.25rem] bg-[linear-gradient(150deg,#F2414A,#D7141A_55%,#B00D17)] px-3.5 text-white shadow-[0_16px_30px_-14px_rgb(215_20_26/0.75)]"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-white text-[#D7141A]">
          <Store className="size-6" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem] font-bold leading-tight">{t.doorOwner}</span>
          <span className="block truncate text-[0.8125rem] font-medium text-white/85">{t.doorOwnerSub}</span>
        </span>
        <ChevronLeft className="size-5 shrink-0 opacity-80" />
      </Link>
      {!ad && (
        <Link
          href={known ? "/login" : "/join"}
          className="press relative flex h-[4rem] items-center gap-3 overflow-hidden rounded-[1.25rem] bg-white px-3.5 shadow-[0_10px_26px_-14px_rgb(29_95_168/0.45)] ring-1 ring-[#1D5FA8]/15"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-[#EAF1FA] text-[#1D5FA8]">
            <WalletCards className="size-6" strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] font-bold leading-tight text-ink">{t.doorCustomer}</span>
            <span className="block truncate text-[0.8125rem] font-medium text-[#5B6B80]">{t.doorCustomerSub}</span>
          </span>
          <ChevronLeft className="size-5 shrink-0 text-faint" />
        </Link>
      )}
    </div>
  );
}

/** The way back in, and the pages a search lands on. */
function Foot() {
  return (
    <>
      <Link href="/login" className="press mx-auto mt-[1dvh] flex h-10 w-fit items-center gap-1.5 px-3 text-[0.9062rem] font-semibold text-[#7A6F63]">
        عندك كونت؟
        <span className="font-bold text-[#B00D17] underline decoration-[#D7141A]/30 decoration-2 underline-offset-4">ادخل</span>
      </Link>
      <nav className="flex items-center justify-center gap-2.5 text-[0.75rem] font-semibold leading-tight text-[#A2978A]">
        <Link href="/prix">الأسعار</Link>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <Link href="/faq">أسئلة</Link>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <Link href="/pour">لكل محل</Link>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <Link href="/privacy">الخصوصية</Link>
        <InstallApp where="welcome" look="link" />
      </nav>
    </>
  );
}

type Bits = { video?: HelpVideo | null; known?: boolean; ad?: boolean };

export function WelcomeNew({ v, video, known, ad }: Bits & { v: "1" | "2" | "3" | "4" }) {
  return (
    <main data-welcome className={`${SCREEN} relative bg-[#FBF6EF]`}>
      <Mark screen={`welcome-v${v}`} />
      {v === "1" && <One video={video} known={known} ad={ad} />}
      {v === "2" && <Two known={known} ad={ad} />}
      {v === "3" && <Three known={known} ad={ad} />}
      {v === "4" && <FourBeats known={known} ad={ad} />}
    </main>
  );
}

/** 1 — the card alone: nothing to look at but the thing itself. */
function One({ video, known, ad }: Bits) {
  return (
    <>
      <div className="flex shrink-0 justify-center pt-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="mx-auto w-[min(100%,21rem)] -rotate-2">
          <Pass shop={CARD} stamps={6} />
        </div>
        <Tagline className="mt-[4dvh] text-[1.5rem]" />
        {video && (
          <div className="mt-[2dvh] flex justify-center">
            <VideoPill video={video} className="max-w-[17rem]" />
          </div>
        )}
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} />
        <Foot />
      </div>
    </>
  );
}

/** 2 — the proof first: the counter, filmed, across the top. */
function Two({ known, ad }: Bits) {
  return (
    <>
      <div className="relative -mx-5 shrink-0 overflow-hidden">
        <video src="/clips/how-1-v2.mp4" poster="/clips/how-1-v2.webp" autoPlay muted loop playsInline preload="none" className="h-[38dvh] w-full object-cover" />
        {/* the film ends in the cream, so the page is one thing and not two */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(251_246_239/0.35),transparent_35%,#FBF6EF_97%)]" />
        <div className="absolute inset-x-0 top-[2dvh] flex justify-center">
          <Logo />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <Tagline />
        <p className="mx-auto mt-[1.4dvh] max-w-[20rem] text-balance text-center text-[0.9375rem] leading-relaxed text-muted">
          الحريف يسكاني الكود اللي عند الكاسة، والتامبون يطيح وحدو. كي يكمّل الكارط، ياخو الكادو.
        </p>
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} />
        <Foot />
      </div>
    </>
  );
}

/** 3 — two doors and nothing else: the screen is the choice. */
function Three({ known, ad }: Bits) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-center py-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 pb-[1dvh]">
        <Link
          href="/shop/new"
          className="press relative flex flex-1 flex-col justify-end overflow-hidden rounded-[1.75rem] bg-[linear-gradient(150deg,#F2414A,#D7141A_55%,#B00D17)] p-5 text-white shadow-[0_20px_40px_-18px_rgb(215_20_26/0.75)]"
        >
          <Store className="absolute end-4 top-4 size-10 opacity-25" strokeWidth={1.8} />
          <span className="block text-[1.5rem] font-bold leading-tight">{t.doorOwner}</span>
          <span className="mt-1 block text-[0.9375rem] font-medium text-white/85">{t.doorOwnerSub}</span>
        </Link>
        {!ad && (
          <Link
            href={known ? "/login" : "/join"}
            className="press relative flex flex-1 flex-col justify-end overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-[0_16px_34px_-18px_rgb(29_95_168/0.5)] ring-1 ring-[#1D5FA8]/15"
          >
            <WalletCards className="absolute end-4 top-4 size-10 text-[#1D5FA8] opacity-20" strokeWidth={1.8} />
            <span className="block text-[1.5rem] font-bold leading-tight text-ink">{t.doorCustomer}</span>
            <span className="mt-1 block text-[0.9375rem] font-medium text-[#5B6B80]">{t.doorCustomerSub}</span>
          </Link>
        )}
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Foot />
      </div>
    </>
  );
}

/** 4 — the three beats, then the doors: for somebody who has never heard of it. */
function FourBeats({ known, ad }: Bits) {
  const beats = [
    { icon: <ScanLine className="size-5" />, title: "سكاني الكود", body: "في الكاسة، كل مرّة تشري" },
    { icon: <Stamp className="size-5" />, title: "التامبون يطيح وحدو", body: "على الكارط في تليفونك" },
    { icon: <Icon3D name="gift" size={26} />, title: "كمّل، وخوذ الكادو", body: "بلاش، من نفس المحل" },
  ];
  return (
    <>
      <div className="flex shrink-0 justify-center pt-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <Tagline className="text-[1.4rem]" />
        <ol className="mt-[2.6dvh] space-y-2">
          {beats.map((b, i) => (
            <li key={i} className="flex items-center gap-3 rounded-[1.25rem] bg-white/70 px-3.5 py-3 shadow-[0_8px_20px_-14px_rgb(20_16_40/0.4)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-[#FBEDE9] text-[#D7141A]">{b.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[1rem] font-bold leading-tight text-ink">{b.title}</span>
                <span className="block truncate text-[0.8125rem] text-muted">{b.body}</span>
              </span>
              <span className="num shrink-0 text-[0.875rem] font-bold text-[#D7141A]/40">{i + 1}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} compact />
        <Foot />
      </div>
    </>
  );
}
