"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { requestRedemption } from "@/app/actions/customer";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/button-styles";

/** Starts (or resumes) a redemption. Nothing is spent until the merchant confirms at the counter. */
export function UseRewardButton({ rewardId, pendingId, size = "lg" }: { rewardId: string; pendingId?: string | null; size?: "md" | "lg" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (pendingId) {
    return (
      <Link href={`/customer/rewards/use/${pendingId}`} className={buttonClass("primary", size, true)}>
        Show my code
      </Link>
    );
  }
  return (
    <div>
      <Button
        block
        size={size}
        loading={pending}
        icon={<Gift className="size-5" />}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await requestRedemption(rewardId);
            if (res && !res.ok) setError(res.error);
          })
        }
      >
        Use reward
      </Button>
      {error && <p className="mt-2 text-center text-sm text-danger-600">{error}</p>}
    </div>
  );
}
