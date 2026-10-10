import { cookies } from "next/headers";
import { ScanFlow } from "@/components/ScanFlow";
import { Screen } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "تامبون", robots: { index: false, follow: false } };

/** A counter code opened by a phone's camera (or the in-app scanner). Shorter than 548px, the page scrolls as a whole: nothing is cut. */
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // this phone has signed in before: offer the way back in first, rather
  // than asking somebody to make the account they already have
  const known = (await cookies()).get("pl-known")?.value === "1";
  return (
    <Screen className="justify-center [@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <ScanFlow token={token} known={known} />
    </Screen>
  );
}
