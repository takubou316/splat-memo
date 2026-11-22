// バトルのメモ帳（2026-11-21〜、試作のタブ）。index.html・board.js の後に読み込む。
// ユーザー要望:「スマホで開いたときに valo-memo みたいにメモが開くようにしたい。ステージとブキを選択してメモを見れる」
// → まずはバトルだけ・新しいタブで作り、出来が良ければ「いまのステージ」と入れ替える（ユーザー判断 2026-11-21）。
// 画面: 今のバトルのモード → ステージとブキのカード → ルール → メモ（ステージ×ブキ／ステージ×ルール／作戦図／ブキ／ステージ）
// メモはその場で書けて自動保存。ステージ×ルール（vs:<id>:<rule>）・ブキ（wv:）・ステージ（vs:<id>:all）は今あるメモと同じキー。
// ステージ×ブキ（sb:<VsStageId>:<ブキID>）とルール（rl:<ルールID>、全ステージ共通）は新しいキー。
// 共有して使うもの: sched, curAndNext, memos, save, load, esc, memoOf, kVs, RULES, RULE_NAME, nameById, stageName, stageImg, allStages, TIER_DATA, render, ui, toast
'use strict';
(function(){
const css = `
.nb-modes{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px 10px;padding:0 16px}
.nb-modes::-webkit-scrollbar{display:none}
.nb-modes button{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 11px;border-radius:10px;background:var(--card);border:1px solid var(--line);text-align:left}
.nb-modes button b{font-size:12px;font-weight:600;color:var(--text)}
.nb-modes button small{font-size:11px;color:var(--faint)}
.nb-modes button.on{border-color:var(--c,var(--salmon));box-shadow:inset 0 0 0 1px var(--c,var(--salmon))}
.nb-modes button.on small{color:var(--c,var(--salmon))}
.nb-pair{display:flex;gap:6px;margin-bottom:8px}
.nb-pair button{flex:1;min-width:0;min-height:40px;padding:6px 8px;border-radius:9px;background:var(--card);border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nb-pair button.on{color:var(--text);border-color:var(--line2);background:var(--card2)}
.nb-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.nb-card{position:relative;display:flex;align-items:center;gap:8px;min-height:64px;padding:8px;border-radius:12px;background:var(--card);border:1px solid var(--line2);text-align:left;overflow:hidden}
.nb-card img{flex:none;width:52px;height:44px;object-fit:cover;border-radius:7px;background:var(--card2)}
.nb-card.w img{object-fit:contain;background:#0b0a12}
.nb-card .t{flex:1;min-width:0}
.nb-card small{display:block;font-size:11px;color:var(--faint)}
.nb-card b{display:block;font-size:14px;font-weight:600;color:var(--text);line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.nb-card .tag{position:absolute;right:6px;top:5px;font-size:10px;color:var(--faint)}
.nb-card .tag.man{color:var(--salmon)}
.nb-card.empty b{color:var(--salmon)}
.nb-rules{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px}
.nb-rules::-webkit-scrollbar{display:none}
.nb-rules button{flex:none;min-height:38px;padding:5px 13px;border-radius:999px;font-size:12px;font-weight:600;color:var(--sub);background:var(--card);border:1px solid var(--line)}
.nb-rules button.on{color:#1a1020;background:var(--salmon);border-color:var(--salmon)}
.nb-sec{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:10px}
.nb-sec.main{border-color:rgba(255,122,61,.55)}
.nb-sec h3{margin:0 0 6px;font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.nb-sec h3 small{font-size:11px;font-weight:400;color:var(--faint)}
.nb-sec textarea{display:block;width:100%;min-height:64px;resize:none;background:#0f0d16;border:1px solid var(--line);border-radius:10px;color:var(--text);font:inherit;font-size:16px;line-height:1.5;padding:9px 11px;overflow:hidden}
.nb-sec textarea:focus{outline:none;border-color:var(--line2)}
.nb-sec .st{font-size:11px;color:var(--faint);min-height:14px;margin-top:3px;text-align:right}
.nb-sec .nowbd{margin:0}
.nb-sec .nbmk{font-size:0}.nb-sec .nbmk button{font-size:12px} /* 見出しと「作戦図」が2回並ばないように、空の時の文字だけ隠す */
.nb-empty{text-align:center;padding:26px 12px;color:var(--sub);font-size:14px}
.nb-empty button{margin-top:10px;padding:10px 18px;border-radius:10px;background:var(--salmon);color:#1a1020;font-weight:700;font-size:14px}
.nbs-bg{position:fixed;inset:0;z-index:30;background:#0008;display:flex;align-items:flex-end}
.nbs{width:100%;max-height:82vh;display:flex;flex-direction:column;background:var(--bg);border-radius:18px 18px 0 0;border-top:1px solid var(--line);padding:12px 14px calc(14px + env(safe-area-inset-bottom))}
.nbs h3{margin:0 0 8px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
.nbs h3 button{margin-left:auto;font-size:14px;color:var(--sub);padding:10px 12px;margin-right:-8px}
.nb-note{font-size:12px;color:var(--sub);margin:-4px 2px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nb-note button{font-size:12px;font-weight:600;color:var(--salmon);border:1px solid rgba(255,122,61,.45);border-radius:999px;padding:7px 12px}
.nbs input{width:100%;height:38px;margin-bottom:8px;background:var(--card);border:1px solid var(--line2);border-radius:10px;color:var(--text);font:inherit;font-size:16px;padding:0 11px}
.nbs .body{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;min-height:0}
.nbs .lab{font-size:11px;font-weight:600;color:var(--faint);margin:8px 2px 5px}
.nbs .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.nbs .grid button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:10px;background:var(--card);font-size:10px;line-height:1.2;color:var(--sub);text-align:center;min-height:74px}
.nbs .grid button img{width:44px;height:44px;object-fit:contain}
.nbs .grid button.on{outline:2px solid var(--salmon);color:var(--text)}
.nbs .list button{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border-radius:10px;background:var(--card);margin-bottom:5px;text-align:left;font-size:14px;font-weight:600;color:var(--text)}
.nbs .list button img{width:64px;height:36px;object-fit:cover;border-radius:6px;background:var(--card2)}
.nbs .list button small{display:block;font-size:11px;font-weight:400;color:var(--faint)}
.nbs .list button.on{outline:2px solid var(--salmon)}
.nbpics{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}
.nbpic{width:72px;height:72px;padding:0;border-radius:8px;overflow:hidden;background:var(--card2);border:1px solid var(--line)}
.nbpic img{width:100%;height:100%;object-fit:cover;display:block}
.nbpic-add{position:relative;display:inline-flex;align-items:center;min-height:36px;padding:0 13px;border-radius:999px;border:1px dashed var(--line2);color:var(--sub);font-size:12px;font-weight:600;overflow:hidden}
.nbpic-add input{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:0}
.nbs-bg.nbv-bg{background:#000;align-items:stretch}
.nbv{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(6px + env(safe-area-inset-top)) 8px calc(10px + env(safe-area-inset-bottom))}
.nbv .bar{display:flex;align-items:center;gap:4px;color:var(--sub);font-size:13px}
.nbv .bar b{font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.nbv .bar button{flex:none;padding:10px 12px;font-size:14px;color:var(--text)}
.nbv .bar .del{margin-left:auto;color:#ff6b6b}
.nbv .im{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;display:flex;align-items:center;justify-content:center}
.nbv .im img{max-width:100%;max-height:100%;object-fit:contain}
.nbv .im.big{display:block}.nbv .im.big img{max-width:none;max-height:none;width:220%}
.nbv .hint{font-size:11px;color:var(--faint);text-align:center;margin:4px 0}
.nbv .nav{display:flex;gap:8px}.nbv .nav button{flex:1;min-height:44px;border-radius:10px;background:var(--card);color:var(--text);font-size:15px}
.nbv .nav button:disabled{opacity:.35}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

// 選んでいる物（端末に覚える）。stage は自分で選んだ時だけ（{id, at}: at はその時の時間帯の始まり。時間帯が変わったら今のステージに戻す）
const nb = Object.assign({ mode: '', pair: 0, stage: null, rule: null, weapon: '', recent: [] }, load('sm_nb', {}));
const saveNb = () => save('sm_nb', { mode: nb.mode, pair: nb.pair, stage: nb.stage, rule: nb.rule, weapon: nb.weapon, recent: nb.recent });
const sbKey = (sid, wid) => 'sb:' + sid + ':' + wid;
window.sbKey = sbKey;
const weapons = () => (window.TIER_DATA && TIER_DATA.sets.vsWeapon && TIER_DATA.sets.vsWeapon.items) || [];
const weaponById = id => weapons().find(w => w.id === id) || null;

// 今の時間帯のバトル（モードごとに、ルールと2つのステージ）
function nowModes(){
  if (!sched || !sched.data) return [];
  const d = sched.data, now = new Date(), out = [];
  const cur = key => curAndNext((d[key] || {}).nodes, now).cur;
  const bk = cur('bankaraSchedules');
  if (bk) (bk.bankaraMatchSettings || []).forEach(s => out.push({ key: s.bankaraMode === 'OPEN' ? 'bo' : 'bc', label: s.bankaraMode === 'OPEN' ? 'オープン' : 'チャレンジ', c: '--bankara', node: bk, s }));
  const x = cur('xSchedules'); if (x) out.push({ key: 'x', label: 'Xマッチ', c: '--x', node: x, s: x.xMatchSetting });
  const rg = cur('regularSchedules'); if (rg) out.push({ key: 'rg', label: 'レギュラー', c: '--regular', node: rg, s: rg.regularMatchSetting });
  const fs = cur('festSchedules');
  if (fs){ const f = fs.festMatchSettings; (Array.isArray(f) ? f : f ? [f] : []).forEach(s => out.push({ key: 'f' + (s.festMode || ''), label: s.festMode === 'REGULAR' ? 'フェス(オープン)' : 'フェス(チャレンジ)', c: '--fest', node: fs, s })); }
  return out.filter(m => m.s && Array.isArray(m.s.vsStages) && m.s.vsStages.length && m.s.vsRule);
}
// 今見ているステージ・ルール・モード
function current(){
  const modes = nowModes();
  const mode = modes.find(m => m.key === nb.mode) || modes[0] || null;
  // 自分で選んだステージは、その時間帯の間だけ有効
  const manual = nb.stage && (!mode || nb.stage.at === mode.node.startTime) ? nb.stage.id : null;
  const pair = mode ? Math.min(nb.pair || 0, mode.s.vsStages.length - 1) : 0;
  const stageId = manual || (mode ? mode.s.vsStages[pair].id : null);
  const ruleId = (nb.rule && nb.rule.at === (mode ? mode.node.startTime : '') && RULE_NAME[nb.rule.id]) ? nb.rule.id : mode ? mode.s.vsRule.id : null;
  return { modes, mode, pair, stageId, manual: !!manual, ruleId, ruleManual: !!(mode && ruleId !== mode.s.vsRule.id) };
}
const imgOf = id => stageImg[id] || '';

window.renderNote = function(){
  if (!sched) return '<div class="empty">読み込み中…</div>';
  const c = current(), w = weaponById(nb.weapon);
  let h = '';
  if (!c.modes.length) h += '<div class="nb-note">今の時間帯のバトルを取得できていません。右上の「更新」を押すか、ステージを選んでください</div>';
  if (c.modes.length){
    h += '<div class="nb-modes">' + c.modes.map(m => '<button data-nbmode="' + esc(m.key) + '" class="' + (c.mode && m.key === c.mode.key ? 'on' : '') + '" style="--c:var(' + m.c + ')"><b>' + esc(m.label) + '</b><small>' + esc(RULE_NAME[m.s.vsRule.id] || m.s.vsRule.name) + '</small></button>').join('') + '</div>';
    if (c.mode && c.mode.s.vsStages.length > 1) h += '<div class="nb-pair">' + c.mode.s.vsStages.map((s, i) => '<button data-nbpair="' + i + '" class="' + (!c.manual && c.pair === i ? 'on' : '') + '">' + esc(stageName(s)) + '</button>').join('') + '</div>';
  }
  // ステージとブキのカード（タップで選ぶ）
  h += '<div class="nb-cards">' +
    (c.stageId ? '<button class="nb-card" data-nbpick="stage"><img src="' + esc(imgOf(c.stageId)) + '" alt=""><span class="t"><small>ステージ</small><b>' + esc(nameById(c.stageId)) + '</b></span><span class="tag' + (c.manual ? ' man' : '') + '">' + (c.manual ? '手動' : '今') + '</span></button>'
      : '<button class="nb-card empty" data-nbpick="stage"><span class="t"><small>ステージ</small><b>選ぶ</b></span></button>') +
    (w ? '<button class="nb-card w" data-nbpick="weapon"><img src="' + esc(w.img) + '" alt=""><span class="t"><small>ブキ</small><b>' + esc(w.name) + '</b></span></button>'
      : '<button class="nb-card w empty" data-nbpick="weapon"><span class="t"><small>ブキ</small><b>タップして選ぶ</b></span></button>') + '</div>';
  // ルール（今のモードのルールが選ばれている。変えると手動）
  h += '<div class="nb-rules">' + RULES.map(([id, n]) => '<button data-nbrule="' + id + '" class="' + (c.ruleId === id ? 'on' : '') + '">' + esc(n) + '</button>').join('') + '</div>';
  if (c.ruleManual || c.manual) h += '<div class="nb-note">' + (c.manual ? 'ステージ' : '') + (c.manual && c.ruleManual ? 'と' : '') + (c.ruleManual ? 'ルール' : '') + 'を自分で選んでいます（次の時間帯になると今のものに戻ります）<button data-nbreset="1">今に戻す</button></div>';
  if (!c.stageId) return h + '<div class="nb-empty">ステージを選ぶと、メモが出ます</div>';
  const sName = nameById(c.stageId), rName = RULE_NAME[c.ruleId] || '';
  const sec = (key, title, sub, ph, main) => '<div class="nb-sec' + (main ? ' main' : '') + '"><h3>' + esc(title) + '<small>' + esc(sub) + '</small></h3>' +
    '<textarea class="nbta" data-nbkey="' + esc(key) + '" placeholder="' + esc(ph) + '" rows="2">' + esc(memos[key] || '') + '</textarea>' +
    '<div class="nbpics" data-nbpk="' + esc(key) + '">' + addPicBtn(key) + '</div><div class="st" data-nbst="' + esc(key) + '"></div></div>';
  if (w) h += sec(sbKey(c.stageId, w.id), sName + ' × ' + w.name, 'このステージでこのブキのとき', '例: 右の高台から抑える、ここの段差は登れない など', true);
  else h += '<div class="nb-sec main"><h3>' + esc(sName) + ' × ブキ<small>このステージでこのブキのとき</small></h3><div class="nb-empty" style="padding:10px">ブキを選ぶと書けます<br><button data-nbpick="weapon">ブキを選ぶ</button></div></div>';
  if (c.ruleId) h += sec(kVs(c.stageId, c.ruleId), sName + ' × ' + rName, 'このステージのこのルール', '例: ' + rName + 'のときはここを取る など', !w);
  h += '<div class="nb-sec"><h3>作戦図<small>' + esc(sName) + '</small></h3><div class="nowbd" data-nbd="v:' + esc(c.stageId) + '"></div></div>';
  if (w) h += sec('wv:' + w.id, w.name + 'のメモ', '全ステージ共通', '例: 射程、スペシャルの使いどころ など');
  // ルールのメモ（全ステージ共通。2026-11-21 ユーザー要望「ルールごと共通のメモが欲しい」）。キーは rl:<ルールID>
  if (c.ruleId) h += sec('rl:' + c.ruleId, rName + 'のメモ', '全ステージ共通', '例: ' + rName + 'の基本の立ち回り、カウントの取り方 など');
  h += sec(kVs(c.stageId), sName + 'のメモ', '全ルール共通', '例: 地形の特徴、よく通る道 など');
  return h;
};

// ---- メモをその場で書く（打つたびに少し待って保存） ----
// 打った欄は dirty（キー→値）に入れ、端末への保存が成功するまで残す（保存に失敗しても、離れる時にもう一度保存する）。
// 保存するのは打った欄だけ（ほかの画面で同じメモを書き換えていても、触っていない欄で上書きしない）
const timers = {}, dirty = new Map();
let pendingRender = false; // 書いている間に見送った描き直し（時間帯の更新など）
function autosize(ta){ ta.style.height = 'auto'; ta.style.height = Math.max(64, ta.scrollHeight + 2) + 'px'; }
const stOf = k => main.querySelector('[data-nbst="' + CSS.escape(k) + '"]');
function saveDirty(keys){
  const ks = (keys || [...dirty.keys()]).filter(k => dirty.has(k)); if (!ks.length) return true;
  ks.forEach(k => { const v = dirty.get(k); if (v.trim()) memos[k] = v; else delete memos[k]; });
  const ok = save('sm_memos', memos);
  ks.forEach(k => { if (ok) dirty.delete(k); const el = stOf(k); if (el) el.textContent = ok ? '保存しました ✓' : '保存できませんでした（もう一度保存します）'; });
  return ok;
}
function flushAll(){
  Object.keys(timers).forEach(k => { clearTimeout(timers[k]); delete timers[k]; });
  saveDirty();
}
window.noteFlush = flushAll;
// 書いている途中は画面を描き直さない（時間帯の更新などで打ちかけが消えないように）。見送った分は書き終えた後に描き直す
window.noteBusy = () => { const a = document.activeElement; return !!(a && a.classList && a.classList.contains('nbta')); };
window.noteDeferRender = () => { pendingRender = true; };
const main = document.getElementById('main');
main.addEventListener('input', e => {
  const ta = e.target; if (!ta.classList || !ta.classList.contains('nbta')) return;
  autosize(ta);
  const k = ta.dataset.nbkey; dirty.set(k, ta.value);
  const el = stOf(k); if (el) el.textContent = '入力中…';
  clearTimeout(timers[k]); timers[k] = setTimeout(() => { delete timers[k]; saveDirty([k]); }, 500);
});
main.addEventListener('focusout', e => {
  if (!e.target.classList || !e.target.classList.contains('nbta')) return;
  const k = e.target.dataset.nbkey; clearTimeout(timers[k]); delete timers[k]; saveDirty([k]);
  // 見送った描き直しは、ボタンのタップを壊さないよう少し待ってから（別の欄に移っていたらまた見送る）
  if (pendingRender) setTimeout(() => { if (pendingRender && ui.view === 'note' && !window.noteBusy()){ pendingRender = false; render(); } }, 350);
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') flushAll(); });
window.noteAfterRender = () => { pendingRender = false; main.querySelectorAll('.nbta').forEach(autosize); fillPics(); };

// ---- 画像（2026-11-22 ユーザー要望「それぞれ画像を載せれるようにしたい」）----
// メモの欄ごとに画像を付けられる。画像は IndexedDB 'splat-memo-pics'（作戦図の DB とは別）に、1枚ずつ {id, key: メモのキー, blob, w, h, at} で保存。
// 取り込む時に長い辺1600pxのJPEGに縮める。書き出し・読み込み（バックアップ）にも入る（notePics）
const PIC_DB = 'splat-memo-pics', PIC_MAX = 12, PIC_ALL = 300, PIC_KEY_RE = /^(sb|vs|wv|rl):[A-Za-z0-9+/=:_-]{1,120}$/;
const picUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
let picP = null;
function picDb(){
  if (!picP) picP = new Promise((res, rej) => {
    if (!window.indexedDB){ rej(new Error('no idb')); return; }
    const r = indexedDB.open(PIC_DB, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore('pics', { keyPath: 'id' }); s.createIndex('key', 'key'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { picP = null; rej(r.error); };
  });
  return picP;
}
async function picDo(mode, fn){
  const db = await picDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('pics', mode), q = fn(tx.objectStore('pics'));
    tx.oncomplete = () => res(q && q.result);
    tx.onerror = tx.onabort = () => rej(tx.error || new Error('idb'));
  });
}
const picsOf = k => picDo('readonly', s => s.index('key').getAll(k)).then(a => (a || []).sort((x, y) => x.at - y.at));
const picCount = () => picDo('readonly', s => s.count());
const picDel = id => picDo('readwrite', s => s.delete(id));
// 長い辺1600pxまでのJPEGにする（読めない画像はここで失敗する）
async function shrinkPic(file){
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = url; });
    const iw = im.naturalWidth, ih = im.naturalHeight; if (!iw || !ih) throw new Error('img');
    const s = Math.min(1, 1600 / Math.max(iw, ih)), cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(iw * s)); cv.height = Math.max(1, Math.round(ih * s));
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    const out = { blob, w: cv.width, h: cv.height }; cv.width = cv.height = 0;
    if (!blob) throw new Error('blob');
    return out;
  } finally { URL.revokeObjectURL(url); }
}
function addPicBtn(k){ return '<label class="nbpic-add">＋ 画像<input type="file" accept="image/*" multiple data-nbpicin="' + esc(k) + '"></label>'; }
const picUrls = new Map(), picSeq = {}; // 欄ごとの表示中のURLと、読み込みの順番（古い読み込みの結果で上書きしない）
const picSlot = k => main.querySelector('[data-nbpk="' + CSS.escape(k) + '"]');
function releasePics(k){ (picUrls.get(k) || []).forEach(u => URL.revokeObjectURL(u)); picUrls.delete(k); }
async function fillPics(keys){
  if (!keys){ [...picUrls.keys()].forEach(releasePics); keys = [...main.querySelectorAll('[data-nbpk]')].map(el => el.dataset.nbpk); } // 全部描き直した時は前の絵のURLを捨てる
  for (const k of keys){
    const my = picSeq[k] = (picSeq[k] || 0) + 1;
    let list = [];
    try { list = await picsOf(k); } catch (e){ continue; }
    const el = picSlot(k);
    if (my !== picSeq[k] || !el) continue;
    releasePics(k);
    const urls = list.map(p => URL.createObjectURL(p.blob)); picUrls.set(k, urls);
    el.innerHTML = list.map((p, i) => '<button class="nbpic" data-nbpicv="' + esc(p.id) + '" data-nbpk2="' + esc(k) + '"><img src="' + urls[i] + '" alt=""></button>').join('') +
      (list.length < PIC_MAX ? addPicBtn(k) : '');
  }
}
// 画像の追加・読み込み・削除は1つずつ順番に（同時に走ると上限の数え方や同じIDの判定がずれるため。Codexレビュー 2026-11-22）
let picQ = Promise.resolve();
const picQueue = fn => { const p = picQ.then(fn, fn); picQ = p.catch(() => {}); return p; };
// 上限と同じIDの確認と書き込みを1回の書き込みトランザクションで行う（入れられなかったら false）
const picPutChecked = p => picDo('readwrite', s => {
  const out = { result: false };
  const g = s.get(p.id);
  g.onsuccess = () => {
    if (g.result) return;
    const ca = s.count();
    ca.onsuccess = () => {
      if (ca.result >= PIC_ALL) return;
      const ck = s.index('key').count(p.key);
      ck.onsuccess = () => { if (ck.result < PIC_MAX){ s.put(p); out.result = true; } };
    };
  };
  return out;
});
function addPics(k, files){
  const say = t => { const s = stOf(k); if (s) s.textContent = t; };
  return picQueue(async () => {
    try {
      const have = await picDo('readonly', s => s.index('key').count(k)), all = await picCount();
      const room = Math.min(PIC_MAX - have, PIC_ALL - all);
      if (room <= 0){ toast(PIC_MAX - have <= 0 ? '1つの欄に付けられる画像は' + PIC_MAX + '枚までです' : '画像は全部で' + PIC_ALL + '枚までです。いらない画像を消してください'); return; }
      if (files.length > room) toast(room + '枚だけ付けます（上限のため）');
      let ok = 0, bad = 0;
      for (const f of files.slice(0, room)){
        say('画像を取り込み中…（' + (ok + bad + 1) + '/' + Math.min(files.length, room) + '）');
        try { const im = await shrinkPic(f); if (await picPutChecked({ id: picUid(), key: k, blob: im.blob, w: im.w, h: im.h, at: Date.now() })) ok++; else bad++; }
        catch (e){ bad++; }
      }
      say(bad ? (ok ? ok + '枚付けました（' + bad + '枚は付けられませんでした）' : '画像を付けられませんでした') : '画像を付けました ✓');
    } catch (e){ say('画像を保存できませんでした'); }
  }).then(() => fillPics([k]));
}
// 選んだ画像は、その input 自身で受け取る（写真を選んでいる間に欄が描き直されて input が外れても、選んだ物を落とさないため）
main.addEventListener('click', e => {
  const inp = e.target; if (!inp.dataset || !inp.dataset.nbpicin || inp.dataset.nbhooked) return;
  inp.dataset.nbhooked = '1';
  inp.addEventListener('change', () => {
    const files = [...(inp.files || [])], k = inp.dataset.nbpicin; inp.value = '';
    if (files.length && PIC_KEY_RE.test(k)) addPics(k, files);
  });
}, true);
// 画像を大きく見る（左右で同じ欄の画像を切り替え、タップで拡大、削除）
let viewerSeq = 0;
async function openViewer(k, id){
  const my = ++viewerSeq;
  let list; try { list = await picsOf(k); } catch (e){ toast('画像を読めませんでした'); return; }
  if (my !== viewerSeq || ui.view !== 'note' || sheet) return; // 2回押した・タブを移った・別の画面が開いている時は開かない
  let i = Math.max(0, list.findIndex(p => p.id === id)), url = null, deleting = false;
  if (!list.length) return;
  openSheet('<div class="bar"><button data-nbclose="1">← とじる</button><b class="cnt"></b><button class="del" data-nbvdel="1">削除</button></div>' +
    '<div class="im"><img alt=""></div><div class="hint">画像をタップで拡大／もう一度タップで戻す</div>' +
    '<div class="nav"><button data-nbvgo="-1">‹ 前</button><button data-nbvgo="1">次 ›</button></div>',
    async t => {
      if (deleting) return; // 消している間は前後の移動もしない
      if (t.dataset.nbvgo){ i = Math.max(0, Math.min(list.length - 1, i + +t.dataset.nbvgo)); show(); }
      else if (t.dataset.nbvdel){
        if (!confirm('この画像を消しますか？（元に戻せません）')) return;
        const delId = list[i].id; deleting = true;
        try { await picQueue(() => picDel(delId)); } catch (e){ deleting = false; toast('消せませんでした'); return; }
        deleting = false;
        fillPics([k]); toast('画像を消しました');
        if (sheet !== mySheet) return; // 消している間に閉じられた
        const j = list.findIndex(p => p.id === delId); if (j >= 0) list.splice(j, 1);
        if (!list.length){ closeSheet(false); return; }
        i = Math.min(i, list.length - 1); show();
      }
    }, 'nbv', () => { if (url) URL.revokeObjectURL(url); url = null; });
  const mySheet = sheet, box = sheet.querySelector('.im'), img = box.querySelector('img');
  box.addEventListener('click', () => box.classList.toggle('big'));
  function show(){
    if (sheet !== mySheet) return;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(list[i].blob); img.src = url; box.classList.remove('big'); box.scrollTop = box.scrollLeft = 0;
    sheet.querySelector('.cnt').textContent = (i + 1) + ' / ' + list.length;
    const nav = sheet.querySelectorAll('[data-nbvgo]'); nav[0].disabled = i <= 0; nav[1].disabled = i >= list.length - 1;
  }
  show();
}
// ---- バックアップ（index.html の書き出し・読み込みから呼ぶ） ----
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
window.exportNotePics = async () => {
  try {
    const all = await picDo('readonly', s => s.getAll()), out = [];
    for (const p of all || []) if (p && p.blob) out.push({ id: p.id, key: p.key, w: p.w, h: p.h, at: p.at, data: await blobToDataURL(p.blob) });
    return out;
  } catch (e){ return null; }
};
// 読み込み: 今ある画像は消さずに追加（同じIDの画像は入れない）。実際に読めるか確かめ、縮め直して入れる
// 書き出したファイルの画像は必ずJPEG（shrinkPic）なので、読み込みもJPEGだけ。開く前に先頭を読んで縦横を確かめ、
// 巨大な画像（展開するとメモリを使い切るもの）は開かない
function jpegSize(dataUrl){
  try {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1, dataUrl.indexOf(',') + 1 + 87384); // 先頭64KBぶん
    const bin = atob(b64.slice(0, b64.length - b64.length % 4)), n = bin.length, at = i => bin.charCodeAt(i);
    if (at(0) !== 0xFF || at(1) !== 0xD8) return null;
    let i = 2;
    while (i + 9 < n){
      if (at(i) !== 0xFF){ i++; continue; }
      const m = at(i + 1);
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7) || m === 0xFF){ i += m === 0xFF ? 1 : 2; continue; }
      const len = (at(i + 2) << 8) | at(i + 3);
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: (at(i + 5) << 8) | at(i + 6), w: (at(i + 7) << 8) | at(i + 8) };
      i += 2 + len;
    }
  } catch (e){}
  return null;
}
window.importNotePics = arr => picQueue(async () => {
  const res = { pics: 0, err: false };
  if (!Array.isArray(arr)) return res;
  try {
    for (const v of arr.slice(0, PIC_ALL)){
      if (!v || typeof v.key !== 'string' || !PIC_KEY_RE.test(v.key) || typeof v.data !== 'string' || v.data.length > 6e6 || !/^data:image\/jpeg;base64,/.test(v.data)){ res.err = true; continue; }
      const sz = jpegSize(v.data);
      if (!sz || !sz.w || !sz.h || sz.w > 4096 || sz.h > 4096){ res.err = true; continue; }
      const id = typeof v.id === 'string' && /^[a-z0-9]{1,40}$/.test(v.id) ? v.id : picUid();
      if (await picDo('readonly', s => s.getKey(id)) !== undefined) continue; // 同じ画像はもう入っている
      try {
        const im = await shrinkPic(await (await fetch(v.data)).blob());
        if (await picPutChecked({ id, key: v.key, blob: im.blob, w: im.w, h: im.h, at: Number.isFinite(v.at) ? v.at : Date.now() })) res.pics++; else res.err = true;
      } catch (e){ res.err = true; }
    }
  } catch (e){ res.err = true; }
  return res;
});
// ---- 上の操作 ----
function redraw(){ flushAll(); saveNb(); render(); }
main.addEventListener('click', e => {
  if (ui.view !== 'note') return;
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset, c = current();
  if (d.nbreset){ nb.stage = null; nb.rule = null; redraw(); }
  else if (d.nbmode){ nb.mode = d.nbmode; nb.pair = 0; nb.stage = null; nb.rule = null; redraw(); }
  else if (d.nbpair != null){ nb.pair = +d.nbpair; nb.stage = null; redraw(); }
  else if (d.nbrule){ nb.rule = c.mode && d.nbrule === c.mode.s.vsRule.id ? null : { id: d.nbrule, at: c.mode ? c.mode.node.startTime : '' }; redraw(); }
  else if (d.nbpick === 'stage') openStageSheet();
  else if (d.nbpick === 'weapon') openWeaponSheet();
  else if (d.nbpicv) openViewer(d.nbpk2, d.nbpicv);
});

// ---- 選ぶシート ----
let sheet = null, sheetCleanup = null;
function closeSheet(fromPop){
  if (!sheet) return;
  sheet.remove(); sheet = null;
  if (sheetCleanup){ sheetCleanup(); sheetCleanup = null; }
  if (!fromPop && history.state && history.state.nbsheet) history.back();
}
window.notePop = () => { if (sheet){ closeSheet(true); return true; } return false; };
// cls: 中身の箱のクラス（既定は下から出るシート。'nbv' は画像を全画面で見る画面）、cleanup: 閉じた時の後片付け
function openSheet(html, onClick, cls, cleanup){
  closeSheet(false);
  sheet = document.createElement('div'); sheet.className = 'nbs-bg' + (cls === 'nbv' ? ' nbv-bg' : '');
  sheet.innerHTML = '<div class="' + (cls || 'nbs') + '">' + html + '</div>';
  sheetCleanup = cleanup || null;
  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-nbclose]')){ closeSheet(false); return; }
    const t = e.target.closest('button'); if (t) onClick(t);
  });
  document.body.appendChild(sheet);
  history.pushState({ nbsheet: true }, '');
}
function openStageSheet(){
  const c = current(), nowIds = c.mode ? c.mode.s.vsStages.map(s => s.id) : [];
  const row = (id, sub) => '<button data-nbstage="' + esc(id) + '" class="' + (id === c.stageId ? 'on' : '') + '"><img src="' + esc(imgOf(id)) + '" alt=""><span>' + esc(nameById(id)) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></button>';
  openSheet('<h3>ステージを選ぶ<button data-nbclose="1">とじる</button></h3><div class="body list">' +
    (nowIds.length ? '<div class="lab">今の' + esc(c.mode.label) + '</div>' + nowIds.map(id => row(id, RULE_NAME[c.mode.s.vsRule.id] || '')).join('') : '') +
    '<div class="lab">すべてのステージ</div>' + allStages('vs').filter(s => !nowIds.includes(s.id)).map(s => row(s.id, '')).join('') + '</div>',
    t => {
      const id = t.dataset.nbstage; if (!id) return;
      // 開いている間に時間帯が変わっていることがあるので、選んだ瞬間の時間帯で決め直す
      const c2 = current(), ids2 = c2.mode ? c2.mode.s.vsStages.map(s => s.id) : [], i = ids2.indexOf(id);
      if (i >= 0){ nb.pair = i; nb.stage = null; } else nb.stage = { id, at: c2.mode ? c2.mode.node.startTime : '' };
      closeSheet(false); redraw();
    });
}
function openWeaponSheet(){
  const ws = weapons(), recent = nb.recent.map(weaponById).filter(Boolean);
  const btn = w => '<button data-nbw="' + esc(w.id) + '" data-name="' + esc(nfkc(w.name).toLowerCase()) + '" class="' + (w.id === nb.weapon ? 'on' : '') + '"><img src="' + esc(w.img) + '" alt="" loading="lazy"><span>' + esc(w.name) + '</span></button>';
  openSheet('<h3>ブキを選ぶ<button data-nbclose="1">とじる</button></h3><input id="nbwq" placeholder="ブキ名で探す" autocomplete="off"><div class="body">' +
    (recent.length ? '<div class="lab nbrec">最近</div><div class="grid nbrec">' + recent.map(btn).join('') + '</div>' : '') +
    '<div class="lab">すべてのブキ</div><div class="grid" id="nbwall">' + ws.map(btn).join('') + '</div></div>',
    t => {
      const id = t.dataset.nbw; if (!id) return;
      nb.weapon = id; nb.recent = [id].concat(nb.recent.filter(x => x !== id)).slice(0, 8);
      closeSheet(false); redraw();
    });
  const q = sheet.querySelector('#nbwq');
  q.addEventListener('input', () => {
    const v = nfkc(q.value).toLowerCase().trim();
    sheet.querySelectorAll('.nbrec').forEach(el => el.style.display = v ? 'none' : '');
    sheet.querySelectorAll('#nbwall button').forEach(b => b.style.display = !v || b.dataset.name.includes(v) ? '' : 'none');
  });
}
// 起動時の最初の描画は note.js より前に走るので、読み込まれた時点で今のメモを出す（通信を待たない）
if (ui.view === 'note') render();
})();
