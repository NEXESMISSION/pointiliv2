"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** A bottom sheet on the phone, a centred dialog on a desk: the native <dialog>. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="ab-sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="space-y-4 p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-extrabold">{title}</h2>
          <button type="button" className="ab-btn ab-btn-quiet ab-btn-sm !px-2.5" onClick={onClose} aria-label="×">
            <X aria-hidden />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
