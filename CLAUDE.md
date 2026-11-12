# CLAUDE.md（splat-memo）

スプラトゥーン3の「サーモンラン」「バトル（対人）」のステージごとにメモを書き、
アプリを開いた瞬間に**今のスケジュールのステージとそのメモ**が見えるスマホ向けPWA。2026-11-12作成。

## 構成
- `index.html` … 画面・ロジックすべて（ビルド不要、外部ライブラリなし）
- `sw.js` … アプリ本体のオフライン用キャッシュ（ネットワーク優先・`cache:'no-store'`）。APIは扱わない
- `manifest.webmanifest`, `icon-*.png` … ホーム画面追加用
- ローカル確認: ルートの `.claude/launch.json` の `splat-memo`（ポート8085）

## データ
- スケジュール: `https://splatoon3.ink/data/schedules.json`（CORS可）。日本語名は `.../locale/ja-JP.json` をIDで引く
  - 取得結果は localStorage `sm_sched` に控え、通信失敗時は控えを表示
  - 30分経過、または取得後に新しい時間帯が始まっていたら取り直す（ホーム画面アプリは開きっぱなしで復帰するため `visibilitychange` でも判定）
- メモ: localStorage `sm_memos` に `{ key: text }`（端末内のみ・同期なし。ユーザーが選択）
  - サーモンラン: `coop:<CoopStageId>`（ビッグランのステージはIDが別。100番台）
  - バトル: `vs:<VsStageId>:all`（共通）/ `vs:<VsStageId>:<VsRuleId>`（ルール別）
  - バックアップは「メモ一覧」タブ下部の書き出し/読み込み（JSON）
- IDはsplatoon3.inkのbase64 ID（例 `VnNTdGFnZS00` = `VsStage-4`）

## 方針（決定済み）
- iPhoneではアプリを自動で起動できないため、「開いた瞬間に今のステージのメモを出す」形にした。通知（Web Push）はサーバーが要るので見送り
- 作業日記は takutolibrary ルールどおり `作業日記` に記録
