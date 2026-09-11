"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/** Bottom sheet on phones, centered dialog on larger screens. Built on <dialog> for focus trapping and Esc. */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

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
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-md"
    >
      <div className="animate-rise rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-lg font-semibold text-ink">{title}</div>
          <button type="button" onClick={onClose} className="-m-2 grid size-10 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="text-[15px] text-body">{children}</div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", tone = "primary", loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; children?: ReactNode; confirmLabel?: string; tone?: "primary" | "danger"; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" size="md" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} size="md" onClick={onConfirm} loading={loading} className="sm:w-auto">
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
