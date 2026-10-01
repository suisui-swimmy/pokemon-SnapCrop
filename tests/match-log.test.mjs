import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function harness() {
  const clock = { now: 1000 };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  }
  const output = [];
  const downloads = [];
  const context = vm.createContext({
    Date: ClockDate, Blob, output, downloads,
    document: { addEventListener() {} }, window: { cancelAnimationFrame() {} },
  });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, `
    captureAutoSnapMetrics = () => globalThis.inputMetrics;
    updatePickOverlayDetection = () => {};
    updateBattleResultDetection = () => {};
    refreshCropPanels = () => {};
    queueAfterNextPaint = () => { if (globalThis.failQueue) throw new Error("test queue failure"); };
    captureReferenceFrameFromVideo = (side) => {
      if (globalThis.failSide === side) throw new Error("test canvas failure");
      return { side, width: 299, height: 807 };
    };
    appendTerminalEntry = (lines) => output.push(...lines);
    downloadBlobFile = (blob, fileName) => downloads.push({ blob, fileName });
    elements.terminalOutput = { innerHTML: "", getClientRects: () => [] };
    globalThis.api = {
      state, MATCH_LOG_CONFIG, runAutoSnapDetection, performSnapCapture,
      publishBattleResult, recordPerformanceDebugMetric, recordMatchLogEvent,
      recordMatchLogRecognition, startMatchLog, finishMatchLog, formatMatchLog,
      captureMatchLogSnapshot, handleTerminalCommand, resetAutoSnapCycle,
    };
  })();`), context);
  const api = context.api;
  Object.assign(api.state, {
    debugMode: false, stream: {}, videoReady: true, mode: "ready",
    streamInfo: { width: 1920, height: 1080, isSixteenByNine: true },
    crops: { my: {}, enemy: {} }, pokemonIconReferenceReady: true,
  });
  const signal = (matched) => ({ templateReady: true, matched,
    coverageScore: matched ? 0.85 : 0.1, spillScore: 0.02, darkBackground: 0.8, offsetX: 5, offsetY: 5 });
  const step = (scene, now) => {
    clock.now = now;
    context.inputMetrics = {
      loadingTemplate: signal(scene === "loading"), selectionTimerIcon: signal(scene === "selection"),
      waitingTimerIcon: signal(scene === "waiting"), bottomDoneBar: { bright: 0, blue: 0 },
      selectionRight: { red: 0, chroma: 0 }, battleHud: { blue: 0, white: 0, chroma: 0, bright: 0 },
    };
    api.runAutoSnapDetection(now);
    return api.state.matchLog.current;
  };
  const win = () => api.publishBattleResult("WIN", signal(true), signal(false));
  const command = (text) => api.handleTerminalCommand(text);
  return { ...api, clock, output, downloads, context, step, signal, win, command,
    log: api.state.matchLog };
}

test("logging starts at loading detection with debug off and does not print debug rows", () => {
  const h = harness();
  h.step("selection", 1000);
  assert.equal(h.log.current, null);
  const match = h.step("loading", 1100);
  assert.equal(match.id, 1);
  assert.equal(match.status, "recording");
  assert.equal(match.frameCount, 1);
  assert.equal(match.metrics.captureAutoSnapMetrics.count, 1);
  assert.equal(h.output.length, 0);
  assert.match(h.formatMatchLog(match), /読み込み中 を検出しました。 loading を検出/u);
  assert.match(h.formatMatchLog(match), /状態: 記録中/u);
});

test("normal selection and snap finish a match at result accepted with a frozen snapshot", () => {
  const h = harness();
  h.step("loading", 1000);
  h.step("selection", 1200);
  h.step("waiting", 1300);
  assert.equal(h.log.current.captureCount, 1);
  assert.equal(h.log.references.enemy.matchId, 1);
  const recognition = h.state.pokemonIconRecognition;
  recognition.status = "ready";
  recognition.engine = "worker";
  recognition.lastSummary = "matched=1/6";
  recognition.lastSlotSummaries = ["ゴリランダー"];
  h.recordMatchLogRecognition(recognition, 40);
  h.clock.now = 3000;
  h.win();
  assert.equal(h.log.current, null);
  const completed = h.log.completed[0];
  assert.equal(completed.status, "completed");
  assert.equal(completed.endedAt, 3000);
  assert.equal(completed.snapshot.references.enemy.source, "この試合");
  assert.match(h.formatMatchLog(completed), /result accepted: WIN/u);
  assert.match(h.formatMatchLog(completed), /ゴリランダー/u);
  const frozen = JSON.stringify(completed);
  h.state.autoSnap.phase = "idle";
  h.performSnapCapture("both");
  h.recordMatchLogRecognition(h.state.pokemonIconRecognition, 100);
  assert.equal(JSON.stringify(completed), frozen);
});

test("a failed next match retains reference provenance but not prior names or capture timings", () => {
  const h = harness();
  h.step("loading", 1000);
  h.step("selection", 1100);
  h.step("waiting", 1200);
  const previousRecognition = h.state.pokemonIconRecognition;
  previousRecognition.lastSummary = "previous names";
  previousRecognition.lastSlotSummaries = ["ゴリランダー"];
  h.recordMatchLogRecognition(previousRecognition, 4000);
  h.state.autoSnap.pickOverlay.ordersByRefIndex[0] = 1;
  h.win();
  h.step("loading", 10000);
  h.step("none", 16001);
  h.step("none", 40001);
  h.recordMatchLogRecognition(previousRecognition, 5000);
  h.recordPerformanceDebugMetric("pokemonIconRecognition", 5000);
  h.win();
  const failed = h.log.completed.at(-1);
  assert.equal(failed.id, 2);
  assert.equal(failed.captureCount, 0);
  assert.equal(failed.snapshot.references.enemy.source, "前の試合 #1");
  assert.equal(failed.metrics.performSnapCapture, undefined);
  assert.equal(failed.metrics.pokemonIconRecognition, undefined);
  assert.equal(failed.recognition, null);
  assert.equal(failed.snapshot.pickOrders, null);
  const text = h.formatMatchLog(failed);
  assert.match(text, /成功 0回/u);
  assert.match(text, /参照画像: 自分=前の試合 #1 \/ 相手=前の試合 #1/u);
  assert.match(text, /event=timeout/u);
  assert.match(text, /event=expired/u);
  assert.doesNotMatch(text, /ゴリランダー|previous names|"durationMs":4000/u);
});

test("export downloads UTF-8 text while debug is off and keeps recording without mutating buffers", async () => {
  const h = harness();
  const match = h.step("loading", 1000);
  h.step("none", 1100);
  const before = JSON.stringify(match);
  assert.equal(h.command("debug log export"), true);
  assert.equal(h.log.current, match);
  assert.equal(JSON.stringify(match), before);
  assert.equal(h.downloads.length, 1);
  assert.match(h.downloads[0].fileName, /^snapcrop-match-1-.*-recording\.txt$/u);
  assert.equal(h.downloads[0].blob.type, "text/plain;charset=utf-8");
  assert.deepEqual([...new Uint8Array(await h.downloads[0].blob.arrayBuffer()).slice(0, 3)], [239, 187, 191]);
  assert.match(await h.downloads[0].blob.text(), /未確定（記録中）/u);
  h.step("selection", 1200);
  h.step("waiting", 1300);
  h.win();
  h.command("debug log export");
  assert.match(h.downloads.at(-1).fileName, /completed\.txt$/u);
  assert.match(await h.downloads.at(-1).blob.text(), /状態: 完了 WIN/u);
});

test("loading recovery stays in one match; a new cycle archives an unfinished match", () => {
  const h = harness();
  const first = h.step("loading", 1000);
  h.step("none", 7001);
  h.step("loading", 8000);
  assert.equal(h.log.current, first);
  assert.equal(h.log.completed.length, 0);
  h.step("none", 38001);
  h.step("loading", 39000);
  assert.equal(first.status, "unfinished");
  assert.equal(h.log.current.id, 2);
  assert.equal(h.log.completed[0], first);
  assert.match(h.formatMatchLog(first), /状態: 勝敗未検出/u);
});

test("retention keeps three ended matches plus one active and supports export by id", async () => {
  const h = harness();
  for (let id = 1; id <= 5; id += 1) h.startMatchLog(id * 1000, h.signal(true));
  assert.deepEqual(h.log.completed.map((match) => match.id).join(","), "2,3,4");
  assert.equal(h.log.current.id, 5);
  h.command("debug status");
  assert.ok(h.output.some((line) => line.includes("試合ログ #5: 記録中")));
  h.command("debug log export 3");
  assert.match(await h.downloads[0].blob.text(), /試合ログ #3/u);
  h.command("debug log export");
  assert.match(await h.downloads[1].blob.text(), /試合ログ #5/u);
  const count = h.downloads.length;
  for (const text of ["debug log export 1", "debug log export 0", "debug log export nope", "debug log export 3 extra", "debug log"])
    h.command(text);
  assert.equal(h.downloads.length, count);
  assert.equal(h.log.current.id, 5);
});

test("bounded buffers preserve start, important event kinds and whole-match aggregates", () => {
  const h = harness();
  Object.assign(h.MATCH_LOG_CONFIG, { eventLimit: 4, sampleLimit: 3 });
  const match = h.step("loading", 1000);
  h.recordMatchLogEvent("timeout", "important timeout");
  for (let i = 0; i < 10; i += 1) {
    h.recordMatchLogEvent("error", `error ${i}`);
    h.step("none", 2000 + i * 1000);
    h.recordPerformanceDebugMetric("performSnapCapture", i + 1);
  }
  assert.equal(match.events.length, 4);
  assert.equal(match.samples.length, 3);
  assert.ok(match.sampleDropped > 0);
  assert.ok(match.eventDropped > 0);
  assert.equal(match.metrics.performSnapCapture.count, 10);
  assert.equal(match.metrics.performSnapCapture.totalMs, 55);
  assert.equal(match.metrics.performSnapCapture.maxMs, 10);
  const text = h.formatMatchLog(match);
  assert.match(text, /読み込み中 を検出しました/u);
  assert.match(text, /important timeout/u);
  assert.match(text, /error 9/u);
  assert.match(text, /count=10 mean=5\.5ms max=10\.0ms/u);
  const pendingCount = match.window.frames;
  h.formatMatchLog(match);
  assert.equal(match.window.frames, pendingCount);
});

test("numeric sampling keeps transient matches and coherent peak score fields without per-frame events", () => {
  const h = harness();
  const match = h.step("loading", 1000);
  h.step("selection", 1100);
  h.step("none", 1200);
  assert.equal(match.window.signals.selectionTimerIcon.matches, 1);
  assert.equal(match.window.signals.selectionTimerIcon.readyFrames, 3);
  assert.equal(match.window.signals.selectionTimerIcon.best.coverage, 0.85);
  assert.equal(match.window.signals.selectionTimerIcon.best.spill, 0.02);
  const eventCount = match.sequence;
  for (let t = 1300; t <= 1900; t += 100) h.step("none", t);
  assert.equal(match.sequence, eventCount);
  assert.equal(match.window.frames, 10);
  assert.equal(match.samples.length, 0);
  h.step("none", 2000);
  assert.equal(match.samples.length, 1);
  assert.equal(match.samples[0].signals.selectionTimerIcon.matches, 1);
  assert.equal(match.samples[0].timings.captureAutoSnapMetrics.count, 10);
  assert.equal(match.window.timings.captureAutoSnapMetrics.count, 1);
});

test("debug toggles, manual reset and terminal clear keep the active recording", () => {
  const h = harness();
  const match = h.step("loading", 1000);
  // These commands must leave the dedicated recording intact.
  h.command("debug off");
  h.resetAutoSnapCycle("manual reset");
  h.command("clear");
  assert.equal(h.log.current, match);
  assert.match(h.formatMatchLog(match), /manual reset/u);
});

test("partial capture failure reports side provenance and failure without claiming a successful snap", () => {
  const h = harness();
  h.performSnapCapture("both");
  const match = h.step("loading", 1000);
  h.context.failSide = "enemy";
  assert.throws(() => h.performSnapCapture("both"), /test canvas failure/u);
  assert.equal(match.captureCount, 0);
  assert.equal(match.captureFailureCount, 1);
  const snapshot = h.captureMatchLogSnapshot(match);
  assert.equal(snapshot.references.my.source, "この試合");
  assert.equal(snapshot.references.enemy.source, "記録開始前");
  assert.match(h.formatMatchLog(match), /test canvas failure/u);
});

test("no loading history means no downloadable match and no empty placeholder download", () => {
  const h = harness();
  h.command("debug log export");
  assert.equal(h.downloads.length, 0);
  assert.match(h.output.at(-1), /対象の試合ログがありません/u);
});

test("an exception after image creation does not also increment successful captures", () => {
  const h = harness();
  const match = h.step("loading", 1000);
  h.context.failQueue = true;
  assert.throws(() => h.performSnapCapture("both"), /test queue failure/u);
  assert.equal(match.captureCount, 0);
  assert.equal(match.captureFailureCount, 1);
  assert.equal(match.milestones.has("snap"), false);
  assert.equal(match.milestones.has("snap-error"), true);
});
