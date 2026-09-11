import type { ReactNode } from "react";

export function EmptyState({ icon, title, children, action, className = "" }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center ${className}`}>
      {icon && <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {children && <div className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-danger-50 text-3xl text-danger-600" aria-hidden>
        !
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {children && <div className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}
