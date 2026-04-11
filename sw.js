var CACHE_NAME = 'tamagoji-v6';
var PRECACHE = [
    '/',
    '/index.html',
    '/numbers.html',
    '/app.min.js',
    '/css/styles.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return Promise.all(PRECACHE.map(function(url) {
                return cache.add(url).catch(function() {});
            }));
        }).then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                    .map(function(n) { return caches.delete(n); })
            );
        }).then(function() { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function(e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    e.respondWith(
        fetch(req).then(function(res) {
            if (res && res.status === 200) {
                var copy = res.clone();
                caches.open(CACHE_NAME).then(function(cache) { cache.put(req, copy); });
            }
            return res;
        }).catch(function() {
            return caches.match(req).then(function(cached) {
                if (cached) return cached;
                if (req.mode === 'navigate') return caches.match('/index.html');
                return Response.error();
            });
        })
    );
});
