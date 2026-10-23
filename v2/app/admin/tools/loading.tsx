/** The tools page while it is read: its title and its closed parts, where they will be. */
export default function ToolsLoading() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-8 w-28 rounded-[0.5rem] bg-line" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-[1.125rem] bg-surface px-4 py-3.5 ring-1 ring-line/70">
          <div className="h-4 w-1/3 rounded bg-line" />
          <div className="mt-2 h-3 w-2/3 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}
