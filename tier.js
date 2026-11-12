// ティアリスト（tiermaker.com を参考）。index.html のメインスクリプトの後に読み込む。
// 共有して使うもの: memos, save, load, esc, toast, render, ui, openEditor, nfkc（index.html のグローバル）
// 題材データ: window.TIER_DATA（tier-data.js、tools/build_tier_data.py で生成）
'use strict';
(function(){
const css = `
.tlist-new{display:block;width:100%;padding:14px;border-radius:14px;background:var(--salmon);color:#1a1020;font-weight:800;font-size:16px;margin-bottom:12px}
.tsetpick{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.tsetpick button{display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:var(--card);text-align:left;font-weight:700;font-size:16px;color:var(--text)}
.tsetpick button img{width:44px;height:44px;object-fit:contain;background:var(--card2);border-radius:10px;padding:3px}
.tfilter{width:100%;margin-bottom:10px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:9px 10px;font:inherit;font-size:15px}
.tl-item{background:var(--card);border-radius:14px;margin-bottom:10px;overflow:hidden}
.tl-open{display:block;width:100%;text-align:left;padding:10px 12px;color:var(--text)}
.tl-title{font-weight:800;font-size:16px}
.tl-meta{font-size:12px;color:var(--sub)}
.tl-prev{display:flex;gap:4px;margin-top:6px;align-items:center;min-height:34px}
.tl-prev .pl{width:22px;height:30px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#1a1020;flex:none}
.tl-prev img{width:30px;height:30px;object-fit:contain;background:var(--card2);border-radius:6px}
.tl-acts{display:flex;border-top:1px solid var(--line)}
.tl-acts button{flex:1;padding:10px 4px;font-size:13px;color:var(--sub)}
.tl-acts button.del{color:#ff8a8a}
#tier{position:fixed;inset:0;z-index:20;background:var(--bg);display:none;flex-direction:column}
#tier.open{display:flex}
#tier .ehead{gap:5px}
#tier .ehead .back{padding:8px 4px}
#tier .ehead button.hb{padding:6px 7px;border-radius:10px;background:var(--card);font-size:13px;font-weight:700;min-width:38px;min-height:40px;flex:none}
#tier .ehead button.hb:disabled{opacity:.35}
#tierTitle{flex:1;min-width:0;text-align:left;font-weight:800;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px 4px}
#tierBoard{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 8px 16px}
.trow{display:flex;margin-bottom:4px;min-height:80px;background:#1b1826;border-radius:10px;overflow:hidden}
.tlab{flex:none;width:58px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#1a1020;text-align:center;word-break:break-all;padding:4px;line-height:1.1}
.titems{flex:1;display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;padding:4px;min-height:80px}
.trow.over{outline:3px solid #fff;outline-offset:-3px}
.ti{width:60px;display:flex;flex-direction:column;align-items:center;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;cursor:grab;border-radius:8px;padding:2px 0}
.ti img{width:56px;height:56px;object-fit:contain;background:#0e0c15;border-radius:8px;pointer-events:none;-webkit-user-drag:none}
.ti span{font-size:9px;line-height:1.15;color:var(--sub);width:58px;text-align:center;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;height:2.3em}
.ti.lifting{opacity:.25}
.ti.pressing{transform:scale(.94);transition:transform .25s}
.ti.ins-before{box-shadow:-4px 0 0 0 #fff}
.ti.ins-after{box-shadow:4px 0 0 0 #fff}
#tierTray{flex:none;border-top:1px solid var(--line);background:#100e18;display:flex;flex-direction:column;max-height:calc(220px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom)}
#tierTray.big{max-height:58vh}
#tierTray.over{outline:3px solid #fff;outline-offset:-3px}
.trayh{display:flex;align-items:center;gap:8px;padding:8px 10px}
.trayh button{padding:8px 12px;border-radius:10px;background:var(--card);font-size:14px;font-weight:700;color:var(--text)}
.trayh .cnt{flex:1;font-size:13px;color:var(--sub);font-weight:700}
.traysearch{margin:0 10px 6px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:16px}
#trayItems{overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 8px;align-content:flex-start}
.tghost{position:fixed;left:0;top:0;z-index:50;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px}
.tghost img{width:76px;height:76px;object-fit:contain;background:#0e0c15;border:2px solid #fff;border-radius:12px;box-shadow:0 8px 24px #000a}
.tghost span{background:#000d;color:#fff;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;white-space:nowrap}
.tsheet-bg{position:fixed;inset:0;z-index:25;background:#0008;display:flex;align-items:flex-end}
.tsheet{width:100%;max-height:85vh;overflow-y:auto;background:var(--bg);border-radius:18px 18px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}
.tsheet h3{margin:0 0 10px;font-size:17px}
.tsi-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.tsi-head img{width:84px;height:84px;object-fit:contain;background:#0e0c15;border-radius:12px}
.tsi-head b{font-size:18px}
.tsi-tiers{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.tsi-tiers button{min-width:52px;min-height:46px;padding:6px 10px;border-radius:10px;font-weight:900;font-size:18px;color:#1a1020}
.tsi-tiers button.cur{outline:3px solid #fff}
.tsi-tiers button.pool{background:var(--card);color:var(--text);font-size:14px;font-weight:700}
.tsbtn{display:block;width:100%;padding:12px;border-radius:12px;background:var(--card);font-weight:700;font-size:15px;margin-top:8px;color:var(--text);text-align:center}
.tsbtn.memo{background:#2d2316;border:1px solid #6b4a1f}
.tsbtn.memo .mp{display:block;font-weight:400;font-size:13px;color:var(--sub);white-space:pre-wrap;text-align:left;margin-top:4px}
.te-row{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.te-row input{flex:1;min-width:0;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit;font-size:16px;font-weight:800}
.te-row .sw{width:40px;height:40px;border-radius:10px;flex:none;border:2px solid #fff3}
.te-row button.ic{width:40px;height:40px;border-radius:10px;background:var(--card);flex:none;font-size:16px;color:var(--text)}
.te-row button.ic.del{color:#ff8a8a}
.te-pal{display:flex;flex-wrap:wrap;gap:6px;margin:-2px 0 10px 4px}
.te-pal button{width:34px;height:34px;border-radius:8px;border:2px solid transparent}
.te-pal button.on{border-color:#fff}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

const TD = window.TIER_DATA || { sets: {} };
const SETS = ['coopWeapon', 'vsWeapon', 'coopStage', 'vsStage', 'boss'];
// tiermaker の標準の段の色（上から）
const PALETTE = ['#ff7f7f','#ffbf7f','#ffdf7f','#ffff7f','#bfff7f','#7fff7f','#7fffff','#7fbfff','#7f7fff','#ff7fff','#bf7fbf','#cfcfcf'];
const DEFAULT_TIERS = [['S', 0], ['A', 1], ['B', 2], ['C', 3], ['D', 4]];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const COLOR_RE = /^#[0-9a-f]{6}$/i; // 色はCSSに埋め込むので形式を限定する
// 保存データ・バックアップのティアリストを検証して整える。使えなければ null
function normList(l, key){
  if (!isObj(l) || !SETS.includes(l.set) || !Array.isArray(l.tiers)) return null;
  const known = new Set((TD.sets[l.set] ? TD.sets[l.set].items : []).map(x => x.id));
  const seen = new Set(), ids = new Set();
  const tiers = l.tiers.filter(isObj).map(t => {
    let id = typeof t.id === 'string' && t.id && !ids.has(t.id) ? t.id : uid(); ids.add(id);
    const items = (Array.isArray(t.items) ? t.items : []).filter(x => typeof x === 'string' && known.has(x) && !seen.has(x) && seen.add(x));
    return { id, label: String(t.label == null ? '?' : t.label).slice(0, 12) || '?', color: COLOR_RE.test(t.color) ? t.color : PALETTE[0], items };
  });
  if (!tiers.length) return null;
  const now = Date.now();
  return { id: key, set: l.set, title: String(l.title || TD.sets[l.set].label).slice(0, 60), auto: !!l.auto, tiers,
    created: Number.isFinite(l.created) ? l.created : now, updated: Number.isFinite(l.updated) ? l.updated : now };
}
function normStore(s){
  const out = { lists: {}, counters: {} };
  if (!isObj(s)) return out;
  if (isObj(s.lists)) for (const [k, l] of Object.entries(s.lists)){ const n = normList(l, k); if (n) out.lists[k] = n; }
  if (isObj(s.counters)) for (const [k, v] of Object.entries(s.counters)) if (SETS.includes(k) && Number.isInteger(v) && v >= 0) out.counters[k] = v;
  return out;
}
let store = normStore(load('sm_tiers', null));
const saveStore = () => save('sm_tiers', store);
window.getTierStore = () => store;
window.mergeTierStore = (incoming) => {
  // バックアップ読み込み: 先に全体を検証してから、同じIDは置き換え・それ以外は追加（今あるティアは消さない）
  const inc = normStore(incoming);
  const before = JSON.stringify(store);
  Object.assign(store.lists, inc.lists);
  for (const [k, v] of Object.entries(inc.counters)) store.counters[k] = Math.max(store.counters[k] || 0, v);
  const n = Object.keys(inc.lists).length;
  if (n && !saveStore()){ store = JSON.parse(before); return -1; }
  return n;
};

const setOf = l => TD.sets[l.set] || { label: '?', items: [] };
const itemMap = {};
SETS.forEach(s => (TD.sets[s] ? TD.sets[s].items : []).forEach(x => { itemMap[s + '|' + x.id] = x; }));
const itemOf = (l, id) => itemMap[l.set + '|' + id];
const placed = l => new Set(l.tiers.flatMap(t => t.items));
const poolOf = l => { const used = placed(l); return setOf(l).items.filter(x => !used.has(x.id)); };
// 保存に失敗したら、画面の変更を保存済みの状態に戻して知らせる
function saveOrRevert(before){
  if (saveStore()) return true;
  store = JSON.parse(before); if (cur) cur = store.lists[cur.id] || null;
  toast('保存できませんでした（空き容量を確認してください）'); render(); if (cur) drawTier();
  return false;
}
const shortName = n => String(n || '');
function fmtDate(ms){ const d = new Date(ms); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }

// ---------- 一覧（ティアタブ） ----------
let picking = false; // 「新しく作る」で題材を選んでいる
let actOpen = null;  // 操作（名前変更・複製・削除）を開いている一覧の項目
window.renderTierList = function(){
  let h = '';
  if (picking){
    h += '<div class="sec" style="margin-top:0">何のティアリストを作りますか？</div><div class="tsetpick">' +
      SETS.filter(s => TD.sets[s]).map(s => '<button data-tnew="' + s + '"><img src="' + esc(TD.sets[s].items[0] ? TD.sets[s].items[0].img : '') + '" alt="">' + esc(TD.sets[s].label) +
        '<span style="margin-left:auto;font-size:12px;color:var(--sub);font-weight:400">' + TD.sets[s].items.length + '個</span></button>').join('') +
      '</div><button class="tsbtn" data-tcancel="1">やめる</button>';
    return h;
  }
  h += '<button class="tlist-new" data-tpick="1">＋ 新しく作る</button>';
  const lists = Object.values(store.lists).sort((a, b) => b.updated - a.updated);
  if (!lists.length) return h + '<div class="empty">ブキ・ステージ・オオモノを、自分の評価で段に並べて残せます。<br>画像を長押しして、指で段に運びます。</div>';
  const f = ui.tierFilter || '';
  h += '<select class="tfilter" id="tierFilter"><option value="">すべて（' + lists.length + '）</option>' +
    SETS.filter(s => TD.sets[s]).map(s => '<option value="' + s + '"' + (f === s ? ' selected' : '') + '>' + esc(TD.sets[s].label) + '</option>').join('') + '</select>';
  lists.filter(l => !f || l.set === f).forEach(l => {
    const prev = [];
    l.tiers.forEach(t => t.items.slice(0, 3).forEach(id => { if (prev.length < 7) prev.push([t, itemOf(l, id)]); }));
    const total = setOf(l).items.length, done = placed(l).size;
    h += '<div class="tl-item"><button class="tl-open" data-topen="' + esc(l.id) + '"><div class="tl-title">' + esc(l.title) + '</div>' +
      '<div class="tl-meta">' + esc(setOf(l).label) + '・' + done + '/' + total + '個を配置・' + fmtDate(l.updated) + '</div>' +
      '<div class="tl-prev">' + (prev.length ? prev.map(([t, x]) => x ? '<img src="' + esc(x.img) + '" alt="">' : '').join('') : '<span class="tl-meta">まだ並べていません</span>') + '</div></button>' +
      (actOpen === l.id ? '<div class="tl-acts"><button data-tren="' + esc(l.id) + '">名前を変更</button><button data-tdup="' + esc(l.id) + '">複製</button><button class="del" data-tdel="' + esc(l.id) + '">削除</button><button data-tact="">とじる</button></div>'
        : '<div class="tl-acts"><button data-tact="' + esc(l.id) + '">⋯ 名前の変更・複製・削除</button></div>') + '</div>';
  });
  return h;
};

function newList(set){
  const n = (store.counters[set] || 0) + 1; store.counters[set] = n; // 番号は使い回さない
  const l = { id: uid(), set, title: TD.sets[set].label + ' ' + n, auto: true, created: Date.now(), updated: Date.now(),
    tiers: DEFAULT_TIERS.map(([lab, c]) => ({ id: uid(), label: lab, color: PALETTE[c], items: [] })) };
  store.lists[l.id] = l;
  if (!saveStore()) toast('保存できませんでした');
  return l;
}
function renameList(l){
  const v = prompt('ティアリストの名前（空にすると「' + TD.sets[l.set].label + ' …」の番号付きの名前のまま）', l.auto ? '' : l.title);
  if (v === null) return false;
  const before = JSON.stringify(store);
  if (v.trim()){ l.title = v.trim().slice(0, 60); l.auto = false; }
  l.updated = Date.now(); return saveOrRevert(before);
}

document.getElementById('main').addEventListener('click', e => {
  if (ui.view !== 'tier') return;
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.tpick){ picking = true; render(); }
  else if (d.tcancel){ picking = false; render(); }
  else if (d.tnew){ picking = false; const l = newList(d.tnew); render(); openTier(l.id); }
  else if (d.topen){ openTier(d.topen); }
  else if (d.tact != null){ actOpen = d.tact || null; render(); }
  else if (d.tren){ const l = store.lists[d.tren]; if (l && renameList(l)) render(); }
  else if (d.tdup){
    const s = store.lists[d.tdup]; if (!s) return;
    const before = JSON.stringify(store);
    const c = JSON.parse(JSON.stringify(s)); c.id = uid(); c.title = s.title + '（コピー）'; c.auto = false; c.created = c.updated = Date.now();
    c.tiers.forEach(t => t.id = uid());
    store.lists[c.id] = c; actOpen = null;
    if (saveOrRevert(before)){ render(); toast('複製しました'); }
  }
  else if (d.tdel){
    const l = store.lists[d.tdel]; if (!l) return;
    if (!confirm('「' + l.title + '」を削除します。元に戻せません。よろしいですか？')) return;
    const before = JSON.stringify(store);
    delete store.lists[d.tdel]; actOpen = null;
    if (saveOrRevert(before)) render();
  }
});
document.getElementById('main').addEventListener('change', e => {
  if (e.target.id === 'tierFilter'){ ui.tierFilter = e.target.value; render(); }
});

// ---------- 編集画面 ----------
const ov = document.createElement('div');
ov.id = 'tier';
ov.innerHTML = '<div class="ehead"><button class="back" id="tierBack">‹ 一覧</button><button id="tierTitle"></button>' +
  '<button class="hb" id="tierUndo" aria-label="取り消し">↶</button><button class="hb" id="tierRedo" aria-label="やり直し">↷</button><button class="hb" id="tierEditRows">段</button><button class="hb" id="tierShot">画像</button></div>' +
  '<div id="tierBoard"></div>' +
  '<div id="tierTray"><div class="trayh"><span class="cnt" id="trayCnt"></span><button id="trayToggle"></button></div>' +
  '<input class="traysearch" id="traySearch" placeholder="名前で探す" style="display:none"><div id="trayItems"></div></div>';
document.body.appendChild(ov);
const $ = id => document.getElementById(id);

let cur = null;          // 開いているティアリスト
let hist = [], hi = -1;  // 取り消し・やり直し用（その画面を開いている間だけ）
let trayBig = false, query = '';
const snap = () => JSON.stringify(cur.tiers);
function commit(){
  cur.updated = Date.now();
  if (!saveStore()){
    // 保存できなかった変更は取り消して、最後に保存できた状態に戻す
    cur.tiers = JSON.parse(hist[hi]); toast('保存できませんでした（空き容量を確認してください）'); drawTier(); return;
  }
  hist = hist.slice(0, hi + 1); hist.push(snap()); hi = hist.length - 1;
  drawTier();
}
function goHist(i){
  const prev = hi; hi = i; cur.tiers = JSON.parse(hist[hi]); cur.updated = Date.now();
  if (!saveStore()){ hi = prev; cur.tiers = JSON.parse(hist[hi]); toast('保存できませんでした'); }
  drawTier();
}
function openTier(id){
  cur = store.lists[id]; if (!cur) return;
  hist = [snap()]; hi = 0; trayBig = false; query = ''; $('traySearch').value = '';
  ov.classList.add('open');
  history.pushState({ tier: true }, '');
  drawTier(true);
}
function closeTier(fromPop){
  if (!cur) return;
  endDrag(true); closeSheet(); cur = null;
  ov.classList.remove('open');
  if (!fromPop && history.state && history.state.tier) history.back();
  render();
}
// index.html の popstate から呼ばれる。閉じたら true
window.tierPop = () => {
  if (sheetEl){ closeSheet(); history.pushState({ tier: true }, ''); return true; }
  if (cur){ closeTier(true); return true; }
  return false;
};
window.tierRedraw = () => { if (cur) { drawTier(); if (sheetItem) openItemSheet(sheetItem); } };

function itemHTML(x){
  return '<div class="ti" data-item="' + esc(x.id) + '"><img src="' + esc(x.img) + '" alt="" draggable="false" loading="lazy"><span>' + esc(shortName(x.name)) + '</span></div>';
}
function drawTier(toTop){
  if (dg) endDrag(true); // 書き換えで触っている要素が消える前に、ドラッグを必ず終わらせる
  $('tierTitle').textContent = cur.title;
  $('tierUndo').disabled = hi <= 0; $('tierRedo').disabled = hi >= hist.length - 1;
  const b = $('tierBoard'), top = b.scrollTop;
  b.innerHTML = cur.tiers.map(t => '<div class="trow" data-tier="' + esc(t.id) + '"><div class="tlab" style="background:' + esc(t.color) + '">' + esc(t.label) + '</div>' +
    '<div class="titems" data-tier="' + esc(t.id) + '">' + t.items.map(id => itemOf(cur, id)).filter(Boolean).map(itemHTML).join('') + '</div></div>').join('') +
    '<div class="tl-meta" style="padding:8px 4px">画像を<b>長押し</b>して段へ運びます。<b>タップ</b>すると置き場所を選んだり、メモを見たりできます。</div>';
  if (!toTop) b.scrollTop = top;
  const pool = poolOf(cur);
  const q = nfkc(query).toLowerCase();
  const shown = q ? pool.filter(x => nfkc(x.name).toLowerCase().includes(q)) : pool;
  $('trayCnt').textContent = '未配置 ' + pool.length + (q ? '（「' + query + '」で ' + shown.length + '）' : '');
  $('trayToggle').textContent = trayBig ? '▼ 小さく' : '▲ 広げて探す';
  $('tierTray').classList.toggle('big', trayBig);
  $('traySearch').style.display = trayBig ? '' : 'none';
  $('trayItems').innerHTML = shown.length ? shown.map(itemHTML).join('') : '<div class="tl-meta" style="padding:8px">' + (pool.length ? '見つかりません' : 'すべて配置しました') + '</div>';
}
$('tierBack').onclick = () => { if (history.state && history.state.tier) history.back(); else closeTier(false); };
$('tierTitle').onclick = () => { if (renameList(cur)) drawTier(); };
$('tierUndo').onclick = () => { if (hi > 0) goHist(hi - 1); };
$('tierRedo').onclick = () => { if (hi < hist.length - 1) goHist(hi + 1); };
$('trayToggle').onclick = () => { trayBig = !trayBig; if (!trayBig) { query = ''; $('traySearch').value = ''; } drawTier(); };
$('traySearch').addEventListener('input', e => { query = e.target.value; drawTier(); });
$('tierEditRows').onclick = () => openRowSheet();
$('tierShot').onclick = () => exportImage();

// ---------- ティア表を1枚の画像にする ----------
// 画像の配信元（splatoon3.ink / raw.githubusercontent.com）は CORS を許可しているので canvas に描ける。
// 画面に表示中の画像はCORSなしで読み込んでいるため、キャッシュを分けるために cors=1 を付けて読み直す
function loadCors(url){
  return new Promise(res => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    let done = false;
    const fin = v => { if (done) return; done = true; clearTimeout(t); im.onload = im.onerror = null; res(v); };
    const t = setTimeout(() => { fin(null); im.src = ''; }, 8000);
    im.onload = () => fin(im); im.onerror = () => fin(null);
    try { const u = new URL(url); u.searchParams.set('cors', '1'); im.src = u.href; } catch (e) { fin(null); }
  });
}
// 同時に読み込む枚数を絞る（iPhoneのメモリ対策）
async function loadAll(urls, limit){
  const out = new Array(urls.length); let next = 0;
  const worker = async () => { while (next < urls.length){ const i = next++; out[i] = await loadCors(urls[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, urls.length) }, worker));
  return out;
}
function fitText(ctx, text, maxW){
  // 1行に収まらない名前は末尾を「…」で切る
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text; while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}
let exporting = false;
async function exportImage(){
  if (!cur || exporting) return;
  exporting = true; $('tierShot').disabled = true;
  // 作っている途中に編集されてもずれないよう、開始時点の内容を写して使う
  const snap = { title: cur.title, set: cur.set, setLabel: setOf(cur).label, updated: cur.updated,
    tiers: cur.tiers.map(t => ({ label: t.label, color: COLOR_RE.test(t.color) ? t.color : PALETTE[0],
      items: t.items.map(id => itemOf(cur, id)).filter(Boolean).map(x => ({ name: x.name, img: x.img })) })) };
  const cv = document.createElement('canvas');
  try {
    toast('画像を作っています…');
    const W = 1080, PAD = 28, LAB = 150, GAP = 8, IMG = 104, NAME = 24, CELL_W = IMG, CELL_H = IMG + NAME + 6;
    const cols = Math.max(1, Math.floor((W - PAD * 2 - LAB - GAP) / (CELL_W + GAP)));
    const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';
    const rowsH = snap.tiers.map(t => Math.max(1, Math.ceil(t.items.length / cols)) * (CELL_H + GAP) + GAP);
    const HEAD = 110, FOOT = 56;
    const H = HEAD + rowsH.reduce((a, b) => a + b + 6, 0) + FOOT;
    // iPhoneのcanvasの大きさの上限に掛からないよう、縦が長すぎる時は全体を縮小して1枚に収める
    const MAX_H = 8000, scale = Math.min(1, MAX_H / H);
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.scale(scale, scale);
    const flat = snap.tiers.flatMap(t => t.items);
    const loaded = await loadAll(flat.map(x => x.img), 6);
    const missing = loaded.filter(x => !x).length;
    ctx.fillStyle = '#16141f'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2f0f7'; ctx.font = 'bold 46px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(fitText(ctx, snap.title, W - PAD * 2), PAD, 52);
    ctx.fillStyle = '#a9a3bd'; ctx.font = '24px ' + FONT;
    ctx.fillText(snap.setLabel, PAD, 92);
    let y = HEAD, n = 0;
    snap.tiers.forEach((t, i) => {
      const h = rowsH[i];
      ctx.fillStyle = '#1b1826'; ctx.fillRect(PAD, y, W - PAD * 2, h);
      ctx.fillStyle = t.color; ctx.fillRect(PAD, y, LAB, h);
      ctx.fillStyle = '#1a1020'; ctx.textAlign = 'center';
      let fs = 56; ctx.font = 'bold ' + fs + 'px ' + FONT;
      while (fs > 22 && ctx.measureText(t.label).width > LAB - 16){ fs -= 4; ctx.font = 'bold ' + fs + 'px ' + FONT; }
      ctx.fillText(t.label, PAD + LAB / 2, y + h / 2);
      t.items.forEach((x, k) => {
        const im = loaded[n++];
        const cx = PAD + LAB + GAP + (k % cols) * (CELL_W + GAP), cy = y + GAP + Math.floor(k / cols) * (CELL_H + GAP);
        ctx.fillStyle = '#0e0c15'; ctx.fillRect(cx, cy, IMG, IMG);
        if (im){
          const s = Math.min(IMG / im.width, IMG / im.height), w = im.width * s, hh = im.height * s;
          ctx.drawImage(im, cx + (IMG - w) / 2, cy + (IMG - hh) / 2, w, hh);
        } else {
          ctx.fillStyle = '#6f6987'; ctx.font = '16px ' + FONT; ctx.fillText('画像なし', cx + IMG / 2, cy + IMG / 2);
        }
        ctx.fillStyle = '#c9c3dd'; ctx.font = '17px ' + FONT;
        ctx.fillText(fitText(ctx, x.name, CELL_W + GAP - 2), cx + IMG / 2, cy + IMG + NAME / 2 + 3);
      });
      ctx.textAlign = 'left';
      y += h + 6;
    });
    const d = new Date(snap.updated);
    ctx.fillStyle = '#6f6987'; ctx.font = '20px ' + FONT; ctx.textAlign = 'right';
    ctx.fillText('ステージメモ  ' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate(), W - PAD, H - FOOT / 2);
    const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'));
    const name = (snap.title.replace(/[\\/:*?"<>|]/g, '_') || 'tier') + '.png';
    const file = new File([blob], name, { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    // 共有シートは「ボタンを押した瞬間」でないと開けないことがあるので、できた画像を見せてから共有ボタンで開く
    const canShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    showSheet('<h3>画像ができました</h3>' + (missing ? '<div class="tl-meta" style="color:#ff8a8a;margin-bottom:6px">' + missing + '個の画像を読み込めませんでした（「画像なし」になっています）</div>' : '') +
      '<img src="' + url + '" alt="" style="width:100%;border-radius:10px;-webkit-touch-callout:default">' +
      (canShare ? '<button class="tsbtn memo" data-share="1">共有・写真に保存</button>' : '') +
      '<div class="tl-meta" style="margin:8px 0">画像を長押ししても保存できます</div><a class="tsbtn" href="' + url + '" download="' + esc(name) + '">ダウンロード</a><button class="tsbtn" data-sclose="1">とじる</button>',
      () => URL.revokeObjectURL(url));
    sheetEl.addEventListener('click', async e => {
      if (e.target.closest('[data-share]')){
        try { await navigator.share({ files: [file], title: snap.title }); }
        catch (err){ if (!err || err.name !== 'AbortError') toast('共有できませんでした。画像を長押しして保存してください'); }
      }
      else if (e.target.closest('[data-sclose]')) closeSheet();
    });
  } catch (e){
    toast('画像を作れませんでした');
  } finally {
    cv.width = cv.height = 0; // メモリを早めに返す
    exporting = false; $('tierShot').disabled = false;
  }
}

function removeEverywhere(id){ cur.tiers.forEach(t => { t.items = t.items.filter(x => x !== id); }); }
function placeItem(id, tierId, index){
  removeEverywhere(id);
  if (tierId){
    const t = cur.tiers.find(x => x.id === tierId); if (!t) return;
    const i = index == null || index > t.items.length ? t.items.length : index;
    t.items.splice(i, 0, id);
  }
  commit();
}

// ---------- ドラッグ（長押しで掴む。掴む前に指が動いたら通常のスクロール） ----------
const HOLD_MS = 350, SLOP = 6;
let dg = null; // { id, el, touchId, x0, y0, x, y, timer, active, ghost, target, raf, off }
let suppressClick = false;
// 掴んでいる間は盤面とトレイの指スクロールを止める（iPhoneは一度スクロールが始まると preventDefault が効かないため）。
// 自動スクロールは scrollTop で行うので overflow:hidden でも動く
const SCROLLERS = ['tierBoard', 'trayItems'];
let savedOverflow = null;
function lockScroll(on){
  if (on){ if (!savedOverflow) savedOverflow = SCROLLERS.map(id => $(id).style.overflowY); SCROLLERS.forEach(id => { $(id).style.overflowY = 'hidden'; }); }
  else if (savedOverflow){ SCROLLERS.forEach((id, i) => { $(id).style.overflowY = savedOverflow[i]; }); savedOverflow = null; }
}
const scrollPos = () => SCROLLERS.map(id => $(id).scrollTop).join(',');
function startPress(el, x, y, touchId, target){
  endDrag(true); // 前の操作が残っていたら片付ける
  dg = { id: el.dataset.item, el, touchId, x0: x, y0: y, x, y, active: false, pos0: scrollPos() };
  if (touchId == null) return; // マウスは動かした時に掴む
  el.classList.add('pressing');
  // 指を離した・動かした合図を、実際に触った要素（画像など）と .ti の両方で受け取る。
  // 画面の書き換えで要素がDOMから外れると document まで届かず「掴んだまま」になるため
  const mv = e => onTouchMove(e), en = e => onTouchEnd(e), cc = () => endDrag(true);
  const targets = [...new Set([el, target].filter(Boolean))];
  targets.forEach(t => { t.addEventListener('touchmove', mv, { passive: false }); t.addEventListener('touchend', en); t.addEventListener('touchcancel', cc); });
  dg.off = () => targets.forEach(t => { t.removeEventListener('touchmove', mv); t.removeEventListener('touchend', en); t.removeEventListener('touchcancel', cc); });
  dg.timer = setTimeout(() => activate(), HOLD_MS);
}
function activate(){
  if (!dg || !cur || !dg.el.isConnected) { endDrag(true); return; }
  // 長押しの間に少しでもスクロールしていたら、スクロールしようとしていたと見なして掴まない
  if (dg.touchId != null && scrollPos() !== dg.pos0) { endDrag(true); return; }
  const x = itemOf(cur, dg.id); if (!x) { endDrag(true); return; }
  dg.active = true;
  lockScroll(true);
  dg.el.classList.remove('pressing'); dg.el.classList.add('lifting');
  const g = document.createElement('div'); g.className = 'tghost';
  g.innerHTML = '<img src="' + esc(x.img) + '" alt=""><span>' + esc(x.name) + '</span>';
  document.body.appendChild(g); dg.ghost = g;
  if (trayBig && dg.el.closest('#tierTray')){ trayBig = false; $('tierTray').classList.remove('big'); $('traySearch').style.display = 'none'; }
  if (navigator.vibrate) try { navigator.vibrate(10); } catch(e){}
  moveDrag(dg.x, dg.y);
  dg.raf = requestAnimationFrame(autoScroll);
}
function clearMarks(){
  document.querySelectorAll('.trow.over').forEach(r => r.classList.remove('over'));
  document.querySelectorAll('.ti.ins-before, .ti.ins-after').forEach(k => k.classList.remove('ins-before', 'ins-after'));
  $('tierTray').classList.remove('over');
}
function moveDrag(x, y){
  if (!dg || !dg.active) return;
  const item = cur && itemOf(cur, dg.id);
  if (!item){ endDrag(true); return; }
  dg.x = x; dg.y = y;
  const name = item.name;
  // 指で隠れないよう、指より上に浮かせる
  dg.ghost.style.transform = 'translate(' + (x - 40) + 'px,' + (y - 120) + 'px)';
  const hit = document.elementFromPoint(x, y);
  const row = hit && hit.closest('.trow');
  const tray = hit && hit.closest('#tierTray');
  clearMarks();
  dg.target = null;
  if (row){
    row.classList.add('over');
    const kids = [...row.querySelectorAll('.titems .ti')].filter(k => k !== dg.el);
    let idx = kids.length;
    for (let i = 0; i < kids.length; i++){
      const r = kids[i].getBoundingClientRect();
      if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)){ idx = i; break; }
    }
    // 挿入位置の白線は影で描く（要素を差し込むと折り返しが変わって位置がずれるため）
    if (kids[idx]) kids[idx].classList.add('ins-before'); else if (kids.length) kids[kids.length - 1].classList.add('ins-after');
    dg.target = { tier: row.dataset.tier, index: idx };
    const t = cur.tiers.find(t => t.id === row.dataset.tier);
    dg.ghost.querySelector('span').textContent = name + ' → ' + (t ? t.label : '');
  } else if (tray){
    $('tierTray').classList.add('over');
    dg.target = { tier: null };
    dg.ghost.querySelector('span').textContent = name + ' → 未配置';
  } else {
    dg.ghost.querySelector('span').textContent = name;
  }
}
// 掴んでいる間だけ、盤面の上下の端で自動スクロール。スクロールしたら指の下の置き場所を計算し直す
function autoScroll(){
  if (!dg || !dg.active) return;
  try {
    const b = $('tierBoard'), r = b.getBoundingClientRect(), before = b.scrollTop;
    if (dg.y < r.top + 60 && dg.y >= r.top - 40) b.scrollTop -= 10;
    else if (dg.y > r.bottom - 60 && dg.y <= r.bottom + 10) b.scrollTop += 10;
    if (b.scrollTop !== before) moveDrag(dg.x, dg.y);
  } catch (e) { endDrag(true); return; }
  if (dg && dg.active) dg.raf = requestAnimationFrame(autoScroll);
}
function endDrag(cancel){
  if (!dg) return;
  const d = dg; dg = null;
  clearTimeout(d.timer);
  if (d.raf) cancelAnimationFrame(d.raf);
  if (d.off) d.off();
  d.el.classList.remove('pressing', 'lifting');
  lockScroll(false); // どの終わり方でもスクロールは必ず戻す
  if (!d.active) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 400);
  if (d.ghost) d.ghost.remove();
  clearMarks();
  // 段の外・トレイの外で離したら元の場所のまま（消したり未配置にしたりしない）
  if (cancel || !d.target || !cur) return;
  if (d.target.tier) placeItem(d.id, d.target.tier, d.target.index);
  else if (placed(cur).has(d.id)) placeItem(d.id, null);
}
const findTouch = (list, id) => { for (const t of list) if (t.identifier === id) return t; return null; };
ov.addEventListener('touchstart', e => {
  // 2本目の指が触れたら、掴んでいる操作はやめる（誤配置を防ぐ）
  if (dg && dg.touchId != null){ endDrag(true); return; }
  const el = e.target.closest('.ti'); if (!el || e.touches.length > 1) return;
  const t = e.changedTouches[0]; startPress(el, t.clientX, t.clientY, t.identifier, e.target);
}, { passive: true });
function onTouchMove(e){
  if (!dg || dg.touchId == null) return;
  const t = findTouch(e.touches, dg.touchId); if (!t) return;
  if (!dg.active){
    if (Math.hypot(t.clientX - dg.x0, t.clientY - dg.y0) > SLOP) endDrag(true);
    return;
  }
  if (e.cancelable) e.preventDefault();
  moveDrag(t.clientX, t.clientY);
}
function onTouchEnd(e){ if (dg && dg.touchId != null && findTouch(e.changedTouches, dg.touchId)) endDrag(false); }
// 通常のバブリングで届く分の補助としてティア画面全体でも受ける（二重処理は dg の有無で防ぐ）
ov.addEventListener('touchend', onTouchEnd);
ov.addEventListener('touchcancel', () => endDrag(true));
// ゆっくりスクロールし始めた時に長押しと判定されないよう、掴む前にスクロールが動いたら長押しを取り消す
['tierBoard', 'trayItems'].forEach(id => $(id).addEventListener('scroll', () => { if (dg && !dg.active) endDrag(true); }, { passive: true }));
window.addEventListener('blur', () => endDrag(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') endDrag(true); });
// PCのマウスは押して動かしたらすぐ掴む
ov.addEventListener('mousedown', e => { const el = e.target.closest('.ti'); if (el && e.button === 0) startPress(el, e.clientX, e.clientY, null); });
document.addEventListener('mousemove', e => {
  if (!dg || dg.touchId != null) return;
  if (!(e.buttons & 1)){ endDrag(true); return; } // ウィンドウの外で離した場合
  if (!dg.active){ if (Math.hypot(e.clientX - dg.x0, e.clientY - dg.y0) > 5){ dg.x = e.clientX; dg.y = e.clientY; activate(); } return; }
  moveDrag(e.clientX, e.clientY);
});
document.addEventListener('mouseup', () => { if (dg && dg.touchId == null) endDrag(false); });
ov.addEventListener('contextmenu', e => { if (e.target.closest('.ti')) e.preventDefault(); });

// ---------- タップ: 置き場所を選ぶ・メモ ----------
let sheetEl = null, sheetItem = null, sheetCleanup = null;
// シートはどの閉じ方（とじる・背景タップ・戻る・別のシートに置き換え）でも後片付けを1回だけ行う
function closeSheet(){
  if (sheetEl){ sheetEl.remove(); sheetEl = null; sheetItem = null; }
  if (sheetCleanup){ const f = sheetCleanup; sheetCleanup = null; try { f(); } catch (e){} }
}
function showSheet(html, cleanup){
  closeSheet();
  sheetCleanup = cleanup || null;
  sheetEl = document.createElement('div'); sheetEl.className = 'tsheet-bg';
  sheetEl.innerHTML = '<div class="tsheet">' + html + '</div>';
  sheetEl.addEventListener('click', e => { if (e.target === sheetEl) closeSheet(); });
  document.body.appendChild(sheetEl);
}
// 題材ごとのメモのキー（ステージは既存のステージメモと同じ）
function memoTarget(set, id){
  if (set === 'coopWeapon') return { kind: 'wc', id, key: 'wc:' + id };
  if (set === 'vsWeapon') return { kind: 'wv', id, key: 'wv:' + id };
  if (set === 'boss') return { kind: 'bs', id, key: 'bs:' + id };
  if (set === 'coopStage') return { kind: 'coop', id, key: 'coop:' + id };
  if (set === 'vsStage') return { kind: 'vs', id, key: 'vs:' + id + ':all' };
  return null;
}
window.tierMemoTarget = memoTarget;
function openItemSheet(id){
  const x = itemOf(cur, id); if (!x) return;
  const where = cur.tiers.find(t => t.items.includes(id));
  const mt = memoTarget(cur.set, id), memo = mt ? memoOf(mt.key) : '';
  showSheet('<div class="tsi-head"><img src="' + esc(x.img) + '" alt=""><div><b>' + esc(x.name) + '</b><div class="tl-meta">' + (where ? '今は「' + esc(where.label) + '」' : '未配置') + '</div></div></div>' +
    '<div class="psh">置き場所をタップ</div><div class="tsi-tiers">' +
    cur.tiers.map(t => '<button data-sto="' + esc(t.id) + '" class="' + (where === t ? 'cur' : '') + '" style="background:' + esc(t.color) + '">' + esc(t.label) + '</button>').join('') +
    '<button class="pool' + (where ? '' : ' cur') + '" data-sto="">未配置へ</button></div>' +
    (mt ? '<button class="tsbtn memo" data-smemo="1">📝 ' + (memo ? 'メモを編集' : 'メモを書く') + (memo ? '<span class="mp">' + esc(memo.length > 120 ? memo.slice(0, 120) + '…' : memo) + '</span>' : '') + '</button>' : '') +
    '<button class="tsbtn" data-sclose="1">とじる</button>');
  sheetItem = id;
  sheetEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sto != null){ const tid = b.dataset.sto || null; closeSheet(); placeItem(id, tid, null); }
    else if (b.dataset.smemo){ openEditor(mt.kind, mt.id, mt.kind === 'vs' ? 'all' : null); }
    else if (b.dataset.sclose) closeSheet();
  });
}
ov.addEventListener('click', e => {
  if (suppressClick) return;
  const el = e.target.closest('.ti'); if (!el || dg) return;
  openItemSheet(el.dataset.item);
});

// ---------- 段の編集 ----------
let palFor = null;
function openRowSheet(){
  const rows = cur.tiers.map((t, i) => '<div class="te-row"><button class="sw" style="background:' + esc(t.color) + '" data-pal="' + esc(t.id) + '" aria-label="色"></button>' +
    '<input value="' + esc(t.label) + '" data-lab="' + esc(t.id) + '" maxlength="12">' +
    '<button class="ic" data-up="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button class="ic" data-down="' + i + '"' + (i < cur.tiers.length - 1 ? '' : ' disabled') + '>↓</button>' +
    '<button class="ic del" data-rdel="' + esc(t.id) + '" aria-label="この段を削除">🗑</button></div>' +
    (palFor === t.id ? '<div class="te-pal">' + PALETTE.map(c => '<button data-col="' + c + '" class="' + (t.color === c ? 'on' : '') + '" style="background:' + c + '"></button>').join('') + '</div>' : '')).join('');
  showSheet('<h3>段の編集</h3>' + rows + '<button class="tsbtn" data-radd="1">＋ 段を追加（一番下）</button><button class="tsbtn" data-sclose="1">とじる</button>');
  sheetEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.pal){ palFor = palFor === d.pal ? null : d.pal; openRowSheet(); return; }
    if (d.col){ const t = cur.tiers.find(t => t.id === palFor); if (t){ t.color = d.col; palFor = null; commit(); openRowSheet(); } return; }
    if (d.up != null){ const i = +d.up; [cur.tiers[i - 1], cur.tiers[i]] = [cur.tiers[i], cur.tiers[i - 1]]; commit(); openRowSheet(); return; }
    if (d.down != null){ const i = +d.down; [cur.tiers[i + 1], cur.tiers[i]] = [cur.tiers[i], cur.tiers[i + 1]]; commit(); openRowSheet(); return; }
    if (d.rdel){
      const t = cur.tiers.find(t => t.id === d.rdel); if (!t) return;
      if (cur.tiers.length <= 1){ toast('段は1つ以上必要です'); return; }
      if (t.items.length && !confirm('「' + t.label + '」の中の' + t.items.length + '個は未配置に戻ります。よろしいですか？')) return;
      cur.tiers = cur.tiers.filter(x => x !== t); commit(); openRowSheet(); return;
    }
    if (d.radd){ cur.tiers.push({ id: uid(), label: '?', color: PALETTE[cur.tiers.length % PALETTE.length], items: [] }); commit(); openRowSheet(); return; }
    if (d.sclose){ palFor = null; closeSheet(); }
  });
  sheetEl.addEventListener('change', e => {
    const id = e.target.dataset.lab; if (!id) return;
    const t = cur.tiers.find(t => t.id === id); if (!t) return;
    const v = e.target.value.trim(); if (!v || v === t.label) return;
    t.label = v; commit();
  });
}

if (ui.view === 'tier') render();
})();
