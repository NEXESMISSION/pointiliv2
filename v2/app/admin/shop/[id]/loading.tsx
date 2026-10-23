/** A shop's page while it is read: its parts in the places they will take on a computer. */
export default function StudyLoading() {
  const box = "rounded-[1.125rem] bg-surface ring-1 ring-line/70";
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-5 w-20 rounded bg-line" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className={`${box} h-56 lg:col-span-8`} />
        <div className={`${box} h-[29rem] lg:col-span-4 lg:row-span-2`} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-8">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${box} h-24`} />
          ))}
        </div>
        <div className={`${box} h-72 lg:col-span-8`} />
        <div className={`${box} h-72 lg:col-span-4`} />
      </div>
    </div>
  );
}
