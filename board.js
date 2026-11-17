// 作戦図（マップの上にアイコン・ペン・矢印・文字を置き、手順でコマ送り）。index.html と tier.js の後に読み込む。
// 土台の画像は、ユーザーが自分で撮ったスクショ（参考: サーモンラーンNW https://salmon-learn-nw.gungee.jp/ のマップ）。端末内だけに保存。
// 設計はCodexと相談（2026-11-17）: タブは増やさずメモタブの「作戦図」に置く／閲覧が初期状態で編集は明示的に開始／
// 1本指で地図を移動・2本指で拡大・全体表示ボタン／アイコンは選んでから地図をタップ／手順は「前へ 手順n/N 次へ」／
// 土台・作戦・WAVEへの割り当てを分ける／画像も作戦もIndexedDBに保存。
// 共有して使うもの: memos, save, load, esc, toast, render, ui, nfkc, memoOf, scenById, TIER_DATA, CONTEST_DATA
'use strict';
(function(){
const SRC_URL = 'https://salmon-learn-nw.gungee.jp/maplist/';
const SRC_NAME = 'サーモンラーンNW';
const LEANNY = 'https://raw.githubusercontent.com/Leanny/splat3/main/images/';
const TIDES = [['Low', '干潮'], ['Mid', '普通'], ['High', '満潮']];
const TIDE_NAME = Object.fromEntries(TIDES);
const COOP_STAGES = ['Q29vcFN0YWdlLTE=', 'Q29vcFN0YWdlLTI=', 'Q29vcFN0YWdlLTc=', 'Q29vcFN0YWdlLTY=', 'Q29vcFN0YWdlLTg=', 'Q29vcFN0YWdlLTQ=', 'Q29vcFN0YWdlLTk='];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const css = `
.bp-stage{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;margin-bottom:6px}
.bp-stage .bp-name{display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;margin-bottom:6px}
.bp-stage .bp-name img{width:56px;height:32px;object-fit:cover;border-radius:6px;background:var(--card2)}
.bp-tides{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.bp-tides button,.bp-one{display:flex;flex-direction:column;align-items:flex-start;background:var(--card2);border-radius:9px;padding:6px 9px;text-align:left;min-height:44px}
.bp-tides b,.bp-one b{font-size:13px;font-weight:600}
.bp-tides small,.bp-one small{font-size:11px;color:var(--faint)}
.bp-tides small.has,.bp-one small.has{color:var(--salmon)}
.bp-tides small.base,.bp-one small.base{color:var(--sub)}
.bp-one{width:100%;flex-direction:row;align-items:center;gap:10px}
.bp-one img{width:56px;height:32px;object-fit:cover;border-radius:6px;background:var(--card)}
.bp-one .bp-t{flex:1;min-width:0}
.bp-credit{font-size:11px;color:var(--faint);margin:10px 2px}
.bp-credit a{color:var(--sub)}
.ovl{position:fixed;inset:0;z-index:22;background:var(--bg);display:none;flex-direction:column}
.ovl.open{display:flex}
#bplaceBody{flex:1;overflow-y:auto;padding:14px 16px 24px;-webkit-overflow-scrolling:touch}
.bpl-base{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:12px}
.bpl-base img{display:block;width:100%;max-height:44vh;object-fit:contain;border-radius:8px;background:#0b0a12}
.bpl-empty{text-align:center;padding:14px 6px;color:var(--sub);font-size:13px}
.bpl-steps{counter-reset:s;margin:8px 0 0;padding:0;list-style:none;text-align:left;font-size:13px;color:var(--sub)}
.bpl-steps li{margin:6px 0;padding-left:26px;position:relative}
.bpl-steps li::before{counter-increment:s;content:counter(s);position:absolute;left:0;top:0;width:18px;height:18px;border-radius:50%;background:var(--card2);color:var(--text);font-size:11px;display:flex;align-items:center;justify-content:center}
.bbtn{display:block;width:100%;padding:11px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-weight:600;font-size:14px;margin-top:8px;color:var(--text);text-align:center;text-decoration:none}
.bbtn.main{background:var(--salmon);border-color:var(--salmon);color:#1a1020}
.bbtn.sub{background:none;color:var(--sub)}
.bbtn-row{display:flex;gap:8px}.bbtn-row .bbtn{flex:1}
.bpl-list .row{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:6px;color:var(--text)}
.bpl-list .row .rinfo{flex:1;min-width:0}
.bpl-list .row .rname{font-weight:600;font-size:14px}
.bpl-list .row .rprev{font-size:11px;color:var(--faint)}
.bpl-list .row .use{flex:none;font-size:12px;font-weight:600;color:var(--salmon);border:1px solid rgba(255,122,61,.4);border-radius:999px;padding:4px 10px}
#board .ehead{gap:6px}
#board .ehead button.hb{padding:6px 9px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-size:13px;font-weight:600;min-width:40px;min-height:38px;flex:none}
#board .ehead button.hb:disabled{opacity:.35}
#board .ehead button.hb.main{background:var(--salmon);border-color:var(--salmon);color:#1a1020}
#bTitle{flex:1;min-width:0;text-align:left;font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 2px}
#bTitle small{display:block;font-size:11px;color:var(--faint);font-weight:400}
#bView{flex:1;position:relative;overflow:hidden;background:#0b0a12;touch-action:none;-webkit-user-select:none;user-select:none}
#bStage{position:absolute;left:0;top:0;transform-origin:0 0}
#bStage img{display:block;pointer-events:none;-webkit-user-drag:none}
#bStage svg{position:absolute;left:0;top:0;overflow:visible}
#bFit{position:absolute;right:10px;top:10px;z-index:2;background:rgba(20,18,28,.85);border:1px solid var(--line2);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--text)}
#bHint{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:2;background:rgba(255,122,61,.92);color:#1a1020;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;display:none;max-width:70%;text-align:center}
#bSaved{position:absolute;left:10px;top:12px;z-index:2;font-size:11px;color:var(--faint)}
#bCredit{position:absolute;left:10px;bottom:6px;z-index:2;font-size:10px;color:rgba(255,255,255,.45)}
#bBottom{flex:none;background:var(--nav);border-top:1px solid var(--line);padding:8px 10px calc(10px + env(safe-area-inset-bottom))}
.bnote{font-size:13px;color:var(--text);padding:0 4px 8px;min-height:20px;white-space:pre-wrap;word-break:break-word}
.bnote.none{color:var(--faint)}
.bsteps{display:flex;gap:8px;align-items:center}
.bsteps button{min-height:44px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-weight:600;font-size:14px;color:var(--text)}
.bsteps .nav{flex:none;width:72px}
.bsteps .nav:disabled{opacity:.3}
.bsteps .cur{flex:1}
.btools{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px}
.btools button{min-height:44px;border-radius:10px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:11px;font-weight:600;color:var(--sub)}
.btools button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.btools button.on{background:var(--salmon);border-color:var(--salmon);color:#1a1020}
.bopts{display:flex;gap:6px;align-items:center;margin-bottom:8px;min-height:32px;flex-wrap:wrap}
.bopts .col{width:30px;height:30px;border-radius:50%;border:2px solid transparent}
.bopts .col.on{border-color:#fff}
.bopts .wd{min-width:40px;height:30px;border-radius:8px;background:var(--card);border:1px solid var(--line);font-size:11px;color:var(--sub)}
.bopts .wd.on{border-color:#fff;color:var(--text)}
.bopts .act{height:34px;padding:0 12px;border-radius:8px;background:var(--card);border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--text)}
.bopts .act.del{color:#ff8a8a}
.bopts .lbl{font-size:11px;color:var(--faint);margin-right:2px}
.bsheet-bg{position:fixed;inset:0;z-index:26;background:#0008;display:flex;align-items:flex-end}
.bsheet{width:100%;max-height:78vh;overflow-y:auto;background:var(--bg);border-radius:18px 18px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}
.bsheet h3{margin:0 0 10px;font-size:15px;font-weight:600}
.bpal-tabs{display:flex;gap:6px;margin-bottom:10px;overflow-x:auto}
.bpal-tabs button{flex:none;padding:6px 12px;border-radius:999px;background:var(--card);border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--sub)}
.bpal-tabs button.on{background:var(--salmon);border-color:var(--salmon);color:#1a1020}
.bpal{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.bpal button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px;border-radius:10px;background:var(--card);font-size:10px;line-height:1.2;color:var(--sub);min-height:72px}
.bpal button img,.bpal button .mk{width:44px;height:44px;object-fit:contain;border-radius:10px;background:#0b0a12}
.bpal button .mk{display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}
.bsl{list-style:none;margin:0;padding:0}
.bsl li{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
.bsl li button.go{flex:1;text-align:left;font-size:13px;color:var(--text)}
.bsl li button.go b{margin-right:6px}
.bsl li.cur button.go{color:var(--salmon)}
.bsl li button.x{flex:none;font-size:12px;color:#ff8a8a;padding:6px 8px}
.bwave{display:flex;align-items:center;gap:10px;width:100%;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:12px;text-align:left;color:var(--text)}
.bwave .bw-t{flex:1;min-width:0}
.bwave b{font-size:14px;font-weight:600;display:block}
.bwave small{font-size:11px;color:var(--faint)}
.bwave svg{width:22px;height:22px;fill:none;stroke:var(--salmon);stroke-width:1.8;flex:none}
.bwave .chg{flex:none;font-size:11px;color:var(--sub);border:1px solid var(--line2);border-radius:999px;padding:3px 9px}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

// ---------- 保存（IndexedDB: 土台の画像と作戦をまとめて） ----------
const IDB_NAME = 'splat-memo-board';
let idbP = null;
function idb(){
  if (!idbP) idbP = new Promise((res, rej) => {
    if (!window.indexedDB){ rej(new Error('no idb')); return; }
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('bases'); db.createObjectStore('boards'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { idbP = null; rej(r.error); };
  });
  return idbP;
}
async function idbDo(store, mode, fn){
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode), s = tx.objectStore(store);
    const req = fn(s);
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = tx.onabort = () => rej(tx.error || new Error('idb'));
  });
}
const baseGet = k => idbDo('bases', 'readonly', s => s.get(k));
const basePut = (k, v) => idbDo('bases', 'readwrite', s => s.put(v, k));
const allBases = () => idbDo('bases', 'readonly', s => s.getAll());
const allBaseKeys = () => idbDo('bases', 'readonly', s => s.getAllKeys());
const boardGet = id => idbDo('boards', 'readonly', s => s.get(id));
const boardPut = b => idbDo('boards', 'readwrite', s => s.put(b, b.id));
const boardDel = id => idbDo('boards', 'readwrite', s => s.delete(id));
const allBoards = () => idbDo('boards', 'readonly', s => s.getAll());

// 場所のキー: サモラン 'c:<CoopStageId>:<Low|Mid|High>' / バトル 'v:<VsStageId>'
const coopPlace = (sid, tide) => 'c:' + sid + ':' + tide;
function placeName(p){
  const a = p.split(':');
  return a[0] === 'c' ? nameById(a[1]) + '・' + (TIDE_NAME[a[2]] || '') : nameById(a[1]);
}
function placeStage(p){ return p.split(':')[1]; }

// 取り込んだ画像を回転し、長い辺1600pxまでに縮めて保存用の Blob にする
async function prepareImage(file, rot){
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = url; });
    const MAX = 1600, iw = im.naturalWidth, ih = im.naturalHeight, s = Math.min(1, MAX / Math.max(iw, ih));
    const sw = Math.round(iw * s), sh = Math.round(ih * s), turn = ((rot % 360) + 360) % 360, side = turn === 90 || turn === 270;
    const cv = document.createElement('canvas'); cv.width = side ? sh : sw; cv.height = side ? sw : sh;
    const ctx = cv.getContext('2d');
    ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(turn * Math.PI / 180);
    ctx.drawImage(im, -sw / 2, -sh / 2, sw, sh);
    let blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (!blob || blob.size > 2.5e6) blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
    const out = { blob, w: cv.width, h: cv.height };
    cv.width = cv.height = 0;
    if (!blob) throw new Error('blob');
    return out;
  } finally { URL.revokeObjectURL(url); }
}

// ---------- アイコンの一覧 ----------
const PLAYERS = [['1', '#ff7a3d'], ['2', '#4a90ff'], ['3', '#4fd27a'], ['4', '#ff5aa5']];
const SALMONIDS = [['SakeFlyBagman', 'タマヒロイ'], ['SakelienGolden', 'キンシャケ'], ['SakelienLarge', 'ドスコイ'], ['SakelienStandard', 'シャケ'],
  ['SakelienSmall', 'コジャケ'], ['SakeBigMouth', 'ドロシャケ'], ['SakeCopter', 'シャケコプター'], ['Sakedozer', 'グリル']];
const MARKS = [['カゴ', '#e6cf4a'], ['湧き', '#ff5aa5'], ['！', '#ff4d4d'], ['✕', '#9b96ad'], ['★', '#ffd23d'], ['集合', '#2fd6a8']];
const COLORS = ['#ffffff', '#ff7a3d', '#ff4d4d', '#ffd23d', '#4fd27a', '#4a90ff', '#ff5aa5'];
function iconInfo(k){
  const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
  if (kind === 'boss'){ const x = (TIER_DATA.sets.boss.items || []).find(i => i.id === id); return { label: x ? x.name : id, img: x ? x.img : LEANNY + 'coopEnemy/' + id + '.png' }; }
  if (kind === 'sake'){ const x = SALMONIDS.find(s => s[0] === id); return { label: x ? x[1] : id, img: LEANNY + 'coopEnemy/' + id + '.png' }; }
  if (kind === 'weapon'){ const x = (TIER_DATA.sets.coopWeapon.items || []).find(i => i.id === id); if (x) return { label: x.name, img: x.img }; }
  if (kind === 'player'){ const x = PLAYERS.find(p => p[0] === id); if (x) return { label: 'プレイヤー' + id, mark: id, color: x[1] }; }
  if (kind === 'mark'){ const x = MARKS.find(m => m[0] === id); if (x) return { label: id, mark: id, color: x[1] }; }
  // 知らないアイコン（データの更新・壊れた読み込み）でも描けるように、灰色の「?」にする
  return { label: '不明', mark: '?', color: '#9b96ad' };
}

// ---------- メモタブの「作戦図」: 場所の一覧 ----------
let statusCache = null; // { bases:Set(place), counts:{place:n} }
async function loadStatus(){
  try {
    const [keys, boards] = await Promise.all([allBaseKeys(), allBoards()]);
    const counts = {}; boards.forEach(b => { counts[b.place] = (counts[b.place] || 0) + 1; });
    statusCache = { bases: new Set(keys), counts };
  } catch (e){ statusCache = { bases: new Set(), counts: {}, err: true }; }
  return statusCache;
}
function placeStatus(p){
  if (!statusCache) return ['…', ''];
  const n = statusCache.counts[p] || 0, b = statusCache.bases.has(p);
  return n ? ['作戦' + n, 'has'] : b ? ['土台のみ', 'base'] : ['未登録', ''];
}
window.renderBoardList = function(kind){
  let h = '<div class="bp-credit">マップの土台は、自分で撮ったスクショを使います（参考: <a href="' + SRC_URL + '" target="_blank" rel="noopener">' + SRC_NAME + '</a>のマップ）。画像はこのスマホの中だけに保存されます。</div>';
  if (kind === 'coop'){
    COOP_STAGES.forEach(sid => {
      h += '<div class="bp-stage"><div class="bp-name"><img src="' + esc(stageImg[sid] || '') + '" alt="">' + esc(nameById(sid)) + '</div><div class="bp-tides">' +
        TIDES.map(([t, n]) => { const p = coopPlace(sid, t), [lab, cls] = placeStatus(p);
          return '<button data-bplace="' + esc(p) + '"><b>' + n + '</b><small class="' + cls + '" data-bst="' + esc(p) + '">' + lab + '</small></button>'; }).join('') + '</div></div>';
    });
  } else {
    allStages('vs').forEach(s => {
      const p = 'v:' + s.id, [lab, cls] = placeStatus(p);
      h += '<button class="bp-one" data-bplace="' + esc(p) + '" style="margin-bottom:6px"><img src="' + esc(stageImg[s.id] || '') + '" alt=""><span class="bp-t"><b>' + esc(s.name) + '</b></span><small class="' + cls + '" data-bst="' + esc(p) + '">' + lab + '</small></button>';
    });
  }
  // 状態は非同期で読むので、読めたら書き換える
  loadStatus().then(() => document.querySelectorAll('[data-bst]').forEach(el => { const [lab, cls] = placeStatus(el.dataset.bst); el.textContent = lab; el.className = cls; }));
  return h;
};

// ---------- 場所の画面（土台の登録と作戦の一覧） ----------
const $ = id => document.getElementById(id);
const place = document.createElement('div'); place.id = 'bplace'; place.className = 'ovl';
place.innerHTML = '<div class="ehead"><button class="back" id="bplaceBack">‹ 戻る</button><div class="etitle" id="bplaceTitle"></div></div><div id="bplaceBody"></div>' +
  '<input type="file" id="bplaceFile" accept="image/*" hidden>';
document.body.appendChild(place);
let pl = null; // { place, assign:{sid,wave}|null, pending:{file,rot,url}|null, baseUrl }
async function openPlace(p, assign){
  pl = { place: p, assign: assign || null, pending: null, baseUrl: null };
  $('bplaceTitle').textContent = placeName(p) + (assign ? '（WAVE ' + assign.wave + ' に使う作戦図）' : '');
  place.classList.add('open');
  history.pushState({ bplace: true }, '');
  await drawPlace();
}
function closePlace(fromPop){
  openSeq++;
  if (!pl) return;
  if (pl.baseUrl) URL.revokeObjectURL(pl.baseUrl);
  if (pl.pending) URL.revokeObjectURL(pl.pending.url);
  pl = null; place.classList.remove('open');
  if (!fromPop && history.state && history.state.bplace) history.back();
  render(); if (play) drawPlay(false);
}
async function drawPlace(){
  if (!pl) return;
  const my = pl; // 読み込みを待つ間に画面が閉じたり別の場所になったりしたら、何もしない
  const body = $('bplaceBody');
  let base = null, boards = [];
  try { [base, boards] = await Promise.all([baseGet(my.place), allBoards()]); }
  catch (e){ if (pl === my) body.innerHTML = '<div class="empty">保存場所を開けませんでした（プライベートブラウズでは使えません）</div>'; return; }
  if (pl !== my) return;
  boards = boards.filter(b => b.place === pl.place).sort((a, b) => b.updated - a.updated);
  if (pl.baseUrl){ URL.revokeObjectURL(pl.baseUrl); pl.baseUrl = null; }
  const coop = pl.place[0] === 'c', tide = coop ? pl.place.split(':')[2] : null;
  const ngUrl = coop ? 'https://salmon-learn-nw.gungee.jp/map/?stage=' + (COOP_INTERNAL[placeStage(pl.place)] || '') + '&tide=' + tide : '';
  let h = '';
  if (pl.pending){
    h += '<div class="bpl-base"><div class="psh">この画像を「' + esc(placeName(pl.place)) + '」の土台にします</div><img src="' + pl.pending.url + '" style="transform:rotate(' + pl.pending.rot + 'deg)" alt="">' +
      '<div class="bbtn-row"><button class="bbtn" data-brot="-90">↺ 左に回す</button><button class="bbtn" data-brot="90">↻ 右に回す</button></div>' +
      '<button class="bbtn main" data-bsave="1">この画像で登録</button><button class="bbtn sub" data-bcancel="1">やめる</button></div>';
  } else if (base){
    pl.baseUrl = URL.createObjectURL(base.blob);
    h += '<div class="bpl-base"><div class="psh">土台（' + esc(base.src || '自分で撮ったスクショ') + '）</div><img src="' + pl.baseUrl + '" alt="">' +
      '<button class="bbtn sub" data-bpick="1">別の画像で登録し直す</button></div>';
  } else {
    h += '<div class="bpl-base"><div class="bpl-empty"><b style="color:var(--text);font-size:14px">' + esc(placeName(pl.place)) + 'の土台がまだありません</b>' +
      '<ol class="bpl-steps">' + (coop ? '<li>下の「' + SRC_NAME + 'で開く」で、このステージ・潮位のマップを表示する</li><li>スクショを撮り、写真アプリでマップの部分だけに切り抜く</li><li>このアプリに戻って「写真から選ぶ」</li>'
        : '<li>ゲームのバトル中にXボタンでマップを出してスクショ（Switchの撮影ボタン）</li><li>スマホに送って、写真アプリでマップの部分だけに切り抜く</li><li>このアプリに戻って「写真から選ぶ」</li>') + '</ol></div>' +
      (coop ? '<a class="bbtn" href="' + esc(ngUrl) + '" target="_blank" rel="noopener">' + SRC_NAME + 'で開く ↗</a>' : '') +
      '<button class="bbtn main" data-bpick="1">写真から選ぶ</button></div>';
  }
  h += '<div class="sec">作戦図</div><div class="bpl-list">';
  if (!boards.length) h += '<div class="empty" style="padding:14px">' + (base ? '土台は登録済みです。下の「作戦図を作る」から始められます' : '土台を登録すると作れます') + '</div>';
  boards.forEach(b => {
    h += '<div class="row"><button class="rinfo" style="text-align:left;color:var(--text)" data-bopen="' + esc(b.id) + '"><div class="rname">' + esc(b.title) + '</div><div class="rprev">手順' + b.steps.length + '・' + fmtDate(b.updated) + '</div></button>' +
      (pl.assign ? '<button class="use" data-buse="' + esc(b.id) + '">このWAVEに使う</button>' : '') + '</div>';
  });
  h += '</div>' + (base ? '<button class="bbtn main" data-bnew="1">＋ 作戦図を作る</button>' : '') +
    (pl.assign && memoOf(bdKey(pl.assign.sid, pl.assign.wave)) ? '<button class="bbtn sub" data-bunassign="1">このWAVEの割り当てを外す</button>' : '') +
    '<div class="bp-credit">土台の画像は自分で撮ったスクショです。マップの見方は<a href="' + SRC_URL + '" target="_blank" rel="noopener">' + SRC_NAME + '</a>を参考にしています。</div>';
  body.innerHTML = h;
}
function fmtDate(ms){ const d = new Date(ms); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
const bdKey = (sid, wave) => 'bd:' + sid + ':' + wave; // ばちこんのWAVEに割り当てた作戦図のID
window.bdKey = bdKey;
// WAVEへの割り当てを変える。保存に失敗したら元に戻して false
function setAssign(assign, id){
  const k = bdKey(assign.sid, assign.wave), before = memos[k];
  if (id) memos[k] = id; else delete memos[k];
  if (save('sm_memos', memos)) return true;
  if (before === undefined) delete memos[k]; else memos[k] = before;
  return false;
}
$('bplaceBack').onclick = () => { if (history.state && history.state.bplace) history.back(); else closePlace(false); };
$('bplaceFile').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f || !pl) return;
  if (pl.pending) URL.revokeObjectURL(pl.pending.url);
  pl.pending = { file: f, rot: 0, url: URL.createObjectURL(f) };
  drawPlace();
});
$('bplaceBody').addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t || !pl) return;
  const d = t.dataset;
  if (d.bpick){
    if (!d.bconfirmed && statusCache && statusCache.counts[pl.place] && !confirm('この場所の作戦図は、今の画像に合わせて置いてあります。別の画像にすると位置がずれることがあります。登録し直しますか？')) return;
    $('bplaceFile').click();
  }
  else if (d.brot){ pl.pending.rot = (pl.pending.rot + (+d.brot) + 360) % 360; drawPlace(); }
  else if (d.bcancel){ URL.revokeObjectURL(pl.pending.url); pl.pending = null; drawPlace(); }
  else if (d.bsave){
    // 待っている間に画面が変わっても、選んだ場所（key）にだけ保存する
    const my = pl, key = pl.place, pend = pl.pending;
    t.disabled = true; t.textContent = '登録しています…';
    try {
      const img = await prepareImage(pend.file, pend.rot);
      await basePut(key, { blob: img.blob, w: img.w, h: img.h, src: '自分で撮ったスクショ（参考: ' + SRC_NAME + '）', updated: Date.now() });
      URL.revokeObjectURL(pend.url);
      if (pl === my) pl.pending = null;
      await loadStatus(); toast('土台を登録しました');
      if (pl === my) drawPlace();
    } catch (err){ if (pl === my){ t.disabled = false; t.textContent = 'この画像で登録'; } toast('登録できませんでした（画像を読み込めないか、空き容量が足りません）'); }
  }
  else if (d.bnew){
    const my = pl, key = pl.place, assign = pl.assign;
    t.disabled = true;
    const base = await baseGet(key).catch(() => null);
    if (!base || pl !== my){ t.disabled = false; return; }
    const n = ((statusCache && statusCache.counts[key]) || 0) + 1;
    const b = { id: uid(), place: key, title: placeName(key) + ' ' + n, w: base.w, h: base.h,
      steps: [{ id: uid(), note: '', objs: [] }], created: Date.now(), updated: Date.now() };
    try { await boardPut(b); } catch (err){ t.disabled = false; toast('保存できませんでした'); return; }
    await loadStatus();
    if (pl !== my) return;
    if (assign && !setAssign(assign, b.id)) toast('作戦図は作りましたが、WAVEへの割り当てを保存できませんでした');
    openBoard(b.id, { edit: true, wave: assign ? assign.wave : null });
  }
  else if (d.bopen){ openBoard(d.bopen, { edit: false, wave: pl.assign ? pl.assign.wave : null }); }
  else if (d.buse){
    if (!setAssign(pl.assign, d.buse)){ toast('保存できませんでした'); return; }
    toast('WAVE ' + pl.assign.wave + ' に割り当てました');
    if (history.state && history.state.bplace) history.back(); else closePlace(false);
  }
  else if (d.bunassign){
    if (!setAssign(pl.assign, null)) toast('保存できませんでした');
    drawPlace();
  }
});

// ---------- 作戦図の画面 ----------
const ICON_SVG = {
  move: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
  select: '<svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 2-3 6z"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 20L20 4M20 4h-7M20 4v7"/></svg>',
  add: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};
const bv = document.createElement('div'); bv.id = 'board'; bv.className = 'ovl';
bv.innerHTML = '<div class="ehead"><button class="back" id="bBack">‹ 戻る</button><button id="bTitle"></button>' +
  '<button class="hb" id="bUndo" aria-label="取り消し">↶</button><button class="hb" id="bRedo" aria-label="やり直し">↷</button><button class="hb main" id="bMode">編集</button></div>' +
  '<div id="bView"><div id="bStage"><img id="bImg" alt=""><svg id="bSvg" xmlns="http://www.w3.org/2000/svg"></svg></div>' +
  '<button id="bFit">全体表示</button><div id="bHint"></div><div id="bSaved"></div><div id="bCredit">土台: 自分で撮ったスクショ（参考: ' + SRC_NAME + '）</div></div>' +
  '<div id="bBottom"></div>';
document.body.appendChild(bv);

let B = null;      // 開いている作戦図
let bs = null;     // 画面の状態 { edit, step, tool, color, wd, sel, pending, view:{s,tx,ty}, wave, imgUrl, hist, hi }
let openSeq = 0;
let saveQueue = Promise.resolve();     // 保存の列（board.js 全体で1本）
const deletedIds = new Set();          // 削除した作戦図（後から保存が来ても書かない）
async function openBoard(id, opts){
  // 読み込みを待つ間に別の作戦図を開いた・戻った場合は、古い方を捨てる
  const my = ++openSeq, plAt = pl, playAt = play && play.wave;
  if (B) return;
  await saveQueue; // 書きかけの保存が終わってから読む（保存前のデータを開かない）
  let b = null;
  try { b = await boardGet(id); } catch (e){}
  if (my !== openSeq || B || pl !== plAt || (play && play.wave) !== playAt) return;
  if (!b){ toast('作戦図が見つかりません（削除されたかもしれません）'); return; }
  const base = await baseGet(b.place).catch(() => null);
  if (my !== openSeq || B || pl !== plAt || (play && play.wave) !== playAt) return;
  B = b;
  bs = { edit: !!opts.edit, step: 0, tool: 'select', color: COLORS[1], wd: 1, sel: null, pending: null, view: null, wave: opts.wave, imgUrl: null,
    hist: [JSON.stringify(b.steps)], hi: 0, lastIcons: load('sm_lasticons', []), ver: 0, savedVer: 0 };
  if (base){ bs.imgUrl = URL.createObjectURL(base.blob); }
  $('bImg').src = bs.imgUrl || '';
  $('bImg').width = B.w; $('bImg').height = B.h;
  const svg = $('bSvg'); svg.setAttribute('width', B.w); svg.setAttribute('height', B.h); svg.setAttribute('viewBox', '0 0 ' + B.w + ' ' + B.h);
  bv.classList.add('open');
  history.pushState({ board: true }, '');
  $('bSaved').textContent = '';
  requestAnimationFrame(() => { fitView(); drawBoard(); });
}
function closeBoard(fromPop){
  openSeq++; // 読み込み中の openBoard を無効にする
  if (!B) return;
  cancelGesture();
  if (bs.imgUrl) URL.revokeObjectURL(bs.imgUrl);
  B = null; bs = null; bv.classList.remove('open'); closeBSheet();
  if (!fromPop && history.state && history.state.board) history.back();
  loadStatus().then(() => { if (pl) drawPlace(); render(); if (play) drawPlay(false); });
}
// index.html の popstate から呼ばれる（一番上だけ閉じる）。閉じたら true
window.boardPop = () => {
  if (bsheet){ closeBSheet(); history.pushState({ board: true }, ''); return true; }
  if (B){ closeBoard(true); return true; }
  if (pl){ closePlace(true); return true; }
  return false;
};
window.openBoardPlace = openPlace;
window.openBoardById = openBoard;
window.boardMeta = async id => { try { return await boardGet(id); } catch (e){ return null; } };

const D = () => Math.max(B.w, B.h);
const curObjs = () => B.steps[bs.step].objs;
function applyView(){ const v = bs.view; $('bStage').style.transform = 'translate(' + v.tx + 'px,' + v.ty + 'px) scale(' + v.s + ')'; }
function fitView(){
  if (!B) return;
  const r = $('bView').getBoundingClientRect(), s = Math.min(r.width / B.w, r.height / B.h) * 0.96;
  bs.view = { s, tx: (r.width - B.w * s) / 2, ty: (r.height - B.h * s) / 2, fit: s };
  applyView();
}
const toImg = (cx, cy) => { const r = $('bView').getBoundingClientRect(), v = bs.view; return [(cx - r.left - v.tx) / v.s, (cy - r.top - v.ty) / v.s]; };

// 大きさは土台の長い辺に対する割合（拡大すると一緒に大きくなる）
const SZ = { icon: 0.06, text: 0.032, wd: [0.004, 0.007, 0.012] };
function objSVG(o, selected){
  const d = D(), id = esc(o.id), sel = selected ? ' sel' : '';
  if (o.t === 'icon'){
    const info = iconInfo(o.k), r = d * SZ.icon / 2;
    let g = '<g class="bo' + sel + '" data-oid="' + id + '"><circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.35) + '" fill="transparent"/>';
    if (info.img) g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + r + '" fill="#0b0a12" stroke="rgba(255,255,255,.75)" stroke-width="' + (d * .002) + '"/><image href="' + esc(info.img) + '" x="' + (o.x - r * .85) + '" y="' + (o.y - r * .85) + '" width="' + (r * 1.7) + '" height="' + (r * 1.7) + '"/>';
    else g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + r + '" fill="' + esc(info.color) + '" stroke="#0b0a12" stroke-width="' + (d * .003) + '"/><text x="' + o.x + '" y="' + o.y + '" text-anchor="middle" dominant-baseline="central" font-size="' + (r * (info.mark.length > 1 ? .7 : 1.1)) + '" font-weight="700" fill="#1a1020">' + esc(info.mark) + '</text>';
    if (selected) g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.25) + '" fill="none" stroke="#fff" stroke-dasharray="' + (d * .008) + '" stroke-width="' + (d * .003) + '"/>';
    return g + '</g>';
  }
  if (o.t === 'pen'){
    const p = o.pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
    const w = d * SZ.wd[[0, 1, 2].includes(o.wd) ? o.wd : 1];
    return '<g class="bo' + sel + '" data-oid="' + id + '"><path d="' + p + '" stroke="transparent" stroke-width="' + Math.max(w * 4, d * .03) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      (selected ? '<path d="' + p + '" stroke="#fff" stroke-width="' + (w + d * .006) + '" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' : '') +
      '<path d="' + p + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }
  if (o.t === 'arrow'){
    const w = d * SZ.wd[[0, 1, 2].includes(o.wd) ? o.wd : 1], ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), hl = Math.max(w * 4, d * .025);
    const hx = o.x2 - Math.cos(ang) * hl, hy = o.y2 - Math.sin(ang) * hl, nx = -Math.sin(ang) * hl * .55, ny = Math.cos(ang) * hl * .55;
    const line = 'M' + o.x1 + ' ' + o.y1 + 'L' + hx + ' ' + hy;
    return '<g class="bo' + sel + '" data-oid="' + id + '"><path d="M' + o.x1 + ' ' + o.y1 + 'L' + o.x2 + ' ' + o.y2 + '" stroke="transparent" stroke-width="' + Math.max(w * 4, d * .03) + '"/>' +
      (selected ? '<path d="M' + o.x1 + ' ' + o.y1 + 'L' + o.x2 + ' ' + o.y2 + '" stroke="#fff" stroke-width="' + (w + d * .006) + '" opacity=".55" stroke-linecap="round"/>' : '') +
      '<path d="' + line + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M' + o.x2 + ' ' + o.y2 + 'L' + (hx + nx) + ' ' + (hy + ny) + 'L' + (hx - nx) + ' ' + (hy - ny) + 'Z" fill="' + esc(o.c) + '"/></g>';
  }
  if (o.t === 'text'){
    const fs = d * SZ.text;
    return '<g class="bo' + sel + '" data-oid="' + id + '"><text x="' + o.x + '" y="' + o.y + '" text-anchor="middle" dominant-baseline="central" font-size="' + fs + '" font-weight="700" fill="' + esc(o.c) + '" stroke="#0b0a12" stroke-width="' + (fs * .22) + '" paint-order="stroke" style="font-family:-apple-system,\'Hiragino Sans\',sans-serif">' + esc(o.s) + '</text>' +
      (selected ? '<rect x="' + (o.x - fs * o.s.length * .55) + '" y="' + (o.y - fs * .8) + '" width="' + (fs * o.s.length * 1.1) + '" height="' + (fs * 1.6) + '" fill="none" stroke="#fff" stroke-dasharray="' + (d * .008) + '" stroke-width="' + (d * .003) + '"/>' : '') + '</g>';
  }
  return '';
}
function drawBoard(){
  if (!B) return;
  const objs = curObjs();
  $('bSvg').innerHTML = objs.map(o => objSVG(o, bs.sel === o.id)).join('') + (bs.draft ? objSVG(bs.draft, false) : '');
  const waveLab = bs.wave ? 'WAVE ' + bs.wave + '・' : '';
  $('bTitle').innerHTML = esc(B.title) + '<small>' + esc(waveLab + placeName(B.place)) + (bs.edit ? '・編集中（タイトルをタップで名前を変更）' : '') + '</small>';
  $('bMode').textContent = bs.edit ? '完了' : '編集';
  $('bUndo').style.display = $('bRedo').style.display = bs.edit ? '' : 'none';
  $('bUndo').disabled = bs.hi <= 0; $('bRedo').disabled = bs.hi >= bs.hist.length - 1;
  const hint = $('bHint');
  if (bs.pending){ hint.style.display = 'block'; hint.textContent = (bs.pending.t === 'text' ? '「' + bs.pending.s + '」' : iconInfo(bs.pending.k).label) + '：置く場所をタップ'; }
  else hint.style.display = 'none';
  const st = B.steps[bs.step], n = B.steps.length;
  let h = '';
  if (bs.edit){
    const tools = [['move', '移動'], ['select', '選択'], ['pen', 'ペン'], ['arrow', '矢印'], ['add', '追加']];
    h += '<div class="btools">' + tools.map(([k, l]) => '<button data-btool="' + k + '" class="' + (bs.tool === k && !bs.pending ? 'on' : '') + '">' + ICON_SVG[k] + l + '</button>').join('') + '</div>';
    const sel = bs.sel && objs.find(o => o.id === bs.sel);
    if (sel){
      h += '<div class="bopts"><span class="lbl">選択中</span><button class="act" data-bdup="1">複製</button>' + (sel.t === 'text' ? '<button class="act" data-btxt="1">文字を編集</button>' : '') +
        (sel.t !== 'icon' ? COLORS.map(c => '<button class="col' + (sel.c === c ? ' on' : '') + '" data-bcol="' + c + '" style="background:' + c + '"></button>').join('') : '') +
        '<button class="act del" data-bdel="1">削除</button></div>';
    } else if (bs.tool === 'pen' || bs.tool === 'arrow'){
      h += '<div class="bopts">' + COLORS.map(c => '<button class="col' + (bs.color === c ? ' on' : '') + '" data-bcol="' + c + '" style="background:' + c + '"></button>').join('') +
        [['細', 0], ['中', 1], ['太', 2]].map(([l, v]) => '<button class="wd' + (bs.wd === v ? ' on' : '') + '" data-bwd="' + v + '">' + l + '</button>').join('') + '</div>';
    } else h += '<div class="bopts"><span class="lbl">' + ({ move: '1本指で地図を動かせます', select: '置いた物をタップで選ぶ・そのまま指で動かす', add: '' }[bs.tool] || '') + '　2本指で拡大</span></div>';
  }
  h += '<button class="bnote' + (st.note ? '' : ' none') + '" data-bnote="1" style="display:block;width:100%;text-align:left">' + (st.note ? esc(st.note) : (bs.edit ? '＋ この手順の要点を書く' : '（この手順の要点はまだありません）')) + '</button>';
  h += '<div class="bsteps"><button class="nav" data-bstep="-1"' + (bs.step > 0 ? '' : ' disabled') + '>‹ 前へ</button><button class="cur" data-blist="1">手順 ' + (bs.step + 1) + ' / ' + n + '</button>' +
    (bs.edit && bs.step === n - 1 ? '<button class="nav" data-bdupstep="1">複製して次へ</button>' : '<button class="nav" data-bstep="1"' + (bs.step < n - 1 ? '' : ' disabled') + '>次へ ›</button>') + '</div>';
  $('bBottom').innerHTML = h;
}
// ---- 保存・取り消し ----
// 保存は「確定した時点の写し」を、全作戦図で1本の列に並べて順に書く（後から来た保存が先に終わったり、
// 削除の後に保存が走って復活したりしないように）。表示は変更番号と保存完了番号を比べて出す
function commit(){
  if (!B) return;
  B.updated = Date.now();
  bs.hist = bs.hist.slice(0, bs.hi + 1); bs.hist.push(JSON.stringify(B.steps)); bs.hi = bs.hist.length - 1;
  if (bs.hist.length > 80){ bs.hist.shift(); bs.hi--; }
  persist(); drawBoard();
}
function persist(){
  const id = B.id, snap = JSON.stringify(B), ver = ++bs.ver, mine = bs;
  $('bSaved').textContent = '保存中…';
  saveQueue = saveQueue.then(async () => {
    if (deletedIds.has(id)) return;
    try {
      await boardPut(JSON.parse(snap));
      if (mine.savedVer < ver) mine.savedVer = ver;
      if (bs === mine) $('bSaved').textContent = mine.savedVer === mine.ver ? '保存済み' : '保存中…';
    } catch (e){
      if (bs === mine) $('bSaved').textContent = '保存できません（次の変更で再試行）';
      toast('保存できませんでした（空き容量を確認してください）');
    }
  });
}
function goHist(i){ cancelGesture(); bs.hi = i; B.steps = JSON.parse(bs.hist[i]); if (bs.step >= B.steps.length) bs.step = B.steps.length - 1; bs.sel = null; B.updated = Date.now(); persist(); drawBoard(); }
$('bUndo').onclick = () => { if (bs && bs.hi > 0) goHist(bs.hi - 1); };
$('bRedo').onclick = () => { if (bs && bs.hi < bs.hist.length - 1) goHist(bs.hi + 1); };
$('bBack').onclick = () => { if (history.state && history.state.board) history.back(); else closeBoard(false); };
$('bMode').onclick = () => { cancelGesture(); bs.edit = !bs.edit; bs.pending = null; bs.sel = null; bs.tool = 'select'; drawBoard(); };
$('bFit').onclick = () => fitView();
$('bTitle').onclick = () => {
  if (!bs.edit) return;
  cancelGesture();
  const v = prompt('作戦図の名前', B.title); if (v === null || !v.trim()) return;
  B.title = v.trim().slice(0, 40); commit();
};

// ---- 下の操作 ----
$('bBottom').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || !B) return;
  cancelGesture(); // 地図に指を置いたまま別の指でボタンを押した場合、描きかけ・動かしかけは捨てる
  const d = t.dataset, objs = curObjs(), sel = bs.sel && objs.find(o => o.id === bs.sel);
  if (d.btool){ if (d.btool === 'add'){ openPalette(); return; } bs.tool = d.btool; bs.pending = null; bs.sel = null; drawBoard(); }
  else if (d.bcol){ if (sel){ sel.c = d.bcol; commit(); } else { bs.color = d.bcol; drawBoard(); } }
  else if (d.bwd != null){ bs.wd = +d.bwd; drawBoard(); }
  else if (d.bdel && sel){ B.steps[bs.step].objs = objs.filter(o => o !== sel); bs.sel = null; commit(); toast('削除しました（↶で戻せます）'); }
  else if (d.bdup && sel){ const c = JSON.parse(JSON.stringify(sel)); c.id = uid(); shiftObj(c, D() * .03, D() * .03); objs.push(c); bs.sel = c.id; commit(); }
  else if (d.btxt && sel){ const v = prompt('文字', sel.s); if (v !== null && v.trim()){ sel.s = v.trim().slice(0, 30); commit(); } }
  else if (d.bstep){ bs.step = Math.max(0, Math.min(B.steps.length - 1, bs.step + (+d.bstep))); bs.sel = null; drawBoard(); }
  else if (d.bdupstep){
    if (B.steps.length >= 30){ toast('手順は30まで'); return; }
    const c = JSON.parse(JSON.stringify(B.steps[bs.step])); c.id = uid(); c.note = ''; c.objs.forEach(o => { o.id = uid(); });
    B.steps.splice(bs.step + 1, 0, c); bs.step++; bs.sel = null; commit(); toast('手順' + (bs.step + 1) + 'を作りました（前の手順の写し）');
  }
  else if (d.bnote){
    if (!bs.edit) return;
    const v = prompt('手順' + (bs.step + 1) + 'の要点（例: 左湧き、タワー優先）', B.steps[bs.step].note || '');
    if (v === null) return; B.steps[bs.step].note = v.trim().slice(0, 80); commit();
  }
  else if (d.blist) openStepList();
});
function shiftObj(o, dx, dy){
  if (o.t === 'pen') o.pts = o.pts.map(p => [p[0] + dx, p[1] + dy]);
  else if (o.t === 'arrow'){ o.x1 += dx; o.y1 += dy; o.x2 += dx; o.y2 += dy; }
  else { o.x += dx; o.y += dy; }
}

// ---- シート（アイコン・手順の一覧） ----
let bsheet = null;
function closeBSheet(){ if (bsheet){ bsheet.remove(); bsheet = null; } }
function showBSheet(html){
  closeBSheet();
  bsheet = document.createElement('div'); bsheet.className = 'bsheet-bg';
  bsheet.innerHTML = '<div class="bsheet">' + html + '</div>';
  bsheet.addEventListener('click', e => { if (e.target === bsheet) closeBSheet(); });
  document.body.appendChild(bsheet);
  return bsheet;
}
let palTab = 'boss';
function contestWeapons(){
  // ばちこんから開いた時は、そのシナリオの支給ブキを先に出す
  if (!play) return [];
  const inst = CONTEST_DATA.instances.find(x => x.no === play.no);
  return inst ? inst.weapons.map(w => coopWeaponIdByName(w.name)).filter(Boolean) : [];
}
function palItems(tab){
  if (tab === 'recent') return bs.lastIcons.filter(k => iconInfo(k).label);
  if (tab === 'boss') return (TIER_DATA.sets.boss.items || []).map(x => 'boss:' + x.id);
  if (tab === 'sake') return SALMONIDS.map(s => 'sake:' + s[0]);
  if (tab === 'player') return PLAYERS.map(p => 'player:' + p[0]).concat(MARKS.map(m => 'mark:' + m[0]));
  if (tab === 'weapon'){ const cw = contestWeapons(); return cw.map(id => 'weapon:' + id).concat((TIER_DATA.sets.coopWeapon.items || []).filter(x => !cw.includes(x.id)).map(x => 'weapon:' + x.id)); }
  return [];
}
function openPalette(){
  const tabs = [['boss', 'オオモノ'], ['sake', 'その他のシャケ'], ['player', 'プレイヤー・印'], ['weapon', 'ブキ']];
  if (bs.lastIcons.length) tabs.unshift(['recent', '最近']);
  if (!tabs.find(t => t[0] === palTab)) palTab = tabs[0][0];
  const html = '<h3>置くものを選ぶ</h3><div class="bpal-tabs">' + tabs.map(([k, l]) => '<button data-ptab="' + k + '" class="' + (palTab === k ? 'on' : '') + '">' + l + '</button>').join('') +
    '<button data-ptxt="1">文字</button></div><div class="bpal">' +
    palItems(palTab).map(k => { const i = iconInfo(k);
      return '<button data-pk="' + esc(k) + '">' + (i.img ? '<img src="' + esc(i.img) + '" alt="" loading="lazy">' : '<span class="mk" style="background:' + esc(i.color) + ';color:#1a1020">' + esc(i.mark) + '</span>') + '<span>' + esc(i.label) + '</span></button>'; }).join('') + '</div>';
  const el = showBSheet(html);
  el.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.ptab){ palTab = t.dataset.ptab; openPalette(); }
    else if (t.dataset.ptxt){
      closeBSheet();
      const v = prompt('置く文字（短く。例: 先にタワー）'); if (!v || !v.trim()) return;
      bs.pending = { t: 'text', s: v.trim().slice(0, 30) }; bs.sel = null; drawBoard();
    }
    else if (t.dataset.pk){
      const k = t.dataset.pk; closeBSheet();
      bs.pending = { t: 'icon', k }; bs.sel = null;
      bs.lastIcons = [k].concat(bs.lastIcons.filter(x => x !== k)).slice(0, 8); save('sm_lasticons', bs.lastIcons);
      drawBoard();
    }
  });
}
function openStepList(){
  const html = '<h3>手順の一覧</h3><ul class="bsl">' + B.steps.map((s, i) => '<li class="' + (i === bs.step ? 'cur' : '') + '"><button class="go" data-sgo="' + i + '"><b>手順' + (i + 1) + '</b>' + esc(s.note || '（要点なし）') + '・' + s.objs.length + '個</button>' +
    (bs.edit && B.steps.length > 1 ? '<button class="x" data-sdel="' + i + '">削除</button>' : '') + '</li>').join('') + '</ul>' +
    (bs.edit ? '<button class="bbtn" data-sdelboard="1" style="color:#ff8a8a">この作戦図を削除</button>' : '');
  const el = showBSheet(html);
  el.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.sgo != null){ bs.step = +t.dataset.sgo; bs.sel = null; closeBSheet(); drawBoard(); }
    else if (t.dataset.sdel != null){
      const i = +t.dataset.sdel; if (!confirm('手順' + (i + 1) + 'を削除します（↶で戻せます）')) return;
      B.steps.splice(i, 1); if (bs.step >= B.steps.length) bs.step = B.steps.length - 1; closeBSheet(); commit();
    }
    else if (t.dataset.sdelboard){
      if (!confirm('「' + B.title + '」を削除します。元に戻せません。よろしいですか？')) return;
      const id = B.id; closeBSheet();
      // 先に「削除した」印を付け、並んでいる保存を全部終えてから消す（遅れた保存で復活させない）
      deletedIds.add(id);
      await saveQueue;
      try { await boardDel(id); } catch (err){ deletedIds.delete(id); toast('削除できませんでした'); return; }
      Object.keys(memos).forEach(k => { if (k.startsWith('bd:') && memos[k] === id) delete memos[k]; });
      if (!save('sm_memos', memos)) toast('WAVEの割り当てを消せませんでした（次に開いた時に「見つかりません」と出ます）');
      if (history.state && history.state.board) history.back(); else closeBoard(false);
    }
  });
}

// ---- 指の操作 ----
// 1本指: 閲覧・移動＝地図を動かす／選択＝置いた物を動かす（空いている所は地図を動かす）／ペン・矢印＝描く／置く待ち＝タップで置く。
// 2本指: いつでも地図の拡大・移動。2本目が触れたら描きかけ・動かしかけは取り消す
const ptrs = new Map();
let g = null; // { kind:'pan'|'pinch'|'draw'|'arrow'|'drag'|'tap', step, ... }
const TAP = 6;
// 動かしかけの物を、触り始めた手順の中で元に戻す
function restoreDrag(){
  if (g && g.kind === 'drag' && g.orig && B && B.steps[g.step]){ const o = B.steps[g.step].objs.find(x => x.id === g.oid); if (o) Object.assign(o, JSON.parse(g.orig)); }
}
function cancelGesture(){
  restoreDrag();
  if (bs) bs.draft = null;
  g = null; ptrs.clear();
  if (B) drawBoard();
}
function startPinch(){
  const [a, b] = [...ptrs.values()];
  g = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v0: Object.assign({}, bs.view) };
}
function startPan(p, extra){ g = Object.assign({ kind: 'pan', x0: p.x, y0: p.y, tx: bs.view.tx, ty: bs.view.ty, far: false }, extra || {}); }
const view = $('bView');
view.addEventListener('pointerdown', e => {
  if (!B || e.target.closest('#bFit')) return;
  // 新しく1本目の指が触れたのに古い指が残っている＝前の指の終わりの合図を取り逃がしている。片付けてから始める
  if (e.isPrimary && ptrs.size) cancelGesture();
  try { view.setPointerCapture(e.pointerId); } catch (err){} // 取れなくても操作は続ける
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size >= 2){
    // 描きかけ・動かしかけは取り消して、拡大・移動に切り替える（3本目以降は数に入れない）
    if (ptrs.size === 2){ restoreDrag(); bs.draft = null; startPinch(); drawBoard(); }
    return;
  }
  const [ix, iy] = toImg(e.clientX, e.clientY);
  const hit = e.target.closest && e.target.closest('[data-oid]');
  const x0 = e.clientX, y0 = e.clientY, step = bs.step;
  if (bs.edit && bs.pending) startPan({ x: x0, y: y0 }, { place: true }); // 置く待ち: 指を動かしたら地図の移動、動かさずに離したら置く
  else if (bs.edit && bs.tool === 'pen') { bs.draft = { id: 'draft', t: 'pen', c: bs.color, wd: bs.wd, pts: [[ix, iy]] }; g = { kind: 'draw', step, x0, y0, lx: x0, ly: y0 }; }
  else if (bs.edit && bs.tool === 'arrow') { bs.draft = { id: 'draft', t: 'arrow', c: bs.color, wd: bs.wd, x1: ix, y1: iy, x2: ix, y2: iy }; g = { kind: 'arrow', step, x0, y0 }; }
  else if (bs.edit && bs.tool === 'select' && hit && curObjs().find(x => x.id === hit.dataset.oid)){
    const o = curObjs().find(x => x.id === hit.dataset.oid);
    bs.sel = o.id; g = { kind: 'drag', step, oid: o.id, x0, y0, ix, iy, orig: JSON.stringify(o), moved: false }; drawBoard();
  }
  else startPan({ x: x0, y: y0 }, { selTap: bs.edit && bs.tool === 'select' });
});
view.addEventListener('pointermove', e => {
  if (!B || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!g) return;
  if (g.kind === 'pinch'){
    if (ptrs.size < 2) return;
    const [a, b] = [...ptrs.values()], dd = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const r = view.getBoundingClientRect(), v0 = g.v0;
    const s = Math.max(v0.fit * 0.6, Math.min(v0.fit * 8, v0.s * dd / Math.max(g.d0, 1)));
    // 2本指の中点の下の地図の点が、指についてくるように
    const px = (g.mx - r.left - v0.tx) / v0.s, py = (g.my - r.top - v0.ty) / v0.s;
    bs.view = { s, tx: mx - r.left - px * s, ty: my - r.top - py * s, fit: v0.fit }; applyView();
    return;
  }
  if (g.step != null && g.step !== bs.step){ cancelGesture(); return; } // 途中で手順が変わったら取りやめ
  const [ix, iy] = toImg(e.clientX, e.clientY);
  if (g.kind === 'pan'){
    if (!g.far && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) >= TAP) g.far = true; // 一度でも大きく動いたらタップ扱いにしない
    bs.view.tx = g.tx + (e.clientX - g.x0); bs.view.ty = g.ty + (e.clientY - g.y0); applyView();
  }
  else if (g.kind === 'draw'){
    if (Math.hypot(e.clientX - g.lx, e.clientY - g.ly) < 3) return; // 点を間引く
    if (bs.draft.pts.length >= 2000) return;
    g.lx = e.clientX; g.ly = e.clientY; bs.draft.pts.push([ix, iy]); $('bSvg').innerHTML = curObjs().map(o => objSVG(o, false)).join('') + objSVG(bs.draft, false);
  }
  else if (g.kind === 'arrow'){ bs.draft.x2 = ix; bs.draft.y2 = iy; $('bSvg').innerHTML = curObjs().map(o => objSVG(o, false)).join('') + objSVG(bs.draft, false); }
  else if (g.kind === 'drag'){
    if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < TAP) return;
    g.moved = true;
    const o = curObjs().find(x => x.id === g.oid); if (!o) return;
    Object.assign(o, JSON.parse(g.orig)); shiftObj(o, ix - g.ix, iy - g.iy);
    $('bSvg').innerHTML = curObjs().map(x => objSVG(x, x.id === bs.sel)).join('');
  }
});
function endPtr(e){
  if (!B || !ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (!g) return;
  if (g.kind === 'pinch'){
    // 残りが2本以上ならその2本でピンチをやり直し、1本なら地図の移動へ
    if (ptrs.size >= 2) startPinch();
    else if (ptrs.size === 1) startPan([...ptrs.values()][0], { far: true });
    else g = null;
    return;
  }
  if (ptrs.size) return; // まだ他の指が残っている（3本以上の時など）
  if (g.step != null && g.step !== bs.step){ cancelGesture(); return; }
  const [ix, iy] = toImg(e.clientX, e.clientY);
  if (g.kind === 'pan' && g.place && !g.far && bs.pending){
    const p = bs.pending, o = p.t === 'text' ? { id: uid(), t: 'text', s: p.s, c: '#ffffff', x: ix, y: iy } : { id: uid(), t: 'icon', k: p.k, x: ix, y: iy };
    curObjs().push(o); bs.pending = null; bs.tool = 'select'; bs.sel = o.id; commit();
  }
  else if (g.kind === 'draw'){
    const d = bs.draft; bs.draft = null;
    if (d && d.pts.length > 1){ d.id = uid(); curObjs().push(d); commit(); } else drawBoard();
  }
  else if (g.kind === 'arrow'){
    const d = bs.draft; bs.draft = null;
    if (d && Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > D() * .02){ d.id = uid(); curObjs().push(d); commit(); } else drawBoard();
  }
  else if (g.kind === 'drag'){ if (g.moved) commit(); else drawBoard(); }
  else if (g.kind === 'pan' && g.selTap && !g.far && bs.sel){ bs.sel = null; drawBoard(); }
  g = null;
}
view.addEventListener('pointerup', endPtr);
// 指の取り消し・指を追えなくなった時: 描きかけ・動かしかけは捨てる
view.addEventListener('pointercancel', e => { if (ptrs.has(e.pointerId)) cancelGesture(); });
view.addEventListener('lostpointercapture', e => { if (ptrs.has(e.pointerId) && g && g.kind !== 'pinch') { ptrs.delete(e.pointerId); if (!ptrs.size){ if (g.kind === 'pan') g = null; else cancelGesture(); } } });
window.addEventListener('resize', () => { if (B) fitView(); });

// ---------- バックアップ（index.html の書き出し・読み込みから呼ぶ） ----------
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
// 書き出し: 並んでいる保存を終えてから、土台と作戦図を1回の読み取りでまとめて取る（同じ時点の内容にする）
window.exportBoards = async () => {
  try {
    await saveQueue;
    const db = await idb();
    const got = await new Promise((res, rej) => {
      const tx = db.transaction(['bases', 'boards'], 'readonly'), out = { bases: {}, boards: [] };
      const bs = tx.objectStore('bases'), cur = bs.openCursor();
      cur.onsuccess = () => { const c = cur.result; if (c){ out.bases[c.key] = c.value; c.continue(); } };
      const rb = tx.objectStore('boards').getAll(); rb.onsuccess = () => { out.boards = rb.result; };
      tx.oncomplete = () => res(out); tx.onerror = tx.onabort = () => rej(tx.error);
    });
    const bases = {};
    for (const [k, v] of Object.entries(got.bases)) if (v && v.blob) bases[k] = { data: await blobToDataURL(v.blob), w: v.w, h: v.h, src: v.src || '' };
    return { version: 1, bases, boards: got.boards };
  } catch (e){ return null; }
};
const PLACE_RE = /^(c:[A-Za-z0-9+/=]{1,40}:(Low|Mid|High)|v:[A-Za-z0-9+/=]{1,40})$/;
const ID_RE = /^[a-z0-9]{1,40}$/;
const LIM = { boards: 300, bases: 60, baseBytes: 12e6, points: 20000, objs: 400, steps: 30 };
const ICON_KEYS = () => new Set([
  ...(TIER_DATA.sets.boss.items || []).map(x => 'boss:' + x.id), ...SALMONIDS.map(s => 'sake:' + s[0]),
  ...(TIER_DATA.sets.coopWeapon.items || []).map(x => 'weapon:' + x.id), ...PLAYERS.map(p => 'player:' + p[0]), ...MARKS.map(m => 'mark:' + m[0])]);
function cleanBoard(b, icons){
  if (!b || typeof b !== 'object' || !PLACE_RE.test(b.place) || !Array.isArray(b.steps) || !b.steps.length) return null;
  const w = Math.min(4000, Math.max(1, Number.isFinite(b.w) ? b.w : 1)), h = Math.min(4000, Math.max(1, Number.isFinite(b.h) ? b.h : 1));
  const lim = Math.max(w, h) * 3; // 座標は土台の周りまで
  const num = v => Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0, col = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff';
  const wd = v => [0, 1, 2].includes(v) ? v : 1;
  let points = 0;
  const steps = b.steps.slice(0, LIM.steps).filter(s => s && Array.isArray(s.objs)).map(s => ({ id: uid(), note: String(s.note || '').slice(0, 80),
    objs: s.objs.slice(0, LIM.objs).map(o => {
      if (!o || typeof o !== 'object') return null;
      if (o.t === 'icon' && typeof o.k === 'string' && icons.has(o.k)) return { id: uid(), t: 'icon', k: o.k, x: num(o.x), y: num(o.y) };
      if (o.t === 'text' && typeof o.s === 'string') return { id: uid(), t: 'text', s: o.s.slice(0, 30), c: col(o.c), x: num(o.x), y: num(o.y) };
      if (o.t === 'arrow') return { id: uid(), t: 'arrow', c: col(o.c), wd: wd(o.wd), x1: num(o.x1), y1: num(o.y1), x2: num(o.x2), y2: num(o.y2) };
      if (o.t === 'pen' && Array.isArray(o.pts)){
        const pts = o.pts.slice(0, Math.max(0, Math.min(2000, LIM.points - points))).filter(p => Array.isArray(p)).map(p => [num(p[0]), num(p[1])]);
        points += pts.length;
        return pts.length > 1 ? { id: uid(), t: 'pen', c: col(o.c), wd: wd(o.wd), pts } : null;
      }
      return null;
    }).filter(Boolean) }));
  if (!steps.length) return null;
  return { id: typeof b.id === 'string' && ID_RE.test(b.id) ? b.id : uid(), place: b.place, title: String(b.title || '作戦図').slice(0, 40),
    w, h, steps, created: Number.isFinite(b.created) ? b.created : Date.now(), updated: Number.isFinite(b.updated) ? b.updated : Date.now() };
}
// 読み込み: 今ある土台・作戦図は消さずに追加（同じIDがあれば新しいIDの別の作戦図として入れる）。土台は無い場所だけ入れる。
// 画像は実際に読み込めるか確かめ、取り込みと同じく縮小し直す。戻り値の idMap（元のID→入れたID）でWAVEの割り当てを付け替える
window.importBoards = async data => {
  const res = { boards: 0, bases: 0, idMap: {} };
  if (!data || typeof data !== 'object') return res;
  try {
    const haveBases = new Set(await allBaseKeys());
    const entries = Object.entries(data.bases && typeof data.bases === 'object' ? data.bases : {}).slice(0, LIM.bases);
    for (const [k, v] of entries){
      if (!PLACE_RE.test(k) || haveBases.has(k) || !v || typeof v.data !== 'string' || v.data.length > LIM.baseBytes * 1.4 || !/^data:image\/(png|jpeg|webp);base64,/.test(v.data)) continue;
      try {
        const raw = await (await fetch(v.data)).blob();
        const img = await prepareImage(raw, 0); // 読めない画像はここで失敗する
        await basePut(k, { blob: img.blob, w: img.w, h: img.h, src: String(v.src || '').slice(0, 80), updated: Date.now() }); res.bases++;
      } catch (e){ res.err = true; }
    }
    const haveIds = new Set((await allBoards()).map(b => b.id)), icons = ICON_KEYS();
    for (const raw of (Array.isArray(data.boards) ? data.boards : []).slice(0, LIM.boards)){
      const b = cleanBoard(raw, icons); if (!b){ res.err = true; continue; }
      const orig = raw && typeof raw.id === 'string' ? raw.id : null;
      if (haveIds.has(b.id)){ b.id = uid(); b.title = (b.title + '（読み込み）').slice(0, 40); }
      try { await boardPut(b); } catch (e){ res.err = true; continue; }
      haveIds.add(b.id); res.boards++;
      if (orig) res.idMap[orig] = b.id;
    }
  } catch (e){ res.err = true; }
  statusCache = null;
  return res;
};
})();
