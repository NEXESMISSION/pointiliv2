"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, LinkButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";

export default function Error({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  const { t, fill } = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main data-error-screen="1" className="pt-safe pb-safe grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-rise text-center">
        <Logo size={28} />
        <div className="mt-8 rounded-3xl border border-line/80 bg-white p-7 shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-warning-50 text-warning-700">
            <TriangleAlert className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{t.common.errorTitle}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.common.errorBody}</p>
          <div className="mt-6 grid gap-2.5">
            <Button type="button" block icon={<RefreshCw className="size-5" aria-hidden />} onClick={() => (retry ?? reset)?.()}>
              {t.common.tryAgain}
            </Button>
            <LinkButton href="/app" variant="outline" block>
              {t.common.backToPointili}
            </LinkButton>
          </div>
          {error.digest && <p className="mt-4 text-xs text-faint">{fill(t.common.errorReference, { digest: error.digest })}</p>}
        </div>
      </div>
    </main>
  );
}
