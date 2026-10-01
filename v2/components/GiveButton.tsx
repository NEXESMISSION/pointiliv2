"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { give } from "@/app/actions";
import { t } from "@/lib/t";

/** «عطيتو ✓» on the owner's home: the gift is handed over, the list refreshes. */
export function GiveButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await give(id);
          router.refresh();
        })
      }
      className="press h-11 shrink-0 rounded-[16px] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] px-4 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgb(255_107_74/0.7)] disabled:opacity-60"
    >
      {t.given}
    </button>
  );
}
