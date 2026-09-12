import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.notFoundTitle, robots: { index: false } };
}

export default async function NotFound() {
  const { t, path } = await getI18n();
  return (
    <main className="pt-safe pb-safe grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-rise text-center">
        <Logo size={28} />
        <div className="mt-8 rounded-3xl border border-line/80 bg-white p-7 shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Compass className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{t.common.notFoundTitle}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.common.notFoundBody}</p>
          <div className="mt-6 grid gap-2.5">
            <LinkButton href="/app" block>
              {t.common.openPointili}
            </LinkButton>
            <LinkButton href={path("/")} variant="outline" block>
              {t.common.goHome}
            </LinkButton>
          </div>
        </div>
      </div>
    </main>
  );
}
