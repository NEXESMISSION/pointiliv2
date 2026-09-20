"use client";

import { Card } from "@/components/ui/Card";
import { useT } from "@/components/i18n/Provider";
import { ImageUploader } from "./ImageUploader";

export function BrandingEditor({ logo, cover, icon, color, disabled, bare = false }: { logo: string | null; cover: string | null; icon?: string | null; color?: string | null; disabled?: boolean; bare?: boolean }) {
  const { t } = useT();
  const body = (
    <div className="relative space-y-3.5">
      {/* a full-width cover is 16/7 of the whole screen, so it is capped and centred */}
      <div className="mx-auto w-full max-w-[15rem]">
        <ImageUploader kind="cover" url={cover} icon={icon} color={color} disabled={disabled} />
      </div>
      <ImageUploader kind="logo" url={logo} icon={icon} color={color} disabled={disabled} />
    </div>
  );
  if (bare) return body;
  return (
    <Card className="p-3.5">
      <p className="mb-3 text-center font-semibold text-ink">{t.merchant.branding.title}</p>
      {body}
    </Card>
  );
}
