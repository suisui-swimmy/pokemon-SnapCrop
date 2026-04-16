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

### 2026-04-17 04:09 JST — auto snap v2.3 で待機中判定を時計アイコン照合へ切り替え
- Status: done
- Goal:
  `selection_locked` 以降の待機中判定を、広い上部帯の色量監視ではなく中央上部の時計アイコンそのものへ置き換える
- Changed files:
  - `app.js`
  - `index.html`
  - `style.css`
  - `README.md`
  - `PROGRESS.md`
  - `assets/auto/waiting-timer-icon.png`
- What changed:
  - ユーザー提供の `waiting-timer-icon.png` を repo に取り込み、`selection_locked -> waiting_icon_seen -> snapped` の単純な状態機械へ切り替えた
  - `waiting_transition_seen` / `waiting_candidate_seen`、広い `AUTO 上部状態`、`AUTO 左待機判定` を削除し、中央上部の小さい search window 内で時計アイコンをテンプレート照合するようにした
  - `matchWaitingTimerIcon()` を追加し、`coverage / spill / darkBackground` で待機中の時計アイコンを判定して、最初の一致 frame で即 `snap both` を試すようにした
  - auto ROI が `clampCrop()` の最小サイズ補正で不必要に膨らんでいたため、`clampAutoRoiCrop()` を追加して fixed ROI をそのままのサイズで使うように直した
  - fallback は時計アイコン frame を 1 度でも保持できた後だけ許可し、battle HUD が先に来た場合だけその frame を使う形に整理した
  - debug overlay は `AUTO 待機タイマー` と `AUTO battle HUD` 中心へ整理し、README の auto snap 説明も v2.3 に合わせて更新した
- Verification:
  - `node --check app.js`: pass
  - `Get-ChildItem assets\\auto | Select-Object Name,Length`: pass
    - `waiting-timer-icon.png` が repo に追加されたことを確認
  - `rg -n "waiting icon|waiting_icon|待機タイマー|waitingTimerIcon|clampAutoRoiCrop|timerTemplate|AUTO 待機タイマー" app.js index.html style.css README.md`: pass
    - v2.3 の主要識別子と UI 文言が期待どおり入っていることを確認
- Remaining issues:
  - 実ブラウザ入力で時計アイコン照合の閾値が十分かは未確認
  - `battleHud` fallback は保険として残しているが、実戦動画次第では ROI の再調整余地がある
- Next step:
  - 実画面で `selection_locked` の後に `AUTO 待機タイマー` が時計アイコンを正しく囲み、アイコンが出た瞬間に snap するかを確認する

### 2026-04-17 12:22 JST — auto snap v3 で前段もテンプレ一致へ寄せた
- Status: done
- Goal:
  `loading -> 選出時計 -> 選出完了ラッチ -> 待機タイマー` の流れへ auto snap を整理し、16:9 入力専用の軽いテンプレ照合ベースへ寄せる
- Changed files:
  - `app.js`
  - `index.html`
  - `style.css`
  - `README.md`
  - `PROGRESS.md`
  - `assets/auto/loading-indicator.png`
  - `assets/auto/selection-timer-icon.png`
- What changed:
  - `loading-indicator.png` と `selection-timer-icon.png` を追加し、auto の前段を色量ベースではなく固定 ROI 上のテンプレ照合へ置き換えた
  - auto phase を `loading_seen -> selection_active -> selection_locked -> waiting_icon_seen` に整理し、前段の `match dialog` や広い上部帯判定を外した
  - `AUTO 選出時計` の debug overlay を追加し、実際に監視している `loading / 選出時計 / 待機タイマー / battle HUD` だけが UI に残るよう整理した
  - 自動 snap は 16:9 入力専用であることを terminal / README 上でも明示した
- Verification:
  - `Get-ChildItem assets\\auto | Select-Object Name,Length`: pass
  - `node --check app.js`: pass
  - `rg -n "getMatchDialogSignal|getLoadingSignal|getSelectionSignal|dialogFrames|dialogSeenAt|timerTemplate|loadWaitingTimerIconTemplate|isWaitingTimerSamplePixel|matchWaitingTimerIcon|matchDialog|loadingGuard|selectionLeft|centerSelectionPrompt|waiting_transition_seen|waiting_candidate_seen|topCenterStatusLabel|leftListDrop|statusPresence|debug-overlay-dialog|debug-overlay-loading-guard|debug-overlay-selection-prompt|マッチング系ダイアログ" app.js index.html style.css README.md`: pass
    - v2 系の旧識別子と削除済み debug overlay が残っていないことを確認
  - Manual check: not run
- Remaining issues:
  - `loading` / `選出時計` の coverage / spill 閾値は、実画面で最終確認していない
- Next step:
  - 実画面で `loading -> 選出時計 -> 選出完了ラッチ -> 待機タイマー` の順に遷移するかを確認し、必要なら `coverage / spill / darkBackground` の閾値を微調整する

### 2026-04-17 12:46 JST — 待機タイマーを主経路にして、選出完了ラッチを補助へ降格
- Status: done
- Goal:
  `loading / 選出時計 / 待機タイマー` のテンプレ一致を主経路にしつつ、`選出完了` ラッチは safety gate としてだけ残す
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - `selection_active` 中でも待機タイマーが一致したら即 `snap both` するように変え、`選出完了` ラッチは必須ゲートではなく補助判定へ降格した
  - `選出完了` ラッチが先に成立した場合も、その後の待機タイマー検出を優先する方針に合わせて terminal reason と trigger message を更新した
  - README の auto snap 説明を、`待機タイマー` 主経路 + `選出完了ラッチ` 補助という役割分担に合わせて更新した
- Verification:
  - `node --check app.js`: pass
  - `rg -n "選出完了ラッチ前でもテンプレ一致を優先|待機タイマー優先|locked=yes|locked=no|選出完了ラッチは補助判定" app.js README.md`: pass
  - Manual check: not run
- Remaining issues:
  - 実画面で `選出完了` ラッチ前に待機タイマーが来たケースと、ラッチ後に待機タイマーが来たケースの両方はまだ未確認
- Next step:
  - 実画面で `loading -> 選出時計 -> 待機タイマー` だけでも撮影できることを確認し、必要なら `選出完了` ラッチの扱いをさらに軽くする
