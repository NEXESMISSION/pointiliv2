// Pointili's service worker. It keeps nothing of the app (every page is always
// the latest, no stale screen after a release): it only answers a page that
// cannot load without internet with a word in Tunisian and a way to try again.
const OFFLINE = `<!doctype html><html lang="ar-TN" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#F4F3F9"><title>Pointili</title>
<style>html,body{margin:0;height:100%;background:#F4F3F9;color:#0F0E17;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;box-sizing:border-box}
h1{font-size:22px;margin:0}p{margin:0;color:#6B6781;font-size:16px;line-height:1.6}button{margin-top:8px;height:52px;padding:0 28px;border:0;border-radius:18px;background:#6C47FF;color:#fff;font-size:17px;font-weight:700}</style></head>
<body><main><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#6C47FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path d="m2 2 20 20"/></svg>
<h1>ما فمّاش إنترنت</h1><p>Pointili تحب الإنترنت باش تخدم. ثبّت الكونيكسيون وعاود.</p><button onclick="location.reload()">عاود جرّب</button></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
