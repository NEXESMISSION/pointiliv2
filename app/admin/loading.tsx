"use client";

import { useT } from "@/components/i18n/Provider";
import { LoadingState } from "@/components/ui/Spinner";

export default function AdminLoading() {
  const { t } = useT();
  return <LoadingState label={t.common.loading} />;
}
