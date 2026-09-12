"use client";

import { Check, Clock, QrCode, RefreshCw, ScanLine, Store, WifiOff, X } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { Logo } from "@/components/Logo";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Button, LinkButton } from "@/components/ui/Button";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { useT } from "@/components/i18n/Provider";
import { resolveDesign } from "@/lib/card-design";
import { formatTime } from "@/lib/format";
import type { StampResult } from "@/lib/types";

export function Checking() {
  const { t } = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <Logo size={30} className="mb-16" />
      <div className="relative grid size-40 place-items-center">
        <svg className="absolute inset-0 size-full animate-spin [animation-duration:1.4s]" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#EBE3FF" strokeWidth="5" />
          <path d="M50 6a44 44 0 0 1 44 44" fill="none" stroke="#6535E0" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <ScanLine className="size-14 text-brand-600" />
      </div>
      <h1 className="mt-10 text-xl font-bold text-ink">{t.scan.checking.title}</h1>
      <p className="mt-1 text-sm text-muted">{t.scan.checking.hint}</p>
    </div>
  );
}

export function StampSuccess({ result }: { result: Extract<StampResult, { ok: true }> }) {
  const { t, count, fill } = useT();
  const { business, card, customer, next_reward, newly_unlocked, rewards } = result;
  const total = card?.stamps_required ?? 10;
  const design = resolveDesign(card?.design, { color: card?.color, icon: card?.icon });
  const primary = rewards.find((r) => r.is_primary) ?? rewards[0];
  const unlocked = newly_unlocked[0];

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden text-center">
      <Confetti count={unlocked ? 60 : 32} />
      <div className="mt-2 grid size-20 animate-pop place-items-center rounded-full bg-success-500 text-white shadow-[0_12px_30px_-8px_rgb(34_197_94/0.6)]">
        <Check className="size-10" strokeWidth={3.2} />
      </div>
      <h1 className="mt-4 animate-rise text-3xl font-extrabold tracking-tight text-ink">{t.scan.success.title}</h1>

      <div className="mt-6 w-full text-start">
        <LoyaltyCardVisual design={design} business={business} subtitle={card?.description} filled={customer.balance} total={total} rewardName={primary?.name} animateIndex={Math.min(customer.balance, total) - 1} />
      </div>

      {unlocked ? (
        <div className="mt-6 w-full animate-rise rounded-3xl border-2 border-dashed border-success-500 p-5">
          <p className="text-4xl" aria-hidden>
            🎉
          </p>
          <p className="mt-1 font-semibold text-success-600">{t.scan.success.unlocked}</p>
          <p className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-ink">{unlocked.name}</p>
          <p className="text-sm text-muted">{business.name}</p>
          <div className="mt-4">
            <UseRewardButton rewardId={unlocked.id} />
          </div>
        </div>
      ) : next_reward ? (
        <p className="mt-5 text-[15px] text-body">
          <span className="font-bold text-ink">{count(t.common.stampsToGo, next_reward.remaining)}</span> {fill(t.scan.success.toGo, { reward: next_reward.name })}
        </p>
      ) : null}

      <div className="mt-auto w-full space-y-2 pt-8">
        <LinkButton href={`/customer/cards/${customer.id}`} variant={unlocked ? "outline" : "primary"} block>
          {t.scan.success.viewCard}
        </LinkButton>
        <LinkButton href="/customer" variant="ghost" block>
          {t.common.done}
        </LinkButton>
      </div>
    </div>
  );
}

export function NeedsAccount({ token, businessName }: { token: string; businessName: string | null }) {
  const { t } = useT();
  const next = encodeURIComponent(`/scan/${token}`);
  return (
    <div className="flex flex-1 flex-col text-center">
      <Logo size={30} className="mx-auto" />
      <div className="mx-auto mt-12 grid size-24 animate-pop place-items-center rounded-[2rem] bg-brand-50 text-brand-600">
        <Store className="size-11" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">{t.scan.needsAccount.title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-body">
        {t.scan.needsAccount.body}
        {businessName ? (
          <>
            {" "}
            {t.scan.needsAccount.at} <span className="font-semibold text-ink">{businessName}</span>
          </>
        ) : null}
        .
      </p>
      <p className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-600">
        <Clock className="size-4" /> {t.scan.needsAccount.held}
      </p>
      <div className="mt-auto space-y-2 pt-10">
        <LinkButton href={`/customer/register?next=${next}`} block>
          {t.scan.needsAccount.createAccount}
        </LinkButton>
        <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
          {t.scan.haveAccount}
        </LinkButton>
      </div>
    </div>
  );
}

const ERROR_ICON: Record<string, typeof X> = { expired: Clock, already_used: QrCode, too_soon: Clock, network: WifiOff };

export function ScanError({ code, result, onRetry }: { code: string; result?: StampResult; onRetry?: () => void }) {
  const { t, locale, fill, msg } = useT();
  const Icon = ERROR_ICON[code] ?? X;
  const name = result && "business" in result ? result.business?.name : undefined;
  const customerId = result && "customer" in result ? result.customer?.id : undefined;
  const soft = code === "too_soon" || code === "already_processed";
  const nextAt = result && "next_at" in result ? result.next_at : undefined;

  return (
    <div className="flex flex-1 flex-col text-center">
      <Logo size={30} className="mx-auto" />
      <div className={`mx-auto mt-14 grid size-24 animate-pop place-items-center rounded-full ${soft ? "bg-warning-50 text-warning-700" : "bg-danger-50 text-danger-600"}`}>
        <Icon className="size-11" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">
        {code === "already_processed" ? t.scan.error.alreadyStamped : code === "too_soon" ? t.scan.error.tooSoon : code === "network" ? t.scan.error.network : t.scan.error.generic}
      </h1>
      {name && <p className="mt-1 font-semibold text-body">{name}</p>}
      <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{msg(code)}</p>
      {code === "too_soon" && nextAt && <p className="mt-2 text-sm font-medium text-body">{fill(t.scan.error.nextAt, { time: formatTime(nextAt, locale) })}</p>}
      {(code === "expired" || code === "already_used") && <p className="mt-2 text-sm text-muted">{t.scan.error.qrChanges}</p>}

      <div className="mt-auto space-y-2 pt-10">
        {code === "network" && onRetry && (
          <Button block onClick={onRetry} icon={<RefreshCw className="size-5" />}>
            {t.common.tryAgain}
          </Button>
        )}
        {customerId && (
          <LinkButton href={`/customer/cards/${customerId}`} block>
            {t.scan.error.viewMyCard}
          </LinkButton>
        )}
        {code !== "network" && !customerId && (
          <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
            {t.scan.error.scanAgain}
          </LinkButton>
        )}
        <LinkButton href="/customer" variant="ghost" block>
          {t.scan.goToCards}
        </LinkButton>
      </div>
    </div>
  );
}
