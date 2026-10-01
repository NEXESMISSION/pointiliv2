import { cookies } from "next/headers";
import type { ThemeChoice } from "@/components/ThemeSwitch";

/** The account's «الشكل»: light, dark, or like the phone (no cookie). */
export async function themeChoice(): Promise<ThemeChoice> {
  const v = (await cookies()).get("pl_theme")?.value;
  return v === "light" || v === "dark" ? v : "system";
}
