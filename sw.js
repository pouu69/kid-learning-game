var CACHE_NAME = 'tamagoji-v1';
var urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/sprites.js',
    '/js/effects.js',
    '/js/renderer.js',
    '/js/minigames.js',
    '/js/game.js',
    '/manifest.json'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })
    );
});
