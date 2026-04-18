# AGENTS.md

## このリポジトリの目的

このリポジトリは `pokemon-SnapCrop` の本体です。  
`pokemon-SnapCrop` は、対戦画面のライブ映像をブラウザで見ながら、左右に参照画像を保持表示し、下段の terminal 風 CLI パネルを中心に操作する静的 Web アプリです。

主目的は次の 3 つです。

1. 対戦中に左右の参照画像を保持表示すること
2. キーボード中心で素早く操作できること
3. 対応条件では待機中画面を検出して自動で `snap both` できること

このアプリは、ダウンロード機能や装飾的な UI よりも、**対戦中に迷わず使えること**を優先します。

---

## 主なファイル

- `index.html`  
  画面構造。本体レイアウト、toolbar、3 ペイン、terminal を定義する

- `style.css`  
  レイアウト、配色、terminal 表示、crop overlay、debug overlay などの見た目を定義する

- `app.js`  
  メディア取得、映像 / 音声切り替え、crop、terminal コマンド、auto snap、PWA 周辺の主要ロジックを持つ

- `assets/auto/*`  
  auto snap 用のテンプレート画像

- `data/pokemon-reference.csv`  
  ポケモン検索に使う CSV データ

- `manifest.webmanifest`, `sw.js`  
  PWA 関連

- `.github/workflows/deploy.yml`  
  GitHub Pages 自動 deploy

- `README.md`  
  ユーザー向けの説明書

---

## 実行と確認

このアプリは静的サイトです。  
`file://` 直開きではなく、HTTP 経由で開いてください。

ローカル確認方法:
- VS Code Live Server
- 任意の静的ファイルサーバー

主な利用環境:
- Windows
- Google Chrome 推奨
- Microsoft Edge でも動作するが、auto snap は Chrome の方が安定しやすい場合がある

GitHub Pages でも動作する前提です。

---

## このアプリで優先すること

変更時は、以下の優先順位を崩さないでください。

1. 左右参照画像を保持表示する本線を壊さない
2. terminal 中心の操作導線を壊さない
3. `snap` は「現在フレームを参照画像へ更新する操作」であることを維持する
4. auto snap は便利機能だが、誤検出を増やすくらいなら保守的でよい
5. 16:9 入力を主経路として扱う
6. OBS Virtual Camera + 別音声入力の運用を壊さない

このアプリの主目的は「参照画像の保持表示」であり、ダウンロード機能は本線ではありません。

---

## 変更時の基本方針

- まず既存コードと README を読み、現状仕様を把握してから作業する
- 小さい変更でも、影響が広い場合は先に計画を立てる
- 最小差分を優先する
- 既存 helper や既存フローを再利用する
- terminal 文言は日本語で、短く自然にする
- manual fallback を安易に削らない
- 実装していない機能を README に書かない
- 確認していないことを「確認済み」と書かない

---

## 壊しやすい領域

以下は影響範囲が広く、壊れやすいので特に注意してください。

- 映像デバイス選択と stream 切り替え
- 音声入力の切り替え
- auto snap の検出フロー
- crop overlay の drag / resize
- terminal focus return
- fullscreen
- PWA / Service Worker / キャッシュ挙動
- `workspace-top` / `video-stage` / `terminal-panel` のレイアウト変更

これらを触るときは、広いリファクタより安全な局所修正を優先してください。

---

## してはいけないこと

- バックエンドを追加しない
- 外部 API 依存にしない
- OCR を勝手に導入しない
- auto snap の検出条件を雑に増やさない
- 大きなレイアウト変更を軽い気持ちで入れない
- terminal 中心の操作思想を崩さない
- 4:3 と 16:9 の扱いを混同しない
- 映像切り替え処理に音声切り替えを雑に巻き込まない
- ユーザー向け README に開発中メモを混ぜない

---

## README の扱い

`README.md` は **ユーザー向けの取扱説明書** として扱ってください。  
主に以下を反映します。

- このツールで何ができるか
- 推奨環境
- 使い始める手順
- 基本操作
- コマンド一覧
- 制約 / 注意点
- 困ったときの対処

開発ルールや agent 向け運用は README ではなく、この `AGENTS.md` に置きます。

---

## 検証方針

変更後は、影響範囲に応じて可能な限り以下を確認してください。

### 基本確認
1. localhost でページが開く
2. GitHub Pages 前提の相対パス構成を壊していない
3. 映像入力が選べる
4. 映像開始または切り替えができる
5. 必要なら音声入力が機能する
6. `edit` / `ready` が動く
7. `snap both` が動く
8. terminal 入力が壊れていない
9. README の内容が現実とズレていない

### 変更内容に応じた追加確認
- auto snap に触れた場合:
  - `auto on` / `auto off` / `auto status`
  - 待機中画面での自動 snap
  - 16:9 と 4:3 の分岐
- crop に触れた場合:
  - drag / resize
  - 保存 / 復元
  - 表示座標の補正
- layout に触れた場合:
  - fullscreen
  - terminal scroll
  - focus return
  - mobile fallback
- PWA / SW に触れた場合:
  - キャッシュ由来の表示崩れ
  - 更新反映
  - standalone 起動

---

## 完了条件

タスクは、少なくとも以下を満たしたときに完了とします。

- 依頼された変更が実装されている
- 本線の対戦 workflow を壊していない
- terminal 中心の操作感が維持されている
- 変更に応じた最低限の確認が済んでいる
- 必要なら `README.md` が更新されている
- 不要な複雑化や広すぎる差分が入っていない

---

## 詰まったときの報告

詰まった場合は、次の順で簡潔に整理してください。

1. 何が blocker か
2. それがブラウザ制約 / デバイス制約 / 実装不備のどれか
3. 代替案は何か
4. それでも前進できる最小の次手は何か