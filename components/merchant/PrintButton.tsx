"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";

export function PrintButton() {
  const { t } = useT();
  return (
    <Button block onClick={() => window.print()} icon={<Printer className="size-5" />}>
      {t.merchant.counterQr.print}
    </Button>
  );
}
