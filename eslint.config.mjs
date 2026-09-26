import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  /* Nothing here is ours to lint: build output, the throwaway test runs, and
     third-party bundles. Left in, fabric.min.js alone raises 800+ complaints
     and buries a real error in app code. */
  globalIgnores([".next/**", ".next-*/**", "out/**", "build/**", "next-env.d.ts", ".e2e/**", "**/vendor/**", "**/*.min.js"]),
]);
