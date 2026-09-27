"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy } from "lucide-react";
import { createBusinessAccount } from "@/app/actions/admin";
import { useT } from "@/components/i18n/Provider";
import { Alert } from "@/components/ui/Alert";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/constants";

type Made = { phone: string; password: string };

/**
 * Opening a shop from the console, the way it actually happens: the founder is
 * standing at the counter, the owner is next to him, and there is no e-mail to
 * send anything to. So the password is generated here and shown ONCE, big
 * enough to read out loud and with a copy button — and the form stays on
 * screen afterwards, because the next door is usually the next shop.
 */
export function NewBusinessForm() {
  const { t } = useT();
  const w = t.admin.newBusiness;
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const [error, setError] = useState<string | null>(null);
  const categories = t.data.categories as Record<string, string>;

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
    setMade({ phone: String(fd.get("phone") ?? "").replace(/[^0-9]/g, ""), password: r.secret ?? "" });
    form.reset();
    router.refresh();
  }

  if (made) {
    return (
      <Card className="space-y-4 p-5 text-center">
        <p className="text-[15px] font-semibold text-ink">{w.doneTitle}</p>
        <p className="text-sm text-muted">{w.doneHint}</p>
        <dl className="space-y-2 rounded-2xl bg-canvas p-4 text-start">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted">{w.phone}</dt>
            <dd dir="ltr" className="font-mono text-[15px] font-semibold text-ink">{made.phone}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted">{w.password}</dt>
            <dd dir="ltr" className="font-mono text-[15px] font-semibold text-ink">{made.password}</dd>
          </div>
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
      <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
        {error && <Alert>{error}</Alert>}

        <Field label={w.name} htmlFor="name">
          <Input id="name" name="name" placeholder={w.namePlaceholder} required maxLength={60} />
        </Field>

        <Field label={w.category} htmlFor="category">
          <Select id="category" name="category" defaultValue="cafe">
            {Object.keys(CATEGORIES).map((c) => (
              <option key={c} value={c}>
                {categories[c] ?? c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={w.ownerName} htmlFor="owner_name">
          <Input id="owner_name" name="owner_name" placeholder={w.ownerPlaceholder} maxLength={80} autoComplete="off" />
        </Field>

        <Field label={w.phone} htmlFor="phone" hint={w.phoneHint}>
          <PhoneInput />
        </Field>

        <SubmitButton pending={pending} pendingText={w.creating}>
          {w.create}
        </SubmitButton>
      </form>
    </Card>
  );
}
