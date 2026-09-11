"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button block onClick={() => window.print()} icon={<Printer className="size-5" />}>
      Print
    </Button>
  );
}
