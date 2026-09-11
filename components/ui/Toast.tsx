"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Toast = { id: number; text: string; tone: "success" | "error" };
const Ctx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-sm animate-rise items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-lift">
            {t.tone === "success" ? <CircleCheck className="size-5 text-success-500" /> : <CircleAlert className="size-5 text-danger-500" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

/** Shows a toast once when a server action result carries a message. */
export function ToastOnResult({ result }: { result: { ok?: boolean; message?: string; at?: number } | null | undefined }) {
  const toast = useToast();
  useEffect(() => {
    if (result?.message) toast(result.message, result.ok === false ? "error" : "success");
    // `at` changes on every submission, so identical messages still show
  }, [result?.at, result?.message, result?.ok, toast]);
  return null;
}
