import Link from "next/link";
import { Back } from "@/components/Back";
import { Collect } from "@/components/Collect";
import { Icon3D, Logo, Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "كود كارط Pointili", robots: { index: false } };

/**
 * A customer's own code, scanned with any camera: a shop owner signed in gets
 * straight to giving the tampon; anyone else learns what it is.
 */
export default async function CustomerCode({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, me] = await Promise.all([params, getMe()]);
  const valid = /^\d{6}$/.test(code);
  if (valid && me?.shop?.goal && me.code !== code) return <Collect by="code" preset={code} />;
  return (
    <Screen>
      <header className="flex shrink-0 items-center pt-2">
        <Back />
      </header>
      <Middle className="items-center text-center">
        <Logo />
        <Icon3D name="ticket" size={88} className="mt-[4dvh] animate-float" />
        <h1 className="mt-4 text-[1.625rem] font-bold">{t.publicCodeTitle}</h1>
        <p className="mt-1.5 max-w-xs text-[1rem] text-muted">{t.publicCodeBody}</p>
        <Link href="/" className="press mt-[4dvh] inline-flex h-12 items-center rounded-full bg-brand px-6 text-[1rem] font-bold text-white">
          Pointili
        </Link>
      </Middle>
    </Screen>
  );
}
