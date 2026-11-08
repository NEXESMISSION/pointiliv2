/**
 * A real QR code, as SVG, made at once (the app's own `qrcode` package, from v2): a scan of the
 * film lands on the site. Synchronous on purpose — the films put it straight into their HTML
 * (qrcode's toString answers with a promise, which a template only prints as «[object Promise]»).
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "..", "..", "..", "v2", "package.json"));
const QRCode = require("qrcode");

export function qrSvg(text = "https://www.pointili.online", dark = "#0f0e17") {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path fill="${dark}" d="${d}"/></svg>`;
}
