import Link from "next/link";
import { Check, ChevronLeft, Store, WalletCards } from "lucide-react";
import { InstallApp } from "@/components/InstallApp";
import { Mark } from "@/components/Tracker";
import { Icon3D, Logo } from "@/components/ui";
import { t } from "@/lib/t";

/*
 * Four front doors that are not a layout (the founder, 19 Oct 2026: «let be
 * more creative»). Each one is an idea, not an arrangement:
 *
 *   5 — the card fills itself. The page IS the product: six tampons land one
 *       after another, the gift opens, and it starts again. Nobody reads what
 *       Pointili does; they watch it happen, in four seconds, with no video to
 *       download.
 *   6 — the receipt. The whole page is a café's till roll, torn at both ends:
 *       the order, the total, and at the bottom, printed like everything else,
 *       «+1 تامبون». It says where this belongs — on the counter — by being
 *       the thing the counter already gives you.
 *   7 — the thread. Four WhatsApp bubbles between an owner and a customer.
 *       Tunisia lives in that app; this is the one page nobody has to be
 *       taught how to read.
 *   8 — the zellige. The eight-pointed star of a Tunisian tile, built out of
 *       stamps, with the card at its centre: the pattern of the place, made
 *       of the thing being sold.
 *
 * All four keep the one-screen rule, the same two doors and the same way back
 * in. Nothing here downloads a video.
 */

const RED = "#D7141A";
const SCREEN = "safe-t safe-b mx-auto flex min-h-dvh max-w-md flex-col px-5 max-[448px]:max-w-none";

function Doors({ ad, known, tight }: { ad?: boolean; known?: boolean; tight?: boolean }) {
  return (
    <div className={tight ? "space-y-1.5" : "space-y-2"}>
      <Link href="/shop/new" className="press flex h-[3.5rem] items-center gap-3 rounded-[1.125rem] bg-[linear-gradient(150deg,#F2414A,#D7141A_55%,#B00D17)] px-3.5 text-white shadow-[0_14px_26px_-14px_rgb(215_20_26/0.75)]">
        <Store className="size-5 shrink-0" strokeWidth={2.2} />
        <span className="min-w-0 flex-1 truncate text-[1rem] font-bold">{t.doorOwner}</span>
        <ChevronLeft className="size-5 shrink-0 opacity-80" />
      </Link>
      {!ad && (
        <Link href={known ? "/login" : "/join"} className="press flex h-[3.5rem] items-center gap-3 rounded-[1.125rem] bg-white px-3.5 ring-1 ring-[#1D5FA8]/15">
          <WalletCards className="size-5 shrink-0 text-[#1D5FA8]" strokeWidth={2.2} />
          <span className="min-w-0 flex-1 truncate text-[1rem] font-bold text-ink">{t.doorCustomer}</span>
          <ChevronLeft className="size-5 shrink-0 text-faint" />
        </Link>
      )}
    </div>
  );
}

function Foot() {
  return (
    <>
      <Link href="/login" className="press mx-auto mt-[0.8dvh] flex h-9 w-fit items-center gap-1.5 px-3 text-[0.875rem] font-semibold text-[#7A6F63]">
        عندك كونت؟ <span className="font-bold text-[#B00D17] underline decoration-[#D7141A]/30 decoration-2 underline-offset-4">ادخل</span>
      </Link>
      <nav className="flex items-center justify-center gap-2.5 text-[0.75rem] font-semibold text-[#A2978A]">
        <Link href="/prix">الأسعار</Link>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <Link href="/faq">أسئلة</Link>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <Link href="/pour">لكل محل</Link>
        <InstallApp where="welcome" look="link" />
      </nav>
    </>
  );
}

type Bits = { known?: boolean; ad?: boolean };

export function WelcomeWild({ v, known, ad }: Bits & { v: "5" | "6" | "7" | "8" }) {
  return (
    <main data-welcome className={`${SCREEN} relative bg-[#FBF6EF]`}>
      <Mark screen={`welcome-v${v}`} />
      {v === "5" && <Fills known={known} ad={ad} />}
      {v === "6" && <Receipt known={known} ad={ad} />}
      {v === "7" && <Thread known={known} ad={ad} />}
      {v === "8" && <Zellige known={known} ad={ad} />}
    </main>
  );
}

/** 5 — the card fills itself, over and over, and the page needs no other explanation. */
function Fills({ known, ad }: Bits) {
  const GOAL = 6;
  return (
    <>
      <style>{`
        @keyframes pt-land { 0%,8% { transform: scale(2.2); opacity: 0 } 14% { transform: scale(0.92); opacity: 1 } 18%,96% { transform: scale(1); opacity: 1 } 100% { transform: scale(1); opacity: 0 } }
        @keyframes pt-gift { 0%,74% { transform: scale(0.4); opacity: 0 } 82% { transform: scale(1.15); opacity: 1 } 88%,96% { transform: scale(1); opacity: 1 } 100% { opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .pt-dot, .pt-gift { animation: none !important; opacity: 1 !important; transform: none !important } }
      `}</style>
      <div className="flex shrink-0 justify-center pt-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {/* the card, filling: six tampons land in turn, the gift opens, and it begins again */}
        <div className="mx-auto w-[min(100%,20rem)] rounded-[1.75rem] p-5 text-white shadow-[0_26px_50px_-22px_rgb(215_20_26/0.6)]" style={{ background: `linear-gradient(150deg,#F2414A,${RED} 60%,#B00D17)` }}>
          <div className="flex items-center justify-between">
            <span className="num text-[1.5rem] font-bold">
              {GOAL}
              <span className="text-[0.875rem] opacity-70">/{GOAL}</span>
            </span>
            <span className="text-[1.0625rem] font-bold">Café El Medina</span>
          </div>
          <div className="mt-5 flex justify-between">
            {Array.from({ length: GOAL }, (_, i) => (
              <span key={i} className="grid size-11 place-items-center rounded-full bg-white/20">
                <span className="pt-dot grid size-11 place-items-center rounded-full bg-white text-[#D7141A]" style={{ animation: `pt-land 5.4s ${i * 0.38}s infinite both` }}>
                  <Check className="size-5" strokeWidth={3.4} />
                </span>
              </span>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-2 text-[0.9375rem] font-bold">
            <span className="pt-gift inline-flex" style={{ animation: "pt-gift 5.4s infinite both" }}>
              <Icon3D name="gift" size={24} />
            </span>
            قهوة بلاش
          </p>
        </div>
        <h1 className="mt-[3.4dvh] text-center text-[1.4rem] font-bold leading-snug">
          <span className="block">كل مرّة تشري، تامبون.</span>
          <span className="block">كي تكمّل، كادو بلاش.</span>
        </h1>
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} />
        <Foot />
      </div>
    </>
  );
}

/** 6 — the whole page is the café's receipt, and the last line on it is a tampon. */
function Receipt({ known, ad }: Bits) {
  const lines = [
    ["قهوة", "2.500"],
    ["كرواسون", "1.800"],
  ];
  return (
    <>
      <div className="flex shrink-0 justify-center pt-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 items-center">
        {/* a till roll, torn at both ends: the zig-zag is the paper, not a border */}
        <div
          className="mx-auto w-[min(100%,20rem)] bg-white px-5 py-6 shadow-[0_20px_44px_-20px_rgb(20_16_40/0.35)]"
          style={{
            maskImage: "linear-gradient(#000 0 0)",
            clipPath:
              "polygon(0% 1.2%, 6% 0%, 12% 1.2%, 18% 0%, 24% 1.2%, 30% 0%, 36% 1.2%, 42% 0%, 48% 1.2%, 54% 0%, 60% 1.2%, 66% 0%, 72% 1.2%, 78% 0%, 84% 1.2%, 90% 0%, 96% 1.2%, 100% 0%, 100% 100%, 96% 98.8%, 90% 100%, 84% 98.8%, 78% 100%, 72% 98.8%, 66% 100%, 60% 98.8%, 54% 100%, 48% 98.8%, 42% 100%, 36% 98.8%, 30% 100%, 24% 98.8%, 18% 100%, 12% 98.8%, 6% 100%, 0% 98.8%)",
          }}
        >
          <p className="text-center text-[1rem] font-bold tracking-[0.2em] text-ink">CAFÉ EL MEDINA</p>
          <p className="mt-0.5 text-center text-[0.75rem] text-muted">تونس · اليوم</p>
          <div className="my-4 border-t border-dashed border-[#D8D2C8]" />
          {lines.map(([what, how]) => (
            <p key={what} className="flex items-baseline justify-between py-1 text-[0.9375rem] text-ink">
              <span className="font-semibold">{what}</span>
              <span className="num text-muted">{how}</span>
            </p>
          ))}
          <div className="my-3 border-t border-dashed border-[#D8D2C8]" />
          <p className="flex items-baseline justify-between text-[1rem] font-bold text-ink">
            <span>المجموع</span>
            <span className="num">4.300</span>
          </p>
          {/* the line that is not on anybody else's receipt */}
          <div className="mt-5 rounded-[0.875rem] bg-[#FBEDE9] px-3 py-2.5 text-center">
            <p className="text-[1.0625rem] font-bold text-[#B00D17]">+1 تامبون</p>
            <p className="mt-0.5 text-[0.8125rem] text-[#8A5A52]">مازالولك 5 وتربح قهوة بلاش</p>
          </div>
          <p className="mt-4 text-center text-[0.75rem] tracking-[0.15em] text-[#A2978A]">POINTILI.ONLINE</p>
        </div>
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} tight />
        <Foot />
      </div>
    </>
  );
}

/** 7 — four bubbles: the page everybody in Tunisia already knows how to read. */
function Thread({ known, ad }: Bits) {
  const said: { who: "them" | "me"; text: string }[] = [
    { who: "them", text: "يا سي محمد، الكارط الكرتون تقطّعلي 😅" },
    { who: "me", text: "ما عادش فمّا كرتون. سكاني الكود اللي عند الكاسة 👇" },
    { who: "them", text: "هكا برك؟ التامبون طاح وحدو 😮" },
    { who: "me", text: "إيه. وكي تكمّل 6، قهوة بلاش ☕" },
  ];
  return (
    <>
      <div className="flex shrink-0 justify-center pt-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        {said.map((s, i) => (
          <div key={i} className={`flex ${s.who === "me" ? "justify-start" : "justify-end"}`}>
            <p
              className={`max-w-[82%] px-3.5 py-2.5 text-[0.9375rem] leading-relaxed shadow-[0_6px_14px_-10px_rgb(20_16_40/0.5)] ${
                s.who === "me"
                  ? "rounded-[1.1rem] rounded-bs-sm bg-[#E7F7D8] text-ink"
                  : "rounded-[1.1rem] rounded-be-sm bg-white text-ink"
              }`}
            >
              {s.text}
            </p>
          </div>
        ))}
        <p className="mt-[1.6dvh] text-center text-[1.25rem] font-bold leading-snug text-ink">كارطات الفيدليتي متاعك، في تليفونك</p>
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} tight />
        <Foot />
      </div>
    </>
  );
}

/** 8 — the tile of the place, built out of the thing being sold. */
function Zellige({ known, ad }: Bits) {
  return (
    <>
      <div className="flex shrink-0 justify-center pt-[2dvh]">
        <Logo />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="relative mx-auto grid size-[min(78vw,30dvh)] place-items-center">
          {/* eight tampons around a middle: the star of a Tunisian tile */}
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="absolute grid size-12 place-items-center rounded-full bg-white text-[#D7141A] shadow-[0_8px_18px_-10px_rgb(20_16_40/0.45)]"
              style={{ transform: `rotate(${i * 45}deg) translateY(min(-30vw,-11dvh)) rotate(${-i * 45}deg)` }}
            >
              <Check className="size-6" strokeWidth={3.2} />
            </span>
          ))}
          <span className="grid size-[42%] place-items-center rounded-[1.25rem] text-white shadow-[0_18px_34px_-16px_rgb(215_20_26/0.7)]" style={{ background: `linear-gradient(150deg,#F2414A,${RED} 60%,#B00D17)` }}>
            <Icon3D name="gift" size={40} />
          </span>
        </div>
        <h1 className="mt-[3dvh] text-center text-[1.4rem] font-bold leading-snug">
          <span className="block">ثمانية تامبونات،</span>
          <span className="block">وكادو في النص</span>
        </h1>
      </div>
      <div className="shrink-0 pb-[1.5dvh]">
        <Doors ad={ad} known={known} />
        <Foot />
      </div>
    </>
  );
}
