// アプリ本体はネットワーク優先（更新がすぐ届くように）、通信できないときだけキャッシュを使う。
// スケジュールAPIはページ側でlocalStorageに控えているので、ここでは扱わない。
const CACHE = 'stage-memo-v10';
// 同梱のマップ（maps/）は中身が変わらないので、版を上げても消さない別のキャッシュに入れ、キャッシュ優先で出す。
// マップを取り込み直したら MAP_CACHE の名前を変える（古い分は activate で消える）
const MAP_CACHE = 'stage-memo-maps-v1';
const SHELL = ['./', './index.html', './contest-data.js', './tier-data.js', './tier.js', './board.js', './note.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './img/tamahiroi.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MAP_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/maps/')){
    e.respondWith(caches.open(MAP_CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // キャッシュへの書き込みは応答を待たせずに続け、終わるまで Service Worker を止めない（失敗しても表示はする）
      if (res.ok) e.waitUntil(c.put(e.request, res.clone()).catch(() => {}));
      return res;
    }))));
    return;
  }
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
