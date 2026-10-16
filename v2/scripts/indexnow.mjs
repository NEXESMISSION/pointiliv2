/**
 * Tells the search engines of IndexNow (Bing — and so ChatGPT's and
 * Copilot's search — Yandex, Seznam, Naver…) every public page of the site,
 * read from its own sitemap: a page added or changed is crawled within days
 * instead of waiting to be found. Bing had not one page of the site in
 * October 2026. The key is public by design: its file sits at the site's root.
 *
 *   node scripts/indexnow.mjs              (after a deploy; the live site's sitemap)
 *   SITE=https://www.pointili.online node scripts/indexnow.mjs
 */
const SITE = (process.env.SITE || "https://www.pointili.online").replace(/\/$/, "");
const KEY = "98217d0e7915ec5adfec45615c7142b4";

const key = await fetch(`${SITE}/${KEY}.txt`).then((r) => (r.ok ? r.text() : ""));
if (key.trim() !== KEY) throw new Error(`the key file is not live at ${SITE}/${KEY}.txt — deploy first`);
const xml = await fetch(`${SITE}/sitemap.xml`).then((r) => r.text());
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) throw new Error("no page in the sitemap");
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
// 200: taken; 202: taken, the key still being checked
console.log(`${urls.length} pages sent to IndexNow: ${res.status} ${res.statusText}${res.ok ? "" : ` — ${(await res.text()).slice(0, 200)}`}`);
if (!res.ok) process.exit(1);
