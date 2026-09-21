/**
 * Catches the photos ChatGPT generates in the browser and writes them to
 * photos/. A click on ChatGPT's own download button does nothing when the
 * browser is being driven, and its content-security policy forbids posting
 * to localhost — so ChatGPT's tab opens /catch (this origin) and hands it the
 * bytes with postMessage; /catch is the one that posts them to /save.
 *
 * When even the popup is blocked, /grab is the way through: the page NAVIGATES
 * itself here (navigation ignores connect-src) and this process downloads the
 * picture with Node, which no browser policy can reach.
 *
 *   node social/carousels/receive-photos.mjs [port]   → 127.0.0.1:4599
 *   GET  /catch                        the relay page
 *   POST /save?name=SC-51-1.png        (body = the image)
 *   GET  /grab?name=…&url=…&back=…     fetch that picture, then bounce back
 */
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(import.meta.dirname, "photos");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Private-Network": "true" };

const CATCH = `<!doctype html><meta charset="utf-8"><title>photo relay</title><body style="font:16px system-ui;padding:24px">waiting…<script>
addEventListener("message", async (e) => {
  const { name, bytes } = e.data || {};
  if (!name || !bytes) return;
  const r = await fetch("/save?name=" + encodeURIComponent(name), { method: "POST", body: bytes });
  document.body.append(document.createElement("br"), name + " → " + r.status);
  e.source && e.source.postMessage({ saved: name, status: r.status }, "*");
});
opener && opener.postMessage({ ready: true }, "*");
</script>`;

const PORT = Number(process.argv[2]) || 4599;

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/catch") return res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(CATCH);
  const name = path.basename(url.searchParams.get("name") || "");

  if (req.method === "GET" && url.pathname === "/grab") {
    const src = url.searchParams.get("url") || "";
    const back = url.searchParams.get("back") || "";
    let note;
    try {
      const r = await fetch(src);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = Buffer.from(await r.arrayBuffer());
      await writeFile(path.join(DIR, name), body);
      note = `${name} — ${Math.round(body.length / 1024)} KB`;
      console.log(`  ✓ ${note}`);
    } catch (e) {
      note = `${name} failed: ${e.message}`;
      console.log(`  ✗ ${note}`);
    }
    // straight back to where it came from, so the next picture can be asked for
    const html = `<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;padding:24px">${note}${back ? `<script>location.replace(${JSON.stringify(back)})</script>` : ""}`;
    return res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
  }

  if (req.method !== "POST" || url.pathname !== "/save" || !/^[\w.-]+\.(png|jpe?g|webp)$/i.test(name)) return res.writeHead(400, cors).end("bad request");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  await writeFile(path.join(DIR, name), body);
  console.log(`  ✓ ${name} — ${Math.round(body.length / 1024)} KB`);
  res.writeHead(200, cors).end("ok");
}).listen(PORT, "127.0.0.1", () => console.log(`waiting for photos on http://127.0.0.1:${PORT}`));
