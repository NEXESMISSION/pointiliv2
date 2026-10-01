import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { SwitchSystem } from "@/components/merchant/SwitchSystem";
import { requireMerchant, rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.points.swEntry };
}

/** Stamps to points, or back: what customers hold is converted, nobody starts from zero (board 8, K4). */
export default async function SwitchPage() {
  const [ctx, { t }] = await Promise.all([requireMerchant("/loyalty/switch"), getI18n()]);
  if (!ctx.card || ctx.member_role !== "owner") redirect("/loyalty");
  const to = ctx.card.system === "points" ? "stamps" : "points";
  const pc = to === "stamps" ? await rpc<{ catalog: { name: string; points: number; ends_at: string | null }[] } | null>("points_card") : null;

  return (
    <div className="mx-auto max-w-xl">
      <TopBar back="/loyalty" title={to === "points" ? t.points.swTitleToPoints : t.points.swTitleToStamps} />
      <SwitchSystem
        to={to}
        version={ctx.card.version}
        goal={ctx.card.stamps_required}
        gift={ctx.card.reward?.name ?? ctx.card.name}
        levels={ctx.card.levels}
        catalog={(pc?.catalog ?? []).filter((g) => !g.ends_at).map((g) => ({ name: g.name, points: g.points }))}
      />
    </div>
  );
}
