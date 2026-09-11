import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="pt-safe pb-safe grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-rise text-center">
        <Logo size={28} />
        <div className="mt-8 rounded-3xl border border-line/80 bg-white p-7 shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Compass className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Page not found</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">This page doesn&apos;t exist or has moved. Let&apos;s get you back on track.</p>
          <div className="mt-6 grid gap-2.5">
            <LinkButton href="/app" block>
              Open Pointili
            </LinkButton>
            <LinkButton href="/" variant="outline" block>
              Go to homepage
            </LinkButton>
          </div>
        </div>
      </div>
    </main>
  );
}
