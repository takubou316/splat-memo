// バトルのメモ帳（2026-11-21〜、試作のタブ）。index.html・board.js の後に読み込む。
// ユーザー要望:「スマホで開いたときに valo-memo みたいにメモが開くようにしたい。ステージとブキを選択してメモを見れる」
// → まずはバトルだけ・新しいタブで作り、出来が良ければ「いまのステージ」と入れ替える（ユーザー判断 2026-11-21）。
// 画面: 今のバトルのモード → ステージとブキのカード → ルール → メモ（ステージ×ブキ／ステージ×ルール／作戦図／ブキ／ステージ）
// メモはその場で書けて自動保存。ステージ×ルール（vs:<id>:<rule>）・ブキ（wv:）・ステージ（vs:<id>:all）は今あるメモと同じキー。
// ステージ×ブキだけ新しいキー sb:<VsStageId>:<ブキID>。
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
    '<textarea class="nbta" data-nbkey="' + esc(key) + '" placeholder="' + esc(ph) + '" rows="2">' + esc(memos[key] || '') + '</textarea><div class="st" data-nbst="' + esc(key) + '"></div></div>';
  if (w) h += sec(sbKey(c.stageId, w.id), sName + ' × ' + w.name, 'このステージでこのブキのとき', '例: 右の高台から抑える、ここの段差は登れない など', true);
  else h += '<div class="nb-sec main"><h3>' + esc(sName) + ' × ブキ<small>このステージでこのブキのとき</small></h3><div class="nb-empty" style="padding:10px">ブキを選ぶと書けます<br><button data-nbpick="weapon">ブキを選ぶ</button></div></div>';
  if (c.ruleId) h += sec(kVs(c.stageId, c.ruleId), sName + ' × ' + rName, 'このステージのこのルール', '例: ' + rName + 'のときはここを取る など', !w);
  h += '<div class="nb-sec"><h3>作戦図<small>' + esc(sName) + '</small></h3><div class="nowbd" data-nbd="v:' + esc(c.stageId) + '"></div></div>';
  if (w) h += sec('wv:' + w.id, w.name + 'のメモ', '全ステージ共通', '例: 射程、スペシャルの使いどころ など');
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
window.noteAfterRender = () => { pendingRender = false; main.querySelectorAll('.nbta').forEach(autosize); };
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
});

// ---- 選ぶシート ----
let sheet = null;
function closeSheet(fromPop){
  if (!sheet) return;
  sheet.remove(); sheet = null;
  if (!fromPop && history.state && history.state.nbsheet) history.back();
}
window.notePop = () => { if (sheet){ closeSheet(true); return true; } return false; };
function openSheet(html, onClick){
  closeSheet(false);
  sheet = document.createElement('div'); sheet.className = 'nbs-bg';
  sheet.innerHTML = '<div class="nbs">' + html + '</div>';
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
