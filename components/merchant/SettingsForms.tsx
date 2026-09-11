"use client";

import { useActionState, useState } from "react";
import { ImageUp } from "lucide-react";
import { removeLogo, updateBusiness, uploadLogo } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { BusinessAvatar } from "@/components/CardIcon";
import { SubmitButton } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ToastOnResult } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/constants";
import type { SessionContext } from "@/lib/types";

export function BusinessForm({ business, disabled }: { business: NonNullable<SessionContext["business"]>; disabled?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(updateBusiness, null);
  return (
    <form action={action}>
      <ToastOnResult result={state} />
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <Field label="Business name" htmlFor="name">
          <Input id="name" name="name" defaultValue={business.name} required maxLength={60} />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue={business.category}>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Business phone" htmlFor="bphone">
          <Input id="bphone" name="phone" type="tel" defaultValue={business.phone ?? ""} placeholder="+216 71 000 000" maxLength={30} />
        </Field>
        <Field label="Address" htmlFor="address">
          <Input id="address" name="address" defaultValue={business.address ?? ""} placeholder="Avenue Habib Bourguiba, Tunis" maxLength={160} autoComplete="street-address" />
        </Field>
        {!disabled && <SubmitButton pendingText="Saving…">Save business details</SubmitButton>}
      </fieldset>
    </form>
  );
}

export function LogoForm({ logo, icon, color, disabled }: { logo: string | null; icon?: string; color?: string; disabled?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(uploadLogo, null);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      <ToastOnResult result={state} />
      <BusinessAvatar logo={preview ?? logo} icon={icon} color={color} size={72} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Logo</p>
        <p className="text-sm text-muted">PNG, JPG or WebP · under 1 MB · square works best</p>
        {!disabled && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-body hover:bg-canvas">
              <ImageUp className="size-4" /> Choose image
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
            {preview && (
              <SubmitButton block={false} size="sm" pendingText="Uploading…">
                Upload
              </SubmitButton>
            )}
            {logo && !preview && (
              <button type="button" onClick={() => removeLogo()} className="h-10 px-2 text-sm font-semibold text-danger-600">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
