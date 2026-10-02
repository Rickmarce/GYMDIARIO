// Cambia VERSION en cada publicación para que los móviles descarguen la versión nueva.
const VERSION = 'v2';
const SHELL = `shell-${VERSION}`;
const IMAGES = 'imagenes-v1';
const FILES = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'data/exercises.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Solo borra cachés antiguas de esta app: el origen rickmarce.github.io lo comparten otras apps (p. ej. partes-lav)
  const propia = k => k.startsWith('shell-') || k.startsWith('imagenes-');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => propia(k) && k !== SHELL && k !== IMAGES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fotos de ejercicios: se guardan la primera vez que se ven para poder usarlas sin conexión
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(IMAGES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Archivos de la app: primero la caché (funciona sin conexión)
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
  }
});
