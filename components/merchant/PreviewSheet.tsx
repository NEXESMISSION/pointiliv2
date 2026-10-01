"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/Provider";
import { Button } from "@/components/ui/Button";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { Modal } from "@/components/ui/Modal";

export type PreviewLine = { icon: Icon3DName; tone: string; title: string; hint: string };

/**
 * The frame of «قبل ما تسجّل» (board 8, rule 4), for stamps and points alike:
 * what a save does to the customers, one line each, then save or go back.
 * Only good news gets the party and the happier button.
 */
export function PreviewSheet({ open, good, subtitle, lines, children, onClose, onSave, saving, variant = "primary" }: { open: boolean; good: boolean; subtitle?: string | null; lines: PreviewLine[]; children?: ReactNode; onClose: () => void; onSave: () => void; saving: boolean; variant?: "primary" | "sea" }) {
  const { t } = useT();
  const w = t.merchant.loyalty;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        good ? (
          <span className="flex items-center gap-2">
            <Icon3D name="party" size={30} /> {w.goodNews}
          </span>
        ) : (
          w.beforeSave
        )
      }
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose} className="sm:w-auto">
            {t.common.back}
          </Button>
          <Button variant={variant} size="lg" loading={saving} onClick={onSave} className="sm:w-auto">
            {good ? w.saveDelight : t.common.save}
          </Button>
        </>
      }
    >
      {subtitle && <p className="-mt-2 mb-3 text-sm text-muted">{subtitle}</p>}
      <div className="max-h-[52dvh] divide-y divide-line overflow-y-auto rounded-[20px] bg-surface ring-1 ring-line">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-3 px-3.5 py-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${l.tone}`}>
              <Icon3D name={l.icon} size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-snug text-ink">{l.title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{l.hint}</span>
            </span>
          </div>
        ))}
        {children}
      </div>
    </Modal>
  );
}
