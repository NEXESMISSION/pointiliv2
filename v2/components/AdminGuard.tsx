"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, LockOpen } from "lucide-react";
import { adminBlock, adminUnblock } from "@/app/actions";
import { CBtn } from "@/components/console";

const FOR = [
  { days: 1, label: "نهار" },
  { days: 30, label: "شهر" },
  { days: 0, label: "ديما" },
];

/** Shut an address or a number out: for a day, a month, or for good — one tap each. */
export function BlockButtons({ value, kind, reason }: { value: string; kind: "ip" | "phone"; reason: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="relative z-[2] inline-flex items-center gap-1">
      <Ban className="size-4 text-coral" aria-hidden />
      {FOR.map((f) => (
        <CBtn
          key={f.days}
          kind="coral"
          className="!h-8 !px-2.5"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminBlock(value, kind, reason, f.days);
              router.refresh();
            })
          }
        >
          {f.label}
        </CBtn>
      ))}
    </span>
  );
}

/** Let an address or a number in again. */
export function UnblockButton({ value }: { value: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <CBtn
      disabled={pending}
      onClick={() =>
        start(async () => {
          await adminUnblock(value);
          router.refresh();
        })
      }
    >
      <LockOpen className="size-4" /> حلّ
    </CBtn>
  );
}

/** Block by hand: an address seen elsewhere, or a phone number. */
export function BlockForm() {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const kind: "ip" | "phone" = /^[\d\s+]+$/.test(value.trim()) && value.replace(/\D/g, "").length <= 11 ? "phone" : "ip";
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        start(async () => {
          if (await adminBlock(value, kind, reason || "بالإيد", 0)) {
            setValue("");
            setReason("");
            router.refresh();
          }
        });
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" placeholder="IP ولا نومرو" className="h-9 w-48 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.875rem] outline-none focus:border-brand" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علاش؟" maxLength={120} className="h-9 w-48 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.875rem] outline-none focus:border-brand" />
      <CBtn kind="coral" disabled={pending || !value.trim()} type="submit">
        <Ban className="size-4" /> سكّر ({kind === "phone" ? "نومرو" : "IP"})
      </CBtn>
    </form>
  );
}
