import { setLangAction } from "@/lib/langAction";
import { LIVE_LANGS, langChoiceOffered, type Lang } from "@/lib/dict";

/**
 * FR · تونسي — the language control. A form, two submit buttons, a cookie, a
 * re-render: no JavaScript, and the page coming back in the other language is
 * the only proof worth showing that it worked.
 *
 * BOTH OPTIONS ARE ALWAYS VISIBLE: a toggle showing only the OTHER language
 * makes you work out whether it is telling you what you have or offering what
 * you could have. "تونسي" in its own script, never "Tounsi".
 *
 * THE TRAP: dir is forced per option so the Arabic label is laid out as Arabic
 * while the page is still French, and the Latin one stays Latin once the page
 * has flipped to RTL — otherwise the two buttons swap places on every switch.
 */
export function LangToggle({ current, className = "" }: { current: Lang; className?: string }) {
  if (!langChoiceOffered()) return null;

  const opts = (
    [
      { key: "fr", label: "FR", aria: "Français" },
      { key: "tn", label: "تونسي", aria: "بالتونسي" },
    ] as const
  ).filter((o) => LIVE_LANGS.includes(o.key));

  return (
    <form
      action={setLangAction}
      className={`shrink-0 ${className}`}
      aria-label={current === "tn" ? "اللغة" : "Langue"}
    >
      <div className="flex items-stretch overflow-hidden rounded-[3px] border border-hair">
        {opts.map((o, i) => {
          const on = o.key === current;
          return (
            <button
              key={o.key}
              type="submit"
              name="lang"
              value={o.key}
              aria-label={o.aria}
              aria-pressed={on}
              dir={o.key === "tn" ? "rtl" : "ltr"}
              className={[
                "px-2.5 py-1.5 text-[12px] font-bold leading-none transition",
                i === 1 ? "border-s border-hair" : "",
                on ? "bg-ink text-white" : "bg-white text-slate hover:bg-mist hover:text-ink",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
