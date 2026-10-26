// A printable Pointili kit to film for Google's video verification: an A5 counter stand (×2 on A4)
// and a sheet of 10 business cards, each with the QR to pointili.online. → ~/Desktop/Pointili Google profile/kit-*.pdf
import { chromium } from "playwright-core";
import QRCode from "qrcode";
import path from "node:path";
import os from "node:os";
const OUT = path.join(os.homedir(), "Desktop", "Pointili Google profile");
const qr = await QRCode.toString("https://www.pointili.online/?utm_source=print&utm_medium=kit", { type: "svg", margin: 0, color: { dark: "#17141F", light: "#0000" } });
const MARK = `<svg viewBox="0 0 96 70"><rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill="#A58BFF"/><rect x="1" y="17" width="80" height="52" rx="8" fill="#6C47FF"/><path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill="#fff"/></svg>`;
const css = `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&family=Inter:wght@700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box} body{font-family:Cairo,sans-serif;color:#17141F;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.brand{display:flex;align-items:center;gap:4mm;font:900 13mm Inter,sans-serif;letter-spacing:-.03em} .brand svg{width:17mm}
.qr svg{width:100%;height:100%;display:block}`;
const stand = `<div style="height:148.5mm;padding:12mm 14mm;display:grid;grid-template-columns:1fr 62mm;gap:10mm;align-items:center;border-bottom:.3mm dashed #bbb;background:linear-gradient(150deg,#fff 0%,#F2EDFF 100%)">
  <div><div class="brand">${MARK}Pointili</div>
  <div dir="rtl" style="margin-top:8mm;font:900 11mm/1.2 Cairo">كارط فيدليتي ديجيتال<br><span style="color:#6C47FF">للمحلات في تونس</span></div>
  <div style="margin-top:4mm;font:800 5mm Inter">Carte de fidélité digitale · sans application</div>
  <div style="margin-top:7mm;font:800 6mm Inter;color:#6C47FF">pointili.online · 58 415 520</div></div>
  <div><div class="qr" style="width:62mm;height:62mm;padding:4mm;background:#fff;border-radius:5mm;border:1mm solid #6C47FF">${qr}</div>
  <div dir="rtl" style="text-align:center;margin-top:3mm;font:900 6mm Cairo">سكاني وتعرّف علينا</div></div></div>`;
const card = `<div style="width:85mm;height:55mm;padding:5mm 6mm;display:grid;grid-template-columns:1fr 26mm;gap:4mm;align-items:center;border:.2mm dashed #ccc;background:#fff">
  <div><div class="brand" style="font-size:8mm;gap:2.5mm"><span style="width:9mm;flex:none;display:block;margin-right:1.5mm">${MARK}</span>Pointili</div>
  <div dir="rtl" style="margin-top:2.5mm;font:900 4.2mm/1.25 Cairo">كارط فيدليتي ديجيتال للمحلات</div>
  <div style="margin-top:2mm;font:800 3.2mm Inter;color:#6C47FF">pointili.online</div><div style="font:700 3mm Inter">58 415 520</div></div>
  <div class="qr" style="width:26mm;height:26mm">${qr}</div></div>`;
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const p = await b.newPage();
for (const [name, body] of [["kit-stand-A5x2", stand + stand], ["kit-cards-10", `<div style="padding:8mm 15mm;display:grid;grid-template-columns:85mm 85mm;gap:0;justify-content:center">${card.repeat(10)}</div>`]]) {
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(OUT, `${name}.pdf`), format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await p.screenshot({ path: path.join(OUT, `${name}-preview.png`), fullPage: true });
  console.log("✓", name);
}
await b.close();
