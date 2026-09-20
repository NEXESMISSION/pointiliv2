import type { Metadata } from "next";
import { BackButton } from "@/components/nav/BackButton";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { ScanError } from "@/components/scan/ScanScreens";
import { getI18n } from "@/lib/i18n/server";
import { TOKEN_RE } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.scan.titles.stamp, robots: { index: false, follow: false } };
}

export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:my-8 sm:min-h-0 sm:rounded-[2rem] sm:shadow-card">
      <div className="absolute start-4 top-[calc(1rem+env(safe-area-inset-top))] z-10">
        <BackButton fallback="/customer" />
      </div>
      {TOKEN_RE.test(token) ? <ScanFlow token={token} /> : <ScanError code="invalid" />}
    </main>
  );
}
