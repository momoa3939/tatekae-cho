// たてかえ帳 Service Worker
// 方針：HTML本体は常に最新を優先（ネットワーク優先）
//       アイコン等の静的アセットはキャッシュ優先（速度優先）

const CACHE_NAME = 'tatekae-cho-cache-v1';
const STATIC_ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // 同一オリジンのみ扱う（外部フォント等はブラウザの通常動作に任せる）
  if (url.origin !== self.location.origin) {
    return;
  }

  const isStaticAsset = STATIC_ASSETS.some(function (asset) {
    return url.pathname.endsWith(asset.replace('./', '/'));
  });

  if (isStaticAsset) {
    // アイコン等：キャッシュ優先
    event.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, resClone);
          });
          return res;
        });
      })
    );
  } else {
    // HTML本体・データ：ネットワーク優先、失敗時のみキャッシュ
    event.respondWith(
      fetch(req)
        .then(function (res) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, resClone);
          });
          return res;
        })
        .catch(function () {
          return caches.match(req);
        })
    );
  }
});
