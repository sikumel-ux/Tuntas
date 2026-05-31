const CACHE_NAME = "tuntas";
const ASSETS_TO_CACHE = [
  "index.html",
  "style.css",
  "script.js",
  "manifest.json",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
];

// Tahap Install: Membuat Cache dan Menyimpan Aset Utama
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("PWA: Mendaftarkan Aset ke Cache");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Tahap Aktivasi: Membersihkan Cache Versi Lama Jika Ada Perubahan
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("PWA: Membersihkan Cache Lama");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Tahap Fetch: Mengambil Aset dari Cache Jika Offline
self.addEventListener("fetch", (event) => {
  // Jangan cache request data realtime dari Google Apps Script
  if (event.request.url.includes("script.google.com")) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
