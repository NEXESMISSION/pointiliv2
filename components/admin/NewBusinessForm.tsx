"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Dices } from "lucide-react";
import { createBusinessAccount } from "@/app/actions/admin";
import { useT } from "@/components/i18n/Provider";
import { Alert } from "@/components/ui/Alert";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, inputClass } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIES, PLANS } from "@/lib/constants";
import { formatTND } from "@/lib/format";

type Made = { phone: string; password: string; plan: string };
type Plan = "trial" | "six_month" | "yearly";

/** Easy to read out loud and to type on a phone: four letters, four digits. */
function friendlyPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let s = "";
  for (let i = 0; i < 4; i++) s += letters[bytes[i]! % letters.length];
  for (let i = 4; i < 8; i++) s += String(bytes[i]! % 10);
  return s;
}

/**
 * Opening a shop from the console, the way it actually happens: the founder is
 * standing at the counter with the owner. He types the name, the phone and the
 * password they agree on (or draws one), picks the plan, and that is the whole
 * account — the owner signs in with it and is only asked what is his to say.
 * The form stays on screen afterwards: the next door is usually the next shop.
 */
export function NewBusinessForm() {
  const { t, locale } = useT();
  const w = t.admin.newBusiness;
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<Plan>("trial");
  const categories = t.data.categories as Record<string, string>;
  const plans = t.data.plans as Record<string, string>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setError(null);
    const r = await createBusinessAccount(fd);
    setPending(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    toast(r.message, "success");
    setMade({ phone: String(fd.get("phone") ?? "").replace(/[^0-9]/g, ""), password: r.secret ?? "", plan: plans[plan] ?? plan });
    form.reset();
    setPassword("");
    setPlan("trial");
    router.refresh();
  }

  if (made) {
    return (
      <Card className="space-y-4 p-5 text-center">
        <p className="text-[15px] font-semibold text-ink">{w.doneTitle}</p>
        <p className="text-sm text-muted">{w.doneHint}</p>
        <dl className="space-y-2 rounded-2xl bg-canvas p-4 text-start">
          {[
            [w.phone, made.phone, true],
            [w.password, made.password, true],
            [w.plan, made.plan, false],
          ].map(([label, value, mono]) => (
            <div key={String(label)} className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd dir={mono ? "ltr" : undefined} className={`text-[15px] font-semibold text-ink ${mono ? "font-mono" : ""}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2">
          <Button
            variant="outline"
            block
            icon={<Copy className="size-4" />}
            onClick={() => {
              void navigator.clipboard.writeText(`${made.phone}\n${made.password}`).then(() => toast(w.copied, "success"));
            }}
          >
            {w.copy}
          </Button>
          <Button block onClick={() => setMade(null)}>
            {w.another}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {error && <Alert>{error}</Alert>}

        <Field label={w.name} htmlFor="name">
          <Input id="name" name="name" placeholder={w.namePlaceholder} required maxLength={60} />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label={w.category} htmlFor="category">
            <Select id="category" name="category" defaultValue="cafe">
              {Object.keys(CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {categories[c] ?? c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={w.plan} htmlFor="plan">
            <Select id="plan" name="plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
              <option value="trial">{w.planTrial}</option>
              {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => (
                <option key={id} value={id}>
                  {`${plans[id] ?? id} · ${formatTND(PLANS[id].price, locale)}`}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={w.ownerName} htmlFor="owner_name">
          <Input id="owner_name" name="owner_name" placeholder={w.ownerPlaceholder} maxLength={80} autoComplete="off" />
        </Field>

        <Field label={w.phone} htmlFor="phone" hint={w.phoneHint}>
          <PhoneInput />
        </Field>

        <Field label={w.password} htmlFor="password" hint={w.passwordHint}>
          <div className="relative" dir="ltr">
            <input
              id="password"
              name="password"
              type="text"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
              spellCheck={false}
              placeholder="••••••••"
              className={`${inputClass} pe-12 font-mono`}
            />
            <button
              type="button"
              onClick={() => setPassword(friendlyPassword())}
              aria-label={w.generate}
              title={w.generate}
              className="absolute end-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink"
            >
              <Dices className="size-5" />
            </button>
          </div>
        </Field>

        <SubmitButton pending={pending} pendingText={w.creating}>
          {w.create}
        </SubmitButton>
      </form>
    </Card>
  );
}
