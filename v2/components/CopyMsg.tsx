"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { t } from "@/lib/t";

/**
 * Text to the phone's clipboard. The clipboard API first; where it is refused (an older installed app, a
 * WebView), the old way through a hidden box. True when it went.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // the old way below
  }
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * One tap, the whole message copied, ready to paste anywhere (19 Nov 2026, the founder on the new password:
 * «hit copy and it just copies the whole sentence with the new password, one message»). It says so for two seconds.
 */
export function CopyMsg({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void copyText(text).then((ok) => {
          if (!ok) return;
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        })
      }
      className={className}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? t.aCopied : t.aCopyMsg}
    </button>
  );
}
