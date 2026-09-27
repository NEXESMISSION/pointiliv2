import { redirect } from "next/navigation";
import { LoginForm } from "@/components/abonili/LoginForm";
import { getAb, getAbContext } from "@/lib/abonili/server";
import { whatsappNumber } from "@/lib/support";

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.login.title };
}

/**
 * Abonili's own way in. There is no sign-up: a club is opened by the founder,
 * at the desk, the day he installs it — the page says so instead of offering a
 * form that would lead nowhere.
 */
export default async function AboniliLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, ctx, { a }] = await Promise.all([searchParams, getAbContext(), getAb()]);
  if (ctx) redirect(next?.startsWith("/abonili") ? next : "/abonili");
  const support = whatsappNumber();

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="ab-wordmark !text-[30px]">Abonili</span>
          <p className="mt-4 text-[17px] font-semibold ab-dim">{a.tagline}</p>
        </div>

        <section className="ab-panel p-5">
          <h1 className="mb-5 text-[22px] font-extrabold">{a.login.title}</h1>
          <LoginForm next={next?.startsWith("/abonili") ? next : undefined} />
        </section>

        <p className="mt-6 text-center text-[13.5px] leading-relaxed ab-faint">{a.login.hint}</p>
        {support && (
          <p className="mt-2 text-center text-[13.5px]">
            <a href={`https://wa.me/${support}`} target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "var(--ab-lime)" }}>
              {a.login.help}
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
