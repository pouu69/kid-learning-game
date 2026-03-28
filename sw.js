var CACHE_NAME = 'tamagoji-v4';
var urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/curriculum.js',
    '/js/storage.js',
    '/js/pet.js',
    '/js/effects.js',
    '/js/world.js',
    '/js/renderer.js',
    '/js/sprites.js',
    '/js/learning.js',
    '/js/activities/meet.js',
    '/js/activities/play.js',
    '/js/activities/care.js',
    '/js/report.js',
    '/js/story/Constants.js',
    '/js/story/EventBus.js',
    '/js/story/Utils.js',
    '/js/story/TimeSystem.js',
    '/js/story/WeatherSystem.js',
    '/js/story/SeasonSystem.js',
    '/js/story/VisitorSystem.js',
    '/js/story/ExploreSystem.js',
    '/js/story/WorldRenderer.js',
    '/js/story/StoryEngine.js',
    '/js/game.js',
    '/manifest.json'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                    .map(function(n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })
    );
});
