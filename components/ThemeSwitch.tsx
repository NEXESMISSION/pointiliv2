"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useT } from "@/components/i18n/Provider";

export type ThemeChoice = "system" | "light" | "dark";
const COOKIE = "pl_theme";

/** Remember the choice and paint with it now, without a reload. */
function applyTheme(c: ThemeChoice) {
  document.cookie = `${COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`;
  const root = document.documentElement;
  if (c === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", c);
}

/**
 * Day, night, or like the phone. The choice lives in a cookie so the server
 * paints the right colours on the first frame; "like the phone" leaves the
 * attribute off and the media query decides.
 */
export function ThemeSwitch({ initial }: { initial: ThemeChoice }) {
  const { t } = useT();
  const w = t.common.theme;
  const [choice, setChoice] = useState<ThemeChoice>(initial);

  const pick = (c: ThemeChoice) => {
    setChoice(c);
    applyTheme(c);
  };

  const options: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
    { id: "light", label: w.light, Icon: Sun },
    { id: "dark", label: w.dark, Icon: Moon },
    { id: "system", label: w.system, Icon: Monitor },
  ];
  return (
    <div className="flex gap-1 rounded-2xl bg-ink/[0.06] p-1" role="radiogroup" aria-label={w.title}>
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={choice === id}
          onClick={() => pick(id)}
          className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition ${choice === id ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}
