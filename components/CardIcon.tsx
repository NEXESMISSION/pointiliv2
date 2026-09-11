import {
  CakeSlice,
  Coffee,
  Croissant,
  Hamburger,
  Heart,
  IceCreamCone,
  Pizza,
  Scissors,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cardColor } from "@/lib/constants";

export const ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  croissant: Croissant,
  cake: CakeSlice,
  pizza: Pizza,
  burger: Hamburger,
  utensils: UtensilsCrossed,
  "ice-cream": IceCreamCone,
  scissors: Scissors,
  sparkles: Sparkles,
  "shopping-bag": ShoppingBag,
  heart: Heart,
  star: Star,
};

export function CardIcon({ name, className = "size-5" }: { name: string | null | undefined; className?: string }) {
  const Icon = ICONS[name ?? ""] ?? Coffee;
  return <Icon className={className} aria-hidden />;
}

/** Business logo, or its card icon on the card colour when there is no logo. */
export function BusinessAvatar({ logo, icon, color, size = 48, rounded = "rounded-2xl" }: { logo?: string | null; icon?: string | null; color?: string | null; size?: number; rounded?: string }) {
  const c = cardColor(color);
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" className={`shrink-0 bg-white object-cover ${rounded}`} style={{ width: size, height: size }} />;
  }
  return (
    <span className={`grid shrink-0 place-items-center ${rounded}`} style={{ width: size, height: size, background: c.soft, color: c.accent }}>
      <CardIcon name={icon} className="size-[48%]" />
    </span>
  );
}
