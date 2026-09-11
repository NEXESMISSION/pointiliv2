import { redirect } from "next/navigation";
import { getContext, homeFor } from "@/lib/session";

/** PWA start URL: send each person straight to their own home. */
export default async function AppSwitchboard() {
  const ctx = await getContext();
  redirect(ctx ? homeFor(ctx) : "/customer/login");
}
