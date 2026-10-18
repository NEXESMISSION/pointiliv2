/**
 * Arriving is never a blank screen: the shape of the home, in grey, while the
 * cards come. With the links prefetched this is rarely seen — which is the
 * point, since the one thing worse than waiting is not knowing you are.
 */
export default function Loading() {
  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md animate-pulse flex-col px-[clamp(1rem,5vw,1.5rem)]" aria-hidden>
      <div className="flex shrink-0 items-center justify-between pt-2">
        <span className="size-11 rounded-full bg-surface" />
        <span className="h-4 w-20 rounded-full bg-surface" />
      </div>
      <div className="mt-[2dvh] min-h-0 flex-1 space-y-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[4.5rem] rounded-[1.5rem] bg-surface" />
        ))}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 pb-[2dvh] pt-[1.5dvh]">
        <span className="h-[3.5rem] rounded-[1.25rem] bg-surface" />
        <span className="h-[3.5rem] rounded-[1.25rem] bg-surface" />
      </div>
    </main>
  );
}
