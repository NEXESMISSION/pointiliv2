import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Pass } from "@/components/Pass";
import { Icon3D, Logo } from "@/components/ui";
import { t } from "@/lib/t";

const RED = "#D7141A";
const BLUE = "#1D5FA8";

/** The crescent and the star of the flag, in a ring: the divider's middle. */
function Emblem() {
  return (
    <svg viewBox="0 0 40 40" className="size-7 shrink-0" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#fff" stroke={RED} strokeWidth="2.5" />
      <circle cx="20" cy="20" r="10.5" fill={RED} />
      <circle cx="22.6" cy="20" r="8.4" fill="#fff" />
      <path d="M24.2 20l5.6-1.9-3.5 4.8v-5.8l3.5 4.8z" fill={RED} />
    </svg>
  );
}

/** A strip of zellige — eight-pointed stars — fading into the button it decorates. */
function Zellige({ color, id }: { color: string; id: string }) {
  return (
    <svg className="pointer-events-none absolute inset-y-0 end-0 h-full w-28 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)] rtl:[mask-image:linear-gradient(to_right,black,transparent)]" aria-hidden>
      <defs>
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M11 1l2.9 7.1L21 11l-7.1 2.9L11 21l-2.9-7.1L1 11l7.1-2.9z" fill="none" stroke={color} strokeWidth="1.4" />
          <rect x="8" y="8" width="6" height="6" transform="rotate(45 11 11)" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * The front door, Tunisian: a card from a café in the Medina between jasmine
 * and a glass of mint tea, a corner of Sidi Bou Said, and two doors only —
 * the shop's (first) and the customer's. One screen, on the smallest phone:
 * every size here follows the screen's height.
 */
export function Welcome() {
  return (
    <main className="relative mx-auto flex h-dvh max-w-md flex-col justify-center overflow-hidden bg-[#FBF6EF] px-5 safe-t safe-b">
      {/* a corner of Sidi Bou Said, behind everything */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tn/sidibou.webp" alt="" width={220} height={520} className="pointer-events-none absolute -start-3 -top-[3dvh] h-[36dvh] w-auto [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />

      <div className="relative flex justify-center">
        <Logo />
      </div>

      {/* the card, the jasmine, the tea: drawn at one size, zoomed down on shorter screens so nothing is cut */}
      <div className="relative mx-auto mt-[3.5dvh] w-[21rem] [zoom:1] [@media(max-height:860px)]:[zoom:0.95] [@media(max-height:760px)]:[zoom:0.87] [@media(max-height:690px)]:[zoom:0.8] [@media(max-height:610px)]:[zoom:0.72]">
        <div className="absolute inset-x-6 -top-[2.2dvh] -rotate-[5deg] opacity-95">
          <Pass shop={{ name: "Salon Nour", kind: "hair", color: BLUE, goal: 6, gift: "بروشينغ بلاش" }} stamps={3} small />
        </div>
        <div className="relative rotate-[2deg] animate-rise">
          <Pass shop={{ name: "Café El Medina", kind: "cafe", color: RED, goal: 8, gift: "قهوة بلاش" }} stamps={6} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tn/jasmine.webp" alt="" width={140} height={118} className="pointer-events-none absolute -bottom-12 -end-16 h-[7.375rem] w-auto drop-shadow-[0_10px_14px_rgb(0_0_0/0.18)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tn/tea.webp" alt="" width={78} height={130} className="pointer-events-none absolute -bottom-10 -start-12 h-[8.125rem] w-auto drop-shadow-[0_12px_16px_rgb(0_0_0/0.22)]" />
      </div>

      <h1 className="relative mt-[6.5dvh] text-center text-[1.4rem] font-bold leading-snug">
        {/* «كارطات الفيدليتي متاعك،» then «في تليفونك»: the line breaks where it is said */}
        {t.tagline.split("، ").map((part, i, all) => (
          <span key={i} className="block">
            {part}
            {i < all.length - 1 ? "،" : ""}
          </span>
        ))}
      </h1>
      <div className="relative mx-auto mt-[1.6dvh] flex w-44 items-center gap-2.5" aria-hidden>
        <span className="h-px flex-1 bg-[linear-gradient(to_left,#D7141A66,transparent)]" />
        <Emblem />
        <span className="h-px flex-1 bg-[linear-gradient(to_right,#D7141A66,transparent)]" />
      </div>

      {/* two doors: the shop's first */}
      <div className="relative mt-[4.5dvh] space-y-[1.4dvh]">
        <Link
          href="/shop/new"
          className="press relative flex h-[3.6rem] items-center gap-3 overflow-hidden rounded-[1.25rem] bg-[linear-gradient(150deg,#F2414A,#D7141A_55%,#B00D17)] px-4 text-white shadow-[0_16px_30px_-14px_rgb(215_20_26/0.75)]"
        >
          <Zellige color="#fff" id="zl-shop" />
          <span className="relative grid size-10 shrink-0 place-items-center rounded-[0.8125rem] bg-white/95">
            <Icon3D name="shop" size={27} />
          </span>
          <span className="relative flex-1 text-[1.0625rem] font-bold">{t.enterAsShop}</span>
          <ChevronLeft className="relative size-5 shrink-0 opacity-80" />
        </Link>
        <Link href="/join" className="press relative flex h-[3.6rem] items-center gap-3 overflow-hidden rounded-[1.25rem] bg-white px-4 shadow-[0_10px_26px_-14px_rgb(29_95_168/0.45)] ring-1 ring-[#1D5FA8]/10">
          <Zellige color={BLUE} id="zl-customer" />
          <span className="relative grid size-10 shrink-0 place-items-center rounded-[0.8125rem] bg-[#EAF1FA]">
            <Icon3D name="ticket" size={27} />
          </span>
          <span className="relative flex-1 text-[1.0625rem] font-bold text-ink">{t.enterAsCustomer}</span>
          <ChevronLeft className="relative size-5 shrink-0 text-faint" />
        </Link>
        <Link href="/login" className="block py-[1dvh] text-center text-[0.9062rem] font-semibold text-[#B00D17]">
          {t.haveAccountLogin}
        </Link>
      </div>
    </main>
  );
}
