import { BadgeCheck, ChartColumn, CreditCard, Gift, QrCode, ScanLine, Stamp, UserPlus, type LucideIcon } from "lucide-react";

export type Step = { icon: LucideIcon; title: string; text: string };

export const BUSINESS_STEPS: Step[] = [
  { icon: CreditCard, title: "Create your loyalty card", text: "Add your business name, pick a colour and an icon, and choose how many stamps a reward takes." },
  { icon: Gift, title: "Choose your reward", text: "A free coffee, a free haircut, a dessert on the house — whatever brings people back." },
  { icon: QrCode, title: "Display your Pointidi QR", text: "Open the QR screen on any phone or tablet at your counter. It refreshes on its own." },
  { icon: ScanLine, title: "Customers scan it", text: "They point their phone camera at the code. Nothing to download." },
  { icon: BadgeCheck, title: "Stamps are added automatically", text: "The stamp lands on their card instantly, and every visit shows up in your dashboard." },
];

export const CUSTOMER_STEPS: Step[] = [
  { icon: UserPlus, title: "Create your Pointidi account", text: "Sign up with your phone number and a password. It takes a minute." },
  { icon: ScanLine, title: "Scan the business QR", text: "After your visit, scan the Pointidi QR at the counter with your phone camera." },
  { icon: Stamp, title: "Receive your stamp", text: "Your stamp appears right away on that shop's card." },
  { icon: ChartColumn, title: "Track your progress", text: "All your cards live in one place, so you always know how close your next reward is." },
  { icon: Gift, title: "Redeem your reward", text: "Card full? Open your reward at the counter and enjoy your treat." },
];

const TONES = {
  brand: { tile: "bg-brand-50 text-brand-600", num: "bg-brand-600" },
  emerald: { tile: "bg-emerald-50 text-emerald-600", num: "bg-emerald-600" },
} as const;

/** Numbered steps with icons. `detailed` adds the explanation under each title. */
export function StepList({ steps, tone = "brand", detailed = false }: { steps: Step[]; tone?: keyof typeof TONES; detailed?: boolean }) {
  const t = TONES[tone];
  const Title = detailed ? "h3" : "p";
  return (
    <ol>
      {steps.map((step, i) => {
        const Icon = step.icon;
        const last = i === steps.length - 1;
        return (
          <li key={step.title} className={`relative flex gap-4 ${last ? "" : detailed ? "pb-8" : "pb-4"}`}>
            {!last && <span aria-hidden className="absolute bottom-1 left-[1.375rem] top-12 w-px bg-line" />}
            <span className={`relative grid size-11 shrink-0 place-items-center rounded-2xl ${t.tile}`}>
              <Icon className="size-5" aria-hidden />
              <span className={`tabular absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${t.num}`}>
                {i + 1}
              </span>
            </span>
            <div className={`min-w-0 ${detailed ? "pt-1" : "self-center"}`}>
              <Title className={`font-semibold text-ink ${detailed ? "text-[17px]" : "text-[15px]"}`}>{step.title}</Title>
              {detailed && <p className="mt-1 text-[15px] leading-relaxed text-muted">{step.text}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
