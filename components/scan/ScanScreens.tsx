"use client";

import { Check, Clock, QrCode, RefreshCw, ScanLine, Store, WifiOff, X } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { Confetti } from "@/components/Confetti";
import { Logo } from "@/components/Logo";
import { StampGrid } from "@/components/LoyaltyCard";
import { Button, LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Stat";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { cardColor } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { message } from "@/lib/messages";
import type { StampResult } from "@/lib/types";

export function Checking() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <Logo size={30} className="mb-16" />
      <div className="relative grid size-40 place-items-center">
        <svg className="absolute inset-0 size-full animate-spin [animation-duration:1.4s]" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#E3E2FF" strokeWidth="5" />
          <path d="M50 6a44 44 0 0 1 44 44" fill="none" stroke="#4536F0" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <ScanLine className="size-14 text-brand-600" />
      </div>
      <h1 className="mt-10 text-xl font-bold text-ink">Checking your stamp…</h1>
      <p className="mt-1 text-sm text-muted">Please wait a moment</p>
    </div>
  );
}

export function StampSuccess({ result }: { result: Extract<StampResult, { ok: true }> }) {
  const { business, card, customer, next_reward, newly_unlocked } = result;
  const style = card ?? { stamps_required: 10, color: "indigo", icon: "coffee" };
  const c = cardColor(style.color);
  const required = style.stamps_required;
  const unlocked = newly_unlocked[0];

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden text-center">
      <Confetti count={unlocked ? 60 : 32} />
      <div className="mt-6 grid size-24 animate-pop place-items-center rounded-full bg-success-500 text-white shadow-[0_12px_30px_-8px_rgb(34_197_94/0.6)]">
        <Check className="size-12" strokeWidth={3.2} />
      </div>
      <h1 className="mt-6 animate-rise text-3xl font-extrabold tracking-tight text-ink">Stamp collected!</h1>

      <div className="mt-6 flex items-center gap-3">
        <BusinessAvatar logo={business.logo_url} icon={style.icon} color={style.color} size={48} rounded="rounded-full" />
        <div className="text-left">
          <p className="text-lg font-bold text-ink">{business.name}</p>
          <p className="text-sm font-medium text-body tabular">
            <span className="font-bold" style={{ color: c.accent }}>
              {customer.balance}
            </span>{" "}
            / {required} stamps
          </p>
        </div>
      </div>

      <div className="mt-6 w-full rounded-3xl p-4" style={{ background: c.bg }}>
        <StampGrid filled={customer.balance} total={required} color={style.color} icon={style.icon} animateIndex={Math.min(customer.balance, required) - 1} />
      </div>

      {unlocked ? (
        <div className="mt-6 w-full animate-rise rounded-3xl border-2 border-dashed p-5" style={{ borderColor: c.accent }}>
          <p className="text-4xl" aria-hidden>
            🎉
          </p>
          <p className="mt-1 font-semibold text-success-600">Reward unlocked!</p>
          <p className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-ink">{unlocked.name}</p>
          <p className="text-sm text-muted">{business.name}</p>
          <div className="mt-4">
            <UseRewardButton rewardId={unlocked.id} />
          </div>
        </div>
      ) : next_reward ? (
        <div className="mt-6 w-full">
          <ProgressBar value={customer.balance} max={next_reward.stamps_required} color="var(--color-success-500)" />
          <p className="mt-3 text-[15px] text-body">
            <span className="font-bold text-ink">{next_reward.remaining} more stamp{next_reward.remaining > 1 ? "s" : ""}</span>
            <br />
            to unlock {next_reward.name}
          </p>
        </div>
      ) : null}

      <div className="mt-auto w-full space-y-2 pt-8">
        <LinkButton href={`/customer/cards/${customer.id}`} variant={unlocked ? "outline" : "primary"} block>
          View card
        </LinkButton>
        <LinkButton href="/customer" variant="ghost" block>
          Done
        </LinkButton>
      </div>
    </div>
  );
}

export function NeedsAccount({ token, businessName }: { token: string; businessName: string | null }) {
  const next = encodeURIComponent(`/scan/${token}`);
  return (
    <div className="flex flex-1 flex-col text-center">
      <Logo size={30} className="mx-auto" />
      <div className="mx-auto mt-12 grid size-24 animate-pop place-items-center rounded-[2rem] bg-brand-50 text-brand-600">
        <Store className="size-11" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">Almost there!</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-body">
        Create your Pointidi account to collect your stamp{businessName ? <> at <span className="font-semibold text-ink">{businessName}</span></> : null}.
      </p>
      <p className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-600">
        <Clock className="size-4" /> Your stamp is saved for 20 minutes
      </p>
      <div className="mt-auto space-y-2 pt-10">
        <LinkButton href={`/customer/register?next=${next}`} block>
          Create account
        </LinkButton>
        <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
          I already have an account
        </LinkButton>
      </div>
    </div>
  );
}

const ERROR_ICON: Record<string, typeof X> = { expired: Clock, already_used: QrCode, too_soon: Clock, network: WifiOff };

export function ScanError({ code, result, onRetry }: { code: string; result?: StampResult; onRetry?: () => void }) {
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
        {code === "already_processed" ? "Already stamped" : code === "too_soon" ? "See you next visit!" : code === "network" ? "Connection problem" : "Couldn't add your stamp"}
      </h1>
      {name && <p className="mt-1 font-semibold text-body">{name}</p>}
      <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{message(code)}</p>
      {code === "too_soon" && nextAt && <p className="mt-2 text-sm font-medium text-body">You can collect your next stamp from {formatTime(nextAt)}.</p>}
      {(code === "expired" || code === "already_used") && <p className="mt-2 text-sm text-muted">The QR on the screen changes automatically — scan the one showing now.</p>}

      <div className="mt-auto space-y-2 pt-10">
        {code === "network" && onRetry && (
          <Button block onClick={onRetry} icon={<RefreshCw className="size-5" />}>
            Try again
          </Button>
        )}
        {customerId && (
          <LinkButton href={`/customer/cards/${customerId}`} block>
            View my card
          </LinkButton>
        )}
        {code !== "network" && !customerId && (
          <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
            Scan again
          </LinkButton>
        )}
        <LinkButton href="/customer" variant="ghost" block>
          Go to my cards
        </LinkButton>
      </div>
    </div>
  );
}
