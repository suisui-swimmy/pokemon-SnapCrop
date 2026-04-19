# AGENTS.md

## このリポジトリについて

このリポジトリは `pokemon-SnapCrop` の本体です。  
対戦画面のライブ映像をブラウザで表示しながら、左右に参照画像を保持表示し、terminal 風 CLI パネルを中心に操作する静的 Web アプリを管理します。

このアプリの主目的は以下です。

- 左右の参照画像を対戦中ずっと表示し続けること
- キーボード中心で素早く操作できること
- 対応条件下で待機中画面を自動検出し、`snap both` できること

ダウンロード機能は主目的ではありません。  
`snap` の本質は「現在フレームから参照画像を更新すること」です。

---

## 主な利用環境

- Windows 11
- Google Chrome 推奨
- Microsoft Edge でも動作するが、auto snap は Chrome の方が安定しやすい場合がある
- GitHub Pages または localhost 経由で利用する
- 16:9 入力を主経路とする
- OBS Virtual Camera を強く推奨する

---

## 主なファイル

- `index.html`  
  アプリ全体の DOM 構造
- `style.css`  
  レイアウトと UI
- `app.js`  
  メディア入力、クロップ、terminal、auto snap などの主要ロジック
- `assets/auto/*`  
  auto snap 用テンプレート画像
- `data/champions_ Reg_M-A.csv`  
  ポケモン検索用データ
- `manifest.webmanifest`, `sw.js`  
  PWA 関連
- `.github/workflows/deploy.yml`  
  GitHub Pages 自動 deploy
- `README.md`  
  ユーザー向け取扱説明書

---

## 実行と確認

このアプリは静的サイトです。  
`file://` 直開きではなく、HTTP 経由で確認してください。

- VS Code Live Server などの静的ファイルサーバーを使う
- または GitHub Pages で確認する

`file://` を前提に直さないこと。  
`getUserMedia()`、CSV 読み込み、Service Worker の都合で、`localhost` または HTTPS 前提です。

---

## このリポジトリで守ること

### 1. 最小差分を優先する
- 大きなリファクタは避ける
- まず既存の流れを読み、既存関数を再利用する
- 1つのタスクで広げすぎない

### 2. 主目的を見失わない
- 主線は「左右参照画像の保持表示」
- terminal 中心の操作性を壊さない
- click 依存を増やしすぎない

### 3. 既存の本線を壊さない
特に以下は壊しやすいので慎重に触ること。

- 映像デバイス選択と stream 切り替え
- 音声入力の分離構成
- crop overlay の drag / resize
- terminal focus return
- auto snap の検出フロー
- fullscreen / PWA / Service Worker
- `workspace-top` / `video-stage` / `terminal-panel` を含むレイアウト

### 4. UI 文言は日本語で短く自然にする
- terminal の文言は簡潔にする
- debug 用の内部情報は通常表示に混ぜすぎない
- 実装していない機能を README に書かない

### 5. 相対パスを維持する
- ルート相対パスに寄せない
- GitHub Pages の repo 名付き URL 配下でも壊れにくい構成を維持する

---

## 現在の重要仕様

- 映像入力選択時に、自動で映像開始または切り替えを試みる
- 音声入力は映像と分離して扱う
- OBS Virtual Camera は映像のみを前提とする
- 16:9 入力では固定クロッププリセットを主経路とする
- 4:3 入力ではクロップ補正はするが、自動認識は行わない
- `auto on` は `ready` への切り替えまでまとめて行う
- auto snap は `ready` 中だけ監視する
- `debug on` のときだけ認識範囲表示を出す
- terminal は本番導線であり、入力フォーカスの維持を重視する

---

## 変更時の基本方針

### terminal / CLI
- terminal を主導線として扱う
- コマンド追加は本当に必要なものだけにする
- 1文字 alias を増やしすぎない
- 状態確認系は `status` / `auto status` / `debug status` に寄せる

### media / stream
- video と audio を不用意に巻き込んで再初期化しない
- `audio-select` の変更で video を再初期化しない
- 権限拒否、未接続、使用中の分岐を壊さない

### auto snap
- 誤発火より見逃し寄りを優先する
- 16:9 専用の前提を崩さない
- テンプレ画像と ROI 前提の保守的な構成を維持する

### layout
- 見た目の微調整でも、fullscreen / PWA / mobile fallback への影響を見る
- UI 改修は広げすぎない
- 便利そうでも、レイアウト事故の温床になる変更は慎重に扱う

---

## 完了前に確認すること

変更内容に応じて、関係する項目を確認すること。

### 基本
1. localhost でページが開く
2. GitHub Pages 配下でも壊れにくい
3. README の説明が実装とズレていない

### 映像・音声
4. 映像入力一覧が表示される
5. 映像入力選択で開始または切り替えできる
6. 音声入力が壊れていない
7. OBS Virtual Camera の映像のみ運用が壊れていない

### クロップ
8. `edit` / `ready` が動く
9. crop overlay の drag / resize が動く
10. 4:3 の補正や保存復元が壊れていない

### terminal
11. `snap both` が動く
12. 空 Enter / `Ctrl + Enter` が動く
13. terminal focus return が壊れていない
14. 検索結果表示が壊れていない

### auto snap
15. `auto on` / `auto off` / `auto status` が動く
16. `auto on` で `ready` まで入る
17. 16:9 入力で待機中検出が動く
18. 4:3 入力で監視しないことが維持されている
19. `debug on` で必要な認識範囲が出る

### 表示まわり
20. fullscreen が壊れていない
21. PWA / Service Worker まわりに明確な退行がない
22. gh-pages でキャッシュずれによる不整合が起きていないか確認する

確認していないことを、確認済みと書かないこと。

---

## Done の定義

タスクは、以下を満たしたら完了です。

- 依頼された変更が実装されている
- 主線である対戦中の利用フローが壊れていない
- terminal 中心の操作感が保たれている
- 映像 / 音声 / クロップ / auto snap の既存本線に不要な退行がない
- ユーザー向け挙動が変わった場合は `README.md` を必要に応じて更新している
- 不要な複雑化を増やしていない

---

## やってはいけないこと

- バックエンドを追加しない
- 外部 API 依存にしない
- OCR を勝手に追加しない
- 4:3 自動認識対応を勝手に広げない
- terminal 導線を click-heavy UI に置き換えない
- 実装していない仕様を README に書かない
- 軽い見た目調整のつもりで広範囲レイアウト改修に広げない

---

## 詰まったとき

詰まった場合は、以下の順で整理すること。

1. 何が blocker か
2. それがブラウザ制約 / デバイス制約 / 実装不備のどれか
3. 最善の代替策は何か
4. 今のスコープのままで前進できる最小の次手は何か