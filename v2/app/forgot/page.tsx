import { ForgotForm } from "@/components/ForgotForm";
import { Heading, Top } from "@/components/Top";
import { Icon3D, Middle, Screen } from "@/components/ui";
import { digits } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "نسيت كلمة السر" };

/**
 * No SMS in Pointili: a forgotten password is a WhatsApp to us, and the
 * founder gives a new one — on the help number set in the console (the same
 * one the owners call). The message carries the account's number (typed on
 * the sign-in page, or here), so the founder never has to ask whose it is.
 */
export default async function Forgot({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const [{ phone }, s] = await Promise.all([searchParams, getSettings()]);
  const number = s.supportPhone;
  return (
    <Screen>
      <Top back="/login" />
      <Middle className="items-center text-center">
        <Icon3D name="phone" size={88} className="animate-float" />
        <Heading title={t.forgot} className="mt-[2.5dvh]" />
        <p className="mt-2 max-w-xs text-[1.0625rem] leading-relaxed text-body">{number ? t.forgotBody : t.forgotNoContact}</p>
        {number && <ForgotForm support={number} phone={digits(phone ?? "")} />}
      </Middle>
    </Screen>
  );
}
