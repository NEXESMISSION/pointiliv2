import QRCode from "qrcode";
import { Verdict } from "@/components/abonili/Verdict";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAb } from "@/lib/abonili/server";
import { cardPath, dayTime } from "@/lib/abonili/format";
import type { AbCard, AbMember } from "@/lib/abonili/types";
import { siteUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{24}$/;

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.card.title, robots: { index: false, follow: false } };
}

/**
 * THE MEMBER'S CARD. A private link, sent by WhatsApp the day they sign up:
 * no app, no password. It shows the one thing they want to know — until when —
 * and carries the QR the desk scans at the door.
 *
 * Read on the server with the service key: the token IS the permission, and
 * nothing about members is ever reachable with the public anon key.
 */
export default async function MemberCard({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, { a, intl }] = await Promise.all([params, getAb()]);
  const card: AbCard = TOKEN.test(token)
    ? (((await createAdminClient().rpc("ab_card", { p_token: token })).data as AbCard | null) ?? { ok: false, error: "not_found" })
    : { ok: false, error: "not_found" };

  if (!card.ok) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm space-y-3">
          <span className="ab-wordmark">Abonili</span>
          <h1 className="text-[24px] font-extrabold">{a.card.notFound}</h1>
          <p className="text-[15px] ab-dim">{a.card.notFoundHint}</p>
        </div>
      </main>
    );
  }

  const url = `${siteUrl()}${cardPath(token)}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0c0e", light: "#ffffff" } });
  const member = { ...card.member, phone: null, note: null } as AbMember;

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-5 px-4 pt-[calc(20px+env(safe-area-inset-top))] pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="ab-trunc text-[18px] font-extrabold">{card.club.name}</p>
          <p className="text-[13px] ab-faint">{a.card.title}</p>
        </div>
        <span className="ab-wordmark !text-[14px]">Abonili</span>
      </header>

      <Verdict m={member} />

      <section className="ab-panel grid place-items-center gap-3 p-5">
        <div className="w-full max-w-[260px] overflow-hidden rounded-[22px] bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" aria-label={a.card.show}
          dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="text-[15px] font-bold">{a.card.show}</p>
        <p className="text-[13px] ab-faint">{a.card.number} <span className="ab-ltr font-bold">#{card.member.code}</span></p>
      </section>

      <section>
        <h2 className="ab-h2">{a.card.lastVisits}</h2>
        {card.visits.length === 0 ? (
          <p className="ab-panel p-4 text-[14px] ab-faint">{a.card.none}</p>
        ) : (
          <ul className="ab-panel ab-divide overflow-hidden">
            {card.visits.map((v) => (
              <li key={v} className="ab-ltr px-4 py-2.5 text-[14px] font-semibold ab-dim">{dayTime(v, intl)}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="pt-2 text-center text-[12px] ab-faint">{a.card.poweredBy}</p>
    </main>
  );
}
