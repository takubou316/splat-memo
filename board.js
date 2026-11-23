// 作戦図（マップの上にアイコン・ペン・矢印・文字を置き、手順でコマ送り）。index.html と tier.js の後に読み込む。
// 土台: サモランはサーモンラーンNW（https://salmon-learn-nw.gungee.jp/）のマップを同梱（作者の許可済み、2026-11-17）。自分のスクショも使える（端末内だけに保存）。
// 設計はCodexと相談（2026-11-17）: タブは増やさずメモタブの「作戦図」に置く／閲覧が初期状態で編集は明示的に開始／
// 1本指で地図を移動・2本指で拡大・全体表示ボタン／アイコンは選んでから地図をタップ／手順は「前へ 手順n/N 次へ」／
// 土台・作戦・WAVEへの割り当てを分ける／画像も作戦もIndexedDBに保存。
// 共有して使うもの: memos, save, load, esc, toast, render, ui, nfkc, memoOf, scenById, TIER_DATA, CONTEST_DATA
'use strict';
(function(){
const LEANNY = 'https://raw.githubusercontent.com/Leanny/splat3/main/images/';
const TIDES = [['Low', '干潮'], ['Mid', '普通'], ['High', '満潮']];
const TIDE_NAME = Object.fromEntries(TIDES);
const COOP_STAGES = ['Q29vcFN0YWdlLTE=', 'Q29vcFN0YWdlLTI=', 'Q29vcFN0YWdlLTc=', 'Q29vcFN0YWdlLTY=', 'Q29vcFN0YWdlLTg=', 'Q29vcFN0YWdlLTQ=', 'Q29vcFN0YWdlLTk='];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// サーモンラーンNW のマップ（作者ガンジーさんの許可を得てアプリに同梱。2026-11-17 XのDMで「アプリ内（リポジトリ内）に直接画像を取り込んでいただいてまったく問題ございません」）
// maps/nw/plain/<NW名>_<潮位>.svg（線画・全ステージ）と maps/nw/model/<NW名>_<潮位>.webp（立体風・5ステージ）。両方とも同じ範囲で切り抜いてあり重なる。
// 値は [幅, 高さ, 立体風があるか]（NWの1016枠での大きさ）。作戦図の座標はこれを NW_K 倍した大きさ（拡大してもぼやけにくいよう大きめに描く）
// 取り込み直しは tools/nw_maps.py（範囲は tools/nw_maps_bbox.json。詳しくは maps/nw/README.md）
const NW_MAPS = {"Shakespiral_Low":[616,664,1],"Shakespiral_Mid":[388,415,1],"Shakespiral_High":[296,244,1],"Shakedent_Low":[536,587,1],"Shakedent_Mid":[414,306,1],"Shakedent_High":[244,211,1],"Shakeup_Low":[702,679,1],"Shakeup_Mid":[447,515,1],"Shakeup_High":[352,227,1],"Shakeship_Low":[701,509,1],"Shakeship_Mid":[433,438,1],"Shakeship_High":[373,159,1],"Shakehighway_Low":[576,657,0],"Shakehighway_Mid":[395,350,0],"Shakehighway_High":[288,213,0],"Shakelift_Low":[659,489,0],"Shakelift_Mid":[362,421,0],"Shakelift_High":[259,283,0],"Shakerail_Low":[710,607,1],"Shakerail_Mid":[433,407,1],"Shakerail_High":[254,338,1]};
const NW_K = 4;
const NW_NAME = 'サーモンラーンNW';
const NW_URL = 'https://salmon-learn-nw.gungee.jp/';
// 場所キー → NWのマップ名（'Shakeup_Mid' など）。バトル・ビッグランなど無いものは null
function nwKey(p){
  const a = String(p).split(':');
  if (a[0] !== 'c' || typeof COOP_INTERNAL === 'undefined') return null;
  const k = COOP_INTERNAL[a[1]] + '_' + a[2];
  return NW_MAPS[k] ? k : null;
}
const nwSize = k => ({ w: NW_MAPS[k][0] * NW_K, h: NW_MAPS[k][1] * NW_K });
const nwImg = (k, bg) => bg === 'nw3d' && NW_MAPS[k][2] ? 'maps/nw/model/' + k + '.webp' : 'maps/nw/plain/' + k + '.svg';
const isNwBg = b => b && (b.bg === 'nw' || b.bg === 'nw3d');
// 作戦図の土台の画像。{ url, own }（own=true は自分で開いた Object URL なので使い終わったら解放する）。無ければ null
async function boardBgUrl(b){
  if (isNwBg(b)){ const k = nwKey(b.place); return k ? { url: nwImg(k, b.bg), own: false } : null; }
  const base = await baseGet(b.place).catch(() => null);
  return base ? { url: URL.createObjectURL(base.blob), own: true } : null;
}
function creditOf(b){
  return isNwBg(b) ? 'マップ: ' + NW_NAME + '（作者の許可を得て使用）' : '土台: 自分で撮ったスクショ';
}

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
.bpl-own{margin-top:14px}
.bswrow{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none;margin:-4px -16px 12px;padding:2px 16px}
.bswrow::-webkit-scrollbar{display:none}
.bswrow .lbl{flex:none;font-size:11px;font-weight:600;color:var(--faint)}
.bswrow button{flex:none;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;color:var(--sub);background:var(--card);border:1px solid var(--line)}
.bswrow button.on{color:#1a1020;background:var(--salmon);border-color:var(--salmon)}
.bpl-own summary{font-size:13px;font-weight:600;color:var(--sub);padding:10px 2px;cursor:pointer}
.bpl-own[open] summary{margin-bottom:4px}
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
#bHint{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:2;background:rgba(255,122,61,.92);color:#1a1020;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;display:none;max-width:70%;text-align:center}
#bSaved{position:absolute;left:10px;top:12px;z-index:2;font-size:11px;color:var(--faint)}
#bCredit{position:absolute;left:10px;bottom:6px;z-index:2;font-size:10px;color:rgba(255,255,255,.45)}
#bBottom{flex:none;background:var(--nav);border-top:1px solid var(--line);padding:8px 10px calc(10px + env(safe-area-inset-bottom))}
.bsheet-bg{position:fixed;inset:0;z-index:26;background:#0008;display:flex;align-items:flex-end}
.bsheet{width:100%;max-height:78vh;overflow-y:auto;background:var(--bg);border-radius:18px 18px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}
.bsheet h3{margin:0 0 10px;font-size:15px;font-weight:600}
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

// 特殊WAVE（2026-11-18 ユーザー要望「特殊WAVEを選択できるようにしたい」→ 作戦図ごとに付ける）。作戦図の sw に [0] を入れる（'' = 通常）。
// [2] は起きる潮位（攻略＆検証wiki「特殊な状況」で確認: ドスコイ大量発生・巨大タツマキは干潮のみ、ラッシュ・グリル発進・キンシャケ探し・ドロシャケ噴出は干潮では起きない）。
// [1] の名前は contest-data.js の event と同じ（ばちこんのWAVEから作る時に自動で選ぶ）
const SW = [['', '通常', 'Low Mid High'], ['rush', 'ラッシュ', 'Mid High'], ['fog', '霧', 'Low Mid High'], ['griller', 'グリル発進', 'Mid High'],
  ['goldie', 'キンシャケ探し', 'Mid High'], ['mudmouth', 'ドロシャケ噴出', 'Mid High'], ['mothership', 'ハコビヤ襲来', 'Low Mid High'],
  ['cohock', 'ドスコイ大量発生', 'Low'], ['tornado', '巨大タツマキ', 'Low']];
const swName = k => (SW.find(s => s[0] === (k || '')) || SW[0])[1];
const swByName = n => (SW.find(s => s[1] === n) || SW[0])[0];
const swFor = p => { const a = String(p).split(':'); return a[0] === 'c' ? SW.filter(s => s[2].split(' ').includes(a[2])) : []; }; // その場所で起きる特殊WAVE（バトルは無し）
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
// タマヒロイは Leanny の coopEnemy に絵が無い（2026-11-17確認、404で「?」になっていた）ので、同じ Leanny のナワバトラーのカードの絵
// （images/minigame/card/Tamahiroi.png）から絵の部分を正方形に切り取った img/tamahiroi.png を使う
// 狂シャケ（ラッシュで出る凶暴なシャケの通称）は専用の絵が無く見た目もシャケと同じなので、シャケの絵に赤い縁と「狂」の印を付けて見分ける（[3] が印）
const SALMONIDS = [['SakeFlyBagman', 'タマヒロイ', 'img/tamahiroi.png'], ['SakelienGolden', 'キンシャケ'], ['SakelienLarge', 'ドスコイ'], ['SakelienStandard', 'シャケ'], ['SakelienRush', '狂シャケ', LEANNY + 'coopEnemy/SakelienStandard.png', '狂'],
  ['SakelienSmall', 'コジャケ'], ['SakeBigMouth', 'ドロシャケ'], ['SakeCopter', 'シャケコプター'], ['Sakedozer', 'グリル']];
const MARKS = [['カゴ', '#e6cf4a'], ['湧き', '#ff5aa5'], ['！', '#ff4d4d'], ['✕', '#9b96ad'], ['★', '#ffd23d'], ['集合', '#2fd6a8']];
const COLORS = ['#ffffff', '#ff7a3d', '#ff4d4d', '#ffd23d', '#4fd27a', '#4a90ff', '#ff5aa5'];
// ハエ（ラッシュでヒカリバエに狙われている人）の印の色。プレイヤーのアイコンにだけ付け、1つの手順では1人だけ（2026-11-18 ユーザー要望）
const FLY_C = '#e8ff3a';
const isPlayer = o => o && o.t === 'icon' && typeof o.k === 'string' && o.k.startsWith('player:');
// 1つの手順のハエを1人にそろえる（keep を渡さなければ最初の1人を残す、null なら全員外す）。編集・読み込みで同じ規則を使う
function normFly(objs, keep){ let first = keep === undefined ? objs.find(o => o.fly && isPlayer(o)) : keep; objs.forEach(o => { if (o.fly && (o !== first || !isPlayer(o))) delete o.fly; }); }
function iconInfo(k){
  const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
  if (kind === 'boss'){ const x = (TIER_DATA.sets.boss.items || []).find(i => i.id === id); return { label: x ? x.name : id, img: x ? x.img : LEANNY + 'coopEnemy/' + id + '.png' }; }
  if (kind === 'sake'){ const x = SALMONIDS.find(s => s[0] === id); return { label: x ? x[1] : id, img: x && x[2] ? x[2] : LEANNY + 'coopEnemy/' + id + '.png', badge: x && x[3] || '' }; }
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
    const counts = {}, own = {}; boards.forEach(b => { counts[b.place] = (counts[b.place] || 0) + 1; if (!isNwBg(b)) own[b.place] = (own[b.place] || 0) + 1; });
    statusCache = { bases: new Set(keys), counts, own };
  } catch (e){ statusCache = { bases: new Set(), counts: {}, own: {}, err: true }; }
  return statusCache;
}
function placeStatus(p){
  if (!statusCache) return ['…', ''];
  const n = statusCache.counts[p] || 0, b = statusCache.bases.has(p);
  return n ? ['作戦' + n, 'has'] : nwKey(p) ? ['マップあり', 'base'] : b ? ['土台のみ', 'base'] : ['未登録', ''];
}
window.renderBoardList = function(kind){
  let h = '<div class="bp-credit">' + (kind === 'coop' ? 'サーモンランのマップは<a href="' + NW_URL + '" target="_blank" rel="noopener">' + NW_NAME + '</a>のものを、作者のガンジーさんの許可を得て使っています。自分のスクショを土台にもできます。'
    : 'バトルのマップの土台は、自分で撮ったスクショを使います。画像はこのスマホの中だけに保存されます。') + '</div>';
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
  // sw: 特殊WAVEで絞る（null = すべて）。ばちこんのWAVEから来たら、そのWAVEの特殊WAVE（無ければ通常）を選んでおく
  let sw0 = null;
  if (assign && p[0] === 'c' && typeof scenById === 'function'){ const s = scenById(assign.sid), w = s && Array.isArray(s.waves) && s.waves[assign.wave - 1]; if (w) sw0 = swByName(w.event || ''); }
  pl = { place: p, assign: assign || null, pending: null, baseUrl: null, sw: sw0 };
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
  const swList = swFor(pl.place), swSel = pl.sw;
  if (swSel != null) boards = boards.filter(b => (b.sw || '') === swSel);
  const swSuffix = swSel ? '（' + swName(swSel) + '）' : '';
  if (pl.baseUrl){ URL.revokeObjectURL(pl.baseUrl); pl.baseUrl = null; }
  const coop = pl.place[0] === 'c', nk = nwKey(pl.place);
  // 自分のスクショを土台にする部分（バトルはこれだけ。サモランはNWのマップが基本で、これは畳んでおく）
  let own = '';
  if (pl.pending){
    own += '<div class="bpl-base"><div class="psh">この画像を「' + esc(placeName(pl.place)) + '」の土台にします</div><img src="' + pl.pending.url + '" style="transform:rotate(' + pl.pending.rot + 'deg)" alt="">' +
      '<div class="bbtn-row"><button class="bbtn" data-brot="-90">↺ 左に回す</button><button class="bbtn" data-brot="90">↻ 右に回す</button></div>' +
      '<button class="bbtn main" data-bsave="1">この画像で登録</button><button class="bbtn sub" data-bcancel="1">やめる</button></div>';
  } else if (base){
    pl.baseUrl = URL.createObjectURL(base.blob);
    own += '<div class="bpl-base"><div class="psh">自分のスクショ</div><img src="' + pl.baseUrl + '" alt="">' +
      '<button class="bbtn' + (nk ? '' : ' main') + '" data-bnew="own">＋ このスクショで作戦図を作る' + swSuffix + '</button>' +
      '<button class="bbtn sub" data-bpick="1">別の画像で登録し直す</button></div>';
  } else {
    own += '<div class="bpl-base"><div class="bpl-empty">' + (nk ? '' : '<b style="color:var(--text);font-size:14px">' + esc(placeName(pl.place)) + 'の土台がまだありません</b>') +
      '<ol class="bpl-steps">' + (coop ? '<li>使いたいマップの画面をスクショする</li><li>写真アプリでマップの部分だけに切り抜く</li><li>このアプリに戻って「写真から選ぶ」</li>'
        : '<li>ゲームのバトル中にXボタンでマップを出してスクショ（Switchの撮影ボタン）</li><li>スマホに送って、写真アプリでマップの部分だけに切り抜く</li><li>このアプリに戻って「写真から選ぶ」</li>') + '</ol></div>' +
      '<button class="bbtn' + (nk ? '' : ' main') + '" data-bpick="1">写真から選ぶ</button></div>';
  }
  let h = '';
  // 特殊WAVEの選択（サモランだけ。その潮位で起きるものだけ出す）
  if (swList.length) h += '<div class="bswrow"><span class="lbl">特殊WAVE</span>' + [['*', 'すべて']].concat(swList.map(s => [s[0], s[1]])).map(([k, n]) =>
    '<button data-bsw="' + k + '" class="' + ((k === '*' ? swSel == null : swSel === k) ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  if (nk){
    h += '<div class="bpl-base"><div class="psh">マップ（' + NW_NAME + '）</div><img src="' + esc(nwImg(nk, 'nw')) + '" alt="' + esc(placeName(pl.place)) + 'のマップ">' +
      '<button class="bbtn main" data-bnew="nw">＋ この地図で作戦図を作る' + swSuffix + '</button></div>';
  } else h += own;
  h += '<div class="sec">作戦図</div><div class="bpl-list">';
  if (!boards.length) h += '<div class="empty" style="padding:14px">' + (swSel != null ? swName(swSel) + 'の作戦図はまだありません。' + (nk ? '上の「この地図で作戦図を作る」で' + swName(swSel) + 'の作戦図を作れます' : '') : nk ? 'まだありません。上の「この地図で作戦図を作る」から始められます' : base ? '土台は登録済みです。「このスクショで作戦図を作る」から始められます' : '土台を登録すると作れます') + '</div>';
  boards.forEach(b => {
    h += '<div class="row"><button class="rinfo" style="text-align:left;color:var(--text)" data-bopen="' + esc(b.id) + '"><div class="rname">' + esc(b.title) + '</div><div class="rprev">' +
      (b.sw ? swName(b.sw) + '・' : '') + (isNwBg(b) ? 'NWのマップ' : '自分のスクショ') + '・手順' + b.steps.length + '・' + fmtDate(b.updated) + '</div></button>' +
      (pl.assign ? '<button class="use" data-buse="' + esc(b.id) + '">このWAVEに使う</button>' : '') + '</div>';
  });
  h += '</div>' + (pl.assign && memoOf(bdKey(pl.assign.sid, pl.assign.wave)) ? '<button class="bbtn sub" data-bunassign="1">このWAVEの割り当てを外す</button>' : '');
  if (nk) h += '<details class="bpl-own"' + (pl.pending || base ? ' open' : '') + '><summary>自分のスクショを土台にする</summary>' + own + '</details>';
  h += '<div class="bp-credit">' + (nk ? 'マップは<a href="' + NW_URL + '" target="_blank" rel="noopener">' + NW_NAME + '</a>のものを、作者のガンジーさんの許可を得て使っています。'
    : '土台の画像は自分で撮ったスクショです。このスマホの中だけに保存されます。') + '</div>';
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
    if (!d.bconfirmed && statusCache && statusCache.own[pl.place] && !confirm('この場所の「自分のスクショ」の作戦図は、今の画像に合わせて置いてあります。別の画像にすると位置がずれることがあります。登録し直しますか？')) return;
    $('bplaceFile').click();
  }
  else if (d.bsw != null){ pl.sw = d.bsw === '*' ? null : d.bsw; drawPlace(); } // 「通常」は data-bsw=""（空）なので有無で見る
  else if (d.brot){ pl.pending.rot = (pl.pending.rot + (+d.brot) + 360) % 360; drawPlace(); }
  else if (d.bcancel){ URL.revokeObjectURL(pl.pending.url); pl.pending = null; drawPlace(); }
  else if (d.bsave){
    // 待っている間に画面が変わっても、選んだ場所（key）にだけ保存する
    const my = pl, key = pl.place, pend = pl.pending;
    t.disabled = true; t.textContent = '登録しています…';
    try {
      const img = await prepareImage(pend.file, pend.rot);
      await basePut(key, { blob: img.blob, w: img.w, h: img.h, src: '自分で撮ったスクショ', updated: Date.now() });
      URL.revokeObjectURL(pend.url);
      if (pl === my) pl.pending = null;
      await loadStatus(); toast('土台を登録しました');
      if (pl === my) drawPlace();
    } catch (err){ if (pl === my){ t.disabled = false; t.textContent = 'この画像で登録'; } toast('登録できませんでした（画像を読み込めないか、空き容量が足りません）'); }
  }
  else if (d.bnew){
    const my = pl, key = pl.place, assign = pl.assign;
    t.disabled = true;
    let size = null, bg = 'own';
    if (d.bnew === 'nw'){ const nk = nwKey(key); if (nk){ size = nwSize(nk); bg = 'nw'; } }
    else { const base = await baseGet(key).catch(() => null); if (base) size = { w: base.w, h: base.h }; }
    if (!size || pl !== my){ t.disabled = false; return; }
    await loadStatus();
    if (pl !== my){ t.disabled = false; return; }
    const n = ((statusCache && statusCache.counts[key]) || 0) + 1, sw = swFor(key).some(s => s[0] === my.sw) ? my.sw : '';
    const b = { id: uid(), place: key, title: placeName(key) + (sw ? ' ' + swName(sw) : '') + ' ' + n, autoTitle: true, w: size.w, h: size.h, bg, sw,
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
// 2026-11-17 valo-memo の作戦ボード（ユーザーいわく「めっちゃ使いやすくした」）に合わせて作り直し。スマホ向けに:
//  ・アイコンは画面下の帯にいつも出しておく（押してから地図をタップ、または上へ引っぱって地図に落とす）
//  ・道具は 選ぶ/ペン/矢印/直線/四角/丸/文字/消しゴム、色と太さはそのすぐ下
//  ・手順は番号のボタンで直接切り替え、＋で今の手順を写して追加、▶ 再生で手順の間を動かして見せる（写した物は同じIDのまま）
//  ・選んだ物は、その場で色・太さ・大きさ・文字・複製・削除（入力の小窓を開かない）
//  ・「向きを回す」で地図を90°ずつ回せる（作戦図ごとに覚える）
const css2 = `
#board .ehead{gap:6px}
#bTop{flex:none;background:var(--nav);border-bottom:1px solid var(--line);padding:6px 8px 4px;display:none}
#board.editing #bTop{display:block}
.btl{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
.btl::-webkit-scrollbar{display:none}
.btl button{flex:none;min-width:46px;min-height:44px;border-radius:10px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:10px;font-weight:600;color:var(--sub);padding:2px 6px}
.btl button .gl{font-size:16px;line-height:1.1;color:var(--text)}
.btl button.on{background:var(--salmon);border-color:var(--salmon);color:#1a1020}
.btl button.on .gl{color:#1a1020}
.bopt{display:flex;gap:6px;align-items:center;min-height:36px;overflow-x:auto;scrollbar-width:none}
.bopt::-webkit-scrollbar{display:none}
.bopt .col{flex:none;width:28px;height:28px;border-radius:50%;border:2px solid transparent}
.bopt .col.on{border-color:#fff;box-shadow:0 0 0 2px var(--nav) inset}
.bopt .seg3{flex:none;display:flex;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:2px}
.bopt .seg3 button{min-width:38px;height:28px;border-radius:6px;font-size:11px;font-weight:600;color:var(--sub)}
.bopt .seg3 button.on{background:var(--card2);color:var(--text)}
.bopt .act{flex:none;height:32px;padding:0 11px;border-radius:8px;background:var(--card);border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--text)}
.bopt .act.del{color:#ff8a8a}
.bopt .act.fly{height:36px;color:${FLY_C};background:var(--card);border-color:${FLY_C}}
.bopt .act.fly.on{color:#1a1020;background:${FLY_C}}
.bfly{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:13px;font-weight:600;color:var(--text)}
.bfly b{font-size:11px;color:#1a1020;background:${FLY_C};border-radius:999px;padding:2px 8px}
.bopt .lbl{flex:none;font-size:10px;color:var(--faint);font-weight:600}
.bopt input{flex:1;min-width:90px;height:32px;background:var(--card);border:1px solid var(--line2);border-radius:8px;color:var(--text);font:inherit;font-size:16px;padding:0 8px}
.bvbtns{position:absolute;right:8px;top:8px;z-index:2;display:flex;flex-direction:column;gap:6px}
.bvbtns button{background:rgba(20,18,28,.85);border:1px solid var(--line2);border-radius:999px;padding:6px 11px;font-size:11px;font-weight:600;color:var(--text)}
#bBottom{padding:6px 8px calc(8px + env(safe-area-inset-bottom))}
.bstrip{margin-bottom:6px}
.bcats{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;margin-bottom:4px}
.bcats::-webkit-scrollbar{display:none}
.bcats button{flex:none;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;color:var(--sub);background:var(--card);border:1px solid var(--line)}
.bcats button.on{color:#1a1020;background:var(--salmon);border-color:var(--salmon)}
.bicons{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;touch-action:pan-x;padding-bottom:2px}
.bicons::-webkit-scrollbar{display:none}
.bicons button{flex:none;width:54px;display:flex;flex-direction:column;align-items:center;gap:1px;border-radius:10px;padding:3px 0;font-size:9px;color:var(--sub);line-height:1.15;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.bicons button img,.bicons button .mk{width:40px;height:40px;object-fit:contain;border-radius:50%;background:#0b0a12;border:1px solid var(--line2);pointer-events:none}
.bicons button .mk{display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#1a1020;border:0}
.bicons button span{width:52px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.bicons .bimg{position:relative;display:block;width:40px;height:40px;overflow:visible}
.bicons .bdg img{border:2px solid #ff4d4d}
.bicons .bimg i{position:absolute;right:-3px;top:-3px;width:17px;height:17px;border-radius:50%;background:#ff4d4d;color:#fff;font-style:normal;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1px solid #0b0a12}
.bicons button.on{background:rgba(255,122,61,.18);color:var(--salmon)}
.bghost{position:fixed;left:0;top:0;z-index:60;pointer-events:none;width:52px;height:52px;border-radius:50%;background:#0b0a12;border:2px solid #fff;box-shadow:0 6px 18px #000a;display:flex;align-items:center;justify-content:center;font-weight:700;color:#1a1020}
.bghost img{width:44px;height:44px;object-fit:contain}
.bsteprow{display:flex;gap:4px;align-items:center;overflow-x:auto;scrollbar-width:none}
.bsteprow::-webkit-scrollbar{display:none}
.bsteprow .sn{flex:none;min-width:40px;height:40px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-size:14px;font-weight:700;color:var(--sub)}
.bsteprow .sn.on{background:var(--salmon);border-color:var(--salmon);color:#1a1020}
.bsteprow .sx{flex:none;height:40px;padding:0 12px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--text)}
.bsteprow .sx.play{color:var(--salmon)}
.bsteprow .sx.del{color:#ff8a8a}
.bsteprow .lab{flex:none;font-size:10px;color:var(--faint);font-weight:600;margin-right:2px}
.bmemo{margin-top:6px}
.bmemo textarea{width:100%;min-height:38px;max-height:84px;resize:none;background:var(--card);border:1px solid var(--line);border-radius:10px;color:var(--text);font:inherit;font-size:16px;line-height:1.4;padding:7px 10px}
.bmemo .vt{font-size:13px;color:var(--text);padding:2px 4px;white-space:pre-wrap;word-break:break-word}
.bmemo .vt.none{color:var(--faint)}
`;
const st2 = document.createElement('style'); st2.textContent = css2; document.head.appendChild(st2);

const TOOLS = [['select', '↖', '選ぶ'], ['pen', '✎', 'ペン'], ['arrow', '➜', '矢印'], ['line', '／', '直線'], ['rect', '▭', '四角'], ['circle', '◯', '丸'], ['text', 'A', '文字'], ['erase', '⌫', '消しゴム']];
const WD_LABEL = [['細い', 0], ['ふつう', 1], ['太い', 2]];
const SZ_LABEL = [['小', 0], ['中', 1], ['大', 2]];
const bv = document.createElement('div'); bv.id = 'board'; bv.className = 'ovl';
bv.innerHTML = '<div class="ehead"><button class="back" id="bBack">‹ 戻る</button><button id="bTitle"></button>' +
  '<button class="hb" id="bUndo" aria-label="取り消し">↶</button><button class="hb" id="bRedo" aria-label="やり直し">↷</button><button class="hb main" id="bMode">編集</button></div>' +
  '<div id="bTop"></div>' +
  '<div id="bView"><div id="bStage"><img id="bImg" alt=""><svg id="bSvg" xmlns="http://www.w3.org/2000/svg"></svg></div>' +
  '<div class="bvbtns"><button id="bFitBtn">全体を表示</button><button id="bRot">⟳ 向きを回す</button><button id="bStyle"></button></div>' +
  '<div id="bHint"></div><div id="bSaved"></div><div id="bCredit"></div></div>' +
  '<div id="bBottom"></div>';
document.body.appendChild(bv);

let B = null;      // 開いている作戦図
let bs = null;     // 画面の状態
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
  const bgImg = await boardBgUrl(b).catch(() => null);
  if (my !== openSeq || B || pl !== plAt || (play && play.wave) !== playAt){ if (bgImg && bgImg.own) URL.revokeObjectURL(bgImg.url); return; }
  B = b; if (![0, 90, 180, 270].includes(B.rot)) B.rot = 0;
  const last = load('sm_lasticons', []);
  bs = { edit: !!opts.edit, step: 0, tool: 'select', color: COLORS[1], wd: 1, sel: null, pending: null, view: null, wave: opts.wave, imgUrl: null,
    hist: [JSON.stringify(b.steps)], hi: 0, lastIcons: Array.isArray(last) ? last : [], ver: 0, savedVer: 0, cat: 'boss', playing: null };
  if (bgImg){ bs.imgUrl = bgImg.url; bs.imgOwn = bgImg.own; }
  $('bImg').src = bs.imgUrl || '';
  $('bImg').width = B.w; $('bImg').height = B.h;
  const svg = $('bSvg'); svg.setAttribute('width', B.w); svg.setAttribute('height', B.h); svg.setAttribute('viewBox', '0 0 ' + B.w + ' ' + B.h);
  bv.classList.add('open');
  history.pushState({ board: true }, '');
  $('bSaved').textContent = '';
  drawBoard(); requestAnimationFrame(fitView);
}
function closeBoard(fromPop){
  openSeq++; // 読み込み中の openBoard を無効にする
  if (!B) return;
  stopPlay(); cancelGesture(); endStripDrag(true); flushInputs();
  if (bs.imgUrl && bs.imgOwn) URL.revokeObjectURL(bs.imgUrl);
  B = null; bs = null; bv.classList.remove('open', 'editing'); closeBSheet();
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

// ---- 表示（拡大・移動・回転）----
// 画面上の点 P = T + s*(C + R(p - C))（C は土台の中心、R は回転）。逆に p = C + R⁻¹((P - T)/s - C)
const rad = () => (B.rot || 0) * Math.PI / 180;
// 拡大率が変わった時の描き直し（1コマに1回まで）
let redrawRaf = 0;
function redrawSoon(){ if (redrawRaf) return; redrawRaf = requestAnimationFrame(() => { redrawRaf = 0; if (B && bs && !bs.playing) drawSvg(); }); }
function applyView(){
  const v = bs.view, cx = B.w / 2, cy = B.h / 2;
  $('bStage').style.transform = 'translate(' + v.tx + 'px,' + v.ty + 'px) scale(' + v.s + ') translate(' + cx + 'px,' + cy + 'px) rotate(' + (B.rot || 0) + 'deg) translate(' + (-cx) + 'px,' + (-cy) + 'px)';
}
function fitView(){
  if (!B) return;
  const r = $('bView').getBoundingClientRect(), side = (B.rot || 0) % 180 !== 0;
  const rw = side ? B.h : B.w, rh = side ? B.w : B.h;
  const s = Math.min(r.width / rw, r.height / rh) * 0.96;
  bs.view = { s, tx: r.width / 2 - s * B.w / 2, ty: r.height / 2 - s * B.h / 2, fit: s, fitted: true }; // fitted: 全体表示のまま（動かしたら false）
  applyView(); redrawSoon();
}
function toImg(px, py){
  const r = $('bView').getBoundingClientRect(), v = bs.view, a = -rad();
  const qx = (px - r.left - v.tx) / v.s - B.w / 2, qy = (py - r.top - v.ty) / v.s - B.h / 2;
  return [B.w / 2 + qx * Math.cos(a) - qy * Math.sin(a), B.h / 2 + qx * Math.sin(a) + qy * Math.cos(a)];
}
function toScreen(ix, iy){ // 画面のビューの中の座標（左上が0）
  const v = bs.view, a = rad(), dx = ix - B.w / 2, dy = iy - B.h / 2;
  return [v.tx + v.s * (B.w / 2 + dx * Math.cos(a) - dy * Math.sin(a)), v.ty + v.s * (B.h / 2 + dx * Math.sin(a) + dy * Math.cos(a))];
}

// ---- 描く ----
// 大きさは土台の長い辺に対する割合（拡大すると一緒に大きくなる）
const SZ = { icon: [0.035, 0.045, 0.06], text: [0.024, 0.032, 0.046], wd: [0.004, 0.007, 0.012] };
const wdOf = o => SZ.wd[[0, 1, 2].includes(o.wd) ? o.wd : 1];
const szOf = (arr, o) => arr[[0, 1, 2].includes(o.sz) ? o.sz : 1];
function upright(x, y){ return B.rot ? ' transform="rotate(' + (-B.rot) + ' ' + x + ' ' + y + ')"' : ''; } // 地図を回してもアイコン・文字は立てたまま
function hitAndSel(d, path, w, selected){
  return '<path d="' + path + '" stroke="transparent" stroke-width="' + Math.max(w * 4, d * .03) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    (selected ? '<path d="' + path + '" stroke="#fff" stroke-width="' + (w + d * .006) + '" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' : '');
}
// アイコンの大きさ（2026-11-18 ユーザー「アイコンがでかすぎて重なったときにみえない」）: 開いている作戦図では、拡大・縮小しても
// 画面上の見た目の大きさ（直径 ICON_PX）を変えない（拡大すると間が空いて重なりがほどける。valo-memo・NWと同じ考え方）。
// 小さな絵（thumbMode）では地図に対する大きさ（SZ.icon）で描く。拡大率が変わったら drawSvg で描き直す
const ICON_PX = [22, 30, 40];
let thumbMode = false;
function iconR(o){
  const i = [0, 1, 2].includes(o.sz) ? o.sz : 1;
  if (!thumbMode && bs && bs.view && bs.view.s > 0) return ICON_PX[i] / 2 / bs.view.s;
  return D() * SZ.icon[i] / 2;
}function objSVG(o, selected, alpha){
  const d = D(), id = esc(o.id), sel = selected ? ' sel' : '', op = alpha != null && alpha < 1 ? ' opacity="' + alpha.toFixed(2) + '"' : '';
  const g0 = '<g class="bo' + sel + '" data-oid="' + id + '"' + op + '>';
  if (o.t === 'icon'){
    const info = iconInfo(o.k), r = iconR(o);
    let g = g0 + '<g' + upright(o.x, o.y) + '><circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.35) + '" fill="transparent"/>';
    if (info.img) g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + r + '" fill="#0b0a12" stroke="' + (info.badge ? '#ff4d4d' : 'rgba(255,255,255,.75)') + '" stroke-width="' + (r * (info.badge ? .16 : .07)) + '"/><image href="' + esc(info.img) + '" x="' + (o.x - r * .85) + '" y="' + (o.y - r * .85) + '" width="' + (r * 1.7) + '" height="' + (r * 1.7) + '"/>' +
      (info.badge ? '<circle cx="' + (o.x + r * .72) + '" cy="' + (o.y - r * .72) + '" r="' + (r * .42) + '" fill="#ff4d4d" stroke="#0b0a12" stroke-width="' + (r * .07) + '"/><text x="' + (o.x + r * .72) + '" y="' + (o.y - r * .72) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (r * .52) + '" font-weight="700" fill="#fff">' + esc(info.badge) + '</text>' : '');
    else g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + r + '" fill="' + esc(info.color) + '" stroke="#0b0a12" stroke-width="' + (r * .1) + '"/><text x="' + o.x + '" y="' + o.y + '" text-anchor="middle" dominant-baseline="central" font-size="' + (r * (info.mark.length > 1 ? .7 : 1.1)) + '" font-weight="700" fill="#1a1020">' + esc(info.mark) + '</text>';
    // ハエ（ラッシュでヒカリバエに狙われている人）: 黄色く光る縁と、上に「ハエ」の札
    // 白い地図でも見えるよう暗い下地の上に黄色の縁。札は小さくなりすぎないよう最小の大きさを決め、土台の上端に近ければ下に出す
    if (o.fly){ const fs = r * .9, pw = fs * 2.5, up = o.y - r * 1.15 - fs * 1.1, py = up - fs * .75 < 0 ? o.y + r * 1.15 + fs * 1.1 : up;
      g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.12) + '" fill="none" stroke="#0b0a12" stroke-width="' + (r * .42) + '"/><circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.22) + '" fill="none" stroke="' + FLY_C + '" stroke-opacity=".5" stroke-width="' + (r * .5) + '"/><circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.08) + '" fill="none" stroke="' + FLY_C + '" stroke-width="' + (r * .16) + '"/>' +
        '<rect x="' + (o.x - pw / 2) + '" y="' + (py - fs * .75) + '" width="' + pw + '" height="' + (fs * 1.5) + '" rx="' + (fs * .75) + '" fill="' + FLY_C + '" stroke="#0b0a12" stroke-width="' + (r * .07) + '"/><text x="' + o.x + '" y="' + py + '" text-anchor="middle" dominant-baseline="central" font-size="' + fs + '" font-weight="700" fill="#1a1020">ハエ</text>'; }
    if (selected) g += '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + (r * 1.25) + '" fill="none" stroke="#fff" stroke-dasharray="' + (r * .3) + '" stroke-width="' + (r * .1) + '"/>';
    return g + '</g></g>';
  }
  if (o.t === 'pen'){
    const p = o.pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(''), w = d * wdOf(o);
    return g0 + hitAndSel(d, p, w, selected) + '<path d="' + p + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }
  if (o.t === 'line'){
    const p = 'M' + o.x1 + ' ' + o.y1 + 'L' + o.x2 + ' ' + o.y2, w = d * wdOf(o);
    return g0 + hitAndSel(d, p, w, selected) + '<path d="' + p + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" stroke-linecap="round"/></g>';
  }
  if (o.t === 'arrow'){
    const w = d * wdOf(o), ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), hl = Math.max(w * 4, d * .025);
    const hx = o.x2 - Math.cos(ang) * hl, hy = o.y2 - Math.sin(ang) * hl, nx = -Math.sin(ang) * hl * .55, ny = Math.cos(ang) * hl * .55;
    return g0 + hitAndSel(d, 'M' + o.x1 + ' ' + o.y1 + 'L' + o.x2 + ' ' + o.y2, w, selected) +
      '<path d="M' + o.x1 + ' ' + o.y1 + 'L' + hx + ' ' + hy + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M' + o.x2 + ' ' + o.y2 + 'L' + (hx + nx) + ' ' + (hy + ny) + 'L' + (hx - nx) + ' ' + (hy - ny) + 'Z" fill="' + esc(o.c) + '"/></g>';
  }
  if (o.t === 'rect'){
    const w = d * wdOf(o), p = 'M' + o.x + ' ' + o.y + 'h' + o.w + 'v' + o.h + 'h' + (-o.w) + 'Z';
    return g0 + hitAndSel(d, p, w, selected) + '<path d="' + p + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" fill="' + esc(o.c) + '" fill-opacity=".12" stroke-linejoin="round"/></g>';
  }
  if (o.t === 'circle'){
    const w = d * wdOf(o), p = 'M' + (o.x - o.r) + ' ' + o.y + 'a' + o.r + ' ' + o.r + ' 0 1 0 ' + (o.r * 2) + ' 0a' + o.r + ' ' + o.r + ' 0 1 0 ' + (-o.r * 2) + ' 0';
    return g0 + hitAndSel(d, p, w, selected) + '<path d="' + p + '" stroke="' + esc(o.c) + '" stroke-width="' + w + '" fill="' + esc(o.c) + '" fill-opacity=".12"/></g>';
  }
  if (o.t === 'text'){
    const fs = d * szOf(SZ.text, o), s = String(o.s || '');
    return g0 + '<g' + upright(o.x, o.y) + '><text x="' + o.x + '" y="' + o.y + '" text-anchor="middle" dominant-baseline="central" font-size="' + fs + '" font-weight="700" fill="' + esc(o.c) + '" stroke="#0b0a12" stroke-width="' + (fs * .22) + '" paint-order="stroke" style="font-family:-apple-system,\'Hiragino Sans\',sans-serif">' + esc(s) + '</text>' +
      '<rect x="' + (o.x - fs * Math.max(1, s.length) * .55) + '" y="' + (o.y - fs * .8) + '" width="' + (fs * Math.max(1, s.length) * 1.1) + '" height="' + (fs * 1.6) + '" fill="transparent"' + (selected ? ' stroke="#fff" stroke-dasharray="' + (d * .008) + '" stroke-width="' + (d * .003) + '"' : '') + '/></g></g>';
  }
  return '';
}
function drawSvg(){ $('bSvg').innerHTML = curObjs().map(o => objSVG(o, bs.sel === o.id)).join('') + (bs.draft ? objSVG(bs.draft, false) : ''); }
// 打ちかけの文字（選んだ文字・手順のメモ）は打つたびに中身へ入れ、確定（change）を待たずに、
// 描き直し・手順の切り替え・閉じる前などに flushInputs() で1回の変更として保存する（入力欄が消えても失わない）
let inputDirty = false;
function flushInputs(){
  if (!inputDirty || !B) return;
  inputDirty = false;
  curObjs().forEach(o => { if (o.t === 'text' && !String(o.s).trim()) o.s = '文字'; });
  commit();
}
function drawBoard(){
  if (!B) return;
  bv.classList.toggle('editing', !!bs.edit);
  drawSvg();
  $('bCredit').textContent = creditOf(B);
  { const k = isNwBg(B) && nwKey(B.place), sb = $('bStyle'); sb.style.display = k && NW_MAPS[k][2] ? '' : 'none'; sb.textContent = B.bg === 'nw3d' ? '線画で見る' : '立体で見る'; }
  const waveLab = bs.wave ? 'WAVE ' + bs.wave + '・' : '';
  $('bTitle').innerHTML = esc(B.title) + '<small>' + esc(waveLab + placeName(B.place) + (B.sw ? '・' + swName(B.sw) : '')) + (bs.edit ? '・名前はここをタップ' : '') + '</small>';
  $('bMode').textContent = bs.edit ? '完了' : '編集';
  $('bUndo').style.display = $('bRedo').style.display = bs.edit ? '' : 'none';
  $('bUndo').disabled = bs.hi <= 0; $('bRedo').disabled = bs.hi >= bs.hist.length - 1;
  const hint = $('bHint');
  if (bs.pending){ hint.style.display = 'block'; hint.textContent = iconInfo(bs.pending).label + '：置く場所をタップ（上に引っぱって置くこともできます）'; }
  else if (bs.edit && bs.tool === 'text'){ hint.style.display = 'block'; hint.textContent = '文字を置く場所をタップ'; }
  else hint.style.display = 'none';
  // 上: 道具と、色・太さ（物を選んでいる時はその物の設定）
  if (bs.edit){
    const objs = curObjs(), sel = bs.sel && objs.find(o => o.id === bs.sel);
    let top = '<div class="btl">' + TOOLS.map(([k, gl, l]) => '<button data-btool="' + k + '" class="' + (bs.tool === k && !bs.pending ? 'on' : '') + '"><span class="gl">' + gl + '</span>' + l + '</button>').join('') + '</div><div class="bopt">';
    const cols = cur => COLORS.map(c => '<button class="col' + (cur === c ? ' on' : '') + '" data-bcol="' + c + '" style="background:' + c + '"></button>').join('');
    const seg = (items, cur, key) => '<span class="seg3">' + items.map(([l, v]) => '<button data-' + key + '="' + v + '" class="' + (cur === v ? 'on' : '') + '">' + l + '</button>').join('') + '</span>';
    if (sel){
      top += '<span class="lbl">選んでいる物</span>';
      if (sel.t === 'text') top += '<input id="bTxt" value="' + esc(sel.s) + '" maxlength="30" placeholder="文字">';
      if (sel.t !== 'icon') top += cols(sel.c);
      if (sel.t === 'icon' || sel.t === 'text') top += seg(SZ_LABEL, [0, 1, 2].includes(sel.sz) ? sel.sz : 1, 'bsz');
      else top += seg(WD_LABEL, [0, 1, 2].includes(sel.wd) ? sel.wd : 1, 'bwd');
      if (isPlayer(sel)) top += '<button class="act fly' + (sel.fly ? ' on' : '') + '" data-bfly="1" aria-pressed="' + !!sel.fly + '">' + (sel.fly ? '✓ ハエ' : 'ハエを付ける') + '</button>';
      top += '<button class="act" data-bdup="1">複製</button><button class="act del" data-bdel="1">削除</button>';
    } else if (['pen', 'arrow', 'line', 'rect', 'circle', 'text'].includes(bs.tool)){
      top += cols(bs.color) + (bs.tool !== 'text' ? seg(WD_LABEL, bs.wd, 'bwd') : '');
    } else {
      top += '<span class="lbl">' + (bs.tool === 'erase' ? '消したい物をなぞる・タップ' : (B.sw === 'rush' ? 'ラッシュ: プレイヤーを選ぶとハエを付けられます。' : '') + '置いた物をタップで選ぶ・そのまま動かす。何もない所をなぞると地図が動く。2本指で拡大') + '</span>';
    }
    $('bTop').innerHTML = top + '</div>';
  }
  // 下: アイコンの帯（編集中）、手順、手順のメモ
  const st = B.steps[bs.step], n = B.steps.length;
  let h = '';
  if (bs.edit){
    const cats = [['boss', 'オオモノ'], ['sake', 'シャケ'], ['player', 'プレイヤー・印'], ['weapon', 'ブキ']];
    if (bs.lastIcons.length) cats.unshift(['recent', '最近']);
    if (!cats.find(c => c[0] === bs.cat)) bs.cat = cats[0][0];
    h += '<div class="bstrip"><div class="bcats">' + cats.map(([k, l]) => '<button data-bcat="' + k + '" class="' + (bs.cat === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
      '<div class="bicons" id="bIcons">' + palItems(bs.cat).map(k => { const i = iconInfo(k);
        return '<button data-pk="' + esc(k) + '" class="' + (bs.pending === k ? 'on' : '') + '">' + (i.img ? '<span class="bimg' + (i.badge ? ' bdg' : '') + '"><img src="' + esc(i.img) + '" alt="" draggable="false" loading="lazy">' + (i.badge ? '<i>' + esc(i.badge) + '</i>' : '') + '</span>' : '<span class="mk" style="background:' + esc(i.color) + '">' + esc(i.mark) + '</span>') + '<span>' + esc(i.label) + '</span></button>'; }).join('') + '</div></div>';
  }
  h += '<div class="bsteprow"><span class="lab">手順</span>' + B.steps.map((s, i) => '<button class="sn' + (i === bs.step ? ' on' : '') + '" data-bgo="' + i + '">' + (i + 1) + '</button>').join('') +
    (bs.edit ? '<button class="sx" data-badd="1">＋ 写して追加</button>' + (n > 1 ? '<button class="sx del" data-bsdel="1">この手順を削除</button>' : '') : '') +
    (n > 1 ? '<button class="sx play" data-bplay="1">' + (bs.playing ? '■ 止める' : '▶ 再生') + '</button>' : '') +
    (bs.edit ? '<button class="sx" data-bmore="1">…</button>' : '') + '</div>';
  // 再生中は入力欄にしない（再生が次の手順へ進む時の描き直しで、打ちかけが消えないように）
  const flyP = st.objs.find(o => o.fly && isPlayer(o));
  if (flyP) h += '<div class="bfly"><b>ハエ</b>' + esc(iconInfo(flyP.k).label) + '</div>';
  h += '<div class="bmemo">' + (bs.edit && !bs.playing ? '<textarea id="bNote" maxlength="80" placeholder="手順' + (bs.step + 1) + 'のメモ（例: 左湧き、タワー優先）">' + esc(st.note || '') + '</textarea>'
    : '<div class="vt' + (st.note ? '' : ' none') + '">' + (st.note ? esc(st.note) : '（手順' + (bs.step + 1) + 'のメモはありません）') + '</div>') + '</div>';
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
function goHist(i){ stopPlay(); cancelGesture(); endStripDrag(true); bs.hi = i; B.steps = JSON.parse(bs.hist[i]); if (bs.step >= B.steps.length) bs.step = B.steps.length - 1; bs.sel = null; B.updated = Date.now(); persist(); drawBoard(); }
$('bUndo').onclick = () => { if (!bs) return; flushInputs(); if (bs.hi > 0) goHist(bs.hi - 1); };
$('bRedo').onclick = () => { if (!bs) return; flushInputs(); if (bs.hi < bs.hist.length - 1) goHist(bs.hi + 1); };
$('bBack').onclick = () => { if (history.state && history.state.board) history.back(); else closeBoard(false); };
$('bMode').onclick = () => { if (!bs) return; flushInputs(); stopPlay(); cancelGesture(); endStripDrag(true); bs.edit = !bs.edit; bs.pending = null; bs.sel = null; bs.tool = 'select'; drawBoard(); requestAnimationFrame(fitView); };
$('bFitBtn').onclick = () => fitView();
// NWのマップは線画と立体風を切り替えられる（同じ範囲で重なるので、置いた物の位置はそのまま）
$('bStyle').onclick = () => {
  if (!B || !isNwBg(B)) return;
  const k = nwKey(B.place); if (!k || !NW_MAPS[k][2]) return;
  B.bg = B.bg === 'nw3d' ? 'nw' : 'nw3d'; bs.imgUrl = nwImg(k, B.bg); $('bImg').src = bs.imgUrl;
  B.updated = Date.now(); persist(); drawBoard();
};
$('bRot').onclick = () => { if (!B) return; flushInputs(); cancelGesture(); B.rot = ((B.rot || 0) + 90) % 360; fitView(); drawSvg(); persist(); };
$('bTitle').onclick = () => {
  if (!bs || !bs.edit) return;
  cancelGesture();
  const v = prompt('作戦図の名前', B.title); if (v === null || !v.trim()) return;
  B.title = v.trim().slice(0, 40); B.autoTitle = false; B.updated = Date.now(); persist(); drawBoard(); // 名前は取り消しの対象外
};
function newObjFor(tool, x, y){
  return { id: uid(), t: 'text', s: '文字', c: bs.color, sz: 1, x, y };
}
// ---- 上の操作（道具・色・太さ・選んだ物）----
$('bTop').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || !B) return;
  if (t.dataset.btool || t.dataset.bdel || t.dataset.bdup) flushInputs();
  stopPlay(); cancelGesture(); // 地図に指を置いたまま押した場合、描きかけ・動かしかけは捨てる
  const d = t.dataset, objs = curObjs(), sel = bs.sel && objs.find(o => o.id === bs.sel);
  if (d.btool){ bs.tool = d.btool; bs.pending = null; bs.sel = null; drawBoard(); }
  else if (d.bcol){ if (sel){ sel.c = d.bcol; commit(); } else { bs.color = d.bcol; drawBoard(); } }
  else if (d.bwd != null){ if (sel){ sel.wd = +d.bwd; commit(); } else { bs.wd = +d.bwd; drawBoard(); } }
  else if (d.bsz != null && sel){ sel.sz = +d.bsz; commit(); }
  else if (d.bdel && sel){ B.steps[bs.step].objs = objs.filter(o => o !== sel); bs.sel = null; commit(); toast('削除しました（↶で戻せます）'); }
  else if (d.bfly && sel && isPlayer(sel)){
    const on = !sel.fly; normFly(objs, null); if (on) sel.fly = true;
    commit(); toast(on ? iconInfo(sel.k).label + 'にハエを付けました（この手順では1人だけ）' : 'ハエを外しました');
  }
  else if (d.bdup && sel){ if (!roomFor(1, sel.t === 'pen' ? sel.pts.length : 0)) return; const c = JSON.parse(JSON.stringify(sel)); c.id = uid(); delete c.fly; shiftObj(c, D() * .03, D() * .03); objs.push(c); bs.sel = c.id; commit(); }
});
// 選んだ文字の書き換えは、打つたびに地図へ反映し、確定（入力欄を離れる）で1回の変更として保存
$('bTop').addEventListener('input', e => {
  if (e.target.id !== 'bTxt' || !B) return;
  const o = curObjs().find(x => x.id === bs.sel); if (!o) return;
  o.s = e.target.value.slice(0, 30); inputDirty = true; drawSvg();
});
$('bTop').addEventListener('change', e => { if (e.target.id === 'bTxt') flushInputs(); });
// ---- 下の操作（アイコンの帯・手順・メモ）----
$('bBottom').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || !B) return;
  const d = t.dataset;
  flushInputs();
  if (d.bplay){ if (bs.playing) stopPlay(); else startPlay(); return; }
  stopPlay(); cancelGesture();
  if (d.bcat){ bs.cat = d.bcat; drawBoard(); }
  else if (d.pk){
    if (stripDrag && stripDrag.used) return; // 引っぱって置いた直後のクリックは無視
    bs.pending = bs.pending === d.pk ? null : d.pk; bs.sel = null; drawBoard();
  }
  else if (d.bgo != null){ bs.step = +d.bgo; bs.sel = null; drawBoard(); }
  else if (d.badd){
    if (B.steps.length >= LIM.steps){ toast('手順は' + LIM.steps + 'まで'); return; }
    if (penPts(B.steps) + penPts([B.steps[bs.step]]) > LIM.points){ toast('ペンの線が多すぎて写せません（線を消してください）'); return; }
    // 今の手順を写して次に入れる。中の物は同じIDのまま（再生でどう動いたかを見せるため）
    const c = JSON.parse(JSON.stringify(B.steps[bs.step])); c.id = uid(); c.note = '';
    B.steps.splice(bs.step + 1, 0, c); bs.step++; bs.sel = null; commit(); toast('手順' + (bs.step + 1) + 'を作りました（前の手順の写し）');
  }
  else if (d.bsdel){
    if (B.steps.length <= 1) return;
    B.steps.splice(bs.step, 1); if (bs.step >= B.steps.length) bs.step = B.steps.length - 1; bs.sel = null; commit(); toast('手順を削除しました（↶で戻せます）');
  }
  else if (d.bmore) openMore();
});
$('bBottom').addEventListener('input', e => {
  if (e.target.id !== 'bNote' || !B) return;
  B.steps[bs.step].note = e.target.value.slice(0, 80); inputDirty = true;
});
$('bBottom').addEventListener('change', e => { if (e.target.id === 'bNote') flushInputs(); });
function shiftObj(o, dx, dy){
  if (o.t === 'pen') o.pts = o.pts.map(p => [p[0] + dx, p[1] + dy]);
  else if (o.t === 'arrow' || o.t === 'line'){ o.x1 += dx; o.y1 += dy; o.x2 += dx; o.y2 += dy; }
  else { o.x += dx; o.y += dy; }
}
// 書き出し→読み込みで欠けないよう、読み込みの上限（LIM）と同じ上限を編集でも守る
const penPts = steps => steps.reduce((n, s) => n + s.objs.reduce((m, o) => m + (o.t === 'pen' ? o.pts.length : 0), 0), 0);
function roomFor(nObjs, nPts){
  if (curObjs().length + nObjs > LIM.objs){ toast('1つの手順に置けるのは' + LIM.objs + '個まで'); return false; }
  if (nPts && penPts(B.steps) + nPts > LIM.points){ toast('ペンの線が多すぎます（消すか手順を減らしてください）'); return false; }
  return true;
}
function placeAt(k, x, y){
  if (!roomFor(1, 0)){ bs.pending = null; drawBoard(); return; }
  const o = { id: uid(), t: 'icon', k, sz: 1, x, y };
  curObjs().push(o); bs.pending = null; bs.tool = 'select'; bs.sel = o.id;
  bs.lastIcons = [k].concat(bs.lastIcons.filter(x => x !== k)).slice(0, 10); save('sm_lasticons', bs.lastIcons);
  commit();
}

// ---- アイコンの帯から引っぱって置く（横に動かすと帯のスクロール、上に動かすと掴む）----
let stripDrag = null; // { k, x0, y0, ghost, used }
$('bBottom').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-pk]'); if (!b || !B || !bs.edit || ptrs.size || stripDrag) return; // 地図を触っている間は掴まない
  stripDrag = { k: b.dataset.pk, x0: e.clientX, y0: e.clientY, ghost: null, used: false, id: e.pointerId, board: B, bs, step: bs.step };
});
document.addEventListener('pointermove', e => {
  if (!stripDrag || e.pointerId !== stripDrag.id) return;
  const dx = e.clientX - stripDrag.x0, dy = e.clientY - stripDrag.y0;
  if (!stripDrag.ghost){
    if (dy < -14 && Math.abs(dy) > Math.abs(dx) * 1.2){
      const i = iconInfo(stripDrag.k), gh = document.createElement('div'); gh.className = 'bghost';
      if (i.img){ gh.innerHTML = '<img src="' + esc(i.img) + '" alt="">'; if (i.badge) gh.style.borderColor = '#ff4d4d'; } else { gh.style.background = i.color; gh.textContent = i.mark; }
      document.body.appendChild(gh); stripDrag.ghost = gh; stopPlay(); cancelGesture();
    } else if (Math.abs(dx) > 14) { stripDrag = null; return; }
    else return;
  }
  stripDrag.ghost.style.transform = 'translate(' + (e.clientX - 26) + 'px,' + (e.clientY - 70) + 'px)'; // 指で隠れないよう上に
});
function endStripDrag(cancel, e){
  if (!stripDrag) return;
  const d = stripDrag;
  if (d.ghost){
    d.ghost.remove(); d.used = true; setTimeout(() => { if (stripDrag === d) stripDrag = null; }, 300);
    if (!cancel && e && B){
      const r = $('bView').getBoundingClientRect(), px = e.clientX, py = e.clientY - 44; // 影を見て離す位置（指の少し上）に置く
      // 掴んだ時と同じ作戦図・手順・編集中の時だけ置く（途中で手順や表示が変わったら置かない）
      const same = B === d.board && bs === d.bs && bs.step === d.step && bs.edit && !bs.playing && !ptrs.size;
      if (same && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom){ const [x, y] = toImg(px, py); placeAt(d.k, x, y); }
    }
  } else stripDrag = null;
}
document.addEventListener('pointerup', e => { if (stripDrag && e.pointerId === stripDrag.id) endStripDrag(false, e); });
document.addEventListener('pointercancel', e => { if (stripDrag && e.pointerId === stripDrag.id) endStripDrag(true); });

// ---- 手順の再生（同じIDの物は前の手順の位置から動かす、無くなる物は消え、増える物は現れる）----
function lerpObj(a, b, t){
  const L = (p, q) => p + (q - p) * t, o = Object.assign({}, b);
  if (a.t !== b.t) return t < .5 ? a : b;
  if (b.t === 'icon' || b.t === 'text'){ o.x = L(a.x, b.x); o.y = L(a.y, b.y); }
  else if (b.t === 'pen'){ if (a.pts.length !== b.pts.length) return t < .5 ? a : b; o.pts = b.pts.map((q, i) => [L(a.pts[i][0], q[0]), L(a.pts[i][1], q[1])]); }
  else if (b.t === 'arrow' || b.t === 'line'){ o.x1 = L(a.x1, b.x1); o.y1 = L(a.y1, b.y1); o.x2 = L(a.x2, b.x2); o.y2 = L(a.y2, b.y2); }
  else if (b.t === 'rect'){ o.x = L(a.x, b.x); o.y = L(a.y, b.y); o.w = L(a.w, b.w); o.h = L(a.h, b.h); }
  else if (b.t === 'circle'){ o.x = L(a.x, b.x); o.y = L(a.y, b.y); o.r = L(a.r, b.r); }
  return o;
}
function frameSVG(sa, sb, t){
  const ma = new Map(sa.objs.map(o => [o.id, o])), mb = new Set(sb.objs.map(o => o.id));
  let h = '';
  sa.objs.forEach(o => { if (!mb.has(o.id) && t < 1) h += objSVG(o, false, 1 - t); });
  // ハエは動いている間は前の手順の人のまま（画面下の表示と同じ）。手順が切り替わった所で次の人に移る
  sb.objs.forEach(o => { const a = ma.get(o.id);
    if (a){ const x = lerpObj(a, o, t); if (a.fly) x.fly = true; else delete x.fly; h += objSVG(x, false); }
    else { const x = Object.assign({}, o); delete x.fly; h += objSVG(x, false, t); } });
  return h;
}
function startPlay(){
  if (!B || B.steps.length < 2) return;
  cancelGesture(); bs.sel = null;
  const my = { i: 0, t0: performance.now() }; bs.playing = my; bs.step = 0; drawBoard();
  const HOLD = 700, MOVE = 800;
  const tick = now => {
    if (!bs || bs.playing !== my) return;
    const el = now - my.t0;
    if (el < HOLD){ my.raf = requestAnimationFrame(tick); return; }
    const t = Math.min(1, (el - HOLD) / MOVE), e2 = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    $('bSvg').innerHTML = frameSVG(B.steps[my.i], B.steps[my.i + 1], e2);
    if (t < 1){ my.raf = requestAnimationFrame(tick); return; }
    my.i++; bs.step = my.i; my.t0 = now;
    if (my.i >= B.steps.length - 1){ bs.playing = null; drawBoard(); return; }
    drawBoard(); my.raf = requestAnimationFrame(tick);
  };
  my.raf = requestAnimationFrame(tick);
}
function stopPlay(){ if (bs && bs.playing){ cancelAnimationFrame(bs.playing.raf); bs.playing = null; if (B) drawBoard(); } }

// ---- シート（その他の操作）----
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
function contestWeapons(){
  // ばちこんから開いた時は、そのシナリオの支給ブキを先に出す
  if (!play) return [];
  const inst = CONTEST_DATA.instances.find(x => x.no === play.no);
  return inst ? inst.weapons.map(w => coopWeaponIdByName(w.name)).filter(Boolean) : [];
}
function palItems(tab){
  if (tab === 'recent') return bs.lastIcons.filter(k => typeof k === 'string' && iconInfo(k).label !== '不明');
  if (tab === 'boss') return (TIER_DATA.sets.boss.items || []).map(x => 'boss:' + x.id);
  if (tab === 'sake') return SALMONIDS.map(s => 'sake:' + s[0]);
  if (tab === 'player') return PLAYERS.map(p => 'player:' + p[0]).concat(MARKS.map(m => 'mark:' + m[0]));
  if (tab === 'weapon'){ const cw = contestWeapons(); return cw.map(id => 'weapon:' + id).concat((TIER_DATA.sets.coopWeapon.items || []).filter(x => !cw.includes(x.id)).map(x => 'weapon:' + x.id)); }
  return [];
}
// 作戦図の特殊WAVEを選び直す（名前と同じく取り消しの対象外）
function openSwSheet(){
  const el = showBSheet('<h3>特殊WAVE</h3><div class="bswrow" style="flex-wrap:wrap;margin:0 0 6px;padding:0">' + swFor(B.place).map(s =>
    '<button data-swpick="' + s[0] + '" class="' + ((B.sw || '') === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div><button class="bbtn sub" data-mclose="1">とじる</button>');
  el.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !B) return;
    if (t.dataset.swpick != null){
      // 名前が作った時の自動の名前（場所＋特殊WAVE＋番号）のままなら、名前の特殊WAVEも付け替える
      const auto = sw => placeName(B.place) + (sw ? ' ' + swName(sw) : '') + ' ', m = B.autoTitle !== false && B.title.startsWith(auto(B.sw)) && /^\d+$/.test(B.title.slice(auto(B.sw).length)); // 自分で付けた名前（autoTitle=false）は変えない
      if (m) B.title = auto(t.dataset.swpick) + B.title.slice(auto(B.sw).length);
      B.sw = t.dataset.swpick; B.updated = Date.now(); persist(); drawBoard(); toast('特殊WAVEを「' + swName(B.sw) + '」にしました'); }
    closeBSheet();
  });
}function openMore(){
  const el = showBSheet('<h3>' + esc(B.title) + '</h3>' +
    (swFor(B.place).length ? '<button class="bbtn" data-msw="1">特殊WAVE: ' + esc(swName(B.sw)) + '（変える）</button>' : '') + '<button class="bbtn" data-mren="1">名前を変える</button><button class="bbtn" data-mdupb="1">この作戦図を複製</button>' +
    '<button class="bbtn" data-mdelb="1" style="color:#ff8a8a">この作戦図を削除</button><button class="bbtn sub" data-mclose="1">とじる</button>');
  el.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.mclose) closeBSheet();
    else if (t.dataset.mren){ closeBSheet(); $('bTitle').onclick(); }
    else if (t.dataset.msw) openSwSheet();
    else if (t.dataset.mdupb){
      closeBSheet();
      const c = JSON.parse(JSON.stringify(B)); c.id = uid(); c.title = (B.title + '（コピー）').slice(0, 40); c.autoTitle = false; c.created = c.updated = Date.now();
      // 複製の保存も同じ列に並べる（書き出しなどが取りこぼさないように）
      const job = saveQueue.then(() => boardPut(c)); saveQueue = job.catch(() => {});
      try { await job; toast('複製しました（場所の一覧にあります）'); } catch (err){ toast('複製できませんでした'); }
    }
    else if (t.dataset.mdelb){
      if (!confirm('「' + B.title + '」を削除します。元に戻せません。よろしいですか？')) return;
      const id = B.id, mine = bs; closeBSheet();
      // 先に「削除した」印を付け、並んでいる保存を全部終えてから消す（遅れた保存で復活させない）
      deletedIds.add(id);
      await saveQueue;
      try { await boardDel(id); } catch (err){ deletedIds.delete(id); toast('削除できませんでした'); return; }
      Object.keys(memos).forEach(k => { if (k.startsWith('bd:') && memos[k] === id) delete memos[k]; });
      if (!save('sm_memos', memos)) toast('WAVEの割り当てを消せませんでした（次に開いた時に「見つかりません」と出ます）');
      // 待っている間に別の作戦図を開いていたら、その画面は閉じない
      if (bs !== mine) return;
      if (history.state && history.state.board) history.back(); else closeBoard(false);
    }
  });
}

// ---- 指の操作 ----
// 1本指: 見る時・選ぶ（何もない所）＝地図を動かす／選ぶ（物の上）＝その物を動かす／ペン・矢印・直線・四角・丸＝描く／
//        文字＝タップで置く／消しゴム＝なぞった物を消す／アイコンを置く待ち＝タップで置く（動かしたら地図の移動）。
// 2本指: いつでも地図の拡大・移動。2本目が触れたら描きかけ・動かしかけは取り消す
const ptrs = new Map();
let g = null;
const TAP = 6;
function restoreDrag(){
  if (g && g.kind === 'drag' && g.orig && B && B.steps[g.step]){ const o = B.steps[g.step].objs.find(x => x.id === g.oid); if (o) Object.assign(o, JSON.parse(g.orig)); }
  if (g && g.kind === 'erase' && g.removed && g.removed.length && B && B.steps[g.step]) B.steps[g.step].objs = g.before;
}
function cancelGesture(){
  restoreDrag();
  if (bs) bs.draft = null;
  g = null; ptrs.clear();
  if (B) drawSvg();
}
function startPinch(){
  const [a, b] = [...ptrs.values()];
  g = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v0: Object.assign({}, bs.view) };
}
function startPan(p, extra){ g = Object.assign({ kind: 'pan', x0: p.x, y0: p.y, tx: bs.view.tx, ty: bs.view.ty, far: false }, extra || {}); }
const view = $('bView');
const DRAW_TOOLS = ['pen', 'arrow', 'line', 'rect', 'circle'];
view.addEventListener('pointerdown', e => {
  if (!B || e.target.closest('.bvbtns')) return;
  flushInputs(); stopPlay(); endStripDrag(true);
  if (e.isPrimary && ptrs.size) cancelGesture(); // 前の指の終わりを取り逃がしていたら片付ける
  try { view.setPointerCapture(e.pointerId); } catch (err){} // 取れなくても操作は続ける
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size >= 2){
    if (ptrs.size === 2){ restoreDrag(); bs.draft = null; startPinch(); drawSvg(); }
    return;
  }
  const [ix, iy] = toImg(e.clientX, e.clientY);
  const hit = e.target.closest && e.target.closest('[data-oid]');
  const x0 = e.clientX, y0 = e.clientY, step = bs.step;
  if (!bs.edit) startPan({ x: x0, y: y0 });
  else if (bs.pending || bs.tool === 'text') startPan({ x: x0, y: y0 }, { place: bs.pending ? 'icon' : 'text' });
  else if (DRAW_TOOLS.includes(bs.tool)){
    const base = { id: 'draft', c: bs.color, wd: bs.wd };
    bs.draft = bs.tool === 'pen' ? Object.assign(base, { t: 'pen', pts: [[ix, iy]] })
      : bs.tool === 'rect' ? Object.assign(base, { t: 'rect', x: ix, y: iy, w: 0, h: 0 })
      : bs.tool === 'circle' ? Object.assign(base, { t: 'circle', x: ix, y: iy, r: 0 })
      : Object.assign(base, { t: bs.tool, x1: ix, y1: iy, x2: ix, y2: iy });
    g = { kind: 'draw', step, x0, y0, lx: x0, ly: y0, ix, iy };
  }
  else if (bs.tool === 'erase'){
    g = { kind: 'erase', step, before: curObjs().slice(), removed: [] };
    eraseAt(e.clientX, e.clientY);
  }
  else if (bs.tool === 'select' && hit && curObjs().find(x => x.id === hit.dataset.oid)){
    const o = curObjs().find(x => x.id === hit.dataset.oid);
    bs.sel = o.id; g = { kind: 'drag', step, oid: o.id, x0, y0, ix, iy, orig: JSON.stringify(o), moved: false }; drawBoard();
  }
  else startPan({ x: x0, y: y0 }, { selTap: bs.tool === 'select' });
});
function eraseAt(px, py){
  const el = document.elementFromPoint(px, py), hit = el && el.closest && el.closest('#bSvg [data-oid]');
  if (!hit) return;
  const objs = curObjs(), i = objs.findIndex(o => o.id === hit.dataset.oid);
  if (i < 0) return;
  g.removed.push(objs[i].id); objs.splice(i, 1); drawSvg();
}
view.addEventListener('pointermove', e => {
  if (!B || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!g) return;
  if (g.kind === 'pinch'){
    if (ptrs.size < 2) return;
    const [a, b] = [...ptrs.values()], dd = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const v0 = g.v0, s = Math.max(v0.fit * 0.6, Math.min(v0.fit * 8, v0.s * dd / Math.max(g.d0, 1)));
    // 2本指の中点の下の地図の点が、指についてくるように（回転していても同じ式）
    const keep = bs.view; bs.view = v0; const [px, py] = toImg(g.mx, g.my); bs.view = keep;
    const r = view.getBoundingClientRect(), a2 = rad(), dx = px - B.w / 2, dy = py - B.h / 2;
    const sx = B.w / 2 + dx * Math.cos(a2) - dy * Math.sin(a2), sy = B.h / 2 + dx * Math.sin(a2) + dy * Math.cos(a2);
    bs.view = { s, tx: mx - r.left - s * sx, ty: my - r.top - s * sy, fit: v0.fit, fitted: false }; applyView(); redrawSoon(); // アイコンの見た目の大きさを保つため描き直す
    return;
  }
  if (g.step != null && g.step !== bs.step){ cancelGesture(); return; } // 途中で手順が変わったら取りやめ
  const [ix, iy] = toImg(e.clientX, e.clientY);
  if (g.kind === 'pan'){
    if (!g.far && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) >= TAP) g.far = true; // 一度でも大きく動いたらタップ扱いにしない
    bs.view.tx = g.tx + (e.clientX - g.x0); bs.view.ty = g.ty + (e.clientY - g.y0); if (g.far) bs.view.fitted = false; applyView();
  }
  else if (g.kind === 'draw'){
    const d = bs.draft; if (!d) return;
    if (d.t === 'pen'){
      if (Math.hypot(e.clientX - g.lx, e.clientY - g.ly) < 3 || d.pts.length >= 2000) return; // 点を間引く
      g.lx = e.clientX; g.ly = e.clientY; d.pts.push([ix, iy]);
    } else if (d.t === 'rect'){ d.x = Math.min(g.ix, ix); d.y = Math.min(g.iy, iy); d.w = Math.abs(ix - g.ix); d.h = Math.abs(iy - g.iy); }
    else if (d.t === 'circle'){ d.r = Math.hypot(ix - g.ix, iy - g.iy); }
    else { d.x2 = ix; d.y2 = iy; }
    drawSvg();
  }
  else if (g.kind === 'erase') eraseAt(e.clientX, e.clientY);
  else if (g.kind === 'drag'){
    if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < TAP) return;
    g.moved = true;
    const o = curObjs().find(x => x.id === g.oid); if (!o) return;
    Object.assign(o, JSON.parse(g.orig)); shiftObj(o, ix - g.ix, iy - g.iy);
    drawSvg();
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
  if (ptrs.size) return; // まだ他の指が残っている
  if (g.step != null && g.step !== bs.step){ cancelGesture(); return; }
  const [ix, iy] = toImg(e.clientX, e.clientY);
  const small = D() * .02;
  if (g.kind === 'pan' && g.place && !g.far){
    if (g.place === 'icon' && bs.pending) placeAt(bs.pending, ix, iy);
    else if (g.place === 'text' && roomFor(1, 0)){ const o = newObjFor('text', ix, iy); curObjs().push(o); bs.tool = 'select'; bs.sel = o.id; commit(); const inp = $('bTxt'); if (inp){ inp.focus(); inp.select(); } }
  }
  else if (g.kind === 'draw'){
    const d = bs.draft; bs.draft = null;
    const ok = d && (d.t === 'pen' ? d.pts.length > 1 : d.t === 'rect' ? d.w > small && d.h > small : d.t === 'circle' ? d.r > small / 2 : Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > small);
    if (ok && roomFor(1, d.t === 'pen' ? d.pts.length : 0)){ d.id = uid(); curObjs().push(d); commit(); } else drawSvg();
  }
  else if (g.kind === 'erase'){ if (g.removed.length){ bs.sel = null; commit(); } }
  else if (g.kind === 'drag'){ if (g.moved) commit(); else drawBoard(); }
  else if (g.kind === 'pan' && g.selTap && !g.far && bs.sel){ bs.sel = null; drawBoard(); }
  g = null;
}
view.addEventListener('pointerup', endPtr);
// 指の取り消し・指を追えなくなった時: 描きかけ・動かしかけ・消しかけは元に戻す
view.addEventListener('pointercancel', e => { if (ptrs.has(e.pointerId)) cancelGesture(); });
view.addEventListener('lostpointercapture', e => { if (ptrs.has(e.pointerId) && g && g.kind !== 'pinch') { ptrs.delete(e.pointerId); if (!ptrs.size){ if (g.kind === 'pan') g = null; else cancelGesture(); } } });
window.addEventListener('resize', () => { if (B && bs && !g && !ptrs.size) fitView(); });
// 上下の帯の高さが変わって地図の枠が変わった時、全体表示のままなら合わせ直す（拡大・移動していたらそのまま）
if (window.ResizeObserver) new ResizeObserver(() => { if (B && bs && bs.view && bs.view.fitted && !g && !ptrs.size) fitView(); }).observe(view);

// ---------- いまのステージに作戦図を出す ----------
// 2026-11-17 ユーザー要望:「メモの部分を開いたら、このマップも簡単に確認出来て作戦をすぐに思い出せたり注意点を振り返れる」。
// index.html の stageButton が置いた <div data-nbd="c:<CoopStageId>" / "v:<VsStageId>"> に、そのステージの作戦図の
// 小さな絵（手順1）を並べる。タップで見る画面。無ければ作る入口だけを1行で出す
const css3 = `
.nowbd:empty{display:none}
.bwthumb{display:block;width:100%;margin:-4px 0 12px;padding:0;background:none;border:0}
.bwthumb:empty{display:none}
.nowbd{margin:-2px 14px 10px} /* カードの中の文字と左をそろえる（2026-11-22、作戦図の行がカードの端にはみ出していた） */
.nbrow{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 2px}
.nbrow::-webkit-scrollbar{display:none}
.nbcard{flex:none;width:min(62vw,240px);text-align:left;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;padding:0}
.nbthumb{position:relative;width:100%;background:#0b0a12}
.nbthumb img,.nbthumb svg{position:absolute;inset:0;width:100%;height:100%}
.nbthumb img{object-fit:fill}
.nbcap{padding:6px 9px 7px;font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nbcap small{display:block;font-size:11px;font-weight:400;color:var(--sub);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nbmk{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--faint)}
.nbmk button{font-size:11px;font-weight:600;color:var(--sub);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 10px}
`;
const st3 = document.createElement('style'); st3.textContent = css3; document.head.appendChild(st3);
let nowSeq = 0, nowUrls = [];
const prefetched = new Set();
function thumbSVG(b){
  // objSVG は開いている作戦図（B）を基準に大きさを決めるので、一時的に差し替えて描く（同期処理の中だけ）
  const keep = B; B = Object.assign({}, b, { rot: 0 }); thumbMode = true;
  try { return (b.steps[0] ? b.steps[0].objs : []).map(o => objSVG(o, false)).join(''); }
  catch (e){ return ''; }
  finally { B = keep; thumbMode = false; }
}
// ばちこんのWAVE画面に出す、割り当てた作戦図の小さな絵（手順1）。{ html, url }（url は自分のスクショの時だけ。使い終わったら解放する）
// 縦長のマップでも画面を埋めないよう、高さは画面の38%まで
window.boardThumb = async b => {
  if (!b || !Array.isArray(b.steps) || !(b.w > 0 && b.h > 0)) return { html: '', url: null };
  const bg = await boardBgUrl(b).catch(() => null);
  return { url: bg && bg.own ? bg.url : null,
    html: '<div style="width:min(100%,calc(38vh * ' + (b.w / b.h).toFixed(4) + '));margin:0 auto"><div class="nbthumb" style="padding-top:' + (b.h / b.w * 100).toFixed(2) + '%;border-radius:10px;overflow:hidden">' +
      (bg ? '<img src="' + esc(bg.url) + '" alt="">' : '') + '<svg viewBox="0 0 ' + b.w + ' ' + b.h + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + thumbSVG(b) + '</svg></div></div>' };
};
// いまのステージを離れたら、読み込み中の処理を捨てて画像を手放す
window.releaseNowBoards = () => { nowSeq++; nowUrls.forEach(u => URL.revokeObjectURL(u)); nowUrls = []; };
window.fillNowBoards = async function(){
  const my = ++nowSeq;
  const slots = [...document.querySelectorAll('[data-nbd]')];
  if (!slots.length){ nowUrls.forEach(u => URL.revokeObjectURL(u)); nowUrls = []; return; } // 作戦図の欄が無くなったら画像を手放す
  // 今のサモランのステージのマップ（3つの潮位）を先に読んでおく（スマホに保存され、電波が弱くても作戦図がすぐ開ける）
  slots.forEach(el => { const k = el.dataset.nbd; if (k.startsWith('c:')) TIDES.forEach(([t]) => { const nk = nwKey(k + ':' + t); if (nk && !prefetched.has(nk)){ prefetched.add(nk); fetch(nwImg(nk, 'nw')).then(r => { if (!r.ok) prefetched.delete(nk); }, () => prefetched.delete(nk)); } }); });
  let boards = [];
  try { boards = (await allBoards()).filter(b => b && typeof b.place === 'string' && Array.isArray(b.steps) && b.w > 0 && b.h > 0); } catch (e){ return; }
  if (my !== nowSeq) return;
  const order = { Low: 0, Mid: 1, High: 2 };
  const groups = new Map();
  slots.forEach(el => {
    const k = el.dataset.nbd;
    // 'c:<id>' はそのステージの全潮位、'c:<id>:<潮位>'（サモランメモの潮位の切り替え）と 'v:<id>' はその場所だけ
    if (!groups.has(k)) groups.set(k, boards.filter(b => k.startsWith('c:') && k.split(':').length === 2 ? b.place.startsWith(k + ':') : b.place === k)
      .sort((a, b) => (order[a.place.split(':')[2]] || 0) - (order[b.place.split(':')[2]] || 0) || b.updated - a.updated));
  });
  // 土台の画像（同じ場所は1回だけ読む）
  const places = [...new Set([...groups.values()].flat().filter(b => !isNwBg(b)).map(b => b.place))], urls = {}; // 自分のスクショの土台だけ読む（NWのマップは同梱のファイル）
  for (const p of places){
    try { const base = await baseGet(p); if (base) urls[p] = URL.createObjectURL(base.blob); } catch (e){}
    if (my !== nowSeq){ Object.values(urls).forEach(u => URL.revokeObjectURL(u)); return; } // 新しい描画が来たら途中でやめる
  }
  nowUrls.forEach(u => URL.revokeObjectURL(u)); nowUrls = Object.values(urls);
  slots.forEach(el => {
    if (!el.isConnected) return;
    const k = el.dataset.nbd, list = groups.get(k) || [];
    if (!list.length){
      el.innerHTML = '<div class="nbmk">作戦図 ' + (k.startsWith('c:') && k.split(':').length === 2
        ? TIDES.map(([t, n]) => '<button data-bplace="' + esc(k + ':' + t) + '">＋ ' + n + '</button>').join('')
        : '<button data-bplace="' + esc(k) + '">＋ 作る</button>') + '</div>';
      return;
    }
    el.innerHTML = '<div class="nbrow">' + list.map(b => {
      const tide = (b.place.startsWith('c:') ? TIDE_NAME[b.place.split(':')[2]] || '' : '') + (b.sw ? '・' + swName(b.sw) : '');
      const note = b.steps[0] && b.steps[0].note;
      return '<button class="nbcard" data-nbopen="' + esc(b.id) + '"><div class="nbthumb" style="padding-top:' + (b.h / b.w * 100).toFixed(2) + '%">' +
        (isNwBg(b) && nwKey(b.place) ? '<img src="' + esc(nwImg(nwKey(b.place), b.bg)) + '" alt="">' : urls[b.place] ? '<img src="' + urls[b.place] + '" alt="">' : '') +
        '<svg viewBox="0 0 ' + b.w + ' ' + b.h + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + thumbSVG(b) + '</svg></div>' +
        '<div class="nbcap">' + esc(b.title) + '<small>' + esc([tide, b.steps.length > 1 ? '手順' + b.steps.length : '', note || ''].filter(Boolean).join('・')) + '</small></div></button>';
    }).join('') + '</div>';
  });
};
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
const LIM = { boards: 300, bases: 60, baseBytes: 12e6, points: 60000, objs: 400, steps: 30 }; // 編集側も同じ上限を守る（roomFor）
const ICON_KEYS = () => new Set([
  ...(TIER_DATA.sets.boss.items || []).map(x => 'boss:' + x.id), ...SALMONIDS.map(s => 'sake:' + s[0]),
  ...(TIER_DATA.sets.coopWeapon.items || []).map(x => 'weapon:' + x.id), ...PLAYERS.map(p => 'player:' + p[0]), ...MARKS.map(m => 'mark:' + m[0])]);
function cleanBoard(b, icons){
  if (!b || typeof b !== 'object' || !PLACE_RE.test(b.place) || !Array.isArray(b.steps) || !b.steps.length) return null;
  const w = Math.min(4000, Math.max(1, Number.isFinite(b.w) ? b.w : 1)), h = Math.min(4000, Math.max(1, Number.isFinite(b.h) ? b.h : 1));
  const lim = Math.max(w, h) * 3; // 座標は土台の周りまで
  const num = v => Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0, col = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff';
  const wd = v => [0, 1, 2].includes(v) ? v : 1, pos = v => Number.isFinite(v) ? Math.max(0, Math.min(lim, v)) : 0;
  // 物のIDは作戦図の中で付け替える（同じIDは手順をまたいで同じ新ID＝再生で動きがつながる）
  const idm = new Map(), oid = v => { const k = String(v); if (!idm.has(k)) idm.set(k, uid()); return idm.get(k); };
  let points = 0;
  const steps = b.steps.slice(0, LIM.steps).filter(s => s && Array.isArray(s.objs)).map(s => ({ id: uid(), note: String(s.note || '').slice(0, 80),
    objs: s.objs.slice(0, LIM.objs).map(o => {
      if (!o || typeof o !== 'object') return null;
      const id = oid(o.id);
      if (o.t === 'icon' && typeof o.k === 'string' && icons.has(o.k)) return Object.assign({ id, t: 'icon', k: o.k, sz: wd(o.sz), x: num(o.x), y: num(o.y) }, o.fly === true && o.k.startsWith('player:') ? { fly: true } : {});
      if (o.t === 'text' && typeof o.s === 'string') return { id, t: 'text', s: o.s.slice(0, 30), c: col(o.c), sz: wd(o.sz), x: num(o.x), y: num(o.y) };
      if (o.t === 'arrow' || o.t === 'line') return { id, t: o.t, c: col(o.c), wd: wd(o.wd), x1: num(o.x1), y1: num(o.y1), x2: num(o.x2), y2: num(o.y2) };
      if (o.t === 'rect') return { id, t: 'rect', c: col(o.c), wd: wd(o.wd), x: num(o.x), y: num(o.y), w: pos(o.w), h: pos(o.h) };
      if (o.t === 'circle') return { id, t: 'circle', c: col(o.c), wd: wd(o.wd), x: num(o.x), y: num(o.y), r: pos(o.r) };
      if (o.t === 'pen' && Array.isArray(o.pts)){
        const pts = o.pts.slice(0, Math.max(0, Math.min(2000, LIM.points - points))).filter(p => Array.isArray(p)).map(p => [num(p[0]), num(p[1])]);
        points += pts.length;
        return pts.length > 1 ? { id, t: 'pen', c: col(o.c), wd: wd(o.wd), pts } : null;
      }
      return null;
    }).filter(Boolean) }));
  steps.forEach(s => normFly(s.objs)); // ハエは1つの手順に1人だけ
  // 1つの手順に同じIDが2つあると選択・再生が混ざるので、2つ目以降は別IDに
  steps.forEach(s => { const seen = new Set(); s.objs.forEach(o => { if (seen.has(o.id)) o.id = uid(); seen.add(o.id); }); });
  if (!steps.length) return null;
  // NWのマップの作戦図は、同梱のマップの大きさに合わせる（無い場所なら自分のスクショ扱い）
  const nk = (b.bg === 'nw' || b.bg === 'nw3d') ? nwKey(b.place) : null;
  return { id: typeof b.id === 'string' && ID_RE.test(b.id) ? b.id : uid(), place: b.place, title: String(b.title || '作戦図').slice(0, 40),
    bg: nk ? b.bg : 'own', sw: swFor(b.place).some(s => s[0] === b.sw) ? b.sw : '', w: nk ? nwSize(nk).w : w, h: nk ? nwSize(nk).h : h, rot: [0, 90, 180, 270].includes(b.rot) ? b.rot : 0, steps, created: Number.isFinite(b.created) ? b.created : Date.now(), updated: Number.isFinite(b.updated) ? b.updated : Date.now() };
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
