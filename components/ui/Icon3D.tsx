import Image from "next/image";

/** The Fluent 3D emoji in public/3d (MIT, licence alongside). */
export type Icon3DName =
  | "barber" | "bell" | "bread" | "burger" | "cake" | "chart" | "coffee" | "coin" | "croissant" | "crown"
  | "fire" | "gem" | "gift" | "hourglass" | "juice" | "moneybag" | "party" | "people" | "phone" | "pin"
  | "pizza" | "scissors" | "shop" | "sparkles" | "star" | "ticket" | "trophy" | "wave";

export function Icon3D({ name, size = 32, className = "" }: { name: Icon3DName; size?: number; className?: string }) {
  return <Image src={`/3d/${name}.png`} alt="" width={size} height={size} className={`e3d ${className}`} />;
}
