"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, LinkButton } from "@/components/ui/Button";

export default function Error({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="pt-safe pb-safe grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-rise text-center">
        <Logo size={28} />
        <div className="mt-8 rounded-3xl border border-line/80 bg-white p-7 shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-warning-50 text-warning-700">
            <TriangleAlert className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Something went wrong</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">That didn&apos;t load as expected. Your stamps and rewards are safe — please try again.</p>
          <div className="mt-6 grid gap-2.5">
            <Button type="button" block icon={<RefreshCw className="size-5" aria-hidden />} onClick={() => (retry ?? reset)?.()}>
              Try again
            </Button>
            <LinkButton href="/app" variant="outline" block>
              Back to Pointili
            </LinkButton>
          </div>
          {error.digest && <p className="mt-4 text-xs text-faint">Reference: {error.digest}</p>}
        </div>
      </div>
    </main>
  );
}
