import { MessageCircle } from "lucide-react";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { t } from "@/lib/t";

export const metadata = { title: "نسيت كلمة السر" };

/** Digits only, country code first: what wa.me expects (SUPPORT_WHATSAPP, else the first admin phone). */
function support(): string | null {
  const raw = process.env.SUPPORT_WHATSAPP || process.env.ADMIN_PHONES?.split(",")[0] || "";
  const d = raw.replace(/\D/g, "");
  if (d.length < 8) return null;
  return d.length === 8 ? `216${d}` : d;
}

/** No SMS in Pointili: a forgotten password is a WhatsApp to us, and the founder gives a new one. */
export default function Forgot() {
  const number = support();
  return (
    <Screen>
      <Top back="/login" title={t.forgot} />
      <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
        <Icon3D name="phone" size={96} className="animate-float" />
        <p className="mt-6 max-w-xs text-[17px] leading-relaxed text-body">{number ? t.forgotBody : t.forgotNoContact}</p>
        {number && (
          <a
            href={`https://wa.me/${number}?text=${encodeURIComponent(t.forgotMsg)}`}
            className="press mt-8 flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#25D366] text-[17px] font-bold text-white shadow-[0_14px_30px_-12px_rgb(37_211_102/0.7)]"
          >
            <MessageCircle className="size-5" /> {t.forgotCta}
          </a>
        )}
      </div>
    </Screen>
  );
}
