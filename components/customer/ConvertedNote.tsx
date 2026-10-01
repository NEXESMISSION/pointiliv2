import { Icon3D } from "@/components/ui/Icon3D";
import { getI18n } from "@/lib/i18n/server";

export type Converted = { at: string; from: "stamps" | "points"; to: "stamps" | "points"; stamps: number | null; points: number | null } | null;

/** After a shop switched systems (board 8, K5): what this card became, said in one line — nothing was lost. */
export async function ConvertedNote({ converted, shop }: { converted: Converted | undefined; shop: string }) {
  if (!converted) return null;
  const { t, count, fill } = await getI18n();
  const text =
    converted.to === "points"
      ? fill(t.points.convertedToPoints, { shop, points: count(t.points.count, converted.points ?? 0) })
      : fill(t.points.convertedToStamps, { shop, stamps: count(t.common.stampsCount, converted.stamps ?? 0) });
  return (
    <div className="mb-3 flex animate-rise items-center gap-3 rounded-[20px] bg-surface p-3.5 shadow-card">
      <Icon3D name="sparkles" size={34} className="shrink-0" />
      <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-ink">{text}</p>
    </div>
  );
}
