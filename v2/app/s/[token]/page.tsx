import { ScanFlow } from "@/components/ScanFlow";
import { Screen } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "تامبون", robots: { index: false, follow: false } };

/** A counter code opened by a phone's camera (or the in-app scanner). */
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Screen className="justify-center overflow-hidden">
      <ScanFlow token={token} />
    </Screen>
  );
}
