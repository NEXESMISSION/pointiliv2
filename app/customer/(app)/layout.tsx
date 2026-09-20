import type { Metadata } from "next";
import { CustomerNav } from "@/components/customer/CustomerNav";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CustomerAppLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/customer");
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <main className="app-main">
        <div className="app-center mx-auto w-full max-w-md px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] bottom-nav-space">{children}</div>
      </main>
      <CustomerNav />
    </div>
  );
}
