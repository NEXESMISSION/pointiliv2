"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { useT } from "@/components/i18n/Provider";

/** Bottom sheet on phones, centered dialog on larger screens. Built on <dialog> for focus trapping and Esc. */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useT();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-[rgb(10_6_30/0.38)] backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-md"
    >
      <div className="animate-sheet rounded-t-[32px] bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2.5 shadow-lift sm:animate-rise sm:rounded-3xl sm:pb-5 sm:pt-5">
        <div className="mx-auto mb-3.5 h-[5px] w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-[21px] font-bold text-ink">{title}</div>
          <button type="button" onClick={onClose} className="-m-2 grid size-10 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label={t.common.close}>
            <X className="size-5" />
          </button>
        </div>
        <div className="text-[15px] text-body">{children}</div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel, tone = "primary", loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; children?: ReactNode; confirmLabel?: string; tone?: "primary" | "danger"; loading?: boolean }) {
  const { t } = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" size="md" onClick={onClose} className="sm:w-auto">
            {t.common.cancel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} size="md" onClick={onConfirm} loading={loading} className="sm:w-auto">
            {confirmLabel ?? t.common.confirm}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
