import { ShieldCheck, Smartphone, Wallet, Zap, type LucideIcon } from "lucide-react";

const BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Zap, title: "No app to install", text: "Works right in the phone's browser." },
  { icon: Wallet, title: "No paper cards to lose", text: "Every stamp is saved to the customer's account." },
  { icon: ShieldCheck, title: "Fraud-proof rotating QR", text: "The code keeps changing, so screenshots don't work." },
  { icon: Smartphone, title: "Works on any phone", text: "iPhone or Android, old or new." },
];

export function Benefits() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {BENEFITS.map((b) => {
        const Icon = b.icon;
        return (
          <li key={b.title} className="rounded-3xl border border-line/80 bg-white p-4 shadow-card sm:p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold leading-snug text-ink sm:text-base">{b.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{b.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
