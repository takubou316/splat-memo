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
- ステージ画像: バトルは `vsStages.nodes[].originalImage`（高解像度）を `low_resolution/..._1.png` に置き換えて使う。サモラン会場は全一覧がAPIに無いため `index.html` の `COOP_IMG_HASH` に固定で持つ
  - 画像ファイル名＝内部名のSHA256（例 `Cop_Shakeup`）。ビッグランは `Cop_<バトルの内部名>`（`Cop_Temple`=マテガイ等）。内部名一覧は Leanny/splat3 の `data/mush/<ver>/CoopSceneInfo.json`。新ステージ追加時はここから足す（assets.splatoon3.inkはUser-Agentなしだと弾かれるので確認時に注意）
- ばちこん（バイトチームコンテスト）のシナリオ: localStorage `sm_contests`
  - キー＝`<CoopStageId>|<ブキ4種の__splatoon3ink_id>`。ループで同じ組み合わせが再登場したら同じ記録を出す（`seen`に開催開始日時を追記）
  - 中身（潮位・イベント・「残り秒/どこ/何」の行・スペシャル・メモ）は公開データに無いのでユーザーが手入力（2026-11-12ユーザー選択）。WAVE数は既定5、追加・削除可
  - 「🗺 マップ」はサーモンラーンNW `https://salmon-learn-nw.gungee.jp/map/?stage=<Shake内部名>&tide=Low|Mid|High` を開く（ビッグラン会場は非対応）
  - バックアップJSONは version 2 で `memos` と `contests` を含む
  - ブキごとのスペシャル: `sp: {ブキ番号0-3: 'Chariot' 等}`。画像は `special_img/blue/<sha256(Sp内部名)>_0.png`（`SPECIALS` 定数。サモラン用はLeanny/splat3 `WeaponInfoSpecial.json` のType=Coop、スーパーチャクチは画像なしで除外）
  - 秒数: WAVEごとに `band`（キケン度帯）を選ぶと、オオモノ湧き時刻（＝湧き方向の切替、間隔72/n秒）の固定行（`fixed:true`）が並ぶ。残り28秒が最後のオオモノ、それ以降はザコのみ。表の出典はwikiwiki「サーモンラン NEXT WAVE」・macarongamemo。帯を変えると空の固定行だけ消える
  - 調べた仕様: ばちこんはWAVE5まで・同じシナリオを繰り返す・キケン度60%から納品数で上昇（攻略サイト情報、公式未確認）
- IDはsplatoon3.inkのbase64 ID（例 `VnNTdGFnZS00` = `VsStage-4`）

## 方針（決定済み）
- iPhoneではアプリを自動で起動できないため、「開いた瞬間に今のステージのメモを出す」形にした。通知（Web Push）はサーバーが要るので見送り
- 作業日記は takutolibrary ルールどおり `作業日記` に記録
