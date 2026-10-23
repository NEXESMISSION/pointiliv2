"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { PhoneField } from "@/components/PhoneField";
import { spaced, validPhone } from "@/lib/phone";
import { fill, t } from "@/lib/t";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");

/**
 * A forgotten password, asked on WhatsApp — with the account's number in the
 * message (the founder, 23 Oct 2026: «I want the phone number of the account
 * that forgot the password, not just the message, so I don't guess or look
 * for him»), and the link that opens that account in the console, ready for a
 * new password. The number comes from the sign-in page when it was typed
 * there; else it is asked here.
 */
export function ForgotForm({ support, phone: first = "" }: { support: string; phone?: string }) {
  const [phone, setPhone] = useState(first);
  const ok = validPhone(phone);
  const text = [t.forgotMsg, fill(t.forgotWho, { phone: spaced(phone) }), `${SITE}/admin/tools?q=${phone}`].join("\n");
  return (
    <div className="mt-[3dvh] w-full text-start">
      <PhoneField label={t.forgotPhone} initial={first} onValue={setPhone} />
      {ok ? (
        <a
          href={`https://wa.me/${support}?text=${encodeURIComponent(text)}`}
          className="press mt-[3dvh] flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#25D366] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(37_211_102/0.7)]"
        >
          <MessageCircle className="size-5" /> {t.forgotCta}
        </a>
      ) : (
        <p className="mt-[3dvh] flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-canvas text-[0.9375rem] font-semibold text-muted">
          <MessageCircle className="size-5" /> {t.forgotNeedPhone}
        </p>
      )}
    </div>
  );
}
