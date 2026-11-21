/* Langkah service worker: cache untuk buka cepat/offline + klik notifikasi. */
var CACHE = 'langkah-shell-v2';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Jaringan dulu supaya versi baru langsung terlihat; cache hanya cadangan saat offline.
   Permintaan ke domain lain (GitHub API) tidak disentuh. */
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('./index.html'); }); }));
});
/* Klik notifikasi atau tombolnya (Selesai, Akhiri, +5 menit): aplikasi dibuka/ditampilkan,
   lalu aksinya dijalankan di sana karena data tersimpan di halaman, bukan di service worker. */
self.addEventListener('notificationclick', function (e) {
  var n = e.notification, act = e.action || 'open', id = (n.data && n.data.id) || '';
  n.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    if (list.length) {
      var c = list[0];
      if (id) c.postMessage({ type: 'langkah-act', action: act, id: id });
      return 'focus' in c ? c.focus() : undefined;
    }
    var url = './index.html' + (id ? '?aksi=' + encodeURIComponent(act) + '&id=' + encodeURIComponent(id) : '');
    return self.clients.openWindow(url);
  }));
});
