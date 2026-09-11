"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setRewardActive } from "@/app/actions/merchant";
import { useToast } from "@/components/ui/Toast";

export function RewardToggle({ reward }: { reward: { id: string; name: string; description: string | null; stamps_required: number; active: boolean } }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={reward.active}
      aria-label={`${reward.active ? "Pause" : "Activate"} ${reward.name}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setRewardActive(reward.id, !reward.active, reward);
          toast(res.message, res.ok ? "success" : "error");
          router.refresh();
        })
      }
      className="grid h-11 w-14 place-items-center disabled:opacity-50"
    >
      <span className={`relative h-7 w-12 rounded-full transition ${reward.active ? "bg-success-500" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${reward.active ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
