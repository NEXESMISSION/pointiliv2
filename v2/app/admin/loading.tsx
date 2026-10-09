/**
 * What the console shows while the next page is being fetched.
 *
 * Every page here reads the database before it can render a single row, which
 * is a few hundred milliseconds on a good connection. Without this file the
 * App Router holds the page you are leaving on the screen for all of it, with
 * nothing moving and nothing said — so the console reads as broken rather
 * than busy, and the slowest page feels the worst.
 *
 * The rail is in the layout and stays put, so only the column of work is
 * drawn here: a title, a row of numbers and a table, in the shapes they will
 * actually take. The point is that the page arrives in the place the eye is
 * already looking.
 */
export default function ConsoleLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-7 w-44 rounded-[0.5rem] bg-line" />

      <div className="mt-5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-[1rem] border border-line bg-surface px-4 py-3.5">
            <div className="h-3 w-14 rounded bg-line" />
            <div className="mt-2.5 h-6 w-16 rounded bg-line" />
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-[1rem] border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <div className="h-4 w-28 rounded bg-line" />
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <div className="h-4 flex-1 rounded bg-line" />
            <div className="h-4 w-24 rounded bg-line max-sm:hidden" />
            <div className="h-4 w-16 rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
