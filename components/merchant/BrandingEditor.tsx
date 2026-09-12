"use client";

import { Card } from "@/components/ui/Card";
import { useT } from "@/components/i18n/Provider";
import { ImageUploader } from "./ImageUploader";

export function BrandingEditor({ logo, cover, icon, color, disabled, bare = false }: { logo: string | null; cover: string | null; icon?: string | null; color?: string | null; disabled?: boolean; bare?: boolean }) {
  const { t } = useT();
  const body = (
    <div className="space-y-5">
      <ImageUploader kind="cover" url={cover} icon={icon} color={color} disabled={disabled} />
      <ImageUploader kind="logo" url={logo} icon={icon} color={color} disabled={disabled} />
    </div>
  );
  if (bare) return body;
  return (
    <Card className="p-5">
      <p className="mb-4 font-semibold text-ink">{t.merchant.branding.title}</p>
      {body}
    </Card>
  );
}
