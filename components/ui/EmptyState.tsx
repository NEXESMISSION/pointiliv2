"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/Provider";

export function EmptyState({ icon, title, children, action, className = "" }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-10 text-center shadow-card ${className}`}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-canvas text-body [&>svg]:size-6">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-danger-50 text-xl font-semibold text-danger-600" aria-hidden>
        !
      </div>
      <h3 className="text-base font-semibold text-ink">{title ?? t.common.errorTitle}</h3>
      {children && <div className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}
