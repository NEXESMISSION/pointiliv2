import { ChevronDown, CircleHelp } from "lucide-react";

/**
 * THE THREE LINES NOBODY EVER TOLD THE OWNER.
 *
 * An owner opens this app for the first time and sees buttons and numbers, and
 * nothing anywhere says what the thing actually does or what he is meant to do
 * first. This is that explanation, sitting on the screen he opens every day.
 *
 * Open while it is still needed — a shop with no customers yet — and folded
 * away once it is not, because a permanent tutorial on a daily screen is a tax
 * on everyone who already knows. No JavaScript: <details> does the whole job.
 */
export function HowItWorks({ title, steps, open = false }: { title: string; steps: { t: string; h: string }[]; open?: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border border-line bg-white shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-semibold text-ink marker:content-none">
        <CircleHelp className="size-[18px] shrink-0 text-brand-600" />
        {title}
        <ChevronDown className="ms-auto size-4 shrink-0 text-faint transition group-open:rotate-180" />
      </summary>
      <ol className="space-y-3 border-t border-line px-4 py-3.5">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3">
            <span dir="ltr" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700 tabular">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-snug text-ink">{s.t}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">{s.h}</span>
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
