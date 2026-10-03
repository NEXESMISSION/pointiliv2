import { Icon3D } from "@/components/ui";
import { kindIcon } from "@/lib/t";

/**
 * A shop's face: its logo when the owner put one, else the picture of what
 * it sells. It fills the box it is put in — the box gives the size, the
 * rounding and the colour behind the picture of the kind.
 */
export function ShopMark({ shop, size }: { shop: { kind: string; logo?: string | null }; size: number }) {
  if (shop.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={shop.logo} alt="" decoding="async" className="size-full rounded-[inherit] bg-white object-contain p-[9%]" />;
  }
  return <Icon3D name={kindIcon(shop.kind)} size={size} />;
}
