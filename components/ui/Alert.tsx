import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "error" | "success" | "info" | "warning";

const styles: Record<Tone, { box: string; Icon: typeof Info }> = {
  error: { box: "border-danger-500/20 bg-danger-50 text-danger-600", Icon: CircleAlert },
  success: { box: "border-success-500/20 bg-success-50 text-success-600", Icon: CircleCheck },
  info: { box: "border-brand-500/15 bg-brand-50 text-brand-800", Icon: Info },
  warning: { box: "border-warning-500/25 bg-warning-50 text-warning-700", Icon: TriangleAlert },
};

export function Alert({ tone = "error", title, children, action, className = "" }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-3.5 text-sm ${box} ${className}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
