"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { abAdminCreateClub, abAdminSetClub } from "@/app/actions/abonili-admin";
import { useT } from "@/components/i18n/Provider";
import { Alert } from "@/components/ui/Alert";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useToast } from "@/components/ui/Toast";
import { abI18n } from "@/lib/abonili/i18n";
import { dayYear } from "@/lib/abonili/format";
import { AB_KINDS } from "@/lib/abonili/types";

export type AdminClub = {
  id: string;
  name: string;
  kind: (typeof AB_KINDS)[number];
  status: "active" | "suspended";
  paid_until: string | null;
  created_at: string;
  owner: { id: string; name: string | null; phone: string | null };
  members: number;
  active: number;
  visits_week: number;
};

/** The console speaks Pointili's language setting, but Abonili's words. */
function useWords() {
  const { locale } = useT();
  return abI18n(locale);
}

export function NewClubForm({ loginUrl }: { loginUrl: string }) {
  const { a } = useWords();
  const w = a.admin;
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ phone: string; password?: string; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    const r = await abAdminCreateClub(new FormData(form));
    setPending(false);
    if (!r.ok) return setError(r.message);
    toast(r.message, "success");
    setMade({ phone: r.phone ?? "", password: r.secret, message: r.message });
    form.reset();
    router.refresh();
  }

  if (made) {
    return (
      <Card className="space-y-4 p-5 text-center">
        <p className="text-[15px] font-semibold text-ink">{made.message}</p>
        <dl className="space-y-2 rounded-2xl bg-canvas p-4 text-start">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted">{w.ownerPhone}</dt>
            <dd dir="ltr" className="font-mono text-[15px] font-semibold text-ink">{made.phone}</dd>
          </div>
          {made.password && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted">{w.passwordOnce}</dt>
              <dd dir="ltr" className="font-mono text-[15px] font-semibold text-ink">{made.password}</dd>
            </div>
          )}
          <p dir="ltr" className="pt-1 text-xs text-muted">{loginUrl}</p>
        </dl>
        <div className="flex gap-2">
          <Button variant="outline" block icon={<Copy className="size-4" />}
            onClick={() => void navigator.clipboard.writeText(`${loginUrl}\n${made.phone}${made.password ? `\n${made.password}` : ""}`).then(() => toast(w.copied, "success"))}>
            {w.copy}
          </Button>
          <Button block onClick={() => setMade(null)}>{w.another}</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label={w.clubName} htmlFor="ab-name">
          <Input id="ab-name" name="name" required maxLength={60} />
        </Field>
        <Field label={w.kind} htmlFor="ab-kind">
          <Select id="ab-kind" name="kind" defaultValue="gym">
            {AB_KINDS.map((k) => <option key={k} value={k}>{a.kinds[k]}</option>)}
          </Select>
        </Field>
        <Field label={w.ownerName} htmlFor="ab-owner">
          <Input id="ab-owner" name="owner_name" maxLength={80} autoComplete="off" />
        </Field>
        <Field label={w.ownerPhone} htmlFor="phone" hint={w.ownerPhoneHint}>
          <PhoneInput />
        </Field>
        <SubmitButton pending={pending} pendingText={w.creating}>{w.create}</SubmitButton>
      </form>
    </Card>
  );
}

function addMonths(from: string, n: number): string {
  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  const x = new Date(Date.UTC(y, m - 1 + n, d));
  return x.toISOString().slice(0, 10);
}

export function ClubRow({ c, today }: { c: AdminClub; today: string }) {
  const { a, fill, intl } = useWords();
  const w = a.admin;
  const toast = useToast();
  const [busy, start] = useTransition();
  const base = c.paid_until && c.paid_until > today ? c.paid_until : today;
  const past = c.paid_until !== null && c.paid_until < today;

  const set = (status: "active" | "suspended", paid: string | null) =>
    start(async () => {
      const r = await abAdminSetClub(c.id, status, paid);
      toast(r.message, r.ok ? "success" : "error");
    });

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ink">{c.name}</p>
          <p className="text-[13px] text-muted">
            {a.kinds[c.kind]} · {c.owner.name ?? "—"} · <span dir="ltr">{c.owner.phone?.replace(/^\+216/, "") ?? "—"}</span>
          </p>
        </div>
        {c.status === "suspended" && <span className="rounded-full bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-600">{w.suspended}</span>}
      </div>
      <p className="text-[13px] text-body">{fill(w.stats, { members: c.members, active: c.active, visits: c.visits_week })}</p>
      <p className={`text-[13px] font-medium ${past ? "text-danger-600" : "text-muted"}`}>
        {c.paid_until ? fill(w.paidUntil, { date: dayYear(c.paid_until, intl) }) : w.unpaid}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => set(c.status, addMonths(base, 1))}>{w.plusMonth}</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => set(c.status, addMonths(base, 12))}>{w.plusYear}</Button>
        {c.status === "active" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => set("suspended", c.paid_until)}>{w.suspend}</Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => set("active", c.paid_until)}>{w.activate}</Button>
        )}
      </div>
    </Card>
  );
}
