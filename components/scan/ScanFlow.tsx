"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { processScan, type ScanOutcome } from "@/app/actions/scan";
import { Checking, ScanError, StampSuccess } from "./ScanScreens";
import { StampSignIn } from "./StampSignIn";

/** Scan → Stamp → Done. One POST, then the answer. */
export function ScanFlow({ token }: { token: string }) {
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    try {
      setOutcome(await processScan(token));
    } catch {
      setOutcome({ kind: "error", code: "network" });
    }
  }, [token]);

  useEffect(() => {
    // React dev mode mounts effects twice; a token must be submitted once.
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  if (!outcome) return <Checking />;
  if (outcome.kind === "stamped") return <StampSuccess result={outcome.result} />;
  if (outcome.kind === "auth") return <StampSignIn token={token} businessName={outcome.businessName} />;
  return (
    <ScanError
      code={outcome.code}
      result={outcome.result}
      onRetry={() => {
        setOutcome(null);
        void run();
      }}
    />
  );
}
