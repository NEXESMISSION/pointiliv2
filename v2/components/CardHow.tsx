"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ScanLine } from "lucide-react";
import { Pass, type PassShop } from "@/components/Pass";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * A customer's card in the owner's sheets (a customer's row, a latest
 * moment), answering a tap. Owners tapped its dots, as on a paper card, and
 * nothing happened: now the tap says how a tampon is given — «سكاني», the
 * code on the customer's phone — with the button to it, in the place of the
 * line under the card. The one way to give stays the one way.
 */
export function CardHow({ shop, stamps, waiting, line, className = "mt-3" }: { shop: PassShop; stamps: number; waiting?: number; line: ReactNode; className?: string }) {
  const [how, setHow] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!how) signal("customer_card_tap");
          setHow(true);
        }}
        aria-label={t.customerHowAdd}
        className={`press block w-full rounded-[1.75rem] text-start ${className}`}
      >
        <Pass shop={shop} stamps={stamps} waiting={waiting} />
      </button>
      {how && !shop.store ? (
        <div className="mt-3 flex animate-pop items-center gap-3 rounded-[1.25rem] bg-brand-soft p-3.5">
          <ScanLine className="size-6 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold leading-snug text-brand">{t.customerHowAdd}</span>
          <Link href="/shop/collect?by=scan" className="press flex h-10 shrink-0 items-center gap-1.5 rounded-[0.875rem] bg-brand px-3.5 text-[0.9375rem] font-bold text-white">
            <ScanLine className="size-4" /> {t.collectScanShort}
          </Link>
        </div>
      ) : (
        line
      )}
    </>
  );
}
