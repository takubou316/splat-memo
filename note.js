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
.nb-sec.hid{display:none}
.nb-sec h3 .nb-ebtn{margin-left:auto;align-self:center;flex:none;min-height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600;color:var(--sub);border:1px solid var(--line2);background:var(--card2)}
.nb-sec h3 .nb-ebtn.done{color:#1a1020;background:var(--salmon);border-color:var(--salmon)}
.nb-txt{font-size:16px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.nb-txt.open{display:block;-webkit-line-clamp:unset}
.nb-more{display:block;font-size:13px;font-weight:600;color:var(--salmon);padding:8px 0 2px}
.nb-more[hidden]{display:none}
.nb-blank{display:block;width:100%;text-align:left;min-height:44px;padding:0 12px;border:1px dashed var(--line2);border-radius:10px;color:var(--sub);font-size:14px}
.nb-inl{display:inline-flex;align-items:center;min-height:40px;margin:0 6px 8px 0;padding:0 12px;border-radius:999px;border:1px dashed var(--line2);color:var(--sub);font-size:13px;font-weight:600}
.nb-add{margin:4px 0 12px}
.nb-add .lab{font-size:12px;color:var(--faint);margin:0 2px 6px}
.nb-add .chips{display:flex;flex-wrap:wrap;gap:6px}
.nb-add .chips button{min-height:40px;padding:0 12px;border-radius:999px;border:1px dashed var(--line2);color:var(--sub);font-size:13px;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
.cn-cards{grid-template-columns:1fr}
/* 潮位の切り替え: 画面の下に貼り付け（片手で届くように） */
.cn-tide{position:sticky;bottom:0;z-index:2;display:flex;align-items:center;gap:6px;margin:12px -16px 0;padding:8px 16px;background:var(--nav);border-top:1px solid var(--line)}
.cn-tide span{font-size:11px;color:var(--faint);margin-right:2px;white-space:nowrap}
.cn-tide button{flex:1;min-height:44px;border-radius:10px;font-size:14px;font-weight:700;color:var(--sub);background:var(--card);border:1px solid var(--line)}
.cn-tide button.on{color:#1a1020;background:var(--salmon);border-color:var(--salmon)}
.cn-wcard{background:var(--card2);border:1px solid var(--line2);border-radius:14px;padding:2px 8px 0;margin-bottom:12px}
.cn-wcard .cn-whead{margin:8px 4px 6px}
.cn-wcard .nb-sec{margin-bottom:8px}
.cn-ws{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px}
.cn-ws button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:10px;background:var(--card);border:1px solid var(--line);font-size:10px;line-height:1.2;color:var(--sub);text-align:center;min-height:78px;overflow:hidden}
.cn-ws button img{width:40px;height:40px;object-fit:contain}
.cn-ws button span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cn-ws button b{font-size:22px;line-height:40px;color:var(--sub);font-weight:400}
.cn-ws button.on{border-color:var(--salmon);box-shadow:inset 0 0 0 1px var(--salmon);color:var(--text)}
.cn-ws button:disabled{opacity:.4}
.cn-whead{display:flex;align-items:center;gap:8px;margin:16px 2px 6px}
.cn-whead img{width:34px;height:34px;object-fit:contain}
.cn-whead b{font-size:15px;font-weight:700;color:var(--text)}
.cn-whead small{font-size:11px;color:var(--faint)}
.nbpics{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}
.nbpics:empty{display:none}
.nowpics{margin:-4px 14px 10px}
#edPicWrap{margin:0 12px calc(12px + env(safe-area-inset-bottom))}
#edPicWrap .nbpics{margin-top:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
#edPicWrap .nbpic,#edPicWrap .nbpic-add{flex:none}
#edPicSt{font-size:11px;color:var(--faint);min-height:14px;margin-top:3px}
.nbpic{width:72px;height:72px;padding:0;border-radius:8px;overflow:hidden;background:var(--card2);border:1px solid var(--line)}
.nbpic img{width:100%;height:100%;object-fit:cover;display:block}
.nbpic-add{position:relative;display:inline-flex;align-items:center;min-height:36px;padding:0 13px;border-radius:999px;border:1px dashed var(--line2);color:var(--sub);font-size:12px;font-weight:600;overflow:hidden}
.nbpic-add input{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:0}
.nbs-bg.nbv-bg{z-index:40;background:#000;align-items:stretch}
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
// メモの欄（その場で書ける。下に画像）
// 2026-11-23c（評価の優先順位4。Codex・Claude の評価 F13/F14）: 普段は「読む表示」。欄の「編集」を押した時だけ書く欄にする
// （読もうと触ってキーボードが出る・誤入力がそのまま保存される、を防ぐ。Bear・Evernote などの「読み取り専用が既定」と同じ考え）。
// 何も書いていない欄（文字も画像も無い）は隠し、画面の下の「メモを追加」にまとめる（main の欄だけは「まだありません ＋ 書く」の1行で残す）。
// 長いメモは6行まで見せて「続きを読む」
const editing = new Set(), expanded = new Set(); // 書いている欄・全部広げた欄（キー）
let addList = [], focusKey = null;               // 描画ごとに集める「隠した空の欄」、描画後にカーソルを置く欄
// inline: 空の時に「メモを追加」へ回さず、その場に小さな「＋ 書く」を置く（支給ブキ一覧のブキのカードの中など、どのブキの欄か分かるように）
const sec = (key, title, sub, ph, main, inline) => {
  const txt = memos[key] || '', ed = editing.has(key) || dirty.has(key), has = !!txt.trim();
  const head = btn => '<h3>' + esc(title) + '<small>' + esc(sub) + '</small>' + btn + '</h3>';
  if (ed) return '<div class="nb-sec editing' + (main ? ' main' : '') + '">' + head('<button class="nb-ebtn done" data-nbdone="' + esc(key) + '">完了</button>') +
    '<textarea class="nbta" data-nbkey="' + esc(key) + '" placeholder="' + esc(ph) + '" rows="2">' + esc(txt) + '</textarea>' +
    '<div class="nbpics" data-nbpk="' + esc(key) + '">' + addPicBtn(key) + '</div><div class="st" data-nbst="' + esc(key) + '"></div></div>';
  // 空の欄は隠す（画像だけある欄は、画像を読めた時に fillPics が見せる）
  const hide = !has && !main;
  if (hide && !inline) addList.push([key, title]);
  return '<div class="nb-sec' + (main ? ' main' : '') + (hide ? ' hid' : '') + '" data-nbsec="' + esc(key) + '">' + head('<button class="nb-ebtn" data-nbedit="' + esc(key) + '">編集</button>') +
    (has ? '<div class="nb-txt' + (expanded.has(key) ? ' open' : '') + '" data-nbtxt="' + esc(key) + '">' + esc(txt) + '</div><button class="nb-more" data-nbmore="' + esc(key) + '" hidden>' + (expanded.has(key) ? '▲ たたむ' : '▼ 続きを読む') + '</button>'
      : main ? '<button class="nb-blank" data-nbedit="' + esc(key) + '">まだありません　＋ 書く</button>' : '') +
    '<div class="nbpics" data-nbpro="1" data-nbpk="' + esc(key) + '"></div></div>' +
    (hide && inline ? '<button class="nb-inl" data-nbadd="' + esc(key) + '">＋ ' + esc(title) + '</button>' : '');
};
// 隠した空の欄の入口（画面の下にまとめる）
const addBar = () => addList.length ? '<div class="nb-add"><div class="lab">メモを追加（まだ書いていない欄）</div><div class="chips">' +
  addList.map(([k, title]) => '<button data-nbadd="' + esc(k) + '">＋ ' + esc(title) + '</button>').join('') + '</div></div>' : '';
// ブキのカテゴリ（TIER_DATA の type）。カテゴリ共通のメモのキーは wk:vs:<type> / wk:coop:<type>（2026-11-23）
const CAT = { Shooter: 'シューター', Blaster: 'ブラスター', Roller: 'ローラー', Brush: 'フデ', Charger: 'チャージャー', Slosher: 'スロッシャー',
  Spinner: 'スピナー', Maneuver: 'マニューバー', Shelter: 'シェルター', Stringer: 'ストリンガー', Saber: 'ワイパー' };
const catName = t => CAT[t] || t;
// 今の時間帯が分からない時の案内（読み込み中／取れなかった）。下のカードでステージを選べばメモは読める
const noSchedNote = what => '<div class="nb-note">' + (fetchError ? '今の' + what + 'のスケジュールを取得できませんでした。下でステージを選ぶと、保存してあるメモを読めます<button data-nbretry="1">もう一度取得</button>'
  : !sched ? '今の' + what + 'を読み込んでいます…（待たずに、下でステージを選んでもメモを読めます）'
  : '今の時間帯の' + what + 'が見つかりません。下でステージを選ぶとメモを読めます<button data-nbretry="1">取り直す</button>') + '</div>';
document.getElementById('main').addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-nbretry]')) refresh(true); });
// バトルメモ（view 'note'）とサモランメモ（view 'cnote'）
window.isNoteView = v => v === 'note' || v === 'cnote';
window.renderNote = () => { addList = []; return ui.view === 'cnote' ? renderCoop() : renderBattle(); };

function renderBattle(){
  // スケジュールが無くても（初回・通信できない）、ステージを選べばメモを読めるようにする（前は「読み込み中…」のまま止まっていた。Codexの評価 2026-11-23）
  const c = current(), w = weaponById(nb.weapon);
  let h = '';
  if (!c.modes.length) h += noSchedNote('バトル');
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
  if (w) h += sec(sbKey(c.stageId, w.id), sName + ' × ' + w.name, 'このステージでこのブキのとき', '例: 右の高台から抑える、ここの段差は登れない など', true);
  else h += '<div class="nb-sec main"><h3>' + esc(sName) + ' × ブキ<small>このステージでこのブキのとき</small></h3><div class="nb-empty" style="padding:10px">ブキを選ぶと書けます<br><button data-nbpick="weapon">ブキを選ぶ</button></div></div>';
  if (c.ruleId) h += sec(kVs(c.stageId, c.ruleId), sName + ' × ' + rName, 'このステージのこのルール', '例: ' + rName + 'のときはここを取る など', !w);
  h += '<div class="nb-sec"><h3>作戦図<small>' + esc(sName) + '</small></h3><div class="nowbd" data-nbd="v:' + esc(c.stageId) + '"></div></div>';
  if (w) h += sec('wv:' + w.id, w.name + 'のメモ', '全ステージ共通', '例: 射程、スペシャルの使いどころ など');
  // カテゴリ共通（2026-11-23 ユーザー要望「武器のカテゴリ共通も作りたい」）
  if (w && w.type) h += sec('wk:vs:' + w.type, catName(w.type) + 'のメモ', 'このカテゴリのブキ共通', '例: ' + catName(w.type) + 'の立ち回りの基本 など');
  // ルールのメモ（全ステージ共通。2026-11-21 ユーザー要望「ルールごと共通のメモが欲しい」）。キーは rl:<ルールID>
  if (c.ruleId) h += sec('rl:' + c.ruleId, rName + 'のメモ', '全ステージ共通', '例: ' + rName + 'の基本の立ち回り、カウントの取り方 など');
  h += sec(kVs(c.stageId), sName + 'のメモ', '全ルール共通', '例: 地形の特徴、よく通る道 など');
  // 全ステージ共通（2026-11-23 ユーザー要望）。キーは al:vs
  h += sec('al:vs', 'バトル全体のメモ', '全ステージ・全ルール共通', '例: いつも気をつけること、意識すること など');
  return h + addBar();
}

// ---- サモランメモ（2026-11-23 ユーザー要望「バトルで作ったものをサモランのほうも作りたい」、新しいタブ） ----
// 今の時間帯のサモラン（サーモンラン・ビッグラン・バイトチームコンテスト）→ ステージと支給ブキ。
// ブキは「1つ選ぶ」（支給の4つ＋ほかのブキから1つ）と「4つ全部」（支給ブキのメモを全部並べる）を切り替えられる（ユーザーが両方見たいと言ったため）
// キー: ステージ×ブキ cw:<CoopStageId>:<サモランのブキID>（新）／ブキ wc:（今あるもの）／カテゴリ wk:coop:<type>（新）／ステージ coop:<id>（今あるもの）／サモラン全体 al:coop（新）
const cnb = Object.assign({ mode: '', stage: null, weapon: null, all: false, tide: 'Mid', recent: [] }, load('sm_cnb', {}));
const CTIDES = [['Low', '干潮'], ['Mid', '通常'], ['High', '満潮']], CTIDE_NAME = Object.fromEntries(CTIDES);
const saveCnb = () => save('sm_cnb', { mode: cnb.mode, stage: cnb.stage, weapon: cnb.weapon, all: cnb.all, tide: cnb.tide, recent: cnb.recent });
const coopWeapons = () => (window.TIER_DATA && TIER_DATA.sets.coopWeapon && TIER_DATA.sets.coopWeapon.items) || [];
const coopWeaponById = id => coopWeapons().find(w => w.id === id) || null;
const cwKey = (sid, wid) => 'cw:' + sid + ':' + wid;
function coopModes(){
  if (!sched || !sched.data) return [];
  const c = sched.data.coopGroupingSchedule || {}, now = new Date();
  return [['rg', 'regularSchedules', 'サーモンラン'], ['br', 'bigRunSchedules', 'ビッグラン'], ['tc', 'teamContestSchedules', 'バイトチームコンテスト']].map(([key, k, label]) => {
    const n = curAndNext((c[k] || {}).nodes, now).cur;
    return n && n.setting && n.setting.coopStage ? { key, label, node: n, s: n.setting } : null;
  }).filter(Boolean);
}
function coopCurrent(){
  const modes = coopModes(), mode = modes.find(m => m.key === cnb.mode) || modes[0] || null, at = mode ? mode.node.startTime : '';
  const manual = cnb.stage && cnb.stage.at === at ? cnb.stage.id : null; // 自分で選んだステージ・ブキはその時間帯の間だけ
  const stageId = manual || (mode ? mode.s.coopStage.id : null);
  // 支給ブキ（ランダムの「？」などサモランのブキの一覧に無いものは id が空）
  const supplied = mode ? (mode.s.weapons || []).map(w => { const name = weaponName(w), id = coopWeaponIdByName(name); return { id, name, img: (w.image && w.image.url) || '' }; }) : [];
  const firstId = (supplied.find(x => x.id) || {}).id || null;
  const weaponId = cnb.weapon && cnb.weapon.at === at && coopWeaponById(cnb.weapon.id) ? cnb.weapon.id : firstId;
  return { modes, mode, at, stageId, manual: !!manual, supplied, weaponId };
}
function renderCoop(){
  const c = coopCurrent(), w = coopWeaponById(c.weaponId);
  let h = '';
  if (!c.modes.length) h += noSchedNote('サーモンラン');
  else h += '<div class="nb-modes">' + c.modes.map(m => '<button data-cnmode="' + m.key + '" class="' + (c.mode && m.key === c.mode.key ? 'on' : '') + '" style="--c:var(--salmon)"><b>' + esc(m.label) + '</b><small>' + esc(stageName(m.s.coopStage)) + '</small></button>').join('') + '</div>';
  h += '<div class="nb-cards cn-cards">' + (c.stageId
    ? '<button class="nb-card" data-cnpick="stage"><img src="' + esc(imgOf(c.stageId)) + '" alt=""><span class="t"><small>ステージ</small><b>' + esc(nameById(c.stageId)) + '</b></span><span class="tag' + (c.manual ? ' man' : '') + '">' + (c.manual ? '手動' : '今') + '</span></button>'
    : '<button class="nb-card empty" data-cnpick="stage"><span class="t"><small>ステージ</small><b>選ぶ</b></span></button>') + '</div>';
  if (c.manual || (cnb.weapon && cnb.weapon.at === c.at && !c.supplied.some(x => x.id === cnb.weapon.id))) h += '<div class="nb-note">自分で選んでいます（次の時間帯になると今のものに戻ります）<button data-cnreset="1">今に戻す</button></div>';
  // ブキの出し方の切り替え（呼び方は Codex の案「ブキ別／支給ブキ一覧」。同じメモの見せる範囲の違いだと分かるように）
  h += '<div class="nb-pair"><button data-cnall="0" class="' + (cnb.all ? '' : 'on') + '">ブキ別</button><button data-cnall="1" class="' + (cnb.all ? 'on' : '') + '">支給ブキ一覧</button></div>';
  if (!c.stageId) return h + '<div class="nb-empty">ステージを選ぶと、メモが出ます</div>';
  const sid = c.stageId, sName = nameById(sid), tide = CTIDES.some(x => x[0] === cnb.tide) ? cnb.tide : 'Mid', tName = CTIDE_NAME[tide];
  // 潮位（2026-11-23 ユーザー要望「潮位ごとのメモも追加したい」）: 選んだ潮位のメモ1つと、その潮位の作戦図だけを出す（Codexの案）。
  // 潮位の切り替えは画面の下に貼り付け（片手で届くように）。キーは td:<CoopStageId>:<Low|Mid|High>
  const tideSec = sec('td:' + sid + ':' + tide, sName + '・' + tName, 'この潮位のとき（表示中の潮位）', '例: ' + tName + 'の時に最初に行く場所、注意すること など', true);
  const board = '<div class="nb-sec"><h3>作戦図<small>' + esc(sName) + '・' + esc(tName) + '</small></h3><div class="nowbd" data-nbd="c:' + esc(sid) + ':' + tide + '"></div></div>';
  const stageSec = sec(kCoop(sid), sName + 'のメモ', '全潮位・全ブキ共通', '例: 納品のしかた、気をつける場所 など');
  const allSec = sec('al:coop', 'サモラン全体のメモ', '全ステージ・全ブキ共通', '例: いつも気をつけること、意識すること など');
  const catSec = t => sec('wk:coop:' + t, catName(t) + 'のメモ', 'このカテゴリのブキ共通（サモラン）', '例: ' + catName(t) + 'が支給された時の動き方 など');
  const tideBar = '<div class="cn-tide"><span>表示する潮位</span>' + CTIDES.map(([k, n]) => '<button data-cntide="' + k + '" class="' + (k === tide ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  // 並び（両方の表示で同じ）: 潮位 → 作戦図 → ブキ → ステージ共通 → カテゴリ → サモラン全体
  h += tideSec + board;
  if (!cnb.all){
    // 支給ブキ（タップで選ぶ）＋ほかのブキ
    h += '<div class="cn-ws">' + c.supplied.map(x => x.id
      ? '<button data-cnw="' + esc(x.id) + '" class="' + (x.id === c.weaponId ? 'on' : '') + '"><img src="' + esc(x.img) + '" alt=""><span>' + esc(x.name) + '</span></button>'
      : '<button disabled><img src="' + esc(x.img) + '" alt=""><span>' + esc(x.name) + '</span></button>').join('') +
      '<button data-cnpick="weapon" class="more' + (w && !c.supplied.some(x => x.id === w.id) ? ' on' : '') + '">' + (w && !c.supplied.some(x => x.id === w.id) ? '<img src="' + esc(w.img) + '" alt=""><span>' + esc(w.name) + '</span>' : '<b>＋</b><span>ほかのブキ</span>') + '</button></div>';
    if (w) h += sec(cwKey(sid, w.id), sName + ' × ' + w.name, 'このステージでこのブキのとき', '例: このブキの時はここで納品を守る など') +
      sec('wc:' + w.id, w.name + 'のメモ', '全ステージ共通（サモラン）', '例: 得意なオオモノ、スペシャルの使いどころ など');
    else h += '<div class="nb-sec"><h3>' + esc(sName) + ' × ブキ</h3><div class="nb-empty" style="padding:10px">ブキを選ぶと書けます<br><button data-cnpick="weapon">ブキを選ぶ</button></div></div>';
    h += stageSec;
    if (w && w.type) h += catSec(w.type);
    return h + allSec + addBar() + tideBar;
  }
  // 支給ブキ一覧: ブキごとに1枚のカード（このステージ・全ステージ共通）→ ステージ共通 → カテゴリ（重ならないように1回ずつ）→ 全体
  const seen = new Set(), ws = [];
  c.supplied.forEach(x => {
    if (!x.id){ h += '<div class="nb-note">' + esc(x.name) + 'はメモの対象外です（ランダム枠など）。「ブキ別」の「ほかのブキ」から実際のブキを選べます</div>'; return; }
    if (seen.has(x.id)) return; seen.add(x.id);
    const cw = coopWeaponById(x.id); if (!cw) return; ws.push(cw);
    h += '<div class="cn-wcard"><div class="cn-whead"><img src="' + esc(cw.img) + '" alt=""><b>' + esc(cw.name) + '</b><small>' + esc(catName(cw.type)) + '</small></div>' +
      sec(cwKey(sid, cw.id), 'このステージで', sName, '例: このブキの時はここで納品を守る など', false, true) +
      sec('wc:' + cw.id, 'このブキ全般', '全ステージ共通（サモラン）', '例: 得意なオオモノ、スペシャルの使いどころ など', false, true) + '</div>';
  });
  if (!c.mode) h += '<div class="nb-note">支給ブキが分からないので、ブキのメモは出せません。「ブキ別」から選んでください</div>';
  h += stageSec;
  [...new Set(ws.map(x => x.type).filter(Boolean))].forEach(t => { h += catSec(t); });
  return h + allSec + addBar() + tideBar;
}

// ---- メモをその場で書く（打つたびに少し待って保存） ----
// 打った欄は dirty（キー→値）に入れ、端末への保存が成功するまで残す（保存に失敗しても、離れる時にもう一度保存する）。
// 保存するのは打った欄だけ（ほかの画面で同じメモを書き換えていても、触っていない欄で上書きしない）
const timers = {}, dirty = new Map();
let pendingRender = false; // 書いている間に見送った描き直し（時間帯の更新など）
function autosize(ta){ ta.style.height = 'auto'; ta.style.height = Math.max(64, ta.scrollHeight + 2) + 'px'; }
const stOf = k => main.querySelector('[data-nbst="' + CSS.escape(k) + '"]');
const stAll = k => document.querySelectorAll('[data-nbst="' + CSS.escape(k) + '"]'); // 画像のお知らせ用（メモの編集画面の欄も含む）
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
// 同じメモをほかの画面（いまのステージの編集画面）で書き直した時に呼ぶ。ここに残っている古い打ちかけ（保存に失敗した物）で、新しい内容を上書きしないように（Codexの評価 2026-11-23）
window.noteForget = k => { clearTimeout(timers[k]); delete timers[k]; dirty.delete(k); };
// 書いている途中は画面を描き直さない（時間帯の更新などで打ちかけが消えないように）。見送った分は書き終えた後に描き直す
// 描いてある画面（バトル／サモラン）と開こうとしている画面が違う時は「書いている途中」扱いにしない（タブを移ったのに前の画面が残らないように。Codexレビュー 2026-11-23）
window.noteBusy = () => { const a = document.activeElement; return !!(a && a.classList && a.classList.contains('nbta')) && main.dataset.nv === ui.view; };
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
  if (pendingRender) setTimeout(() => { if (pendingRender && isNoteView(ui.view) && !window.noteBusy()){ pendingRender = false; render(); } }, 350);
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') flushAll(); });
window.noteAfterRender = () => {
  pendingRender = false; main.dataset.nv = ui.view; main.querySelectorAll('.nbta').forEach(autosize); fillPics();
  // 6行に収まらないメモにだけ「続きを読む」を出す
  main.querySelectorAll('.nb-txt').forEach(el => { const b = el.nextElementSibling; if (b && b.dataset.nbmore) b.hidden = !(el.classList.contains('open') || el.scrollHeight > el.clientHeight + 2); });
  if (focusKey){ const ta = main.querySelector('.nbta[data-nbkey="' + CSS.escape(focusKey) + '"]'); focusKey = null; if (ta){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.scrollIntoView({ block: 'center' }); } }
};

// ---- 画像（2026-11-22 ユーザー要望「それぞれ画像を載せれるようにしたい」）----
// メモの欄ごとに画像を付けられる。画像は IndexedDB 'splat-memo-pics'（作戦図の DB とは別）に、1枚ずつ {id, key: メモのキー, blob, w, h, at} で保存。
// 取り込む時に長い辺1600pxのJPEGに縮める。書き出し・読み込み（バックアップ）にも入る（notePics）
const PIC_DB = 'splat-memo-pics', PIC_MAX = 12, PIC_ALL = 300, PIC_KEY_RE = /^(sb|vs|wv|rl|coop|wc|bs|cw|al|wk|td|coach):[A-Za-z0-9+/=:_-]{1,120}$/; // coop・wc・bs はメモの編集画面から（2026-11-22b）
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
window.memoAcceptsPics = key => PIC_KEY_RE.test(key);
window.memoPicKeys = async () => {
  const db = await picDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pics', 'readonly'), keys = [];
    const request = tx.objectStore('pics').index('key').openKeyCursor(null, 'nextunique');
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor){ keys.push(cursor.key); cursor.continue(); }
    };
    tx.oncomplete = () => resolve(keys);
    tx.onabort = tx.onerror = () => reject(tx.error);
  });
};
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
// 画像の欄はバトルメモのほか、いまのステージ（見るだけ、data-nbpro）とメモの編集画面（index.html の #edPics）にもある。同じキーの欄が複数あれば全部に出す
const picSlots = k => [...document.querySelectorAll('[data-nbpk="' + CSS.escape(k) + '"]')];
function releasePics(k){ (picUrls.get(k) || []).forEach(u => URL.revokeObjectURL(u)); picUrls.delete(k); }
// URLは「新しい絵を入れ終えてから古い方を捨てる」。どの欄にも無くなったキーのURLは最後にまとめて捨てる（Codexレビュー 2026-11-22b）
const slotKeys = () => new Set([...document.querySelectorAll('[data-nbpk]')].map(el => el.dataset.nbpk).filter(Boolean));
function prunePics(){ const live = slotKeys(); [...picUrls.keys()].forEach(k => { if (!live.has(k)) releasePics(k); }); }
async function fillPics(keys){
  if (!keys) keys = [...slotKeys()];
  for (const k of keys){
    if (!k) continue;
    const my = picSeq[k] = (picSeq[k] || 0) + 1;
    let list = [];
    try { list = await picsOf(k); } catch (e){ continue; }
    const els = picSlots(k);
    if (my !== picSeq[k] || !els.length) continue;
    const old = picUrls.get(k) || [];
    const urls = list.map(p => URL.createObjectURL(p.blob)); picUrls.set(k, urls);
    const thumbs = list.map((p, i) => '<button class="nbpic" data-nbpicv="' + esc(p.id) + '" data-nbpk2="' + esc(k) + '"><img src="' + urls[i] + '" alt=""></button>').join('');
    els.forEach(el => {
      el.innerHTML = thumbs + (!el.dataset.nbpro && list.length < PIC_MAX ? addPicBtn(k) : '');
      // 画像だけある欄は、隠していても見せる（「メモを追加」からは外す）
      const s = el.closest('.nb-sec.hid'); if (s && list.length){ s.classList.remove('hid'); const c = main.querySelector('[data-nbadd="' + CSS.escape(k) + '"]'); if (c) c.remove(); }
    });
    old.forEach(u => URL.revokeObjectURL(u));
  }
  prunePics();
}
window.fillMemoPics = fillPics;
window.addPicBtnHtml = addPicBtn;
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
  const say = t => stAll(k).forEach(s => { s.textContent = t; });
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
document.addEventListener('click', e => {
  const inp = e.target; if (!inp.dataset || !inp.dataset.nbpicin || inp.dataset.nbhooked) return;
  inp.dataset.nbhooked = '1';
  inp.addEventListener('change', () => {
    const files = [...(inp.files || [])], k = inp.dataset.nbpicin; inp.value = '';
    if (files.length && PIC_KEY_RE.test(k)) addPics(k, files);
  });
}, true);
// 画像を大きく見る（左右で同じ欄の画像を切り替え、タップで拡大、削除）
let viewerSeq = 0;
async function openViewer(k, id, origin){
  const my = ++viewerSeq;
  let list; try { list = await picsOf(k); } catch (e){ toast('画像を読めませんでした'); return; }
  // 2回押した・押したサムネが消えた／隠れた（編集画面を閉じた等）・別の画面が開いている時は開かない
  if (my !== viewerSeq || sheet || !origin || !origin.isConnected || !origin.getClientRects().length) return;
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
// 取り込み中の画像も入るように、追加・削除と同じ列に並んでから読む（Codexの評価 2026-11-23）
window.exportNotePics = () => picQueue(async () => {
  try {
    const all = await picDo('readonly', s => s.getAll()), out = [];
    for (const p of all || []) if (p && p.blob) out.push({ id: p.id, key: p.key, w: p.w, h: p.h, at: p.at, data: await blobToDataURL(p.blob) });
    return out;
  } catch (e){ return null; }
});
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
function redraw(){ flushAll(); saveNb(); saveCnb(); render(); }
// 読む表示と書く欄の切り替え（バトルメモ・サモランメモ共通）
main.addEventListener('click', e => {
  if (!isNoteView(ui.view)) return;
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  // 書いている欄にカーソルが残ったままだと描き直しが見送られるので、先に外す（iPhoneではボタンを押してもカーソルが外れないことがある）
  if ((d.nbedit || d.nbadd || d.nbdone) && document.activeElement && document.activeElement.classList.contains('nbta')) document.activeElement.blur();
  if (d.nbedit || d.nbadd){ const k = d.nbedit || d.nbadd; editing.add(k); focusKey = k; redraw(); }
  else if (d.nbdone){ flushAll(); if (!dirty.has(d.nbdone)){ editing.delete(d.nbdone); render(); } }
  else if (d.nbmore){
    const k = d.nbmore, el = main.querySelector('[data-nbtxt="' + CSS.escape(k) + '"]'); if (!el) return;
    if (expanded.has(k)) expanded.delete(k); else expanded.add(k);
    el.classList.toggle('open', expanded.has(k)); t.textContent = expanded.has(k) ? '▲ たたむ' : '▼ 続きを読む';
  }
});
main.addEventListener('click', e => {
  if (ui.view !== 'cnote') return;
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset, c = coopCurrent();
  if (d.cnreset){ cnb.stage = null; cnb.weapon = null; redraw(); }
  else if (d.cnmode){ cnb.mode = d.cnmode; cnb.stage = null; cnb.weapon = null; redraw(); }
  else if (d.cnall != null){ cnb.all = d.cnall === '1'; redraw(); }
  else if (d.cntide){ cnb.tide = d.cntide; redraw(); }
  else if (d.cnw){ cnb.weapon = { id: d.cnw, at: c.at }; redraw(); }
  else if (d.cnpick === 'stage') openCoopStageSheet();
  else if (d.cnpick === 'weapon') openWeaponSheet(coopWeapons(), c.weaponId, cnb.recent, id => {
    cnb.weapon = { id, at: coopCurrent().at }; cnb.recent = [id].concat(cnb.recent.filter(x => x !== id)).slice(0, 8);
  });
});
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
// 画像のサムネ（バトルメモ・いまのステージ・メモの編集画面のどこからでも）
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-nbpicv]'); if (!t || t.closest('.nbs-bg')) return;
  openViewer(t.dataset.nbpk2, t.dataset.nbpicv, t);
});

// ---- 選ぶシート ----
let sheet = null, sheetCleanup = null, skipPop = false;
function closeSheet(fromPop){
  if (!sheet) return;
  sheet.remove(); sheet = null;
  if (sheetCleanup){ sheetCleanup(); sheetCleanup = null; }
  // 自分で履歴を1つ戻した分の popstate は、ここで受け止める（メモの編集画面の上で画像を見ていた時に、編集画面まで閉じないように）
  if (!fromPop && history.state && history.state.nbsheet){ skipPop = true; history.back(); }
}
window.notePop = () => { if (skipPop){ skipPop = false; return true; } if (sheet){ closeSheet(true); return true; } return false; };
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
function openCoopStageSheet(){
  const c = coopCurrent(), nowId = c.mode ? c.mode.s.coopStage.id : null;
  const row = (id, sub) => '<button data-cnstage="' + esc(id) + '" class="' + (id === c.stageId ? 'on' : '') + '"><img src="' + esc(imgOf(id)) + '" alt=""><span>' + esc(nameById(id)) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></button>';
  openSheet('<h3>ステージを選ぶ<button data-nbclose="1">とじる</button></h3><div class="body list">' +
    (nowId ? '<div class="lab">今の' + esc(c.mode.label) + '</div>' + row(nowId, '') : '') +
    '<div class="lab">すべてのステージ</div>' + allStages('coop').filter(s => s.id !== nowId).map(s => row(s.id, s.num >= 100 ? 'ビッグラン' : '')).join('') + '</div>',
    t => {
      const id = t.dataset.cnstage; if (!id) return;
      const c2 = coopCurrent();
      cnb.stage = c2.mode && id === c2.mode.s.coopStage.id ? null : { id, at: c2.at };
      closeSheet(false); redraw();
    });
}
// list: 並べるブキ、selId: 選んでいるブキ、recentIds: 最近、onPick: 選んだ時（省略するとバトルメモのブキ）
function openWeaponSheet(list, selId, recentIds, onPick){
  if (!list){ list = weapons(); selId = nb.weapon; recentIds = nb.recent; onPick = id => { nb.weapon = id; nb.recent = [id].concat(nb.recent.filter(x => x !== id)).slice(0, 8); }; }
  const ws = list, recent = recentIds.map(id => list.find(w => w.id === id)).filter(Boolean);
  const btn = w => '<button data-nbw="' + esc(w.id) + '" data-name="' + esc(nfkc(w.name).toLowerCase()) + '" class="' + (w.id === selId ? 'on' : '') + '"><img src="' + esc(w.img) + '" alt="" loading="lazy"><span>' + esc(w.name) + '</span></button>';
  openSheet('<h3>ブキを選ぶ<button data-nbclose="1">とじる</button></h3><input id="nbwq" placeholder="ブキ名で探す" autocomplete="off"><div class="body">' +
    (recent.length ? '<div class="lab nbrec">最近</div><div class="grid nbrec">' + recent.map(btn).join('') + '</div>' : '') +
    '<div class="lab">すべてのブキ</div><div class="grid" id="nbwall">' + ws.map(btn).join('') + '</div></div>',
    t => {
      const id = t.dataset.nbw; if (!id) return;
      onPick(id);
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
if (isNoteView(ui.view)) render();
})();
