/** Three steps for an owner — account, shop, card — as three bars. */
export function Steps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <div className="mt-4 flex gap-1.5" aria-label={`${at}/3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= at ? "bg-brand" : "bg-line"}`} />
      ))}
    </div>
  );
}
