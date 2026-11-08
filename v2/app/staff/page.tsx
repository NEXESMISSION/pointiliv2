import Link from "@/components/Link";
import { redirect } from "next/navigation";
import { QrCode, ScanLine, Smartphone } from "lucide-react";
import { Back } from "@/components/Back";
import { Mark } from "@/components/Owner";
import { ShopMark } from "@/components/ShopMark";
import { StaffLeave } from "@/components/StaffScreens";
import { LinkBtn, Screen } from "@/components/ui";
import { P, type StaffShop } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const dynamic = "force-dynamic";
export const metadata = { title: P.staffHome, robots: { index: false } };

/**
 * A staff phone's home (Pro, supabase/packs-2026-11-09.sql): the shop it works at and the three ways to
 * give a tampon — the code shown, the customer's number, the camera on the customer's code. Nothing else
 * of the shop: no settings, no list, no numbers. An owner has their own counter, and goes there.
 */
export default async function StaffHome() {
  const me = await getMe();
  if (!me) redirect("/login?next=/staff");
  if (me.shop) redirect("/shop");
  const shop = await call<StaffShop>("my_staff_shop");
  if (!shop)
    return (
      <Screen>
        <header className="flex shrink-0 items-center pt-2">
          <Back home="/" />
        </header>
        <div className="my-auto text-center">
          <p className="mx-auto max-w-xs text-[1rem] font-semibold text-muted">{P.staffGone}</p>
          <LinkBtn href="/" kind="soft" className="mx-auto mt-5 max-w-xs">
            Pointili
          </LinkBtn>
        </div>
      </Screen>
    );
  return (
    <Screen>
      <header className="flex shrink-0 items-center gap-3 pt-3">
        <Back home="/" />
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full shadow-card" style={{ background: shop.color }}>
          <ShopMark shop={shop} size={30} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] text-muted">{P.staffAtShort}</span>
          <b className="block truncate text-[1.375rem] leading-tight">{shop.name}</b>
        </span>
      </header>
      {shop.paused && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.8125rem] font-semibold text-coral">{t.pausedBanner}</p>}

      <h2 className="mt-[3dvh] shrink-0 px-0.5 text-[1rem] font-bold">{t.giveTitle}</h2>
      <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
        <Link
          href="/staff/qr"
          className="press relative flex min-h-[clamp(7rem,17dvh,9rem)] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-[linear-gradient(150deg,#8f75ff,#6c47ff_50%,#4a2ad6)] p-3.5 text-white shadow-[0_8px_18px_-12px_rgb(74_42_214/0.7)]"
        >
          <span className="relative grid size-11 place-items-center rounded-[0.875rem] bg-white/20">
            <QrCode className="size-6" />
          </span>
          <span className="relative">
            <b className="block text-[1.1875rem] font-bold leading-tight">{t.showCode}</b>
            <span className="block text-[0.75rem] leading-snug text-white/85">{t.giveQrSub}</span>
          </span>
        </Link>
        <Link href="/staff/collect?by=phone" className="press flex min-h-[clamp(7rem,17dvh,9rem)] flex-col justify-between rounded-[1.5rem] bg-surface p-3.5 shadow-card">
          <Mark icon={Smartphone} size={44} />
          <span>
            <b className="block text-[1.1875rem] font-bold leading-tight">{t.giveByPhone}</b>
            <span className="block text-[0.75rem] leading-snug text-muted">{t.giveByPhoneSub}</span>
          </span>
        </Link>
      </div>
      <Link href="/staff/collect?by=scan" className="press mt-2 flex shrink-0 items-center justify-center gap-2 rounded-[1.125rem] bg-surface px-3 py-3.5 shadow-card">
        <ScanLine className="size-5 text-brand" strokeWidth={2.2} />
        <span className="text-[0.9375rem] font-bold">{t.collectScanShort}</span>
      </Link>

      <div className="mt-auto pb-[2dvh] pt-4">
        <StaffLeave shop={shop.name} />
      </div>
    </Screen>
  );
}
