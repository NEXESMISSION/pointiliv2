"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { Icon3D } from "@/components/ui";
import { useScreen } from "@/components/Tracker";
import { seenBefore, shown } from "@/lib/once";
import { pixelOnce } from "@/lib/pixel";
import { fill, t } from "@/lib/t";

/**
 * The first thing a new owner sees once their card is ready — on their own
 * home, not on the counter.
 *
 * It says bravo, then asks for one thing: press «ورّي الكود». Pressing it is
 * what opens the counter, where the note about the code is waiting. So the
 * owner learns the home first and walks to the counter themselves, instead of
 * being dropped on a full-screen code they did not ask for.
 *
 * Once in a lifetime, like every other note: the moment it shows it is
 * written down — here, on this phone, and in the database — and the address
 * drops ?welcome, so neither a reload nor the back button brings it back.
 * It borrows the «coach» note, so an owner who was coached the old way (on
 * the counter) never sees it.
 */
export function ShopWelcome({ name, shopId, show }: { name: string; shopId: string; show: boolean }) {
  const [open, setOpen] = useState(() => show && !seenBefore("coach", shopId));
  const router = useRouter();
  const claimed = useRef(false);

  useEffect(() => {
    if (!open || claimed.current) return;
    claimed.current = true;
    // the card is made: for Facebook's pixel, the owner is in for real
    pixelOnce("CardCreated");
    window.history.replaceState(null, "", "/shop");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useScreen(open ? "shop-welcome" : null);
  if (!open) return null;

  /* they press it: the note is marked by the counter, with the tip */
  const go = () => {
    setOpen(false);
    router.push("/shop/qr?tip=1");
  };
  /* they would rather look around: the note is done with here */
  const later = () => {
    shown("coach", shopId);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid items-end justify-items-center bg-ink/45 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label={t.coachReady}>
      <div className="w-full max-w-sm animate-rise rounded-[1.75rem] bg-surface p-5 text-center shadow-lift">
        <Icon3D name="party" size={64} className="mx-auto animate-float" />
        <h2 className="mt-2 text-[1.375rem] font-bold leading-tight">{name ? fill(t.coachBravo, { name }) : t.coachBravoAnon}</h2>
        <p className="mt-1 text-[1rem] font-semibold text-body">{t.coachReady}</p>
        <p className="mx-auto mt-2 max-w-[17rem] text-[0.9375rem] leading-relaxed text-muted">{t.coachHomeTap}</p>
        <button type="button" onClick={go} className="press mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]">
          <QrCode className="size-5" /> {t.showCode}
        </button>
        <button type="button" onClick={later} className="press mt-1.5 h-11 w-full text-[0.9375rem] font-semibold text-muted">
          {t.coachHomeLater}
        </button>
      </div>
    </div>
  );
}
