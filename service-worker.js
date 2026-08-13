// Service worker del Recetario de café.
// Estrategia: precache del app shell + cache-first con relleno dinámico
// (así después de la primera carga funciona offline, incluidas las fuentes).

const CACHE = "cafe-lab-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Guardamos una copia de lo que se vaya pidiendo (fuentes, etc.)
        // siempre que la respuesta sea válida o de tipo opaque (cross-origin).
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // Sin red y sin cache: si pedían una página, devolvemos la app.
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
