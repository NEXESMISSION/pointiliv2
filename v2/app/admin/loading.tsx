/**
 * What the console shows while a page is read: the board's own shapes — the
 * title, the search, the filters and a few shops — in the places they will
 * take, so the page arrives where the eye already is.
 */
export default function ConsoleLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-8 w-32 rounded-[0.5rem] bg-line" />
      <div className="mt-3 h-11 rounded-[0.875rem] bg-surface ring-1 ring-line/80" />
      <div className="mt-3 flex gap-2">
        {[3.5, 3.5, 4, 6, 4.5].map((w, i) => (
          <div key={i} className="h-9 rounded-full bg-surface ring-1 ring-line" style={{ width: `${w}rem` }} />
        ))}
      </div>
      <div className="mt-3 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-[1.125rem] bg-surface p-3.5 ring-1 ring-line/70">
            <div className="flex gap-3">
              <div className="size-11 rounded-[0.875rem] bg-line" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-2/5 rounded bg-line" />
                <div className="h-3 w-3/5 rounded bg-line" />
              </div>
            </div>
            <div className="mt-3 h-3 w-1/2 rounded bg-line" />
            <div className="mt-3 h-10 rounded-[0.75rem] bg-canvas" />
            <div className="mt-2.5 grid grid-cols-[1fr_1fr_5rem] gap-2">
              <div className="h-10 rounded-[0.75rem] bg-canvas" />
              <div className="h-10 rounded-[0.75rem] bg-canvas" />
              <div className="h-10 rounded-[0.75rem] bg-canvas" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
