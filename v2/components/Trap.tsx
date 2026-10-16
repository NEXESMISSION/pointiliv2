/**
 * A field no person sees or reaches — out of sight, of the tab order, of
 * autofill and of screen readers — in the forms that make an account. A bot
 * that fills every field it finds fills it too, and the server turns it away
 * (lib/guard: trapped). Its name says nothing a browser would autofill.
 */
export function Trap({ value, onChange }: { value?: string; onChange?: (v: string) => void } = {}) {
  return (
    <input
      type="text"
      name="pl_site"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      data-lpignore="true"
      data-1p-ignore
      {...(onChange ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : {})}
      className="pointer-events-none fixed left-0 top-0 size-px opacity-0"
    />
  );
}
