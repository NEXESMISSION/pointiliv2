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

export const metadata = { title: "Counter QR" };

export default async function CounterQrPage() {
  const ctx = await requireMerchant("/counter-qr");
  if (!ctx.card) redirect("/loyalty?welcome=1");

  const url = `${siteUrl()}/join/${ctx.business.join_code}`;
  const [svg, png] = await Promise.all([
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "Q", color: { dark: "#0c0c14", light: "#00000000" } }),
    QRCode.toDataURL(url, { width: 1200, margin: 3, errorCorrectionLevel: "Q" }),
  ]);
  const reward = ctx.card.reward?.name;

  return (
    <div className="mx-auto max-w-md print:max-w-none">
      <div className="print:hidden">
        <TopBar title="Counter QR" subtitle="Print it once, it never changes" back="/dashboard" />
      </div>

      {/* The poster */}
      <article className="rounded-3xl border border-line bg-white px-6 pb-7 pt-8 text-center shadow-card print:mx-auto print:mt-6 print:max-w-[150mm] print:border-2 print:shadow-none">
        <div className="flex justify-center">
          <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card.icon} color={ctx.card.color} size={60} rounded="rounded-2xl" />
        </div>
        <p className="mt-3 text-lg font-semibold tracking-tight text-ink">{ctx.business.name}</p>
        <h2 className="mt-5 text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-ink print:text-5xl">
          Scan to get
          <br />
          our loyalty card
        </h2>
        <div className="mx-auto mt-6 w-full max-w-[16rem] rounded-2xl border border-line p-4 print:max-w-[95mm] print:p-5 [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        {reward && (
          <p className="mx-auto mt-6 inline-flex max-w-full items-center gap-2 rounded-full bg-canvas px-4 py-2 text-sm font-medium text-ink print:border print:border-line print:text-lg">
            <Gift className="size-4 shrink-0 text-brand-600" />
            <span className="truncate">
              {ctx.card.stamps_required} stamps = {reward}
            </span>
          </p>
        )}
        <p className="mt-4 text-[13px] text-muted print:text-base">Use your phone camera · No app needed</p>
        <div className="mt-6 flex justify-center opacity-80">
          <Logo size={15} />
        </div>
      </article>

      <div className="mt-5 grid grid-cols-2 gap-2.5 print:hidden">
        <PrintButton />
        <a href={png} download={`${ctx.business.name.replace(/[^\w-]+/g, "-")}-counter-qr.png`} className={buttonClass("outline", "lg", true)}>
          <Download className="size-5" /> Image
        </a>
      </div>

      <Card className="mt-5 divide-y divide-line print:hidden">
        {[
          { icon: <Sticker />, title: "Stick it on the counter", text: "Customers scan it to add your card to their phone — even before their first stamp." },
          { icon: <ShieldCheck />, title: "It can't give stamps", text: "So a photo of it is useless for cheating. Print it, share it, put it on the menu." },
          { icon: <QrCode />, title: "Stamps come from the live QR", text: "When a customer pays, open the live QR. It changes after every scan." },
        ].map((row) => (
          <div key={row.title} className="flex gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-body [&>svg]:size-[18px]">{row.icon}</span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">{row.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{row.text}</p>
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-4 print:hidden">
        <LinkButton href="/qr" variant="secondary" block icon={<QrCode className="size-5" />}>
          Open live QR
        </LinkButton>
      </div>
      <p className="mt-4 break-all text-center text-xs text-faint print:hidden">{url}</p>
    </div>
  );
}
