import { ImageResponse } from "next/og";
import { messagesFor } from "@/lib/i18n/messages";

/** The share card is one image for everyone, so it speaks French. */
const og = messagesFor("fr").marketing.og;

export const alt = og.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 70"><mask id="m"><rect width="96" height="70" fill="#fff"/><rect x="-2" y="14" width="86" height="58" rx="10" fill="#000"/></mask><rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill="#fff" fill-opacity="0.55" mask="url(#m)"/><rect x="1" y="17" width="80" height="52" rx="8" fill="#fff"/><path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill="#6535E0"/></svg>`;

/** The share preview for links on WhatsApp, Facebook, X, LinkedIn… */
export default function OpengraphImage() {
  const stamps = Array.from({ length: 10 }, (_, i) => i < 7);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #7A4DF0 0%, #4E27C4 100%)", color: "#fff", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`} width={84} height={61} alt="" />
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>Pointili</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{og.title}</span>
            <span style={{ fontSize: 28, marginTop: 22, opacity: 0.82 }}>{og.subtitle}</span>
          </div>
          <span style={{ fontSize: 26, opacity: 0.7 }}>{og.tagline}</span>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 380, background: "#fff", borderRadius: 36, padding: 32, color: "#111322", boxShadow: "0 30px 60px rgba(20,10,60,0.35)" }}>
            <span style={{ fontSize: 30, fontWeight: 800 }}>Café Bonheur</span>
            <span style={{ fontSize: 20, color: "#6E7385", marginTop: 4 }}>{og.cardStamps}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {stamps.map((on, i) => (
                <div key={i} style={{ width: 52, height: 52, borderRadius: 26, background: on ? "#6535E0" : "#F5F1FF", border: on ? "none" : "3px dashed #B9A1FC", display: "flex" }} />
              ))}
            </div>
            <div style={{ display: "flex", marginTop: 26, background: "#F5F1FF", borderRadius: 18, padding: "14px 18px", fontSize: 22, fontWeight: 700, color: "#5328C4" }}>{og.cardReward}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
