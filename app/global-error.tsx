"use client";

import { useEffect } from "react";

const BRAND = "#6535E0";

export default function GlobalError({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          boxSizing: "border-box",
          background: "#F6F7FB",
          color: "#0F1222",
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <title>Something went wrong · Pointili</title>
        <main
          style={{
            width: "100%",
            maxWidth: 380,
            background: "#fff",
            border: "1px solid #E8EAF2",
            borderRadius: 28,
            boxShadow: "0 1px 2px rgb(16 24 40 / 0.04), 0 16px 40px -12px rgb(16 24 40 / 0.18)",
            padding: "36px 24px 28px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>
            <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden>
              <path d="M24 3C14.6 3 7 10.4 7 19.6 7 31.6 21.2 43.3 22.6 44.5a2.2 2.2 0 0 0 2.8 0C26.8 43.3 41 31.6 41 19.6 41 10.4 33.4 3 24 3Z" fill={BRAND} />
              <circle cx="24" cy="19.5" r="9.5" fill="#fff" />
              <path d="M20.3 15.2h4.6a4.4 4.4 0 0 1 0 8.8h-2.2v3.2h-2.4v-12Zm2.4 2.2v4.4h2.1a2.2 2.2 0 0 0 0-4.4h-2.1Z" fill={BRAND} />
            </svg>
            Pointili
          </span>
          <h1 style={{ margin: "28px 0 8px", fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.02em" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 24px", color: "#6B7185", fontSize: 15, lineHeight: 1.55 }}>
            Pointili hit an unexpected problem. Your stamps and rewards are safe — please try again.
          </p>
          <button
            type="button"
            onClick={() => (retry ?? reset)?.()}
            style={{
              appearance: "none",
              border: 0,
              width: "100%",
              height: 52,
              borderRadius: 16,
              background: BRAND,
              color: "#fff",
              font: "inherit",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 10px 24px -8px rgb(101 53 224 / 0.55)",
            }}
          >
            Try again
          </button>
          {/* A full reload is the reliable way out when the root layout itself failed. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ display: "inline-block", marginTop: 16, color: BRAND, fontSize: 15, fontWeight: 600, textDecoration: "none", padding: "8px 12px" }}>
            Go to homepage
          </a>
          {error.digest && <p style={{ margin: "12px 0 0", color: "#9AA0B3", fontSize: 12 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
