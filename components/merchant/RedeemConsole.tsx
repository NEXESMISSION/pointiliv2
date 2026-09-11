"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Gift, ScanLine, Ticket } from "lucide-react";
import { confirmRedemption, lookupRedemptionCode } from "@/app/actions/merchant";
import { CameraScanner } from "@/components/scan/CameraScanner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { rewardCodeFromScan, tokenFromScan } from "@/lib/url";
import type { RedemptionView } from "@/lib/types";

export function RedeemConsole({ initialPending, initialFound, initialError, autoScan }: { initialPending: RedemptionView[]; initialFound: RedemptionView | null; initialError: string | null; autoScan: boolean }) {
  const [pending, setPending] = useState(initialPending);
  const [found, setFound] = useState<RedemptionView | null>(initialFound);
  const [error, setError] = useState<string | null>(initialError);
  const [done, setDone] = useState<RedemptionView | null>(null);
  const [scanning, setScanning] = useState(autoScan && !initialFound);
  const [code, setCode] = useState("");
  const [checking, startCheck] = useTransition();
  const router = useRouter();

  const check = (value: string) =>
    startCheck(async () => {
      setError(null);
      const res = await lookupRedemptionCode(value);
      if (res.ok && res.redemption) {
        setFound(res.redemption);
        setCode("");
      } else {
        setError(res.error ?? "Something went wrong. Please try again.");
      }
    });

  // Live list: a request appears here seconds after the customer taps "Use reward".
  useEffect(() => {
    const iv = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/merchant/pending", { cache: "no-store" });
        if (res.ok) setPending(await res.json());
      } catch {
        /* keep the last list */
      }
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // The reward on screen is not repeated in the waiting list (one Confirm button per reward).
  const waiting = pending.filter((r) => r.id !== found?.id);

  const finish = (r: RedemptionView) => {
    setFound(null);
    setDone(r);
  };

  if (done) {
    return (
      <Card className="animate-rise p-6 text-center">
        <span className="mx-auto grid size-20 animate-pop place-items-center rounded-full bg-success-500 text-white">
          <Check className="size-10" strokeWidth={3} />
        </span>
        <p className="mt-4 text-2xl font-extrabold text-ink">Reward redeemed!</p>
        <p className="mt-1 text-lg font-semibold text-success-600">{done.reward_name}</p>
        <p className="text-muted">{done.customer.name || `Customer #${done.customer.code}`}</p>
        <div className="mt-6 space-y-2">
          <Button
            block
            icon={<ScanLine className="size-5" />}
            onClick={() => {
              setDone(null);
              setScanning(true);
            }}
          >
            Scan next reward
          </Button>
          <Button
            block
            variant="outline"
            onClick={() => {
              setDone(null);
              router.replace("/redeem");
            }}
          >
            Done
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {found ? (
        <Confirm r={found} onDone={finish} onCancel={() => setFound(null)} />
      ) : (
        <Card className="space-y-4 p-5">
          <Button size="xl" block icon={<ScanLine className="size-6" />} onClick={() => setScanning(true)}>
            Scan reward QR
          </Button>
          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" /> or type the code <span className="h-px flex-1 bg-line" />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              check(code);
            }}
          >
            <label htmlFor="code" className="sr-only">
              6-digit code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={7}
              placeholder="000 000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
              className="h-14 min-w-0 flex-1 rounded-2xl border border-line bg-white text-center font-mono text-2xl font-bold tracking-[0.25em] text-ink placeholder:text-line focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            <Button type="submit" variant="secondary" className="h-14 shrink-0" loading={checking} disabled={code.replace(/\D/g, "").length !== 6}>
              Check
            </Button>
          </form>
          {error && <Alert>{error}</Alert>}
        </Card>
      )}

      <section>
        <SectionTitle>Waiting at the counter</SectionTitle>
        {waiting.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-muted">
            <Ticket className="size-5" /> {found ? "No other reward requests right now." : "No reward requests right now."}
          </Card>
        ) : (
          <div className="space-y-3">
            {waiting.map((r) => (
              <Confirm key={r.id} r={r} compact onDone={finish} />
            ))}
          </div>
        )}
      </section>

      {scanning && (
        <CameraScanner
          title="Scan reward QR"
          hint="Point your camera at the customer's reward QR"
          onClose={() => setScanning(false)}
          onText={(text) => {
            const value = rewardCodeFromScan(text);
            if (!value) return tokenFromScan(text) ? "That's your stamp QR — scan the customer's reward QR." : "That isn't a Pointili reward QR.";
            setScanning(false);
            check(value);
            return null;
          }}
        />
      )}
    </div>
  );
}

function Confirm({ r, compact, onDone, onCancel }: { r: RedemptionView; compact?: boolean; onDone: (r: RedemptionView) => void; onCancel?: () => void }) {
  const [busy, start] = useTransition();
  const toast = useToast();
  return (
    <Card className={compact ? "p-4" : "animate-rise p-5 ring-2 ring-success-500"}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning-50 text-warning-700">
          <Gift className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-ink">{r.reward_name}</p>
          <p className="truncate text-sm text-muted">
            {r.customer.name || `Customer #${r.customer.code}`} · {r.customer.phone_masked}
          </p>
        </div>
        <p className="shrink-0 rounded-xl bg-canvas px-2.5 py-1 font-mono text-lg font-bold tracking-wider text-ink">
          {r.code.slice(0, 3)} {r.code.slice(3)}
        </p>
      </div>
      {!compact && (
        <p className="mt-3 text-sm text-muted">
          Uses {r.stamps_spent} of their {r.customer.balance} stamps. Give the reward, then confirm.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {onCancel && (
          <Button variant="outline" size="md" onClick={onCancel} className="flex-1">
            Back
          </Button>
        )}
        <Button
          variant="success"
          size={compact ? "md" : "lg"}
          className="flex-1"
          loading={busy}
          icon={<Check className="size-5" />}
          onClick={() =>
            start(async () => {
              const res = await confirmRedemption(r.id);
              if (res.ok && res.redemption) onDone(res.redemption);
              else toast(res.message, "error");
            })
          }
        >
          Confirm redemption
        </Button>
      </div>
    </Card>
  );
}
