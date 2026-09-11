import { ScanFlow } from "@/components/scan/ScanFlow";
import { ScanError } from "@/components/scan/ScanScreens";
import { TOKEN_RE } from "@/lib/url";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collect your stamp", robots: { index: false, follow: false } };

export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:my-8 sm:min-h-0 sm:rounded-[2rem] sm:shadow-card">
      {TOKEN_RE.test(token) ? <ScanFlow token={token} /> : <ScanError code="invalid" />}
    </main>
  );
}
