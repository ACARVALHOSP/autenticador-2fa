const CACHE_NAME = "autenticador2fa-v1";
const ASSETS = [
  ".",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/totp.js",
  "js/db.js",
  "js/qr.js",
  "js/jsQR.js",
  "manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
