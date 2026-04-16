### 2026-04-16 22:48 JST — 待機中画面の自動 snap v1 を追加
- Status: done
- Goal:
  選出画面から待機中画面への遷移を ready モード中だけ監視し、`snap both` を自動発火できる最小構成を入れる
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - `app.js` に auto snap 用の軽量状態機械を追加し、`idle -> armed -> fired` の流れで ready 中のみ監視するようにした
  - 既存の `handleSnapCommand("both")` を再利用する形で、自動発火時も左右参照画像の更新処理を共通化した
  - terminal コマンド `auto on / auto off / auto status / auto reset` を追加し、phase と直近判定理由を確認できるようにした
  - README を、左右参照表示と auto snap コマンドを含む現状仕様に合わせて更新した
- Verification:
  - `node --check app.js`: pass
  - Manual check: 添付 2 画像に対して PowerShell の簡易検証を行い、1 枚目で arm、2 枚目で trigger 条件を満たすことを確認
- Remaining issues:
  - auto snap は v1 の閾値ベースなので、クロップ位置や実際の映像入力条件によっては追加調整が必要
  - 実カメラ入力つきのブラウザ実機確認は未実施
- Next step:
  - 実際の配信画面で `auto status` を見ながら閾値を微調整し、必要なら prompt ROI と `leftShift` 条件を詰める

### 2026-04-16 23:11 JST — auto 検出 ROI のデバッグ表示を追加
- Status: done
- Goal:
  自動 snap がどこを監視しているかを UI 上で確認できるようにする
- Changed files:
  - `index.html`
  - `style.css`
  - `app.js`
  - `PROGRESS.md`
- What changed:
  - `video-stage` 上に `AUTO 自 / AUTO 敵 / AUTO 中央` のデバッグ枠を追加した
  - `ready` かつ `auto ON` のときだけ、左右 crop と中央 prompt ROI を破線オーバーレイで表示するようにした
  - 枠表示は既存の crop 編集 overlay と分離し、通常の pointer 操作を邪魔しない `pointer-events: none` にした
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザ上での視認性とラベル位置の最終確認は未実施
- Next step:
  - 実画面で debug 枠の見え方を確認し、必要なら線色や表示条件を微調整する

### 2026-04-17 01:37 JST — auto snap v2 の状態機械と fallback を実装
- Status: done
- Goal:
  `マッチング待機/マッチング -> loading -> 選出 -> 選出完了 -> 待機中` の順序を使う auto snap v2 に置き換え、待機中優先 + committed frame fallback を入れる
- Changed files:
  - `app.js`
  - `index.html`
  - `style.css`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - `app.js` の auto 検出を v1 の `armed -> fired` 方式から、`match_dialog_seen -> loading_seen -> selection_active -> selection_committed -> snapped` の状態機械へ置き換えた
  - `requestVideoFrameCallback` 優先の監視 loop を追加し、auto 監視中は video frame 単位で判定するようにした
  - `選出完了` を左端番号帯と左下 `4/4` バーで検出し、その時点の左右 crop を committed frame としてメモリ保持する fallback を追加した
  - `待機中` は committed baseline からの `my` crop 崩れ + `enemy` 側リスト維持 + 上部 status 変化で判定し、間に合わない場合は `[auto:fallback]` で committed frame を 1 回だけ反映するようにした
  - debug overlay を `AUTO 中央 / AUTO 読込 / AUTO 誤判定ガード / AUTO 番号帯 / AUTO 完了バー` まで拡張した
  - README の auto snap 説明を v2 の検出フローと fallback 仕様に更新した
- Verification:
  - `node --check app.js`: pass
  - Manual check: 添付静止画で `dialog / loading / selection / committed` の閾値を PowerShell で再計測し、画像 1-5 と 10 が意図どおりに分かれることを確認
- Remaining issues:
  - `待機中` と `battle start` の最終チューニングは、実動画または実ブラウザ入力での確認がまだ必要
  - `wait_target` はユーザーの実 crop に依存するため、必要なら `myDrop` と `statusShift` の閾値を追加調整する余地がある
- Next step:
  - 実際の動画入力で `auto status` と debug overlay を見ながら `wait_target` / `fallback` の発火タイミングを確認し、必要なら `waiting` 閾値を微調整する

### 2026-04-17 02:53 JST — auto snap v2.1 で `選出完了` をラッチ専用に修正
- Status: done
- Goal:
  `選出完了` bright 化だけで fallback が走る経路を消し、`待機遷移 -> 待機中` を見たときだけ自動 snap するように直す
- Changed files:
  - `app.js`
  - `index.html`
  - `style.css`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - auto phase を `selection_locked` / `waiting_transition_seen` ベースへ組み直し、左下 `4/4 + 選出完了` バーと左端番号帯は「4体選択済み」のラッチ専用に降格した
  - `選出完了` ラッチ直後の timeout fallback を削除し、fallback は `待機遷移` を見た後に `battle start` が先着した場合だけ使うように変えた
  - `AUTO 上部タイマー` / `AUTO 上部状態` / `AUTO 中央選出文` の ROI と debug overlay を追加し、`中央選出文の消失 + 上部タイマー表示 + 完了バー/番号帯の減衰` を待機遷移の必須条件にした
  - `auto status` と terminal reason を v2.1 に合わせて更新し、`transition` では `statusRise`、`waiting` では `promptChroma` まで見えるようにした
  - README の auto snap 説明を、`選出完了` は撮影条件ではなくラッチ条件である前提に合わせて更新した
- Verification:
  - `node --check app.js`: pass
  - `rg -n "selection_committed|committedBaseline|selectionCommittedAt|committedFrames|getCommittedSignal|buildCommittedBaseline|statusTop|committedToFallback|statusShift" app.js README.md PROGRESS.md`: pass
    - `app.js` / `README.md` から旧 v2 の識別子が消えていることを確認
    - `PROGRESS.md` には履歴として旧 v2 の記述が残る
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで `選出完了` bright のまま数秒止めても撮られないことと、`待機中` で最初の数 frame に snap できることは未確認
  - `topCenterTimer` / `centerSelectionPrompt` の閾値は、実 crop に合わせた最終微調整が入る可能性がある
- Next step:
  - 実動画または実ブラウザ入力で `auto status` と debug overlay を見ながら、`selection_locked -> waiting_transition -> waiting` の順に遷移することを確認する

### 2026-04-17 03:18 JST — auto snap v2.2 で `待機中候補` を固定UI判定へ寄せた
- Status: done
- Goal:
  `VS` シーンでの誤発火を抑えつつ、`待機中` 本体はユーザー crop に依存せず固定UIで拾えるようにする
- Changed files:
  - `app.js`
  - `index.html`
  - `style.css`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - auto phase に `waiting_candidate_seen` を追加し、`waiting_transition_seen` は待機遷移の検出だけ、実際の snap は `待機中候補` を見たときだけ行う形に分離した
  - `wait_target` 相当の判定を `state.crops.my` 依存から外し、`selectionLeft` の固定 ROI 変化、中央上部の時計/状態行、中央選出文の消失、敵側リスト残存で `待機中候補` を判定するようにした
  - `topCenterTimer` / `topCenterStatusLabel` ROI を実際の時計/状態行へ下げ、`VS` シーン上部のヘッダーや照明を拾いにくくした
  - fallback は `waiting_candidate_seen` 後だけ許可し、`battle HUD` を見たときだけ候補 frame を使うように変更した
  - debug overlay に `AUTO 左待機判定` と `AUTO battle HUD` を追加し、`auto status` も `leftDrop / enemyList / timer / battleHud` ベースの表示へ更新した
- Verification:
  - `node --check app.js`: pass
  - `rg -n "getWaitTargetSignal|thresholds\\.waiting\\b|battleStart|fallback_armed|myDrop|promptChroma" app.js README.md index.html style.css`: pass
    - `app.js` / `README.md` / `index.html` / `style.css` から v2.1 の主な旧識別子が消えていることを確認
  - Manual check: not run
- Remaining issues:
  - 新しい `topCenterTimer` / `topCenterStatusLabel` / `battleHud` の閾値は、実ブラウザ入力でまだ最終確認していない
  - `battle HUD` の ROI は安全側に寄せているので、必要なら実戦動画を見ながら少し狭める余地がある
- Next step:
  - 実画面で `selection_locked -> waiting_transition -> waiting_candidate -> waiting` の順に遷移することと、`VS` では `waiting_candidate` に入らないことを確認する
