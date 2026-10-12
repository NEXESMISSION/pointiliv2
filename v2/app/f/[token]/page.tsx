import { notFound } from "next/navigation";
import type { FormField } from "@/app/actions-forms";
import { FormFill } from "@/components/FormFill";
import { ShopMark } from "@/components/ShopMark";
import { LinkBtn, Logo, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call, service } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "تسجيل", robots: { index: false, follow: false } };

type Form = { ok: boolean; name: string; fields: FormField[]; shop: { name: string; kind: string; color: string; logo: string | null }; mine: Record<string, string> | null };

/**
 * A form of identification, opened by its QR (the founder hands them out for
 * a shop: a university, a partner). Not signed in: what it is, and the way to
 * an account, coming back here. Signed in: the form itself.
 */
export default async function FormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) notFound();
  const me = await getMe();
  const form = me ? await call<Form | null>("form_open", { p_token: token }) : ((await service().rpc("form_open", { p_token: token })).data as Form | null);
  if (!form?.ok) notFound();
  const next = encodeURIComponent(`/f/${token}`);

  return (
    <Screen>
      <header className="flex shrink-0 items-center gap-3 pt-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[0.9375rem]" style={{ background: form.shop.color }}>
          <ShopMark shop={form.shop} size={30} />
        </span>
        <span className="min-w-0">
          <bdi className="block truncate text-[0.9375rem] font-semibold text-muted">{form.shop.name}</bdi>
          <bdi className="block truncate text-[1.375rem] font-bold leading-tight">{form.name}</bdi>
        </span>
      </header>
      {me ? (
        <>
          <p className="mb-3 mt-2 shrink-0 text-[0.9375rem] text-muted">{form.mine ? "هاذي المعلومات اللي سجّلت، تنجم تبدّلها." : "عمّر المعلومات هاذم مرّة وحدة، والمحل يعرفك كل مرّة تجي."}</p>
          <FormFill token={token} shop={form.shop.name} name={form.name} fields={form.fields} mine={form.mine} />
        </>
      ) : (
        <div className="my-auto flex flex-col items-center text-center">
          <Logo />
          <p className="mt-5 max-w-xs text-balance text-[1.0625rem] leading-relaxed text-body">
            باش تتسجّل في <bdi className="font-bold">{form.name}</bdi> عند <bdi className="font-bold">{form.shop.name}</bdi>، اعمل كونت (ولا ادخل للكونت متاعك) وعمّر المعلومات.
          </p>
          <div className="mt-6 w-full space-y-2.5">
            <LinkBtn href={`/join?next=${next}`}>اعمل كونت</LinkBtn>
            <LinkBtn href={`/login?next=${next}`} kind="soft">
              عندي كونت
            </LinkBtn>
          </div>
        </div>
      )}
    </Screen>
  );
}
