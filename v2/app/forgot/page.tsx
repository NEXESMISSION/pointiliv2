import { MessageCircle } from "lucide-react";
import { Heading, Top } from "@/components/Top";
import { Icon3D, Middle, Screen } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "نسيت كلمة السر" };

/**
 * No SMS in Pointili: a forgotten password is a WhatsApp to us, and the
 * founder gives a new one — on the help number set in the console (the same
 * one the owners call).
 */
export default async function Forgot() {
  const number = (await getSettings()).supportPhone;
  return (
    <Screen>
      <Top back="/login" />
      <Middle className="items-center text-center">
        <Icon3D name="phone" size={88} className="animate-float" />
        <Heading title={t.forgot} className="mt-[2.5dvh]" />
        <p className="mt-2 max-w-xs text-[1.0625rem] leading-relaxed text-body">{number ? t.forgotBody : t.forgotNoContact}</p>
        {number && (
          <a
            href={`https://wa.me/${number}?text=${encodeURIComponent(t.forgotMsg)}`}
            className="press mt-[4dvh] flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#25D366] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(37_211_102/0.7)]"
          >
            <MessageCircle className="size-5" /> {t.forgotCta}
          </a>
        )}
      </Middle>
    </Screen>
  );
}
