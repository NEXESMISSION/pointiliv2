import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { Download, Gift, QrCode, ShieldCheck, Sticker } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/merchant/PrintButton";
import { TopBar } from "@/components/nav/TopBar";
import { LinkButton } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/Card";
import { requireMerchant } from "@/lib/session";
import { siteUrl } from "@/lib/url";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.counterQr };
}

export default async function CounterQrPage() {
  const [ctx, { t, count }] = await Promise.all([requireMerchant("/counter-qr"), getI18n()]);
  if (!ctx.card) redirect("/loyalty?welcome=1");

  const url = `${siteUrl()}/join/${ctx.business.join_code}`;
  const [svg, png] = await Promise.all([
    QRCode.toString(url, { type: "svg", width: 512, margin: 0, errorCorrectionLevel: "Q", color: { dark: "#0c0c14", light: "#00000000" } }),
    QRCode.toDataURL(url, { width: 1200, margin: 3, errorCorrectionLevel: "Q" }),
  ]);
  const reward = ctx.card.reward?.name;
  const rows = [
    { icon: <Sticker />, title: t.merchant.counterQr.row1Title, text: t.merchant.counterQr.row1Text },
    { icon: <ShieldCheck />, title: t.merchant.counterQr.row2Title, text: t.merchant.counterQr.row2Text },
    { icon: <QrCode />, title: t.merchant.counterQr.row3Title, text: t.merchant.counterQr.row3Text },
  ];

  return (
    <div className="mx-auto w-full max-w-md print:max-w-none">
      <div className="print:hidden">
        <TopBar title={t.nav.merchant.counterQr} subtitle={t.merchant.counterQr.subtitle} back="/dashboard" />
      </div>

      {/* The poster: a small preview on the phone, full size on paper */}
      <article className="rounded-3xl border border-line bg-white px-4 pb-2 pt-3 text-center shadow-card print:mx-auto print:mt-6 print:max-w-[150mm] print:border-2 print:px-8 print:pb-10 print:pt-10 print:shadow-none">
        <div className="flex justify-center">
          <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card.icon} color={ctx.card.color} size={40} rounded="rounded-2xl" />
        </div>
        <p className="mt-1.5 text-sm font-semibold tracking-tight text-ink print:mt-3 print:text-2xl">{ctx.business.name}</p>
        <h2 className="mt-1.5 text-[1.05rem] font-bold leading-[1.15] tracking-[-0.03em] text-ink print:mt-5 print:text-5xl">
          {t.merchant.counterQr.posterTitle1}
          <br />
          {t.merchant.counterQr.posterTitle2}
        </h2>
        <div className="mx-auto mt-2 aspect-square w-full max-w-[6.75rem] rounded-2xl border border-line p-2 print:mt-6 print:max-w-[95mm] print:p-5 [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        {reward && (
          <p className="mx-auto mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-[13px] font-medium text-ink print:mt-6 print:border print:border-line print:px-4 print:py-2 print:text-lg">
            <Gift className="size-4 shrink-0 text-brand-600" />
            <span className="truncate">
              {count(t.common.stampsCount, ctx.card.stamps_required)} = {reward}
            </span>
          </p>
        )}
        <p className="mt-1 text-[12px] text-muted print:mt-4 print:text-base">{t.merchant.counterQr.posterHint}</p>
        <div className="mt-1.5 flex justify-center opacity-80 print:mt-6">
          <Logo size={12} />
        </div>
      </article>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 print:hidden">
        <PrintButton />
        <a href={png} download={`${ctx.business.name.replace(/[^\w-]+/g, "-")}-counter-qr.png`} className={buttonClass("outline", "lg", true)}>
          <Download className="size-5" /> {t.merchant.counterQr.image}
        </a>
      </div>

      <Card className="mt-2.5 divide-y divide-line print:hidden">
        {rows.map((row) => (
          <div key={row.title} className="flex gap-2.5 p-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-canvas text-body [&>svg]:size-4">{row.icon}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-tight text-ink">{row.title}</p>
              <p className="text-[12px] leading-snug text-muted">{row.text}</p>
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-2.5 print:hidden">
        <LinkButton href="/qr" variant="secondary" block icon={<QrCode className="size-5" />}>
          {t.merchant.counterQr.openLive}
        </LinkButton>
      </div>
      <p dir="ltr" className="mt-1 truncate text-center text-xs text-faint print:hidden">
        {url}
      </p>
    </div>
  );
}
