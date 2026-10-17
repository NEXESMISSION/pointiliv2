import type { LucideIcon } from "lucide-react";

/*
 * The owner's screens, one look (the founder, 17 Oct 2026: «a consistent
 * design and colours for the owner pages»). The rules, everywhere under /shop:
 *  - the ground: the Morph lavender (app/shop/layout.tsx draws it once);
 *  - purple (brand) is what can be done: buttons, what is chosen, the icons;
 *  - coral is a gift (and an error), green is done (and WhatsApp), nothing else;
 *  - the shop's own colour only on its logo and its card, never on the app around them;
 *  - white cards, one radius and one shadow; the icons are line icons on a soft purple square;
 *  - a title is 1.625rem; the help is a quiet round «؟», never a pill with words.
 */

/** An icon on an owner screen: the line icon in purple, on its soft square. */
export function Mark({ icon: Icon, size = 36 }: { icon: LucideIcon; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[0.75rem] bg-brand-soft text-brand" style={{ width: size, height: size }} aria-hidden>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} />
    </span>
  );
}

/** On or off: one switch for every owner screen, purple when on. */
export function Switch({ on, onClick, label, disabled = false }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${on ? "bg-brand" : "bg-line"}`}
    >
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[inset-inline-start] duration-300 ${on ? "start-1" : "start-[1.375rem]"}`} />
    </button>
  );
}
