/** A real QR code, as SVG (the app's own `qrcode` package, from v2): a scan of the film lands on the site. */
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "..", "..", "..", "v2", "package.json"));
const QRCode = require("qrcode");

export const qrSvg = (text = "https://www.pointili.online", dark = "#0f0e17") =>
  QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark, light: "#0000" } });
