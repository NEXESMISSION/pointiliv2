export type FormState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  message?: string;
  /** changes on every submission so identical results still re-trigger effects */
  at?: number;
  step?: "phone" | "code" | "password";
  devCode?: string;
  data?: unknown;
} | null;
