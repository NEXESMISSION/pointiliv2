"use client";

import { useState } from "react";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { waLink } from "@/lib/abonili/format";
import { useAb } from "./AbProvider";

/** The member's card link, and the two ways it actually travels: copied, or WhatsApp. */
export function CardShare({ url, name, club, phone }: { url: string; name: string; club: string; phone: string | null }) {
  const { a, fill } = useAb();
  const [copied, setCopied] = useState(false);
  const text = fill(a.member.whatsappText, { name: name.split(" ")[0] ?? name, club, url });

  return (
    <div className="space-y-3">
      <p className="ab-well ab-ltr ab-trunc px-3 py-2.5 text-[13px] ab-dim">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <a href={waLink(phone, text)} target="_blank" rel="noopener noreferrer" className="ab-btn ab-btn-sm">
          <MessageCircle aria-hidden />
          {a.member.whatsapp}
        </a>
        <button
          type="button"
          className="ab-btn ab-btn-quiet ab-btn-sm"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
        >
          <Copy aria-hidden />
          {copied ? a.member.copied : a.member.copy}
        </button>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold ab-dim">
        <ExternalLink aria-hidden className="size-4" />
        {a.member.openCard}
      </a>
    </div>
  );
}
