"use client";

import { Clock, QrCode, RefreshCw, ScanLine, WifiOff, X } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { IMPACT_MS, StampDrop } from "./StampDrop";
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
      <Logo size={30} className="mb-10" />
      <div className="relative grid size-32 place-items-center">
        <svg className="absolute inset-0 size-full animate-spin [animation-duration:1.4s]" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#EBE3FF" strokeWidth="5" />
          <path d="M50 6a44 44 0 0 1 44 44" fill="none" stroke="#6535E0" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <ScanLine className="size-12 text-brand-600" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-ink">{t.scan.checking.title}</h1>
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
  /* Everything arrives out of the stamp's impact, in reading order — see StampDrop. */
  const after = (ms: number) => ({ animationDelay: `${IMPACT_MS + ms}ms` });

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden text-center">
      <Confetti count={unlocked ? 60 : 32} />
      <StampDrop label={t.scan.stampWord} tone="success" size={96} />
      <h1 className="animate-rise text-2xl font-extrabold tracking-tight text-ink" style={after(100)}>
        {t.scan.success.title}
      </h1>

      <div className="mt-4 w-full animate-rise text-start" style={after(180)}>
        <LoyaltyCardVisual design={design} business={business} subtitle={card?.description} filled={customer.balance} total={total} rewardName={primary?.name} animateIndex={Math.min(customer.balance, total) - 1} />
      </div>

      {unlocked ? (
        <div className="mt-4 w-full animate-rise rounded-3xl border-2 border-dashed border-success-500 p-4" style={after(280)}>
          <p className="text-3xl" aria-hidden>
            🎉
          </p>
          <p className="mt-1 text-sm font-semibold text-success-600">{t.scan.success.unlocked}</p>
          <p className="mt-0.5 text-xl font-extrabold uppercase tracking-tight text-ink">{unlocked.name}</p>
          <p className="text-[13px] text-muted">{business.name}</p>
          <div className="mt-3">
            <UseRewardButton rewardId={unlocked.id} />
          </div>
        </div>
      ) : next_reward ? (
        <p className="mt-4 animate-rise text-[15px] text-body" style={after(280)}>
          <span className="font-bold text-ink">{count(t.common.stampsToGo, next_reward.remaining)}</span> {fill(t.scan.success.toGo, { reward: next_reward.name })}
        </p>
      ) : null}

      <div className="w-full animate-rise space-y-2 pt-6" style={after(360)}>
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

const ERROR_ICON: Record<string, typeof X> = { expired: Clock, already_used: QrCode, too_soon: Clock, network: WifiOff };

export function ScanError({ code, result, onRetry }: { code: string; result?: StampResult; onRetry?: () => void }) {
  const { t, locale, fill, msg } = useT();
  const Icon = ERROR_ICON[code] ?? X;
  const name = result && "business" in result ? result.business?.name : undefined;
  const customerId = result && "customer" in result ? result.customer?.id : undefined;
  // A code that expired, was used or never existed: they missed it, nothing more to explain.
  const missed = code === "expired" || code === "already_used" || code === "invalid" || code === "not_found";
  const soft = missed || code === "too_soon" || code === "already_processed";
  const nextAt = result && "next_at" in result ? result.next_at : undefined;

  return (
    <div className="flex flex-1 flex-col justify-center text-center">
      <Logo size={30} className="mx-auto shrink-0" />
      <div className={`mx-auto mt-6 grid size-20 shrink-0 animate-pop place-items-center rounded-full ${soft ? "bg-warning-50 text-warning-700" : "bg-danger-50 text-danger-600"}`}>
        <Icon className="size-9" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
        {missed ? t.scan.error.missed : code === "already_processed" ? t.scan.error.alreadyStamped : code === "too_soon" ? t.scan.error.tooSoon : code === "network" ? t.scan.error.network : t.scan.error.generic}
      </h1>
      {name && <p className="mt-1 font-semibold text-body">{name}</p>}
      <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{missed ? t.scan.error.missedBody : msg(code)}</p>
      {code === "too_soon" && nextAt && <p className="mt-2 text-sm font-medium text-body">{fill(t.scan.error.nextAt, { time: formatTime(nextAt, locale) })}</p>}

      <div className="space-y-2 pt-8">
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
