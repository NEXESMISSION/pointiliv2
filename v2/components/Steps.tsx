/**
 * Three steps for an owner — account, shop, card — as three bars.
 *
 * `sub` (0 to 1): how far through the step they are now. The card is four
 * questions of its own (components/CardFirst.tsx), and without this its bar
 * stood still through all four, which read as a screen that was not moving.
 */
export function Steps({ at, sub }: { at: 1 | 2 | 3; sub?: number }) {
  return (
    <div className="mt-4 flex gap-1.5" aria-label={`${at}/3`}>
      {[1, 2, 3].map((i) => {
        const part = i === at && sub != null && sub < 1;
        return (
          <span key={i} className={`relative h-1.5 flex-1 overflow-hidden rounded-full transition-colors ${i <= at && !part ? "bg-brand" : "bg-line"}`}>
            {part && <span className="absolute inset-y-0 start-0 rounded-full bg-brand transition-[width] duration-300" style={{ width: `${Math.round(Math.max(sub, 0) * 100)}%` }} />}
          </span>
        );
      })}
    </div>
  );
}
