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

### 2026-04-17 20:14 JST — f494902f2a937a9c8eb80f85bda7c802b2e45350 までロールバック(USER NOTE)
- 軽量化導入後、認識が安定しないため、一度確実に認識が行えてた時点までgitによるロールバックを実施、なおロールバック前はbackup/before-rollback-20260417でbranchを切った。

### 2026-04-17 21:01 JST — `debug` コマンドを追加し、認識範囲表示を debug 限定にした
- Status: done
- Goal:
  普段の運用では認識範囲 overlay を隠し、必要なときだけ terminal から debug 表示を切り替えられるようにする
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - terminal に `debug on` / `debug off` / `debug status` を追加した
  - 認識範囲 overlay の表示条件に `debugMode` を追加し、`ready + auto ON + debug ON` のときだけ UI 上へ出るようにした
  - README のコマンド一覧と自動 snap 説明に、debug 表示が debug モード限定であることを追記した
- Verification:
  - `node --check app.js`: pass
  - `rg -n "debug on|debug off|debug status|handleDebugCommand|setDebugMode|getDebugStatusLines|state\\.debugMode|認識範囲表示" app.js README.md`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで `debug on` / `debug off` の表示切替はまだ未確認
- Next step:
  - 実画面で `debug on` 時だけ overlay が出て、`debug off` で即座に消えるか確認する

### 2026-04-17 21:32 JST — 16:9 入力の左右クロップを固定プリセット化
- Status: done
- Goal:
  16:9 入力では左右クロップを固定座標で扱い、4:3 入力だけ手動クロップ + `localStorage` 復元を残す
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - 16:9 入力用の左右クロップ固定プリセットを追加し、映像開始時は `localStorage` より先にそのプリセットを適用するようにした
  - `edit` は 16:9 でも残しつつ、調整結果はそのセッションだけ有効で、4:3 入力のときだけ `localStorage` へ保存するようにした
  - 新しい運用方針を UI 追加なしで terminal notice と README に反映した
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで 16:9 入力時に固定プリセットがそのまま当たり、4:3 入力時に従来どおり復元されるかは未確認
- Next step:
  - 16:9 / 4:3 の両入力で起動して、固定プリセットと手動保存の分岐が想定どおりか確認する

### 2026-04-17 21:39 JST — 16:9 入力時は自動で `ready` 開始に変更
- Status: done
- Goal:
  16:9 入力では固定クロップ適用後にそのまま `ready` 状態へ入り、必要なときだけ terminal から `edit` へ戻せるようにする
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - 16:9 入力で映像開始したとき、固定プリセット適用後に `edit` から `ready` へ自動遷移するようにした
  - terminal notice を、固定クロップ適用済みで `ready` 開始することと、必要なら `edit` で微調整できることが分かる文言に更新した
  - README のクロップ調整説明にも、16:9 入力では `ready` 開始であることを追記した
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで 16:9 入力時に自動で `ready` に入り、4:3 入力では従来どおり `edit` のまま始まるかは未確認
- Next step:
  - 16:9 / 4:3 の両入力で起動して、初期モード分岐が想定どおりか確認する

### 2026-04-17 22:25 JST — terminal 表示ログの棚卸し
- Status: done
- Goal:
  コマンド/コンソールログ整理の前段として、現状 `#terminal-output` に流れる文言を全件洗い出し、debug 限定候補を見分けられる状態にする
- Changed files:
  - `PROGRESS.md`
- What changed:
  - `app.js` の `appendTerminalEntry()` / `appendTerminalNotice()` 呼び出し元を洗い出し、terminal に表示される文言を source 別に一覧化した
  - `auto status` / `debug status` の動的出力フォーマットも確認し、固定文言とメトリクス埋め込み文言を分けて整理した
  - ブラウザ DevTools 向けの `console.*` は現状使っておらず、表示対象は画面下 terminal UI に集約されていることを確認した
- Verification:
  - `rg -n "appendTerminalEntry|appendTerminalNotice|console\\." app.js index.html sw.js README.md`: pass
  - Manual check: not run
- Remaining issues:
  - どのログを `debug` 限定へ移すか、どのログは通常運用でも残すかの分類はまだ未着手
  - 現状の terminal 文言は auto 検出の内部状態がかなり露出しており、通常運用向けの表現調整が必要
- Next step:
  - 棚卸し結果をもとに、`通常表示` / `debug 限定` / `文言調整のみ` の 3 区分で整理案を作る

### 2026-04-17 23:26 JST — terminal 文言を通常表示 / status / debug で整理
- Status: done
- Goal:
  terminal の通常表示を短く自然な案内中心に整理し、内部メトリクスや raw 詳細は `debug ON` 時だけ見えるようにする
- Changed files:
  - `app.js`
  - `PROGRESS.md`
- What changed:
  - 通常時に流す起動案内、mode 切替、映像/音声/PWA 失敗、自動 snap 成功/失敗の文言を短い自然文へ寄せた
  - `appendTerminalError()` / `appendTerminalDebug()` を追加し、raw `error.message` と auto の内部詳細を `debug ON` 時だけ terminal に出すよう整理した
  - auto の途中経過ログ (`loading` / 選出時計 / 選出完了 / fallback 系詳細) は通常表示から外し、`auto status` は日本語要約中心、`debug status` は自然文中心へ整えた
- Verification:
  - `node --check app.js`: pass
  - `rg -n "\\[auto:fallback\\]|\\[error\\] 詳細:|overlay: visible|overlay: hidden|manual reset|phase=selection_active|locked=yes|waiting icon frame" app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで、通常時に auto の途中経過ログが静かになっていることと、`debug on` 時だけ詳細が増えることは未確認
  - `auto status` の debug 詳細は内部用語を残しているため、運用しながら必要ならさらに日本語寄せできる
- Next step:
  - 実画面で `auto on` / `auto status` / `debug on` / `debug status` を試し、通常表示と debug 表示の密度差が狙いどおりか確認する

### 2026-04-17 23:42 JST — 起動時と mode 切替の文言をさらに簡潔化
- Status: done
- Goal:
  起動時、`edit`、`ready`、`auto on` の案内を冗長すぎない自然な日本語へさらに寄せる
- Changed files:
  - `app.js`
  - `PROGRESS.md`
- What changed:
  - 起動時 notice を `edit で範囲を調整、ready で待機できます。` と `自動 snap は ON/OFF です。状態は auto status / debug status / help で確認できます。` ベースへ短縮した
  - 16:9 入力時の notice を 1 行へまとめ、固定プリセット適用だけを伝える形にした
  - mode 切替文言を `edit に入りました` / `ready に戻りました` に揃え、`auto on` も `このまま対戦を始められます。` へ調整した
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで起動直後の notice 量がちょうどよいかは未確認
- Next step:
  - 実画面で起動直後、`edit`、`ready`、`auto on` の順に見て、案内がまだ多い箇所があればさらに微調整する

### 2026-04-18 00:24 JST — 採用版の terminal 文言へ置換し、`auto on` の ready 重複を抑制
- Status: done
- Goal:
  採用版の文言へ揃えつつ、`auto on` 実行時は `ready` 完了を内包した 1 メッセージだけ出るようにする
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - 起動時、映像/音声/PWA、mode 切替、auto / debug、debug 詳細の文言を採用版へ差し替えた
  - `setMode()` に terminal 文言抑制オプションを追加し、`auto on` では `ready` へ切り替えつつ通常の `ready` メッセージを出さないようにした
  - `auto on` の terminal は `ready` 完了を含む専用メッセージへ置換し、README も `auto on` が `ready` までまとめて行う説明に合わせた
- Verification:
  - `node --check app.js`: pass
  - `rg -n "自動 snap は ON です\\.|自動 snap は OFF です。auto on|OBS Virtual Camera は映像のみです。音が必要な場合|4:3 入力を検出しました。16:9 で出力できる映像入力で自動 snap を有効にできます。|ready に戻りました。クロップ調整を終えて待機中です。|自動 snap を ON にし、ready に切り替えました。|デバッグ表示を ON にしました。認識範囲を表示しました。|読み込み中 を検出しました。|選出画面のタイマーを検出しました。|読み込み中 画像の読み込みに失敗しました。|選出タイマー画像の読み込みに失敗しました。|音量またはミュートを操作すると再開を試します。|全画面表示に切り替えられませんでした。|待機中タイマーを検出したフレームを保持できていません。\\(" app.js README.md`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで `auto on` 実行時に本当に 1 行だけ出て、通常の `ready` 文言が重ならないことは未確認
- Next step:
  - 実画面で `auto on` を実行し、`ready` 完了込みの専用メッセージだけが出ることと、`debug on` 時の詳細文言が採用版どおりか確認する

### 2026-04-18 00:42 JST — terminal 補助コマンドを追加
- Status: done
- Goal:
  本番中の入力負担を減らすため、alias / status / clear / crop reset を terminal コマンドへ最小差分で追加する
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - `e / r / s / sm / se` の短縮 alias を追加し、既存の `edit / ready / snap` に流すようにした
  - `status` を追加し、`mode / auto / debug / input / video / audio` の要約を既存 state から表示するようにした
  - `clear / cls` を追加し、terminal 表示欄だけを消してから `terminal の表示をクリアしました。` を出すようにした
  - `crop reset [my|enemy|both]` を追加し、16:9 は固定プリセット、4:3 は既存 default crop を再利用して初期状態へ戻すようにした
  - `help` と README のコマンド説明を、新しい alias / status / clear / crop reset に合わせて更新した
- Verification:
  - `node --check app.js`: pass
  - `rg -n "status / clear / cls / crop reset|短縮コマンド|normalizeTerminalAlias|getTerminalStatusLines|clearTerminalOutput|handleCropResetCommand|getResetCrop|crop reset \\[my\\|enemy\\|both\\]" app.js README.md`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで `clear` 実行後の見え方と、`crop reset` が 16:9 / 4:3 の両入力で想定どおり戻るかは未確認
- Next step:
  - 実画面で `e / r / s / sm / se / status / clear / crop reset both` を順に試し、alias と初期状態復帰が狙いどおりか確認する

### 2026-04-18 00:49 JST — `crop reset` のログを「範囲」明示に調整
- Status: done
- Goal:
  `crop reset` 実行時のログが、撮影画像ではなくクロップ範囲を戻したことだと分かるようにする
- Changed files:
  - `app.js`
  - `PROGRESS.md`
- What changed:
  - `自分側 / 相手側 / 左右のクロップを初期状態に戻しました。` を、それぞれ `クロップ範囲を初期状態に戻しました。` へ差し替えた
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで `crop reset` 実行時の見え方は未確認
- Next step:
  - `crop reset my / enemy / both` を実行して、ログ文言が「範囲」を戻した意味で自然に見えるか確認する

### 2026-04-18 01:19 JST — terminal へ安全にフォーカスを戻す最小差分を追加
- Status: done
- Goal:
  terminal 以外の UI を触ったあとも、`ready` 中は terminal input に戻りやすくしつつ、`edit` 中の crop / 数値入力 / slider 操作は邪魔しない
- Changed files:
  - `app.js`
  - `PROGRESS.md`
- What changed:
  - `app.js` に `focusTerminalInputIfAppropriate()` と `runControlActionAndRestoreTerminalFocus()` を追加し、toolbar ボタンや select の完了後だけ terminal へ戻す判定を helper に集約した
  - `device-select` / `audio-select` は `change` 後、音量は既存 `input` を維持したまま `change` 後だけ terminal に戻すようにした
  - `workspace-top` に delegated click を追加し、`ready` 中の panel 空き領域 click だけ terminal へ戻し、`edit` 中、interactive 要素、crop overlay / handle、drag 中、drag 終了直後は除外するようにした
  - `finishCropInteraction()` で drag 終了時刻を記録し、crop 操作直後の click 誤爆で terminal に戻らないようにした
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで、select 変更後、toolbar ボタン後、`ready` 中 panel click 後の refocus と、`edit` 中の非干渉をまだ確認していない
- Next step:
  - 実画面で `ready` / `edit` を切り替えながら select、各ボタン、音量スライダー、crop drag / resize を順に試し、terminal への復帰条件が想定どおりか確認する

### 2026-04-18 05:50 JST — 映像入力 select 変更時の自動開始を既存フローへ接続
- Status: done
- Goal:
  `映像入力` の選択変更だけで既存の開始処理を走らせ、`映像を開始` ボタンを fallback として残したまま導線を短くする
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - `device-select` の `change` ハンドラを `runControlActionAndRestoreTerminalFocus()` 経由に寄せ、選択 state 更新の直後に既存 `startSelectedVideo()` をそのまま呼ぶようにした
  - これにより、video device 変更時は既存の `stopCurrentStream()` と `getUserMedia()` 再取得、音声選択の反映、focus return 判定を再利用したまま自動開始または安全な切り替えに乗るようになった
  - README の映像開始手順を、select 変更で自動開始し、失敗時だけ `映像を開始` を押す流れに合わせて最小限更新した
- Verification:
  - `node --check app.js`: pass
  - `rg -n "handleDeviceSelectionChangeWithFocusReturn|映像開始を試みます|自動開始できなかった場合" app.js README.md`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで、video device 変更時の自動開始、既存 stream からの切り替え、OBS Virtual Camera + 音声別入力の組み合わせはまだ未確認
- Next step:
  - 実画面で `映像入力` を切り替え、初回自動開始、配信中の安全な切り替え、音声未選択 / 音声別選択 / OBS Virtual Camera の 3 パターンを順に確認する

### 2026-04-18 06:05 JST — audio-select 変更時の音声自動適用を追加
- Status: done
- Goal:
  `audio-select` の変更で video を再初期化せず、音声入力だけを安全に止めて差し替えられるようにする
- Changed files:
  - `app.js`
  - `PROGRESS.md`
- What changed:
  - `handleAudioSelectionChangeWithFocusReturn()` を `runControlActionAndRestoreTerminalFocus()` 経由に寄せ、選択 state 更新後に音声だけを差し替える `applySelectedAudioInput()` を呼ぶようにした
  - `applySelectedAudioInput()` を追加し、`audio-select` が空なら音声停止のみ、選択があれば `requestSelectedAudioStream()` と `setupAudioPlayback()` を使って音声だけを再取得するようにした
  - 旧音声の停止処理を `stopSelectedAudioInput()` に寄せ、source node 切断と input track 停止を共通化したうえで、既存の `stopCurrentStream()` からも同じ helper を使うようにした
  - mute / volume / autoplay 制限の処理は既存 `setupAudioPlayback()` / `resumeAudioContext()` / `applyAudioOutputState()` の流れをそのまま再利用し、video stream や `elements.video.srcObject` には触れないようにした
- Verification:
  - `node --check app.js`: pass
  - `rg -n "handleAudioSelectionChangeWithFocusReturn|applySelectedAudioInput|stopSelectedAudioInput" app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで、audio-select 変更時に video が維持されたまま音声だけ切り替わること、`音声なし` で音だけ止まること、autoplay 保留文言が既存どおり出ることは未確認
- Next step:
  - 実画面で `音声なし -> 音声入力A -> 音声入力B -> 音声なし` を順に試し、video 非再初期化、音量 / ミュート維持、OBS Virtual Camera + 別 audio input の継続利用を確認する

### 2026-04-18 06:24 JST — 新しい選出画面に入った時点で前回参照画像を自動クリア
- Status: done
- Goal:
  `読み込み中 -> 選出タイマー` が成立したとき、前試合の左右参照画像が残っていれば自動で消して次の snap 待ちへ入れるようにする
- Changed files:
  - `app.js`
  - `README.md`
  - `PROGRESS.md`
- What changed:
  - 左右参照画像をまとめて消して panel 表示も更新する `clearReferenceImages()` を追加した
  - auto phase が `loading_seen -> selection_active` へ遷移した瞬間に、前回参照画像が残っていれば `[auto]` ログ付きで自動クリアするようにした
  - README の自動 snap 説明にも、新しい選出画面を検出した時点で前回参照を消す挙動を追記した
- Verification:
  - `node --check app.js`: pass
  - Manual check: not run
- Remaining issues:
  - 実ブラウザで、前回参照が残っている状態から `選出タイマー` 検出時に即クリアされることは未確認
- Next step:
  - 連戦中の動画入力で、前試合の参照が残ったまま `loading -> 選出時計` に入ったケースを確認し、期待どおりクリアされるかを見る
