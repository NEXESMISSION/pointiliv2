"use client";

import { ErrorScreen } from "@/components/ErrorScreen";
import { translator } from "@/lib/dict";
import { langFromCookie } from "@/lib/langClient";

/**
 * The app-wide boundary: anything without a closer one lands here, including
 * a throw in a layout that a segment error.tsx cannot reach. It speaks the
 * customer's language (read from the cookie — a boundary gets no server
 * props) and sends them to their wallet, never to a sales page.
 *
 * THE TRAP: a full reload, not reset(). reset() re-renders only the segment
 * below the boundary, so for a layout failure the button did nothing.
 */
export default function AppError() {
  const t = translator(langFromCookie());
  return (
    <ErrorScreen
      title={t("Ça n'a pas chargé")}
      message={t("Quelque chose n'a pas répondu. Réessaie dans un instant.")}
      note={t("Tes tampons sont en sécurité — rien n'est perdu.")}
      retryLabel={t("Réessayer")}
      reset={() => window.location.reload()}
      homeHref="/moi"
      homeLabel={t("Mes cartes")}
    />
  );
}
