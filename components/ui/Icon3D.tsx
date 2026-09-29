import Image from "next/image";

/** The Fluent 3D emoji in public/3d (MIT, licence alongside). */
export type Icon3DName =
  | "barber" | "bell" | "bread" | "burger" | "cake" | "chart" | "coffee" | "coin" | "croissant" | "crown"
  | "fire" | "gem" | "gift" | "hourglass" | "juice" | "moneybag" | "party" | "people" | "phone" | "pin"
  | "pizza" | "scissors" | "shop" | "sparkles" | "star" | "ticket" | "trophy" | "wave";

export function Icon3D({ name, size = 32, className = "" }: { name: Icon3DName; size?: number; className?: string }) {
  return <Image src={`/3d/${name}.png`} alt="" width={size} height={size} className={`e3d ${className}`} />;
}

/** A shop's category, drawn in 3D (lib/constants CATEGORIES). */
export function category3D(category: string | null | undefined): Icon3DName {
  switch (category) {
    case "cafe":
      return "coffee";
    case "restaurant":
    case "fast_food":
      return "burger";
    case "pizzeria":
      return "pizza";
    case "bakery":
      return "croissant";
    case "ice_cream":
      return "juice";
    case "salon":
      return "scissors";
    case "beauty":
      return "gem";
    case "retail":
      return "shop";
    case "gym":
      return "fire";
    default:
      return "star";
  }
}
