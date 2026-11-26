// アプリ本体はネットワーク優先（更新がすぐ届くように）、通信できないときだけキャッシュを使う。
// スケジュールAPIはページ側でlocalStorageに控えているので、ここでは扱わない。
const CACHE = 'stage-memo-v27';
// 同梱のマップ（maps/）は中身が変わらないので、版を上げても消さない別のキャッシュに入れ、キャッシュ優先で出す。
// マップを取り込み直したら MAP_CACHE の名前を変える（古い分は activate で消える）
const MAP_CACHE = 'stage-memo-maps-v1';
const SHELL = ['./', './index.html', './contest-data.js', './tier-data.js', './tier.js', './board.js', './note.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './img/tamahiroi.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^stage-memo-v\d+$/.test(k) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
  // 電波が悪くて返事が来ないまま待ち続けないよう、4秒たってもネットから届かず手元に控えがあれば控えを出す（ネットの分は届いたら控えを更新する。
  // 2026-11-23 Codexの評価: 失敗せず待ち続ける回線だと起動できなかった）
  // 本文まで届き切ってから「ネットの分」とする（見出しだけ届いて本文が止まる回線でも、4秒で控えに切り替わるように。Codexレビュー）
  const net = fetch(e.request, { cache: 'no-store' }).then(res => res.ok ? res.arrayBuffer().then(buf => {
    const full = new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers });
    e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, full.clone())).catch(() => {})); // 下の waitUntil(net) の間に呼ぶので有効
    return full;
  }) : res);
  const cached = () => caches.open(CACHE).then(cache => cache.match(e.request, { ignoreSearch: true }));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done && r){ done = true; resolve(r); } };
    const timer = setTimeout(() => cached().then(give), 4000);
    net.then(r => { clearTimeout(timer); give(r); }, () => { clearTimeout(timer); cached().then(r => give(r || Response.error())); });
  }));
  e.waitUntil(net.catch(() => {}));
});
