import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function createHarness({ debug = true } = {}) {
  const logs = [];
  const captures = [];
  const context = vm.createContext({
    crypto: webcrypto,
    document: { addEventListener() {} },
    window: { cancelAnimationFrame() {} },
    logs,
    captures,
  });
  // Run the real app state machine; replace only image input, rendering and side effects.
  const instrumented = appSource.replace(/\}\)\(\);\s*$/u, `
    captureAutoSnapMetrics = () => globalThis.inputMetrics;
    updatePickOverlayDetection = () => {};
    updateBattleResultDetection = () => {};
    refreshCropPanels = () => {};
    renderCropOverlays = () => {};
    syncAutoSnapMonitoring = () => {};
    startPreviewLoop = () => {};
    stopPreviewLoop = () => {};
    bufferAutoFallbackReferences = () => null;
    appendTerminalEntry = (lines) => logs.push(...lines);
    appendTerminalDebug = (lines) => { if (state.debugMode) logs.push(...lines); };
    performSnapCapture = (target) => {
      if (!state.videoReady || !state.stream) throw new Error("simulated missing input");
      if (globalThis.captureFails) throw new Error("simulated capture failure");
      captures.push(target);
      state.references = { my: { match: "new" }, enemy: { match: "new" } };
      return "左右の参照画像を更新しました。";
    };
    globalThis.api = {
      state, runAutoSnapDetection, resetAutoSnapCycle,
      getAutoStatusLines, canRunAutoSnapMonitor,
      setMode, setAutoSnapEnabled, runManualSnapShortcut, handleSnapCommand,
      triggerAutoFallback,
    };
  })();`);
  assert.notEqual(instrumented, appSource);
  vm.runInContext(instrumented, context, { filename: "app.js" });
  const { api } = context;
  Object.assign(api.state, {
    debugMode: debug,
    videoReady: true,
    stream: {},
    streamInfo: { isSixteenByNine: true },
    mode: "ready",
    crops: { my: {}, enemy: {} },
    references: { my: { match: "old" }, enemy: { match: "old" } },
  });
  api.state.autoSnap.phase = "snapped";
  api.state.autoSnap.lastSnapMode = "waiting";
  function step(scene, now) {
    const signal = (matched) => ({
      templateReady: true,
      matched,
      coverageScore: matched ? 0.85 : 0.12,
      spillScore: 0.02,
      darkBackground: 0.8,
      offsetX: 5,
      offsetY: 5,
    });
    context.inputMetrics = {
      loadingTemplate: signal(scene === "loading"),
      selectionTimerIcon: signal(scene === "selection"),
      waitingTimerIcon: signal(scene === "waiting"),
      bottomDoneBar: { bright: 0, blue: 0 },
      selectionRight: { red: 0, chroma: 0 },
      battleHud: {
        blue: scene === "battle" ? 0.6 : 0,
        white: scene === "battle" ? 0.5 : 0,
        chroma: 0,
        bright: scene === "battle" ? 0.8 : 0,
      },
    };
    api.runAutoSnapDetection(now);
    return api.state.autoSnap.phase;
  }
  return { ...api, step, logs, captures, auto: api.state.autoSnap, context };
}

test("ready guidance follows actual shortcut availability and input readiness", async () => {
  const h = createHarness({ debug: false });
  for (const enabled of [true, false]) {
    h.auto.enabled = enabled; h.state.mode = "edit"; h.logs.length = 0;
    h.setMode("ready");
    assert.equal(h.logs.some((line) => line.includes("空 Enter または Ctrl + Enter で撮影できます")), !enabled);
    const before = h.captures.length;
    await h.runManualSnapShortcut("both");
    assert.equal(h.captures.length - before, enabled ? 0 : 1);
  }
  h.auto.enabled = true;
  await h.handleSnapCommand("both");
  assert.equal(h.captures.length, 2, "explicit snap still works with AUTO on");
  h.state.stream = null; h.state.videoReady = false; h.state.mode = "edit"; h.logs.length = 0;
  h.setMode("ready");
  assert.match(h.logs.join("\n"), /映像入力を待っています/u);
  assert.match(h.getAutoStatusLines().join("\n"), /状態: 映像待ち/u);
  await h.handleSnapCommand("both");
  assert.match(h.logs.join("\n"), /映像入力を開始してから/u);
  assert.equal(h.captures.length, 2);
  h.auto.enabled = false; h.logs.length = 0;
  h.setAutoSnapEnabled(true);
  assert.match(h.logs.join("\n"), /ON（映像待ち）/u);
  h.state.videoReady = true; h.state.stream = {}; h.state.streamInfo.isSixteenByNine = false;
  h.state.mode = "edit"; h.logs.length = 0; h.setMode("ready");
  assert.match(h.logs.join("\n"), /16:9 入力待ち/u);
  assert.doesNotMatch(h.logs.join("\n"), /撮影できます/u);
});

test("normal automatic capture emits one success line and failures never report success", () => {
  const h = createHarness({ debug: false });
  h.step("loading", 1000); h.step("selection", 2000); h.logs.length = 0;
  h.context.captureFails = true;
  h.step("waiting", 3000);
  assert.match(h.getAutoStatusLines().join("\n"), /前回の結果: 撮影に失敗/u);
  assert.doesNotMatch(h.getAutoStatusLines().join("\n"), /撮影しました/u);
  h.context.captureFails = false; h.logs.length = 0;
  h.step("waiting", 4000);
  assert.deepEqual(h.logs, ["[auto] 左右の参照画像を更新しました。"]);
  assert.match(h.getAutoStatusLines().join("\n"), /撮影しました/u);
  h.auto.fallbackBuffer = null; h.triggerAutoFallback("battle_hud");
  assert.match(h.getAutoStatusLines().join("\n"), /前回の結果: 撮影に失敗/u);
  h.auto.fallbackBuffer = { frames: {} }; h.context.captureFails = true;
  h.triggerAutoFallback("battle_hud");
  assert.match(h.getAutoStatusLines().join("\n"), /前回の結果: 撮影に失敗/u);
  h.context.captureFails = false; h.triggerAutoFallback("battle_hud");
  assert.match(h.getAutoStatusLines().join("\n"), /前回の結果: 予備経路で撮影しました/u);
  h.resetAutoSnapCycle("test");
  assert.match(h.getAutoStatusLines().join("\n"), /前回の結果: まだありません/u);
});

for (const elapsed of [5999, 6000, 6001]) {
  test(`matching selection at loading + ${elapsed}ms reaches capture`, () => {
    const h = createHarness();
    h.step("loading", 1000);
    assert.equal(h.step("selection", 1000 + elapsed), "selection_active");
    assert.equal(h.state.references.enemy, null);
    assert.equal(h.step("waiting", 1100 + elapsed), "snapped");
    assert.deepEqual(h.captures, ["both"]);
    assert.equal(h.state.references.enemy.match, "new");
    h.step("waiting", 1200 + elapsed);
    assert.equal(h.captures.length, 1);
  });
}

test("a delayed selection recovers with two consecutive matches and clears old images once", () => {
  const h = createHarness();
  h.step("loading", 1000);
  assert.equal(h.step("none", 7001), "selection_recovery");
  assert.match(h.getAutoStatusLines().join("\n"), /選出画面を再確認中/u);
  assert.equal(h.step("selection", 9000), "selection_recovery");
  assert.equal(h.state.references.enemy.match, "old");
  assert.equal(h.step("none", 9100), "selection_recovery");
  assert.equal(h.step("selection", 9200), "selection_recovery");
  assert.equal(h.step("selection", 9300), "selection_active");
  assert.equal(h.state.references.enemy, null);
  h.step("waiting", 9400);
  assert.deepEqual(h.captures, ["both"]);
  assert.equal(h.logs.filter((line) => line.includes("前回の参照画像をクリアしました")).length, 1);
  assert.match(h.auto.selectionDiagnostics.join("\n"), /event=recovered/u);
});

test("continuing loading refreshes the timeout origin", () => {
  const h = createHarness();
  h.step("loading", 1000);
  assert.equal(h.step("loading", 10000), "loading_seen");
  assert.equal(h.auto.loadingSeenAt, 1000);
  assert.equal(h.auto.loadingLastSeenAt, 10000);
  assert.equal(h.step("none", 16000), "loading_seen");
  assert.equal(h.step("selection", 16001), "selection_active");
});

test("recovery accepts its second selection match at the 30-second boundary", () => {
  const h = createHarness();
  h.step("loading", 1000);
  h.step("none", 7001);
  assert.equal(h.step("selection", 30999), "selection_recovery");
  assert.equal(h.step("selection", 31000), "selection_active");
});

test("expired loading context cannot clear old images or capture, even with a matching timer", () => {
  const h = createHarness();
  h.step("loading", 1000);
  h.step("none", 7001);
  h.step("selection", 31000);
  assert.equal(h.step("selection", 31001), "idle");
  assert.equal(h.step("selection", 31100), "idle");
  assert.equal(h.step("waiting", 31200), "idle");
  assert.equal(h.state.references.enemy.match, "old");
  assert.equal(h.captures.length, 0);
  assert.match(h.getAutoStatusLines().join("\n"), /event=timeout[\s\S]*event=expired/u);
});

test("a long callback gap cannot reuse an expired loading context", () => {
  const h = createHarness();
  h.step("loading", 1000);
  assert.equal(h.step("selection", 31001), "idle");
  assert.equal(h.state.references.enemy.match, "old");
  assert.match(h.auto.selectionDiagnostics[0], /event=expired.*gap=30001ms/u);
});

test("two consecutive battle HUD matches cancel recovery without capturing", () => {
  const h = createHarness();
  h.step("loading", 1000);
  h.step("none", 7001);
  assert.equal(h.step("battle", 7100), "selection_recovery");
  h.step("none", 7200);
  assert.equal(h.step("battle", 7300), "selection_recovery");
  assert.equal(h.step("battle", 7400), "idle");
  assert.equal(h.step("selection", 7500), "idle");
  assert.equal(h.captures.length, 0);
  assert.equal(h.state.references.enemy.match, "old");
  assert.match(h.auto.selectionDiagnostics.at(-1), /event=battle-hud/u);
});

test("a newly detected loading screen restores normal selection monitoring", () => {
  const h = createHarness();
  h.step("loading", 1000);
  h.step("none", 7001);
  assert.equal(h.step("loading", 10000), "loading_seen");
  assert.equal(h.auto.loadingLastSeenAt, 10000);
  assert.equal(h.step("selection", 16001), "selection_active");
  h.step("waiting", 16100);
  assert.equal(h.captures.length, 1);
});

test("selection and waiting alone cannot arm auto snap without loading history", () => {
  for (const phase of ["idle", "snapped"]) {
    const h = createHarness();
    h.auto.phase = phase;
    for (const scene of ["selection", "selection", "waiting", "battle"]) {
      assert.equal(h.step(scene, 1000), phase);
    }
    assert.equal(h.state.references.enemy.match, "old");
    assert.equal(h.captures.length, 0);
  }
});

test("timeout evidence survives automatic expiry, is bounded, and is available after debug is enabled", () => {
  const h = createHarness({ debug: false });
  h.step("loading", 1000);
  h.step("none", 7001);
  for (let time = 7100; time < 9000; time += 100) h.step("none", time);
  assert.equal(h.auto.selectionDiagnostics.length, 1);
  assert.equal(h.logs.length, 0);
  assert.match(h.auto.selectionDiagnostics[0], /event=timeout at=1970-01-01T00:00:07\.001Z phase=loading_seen elapsed=6001ms lastLoadingAgo=6001ms gap=6001ms/u);
  assert.match(h.auto.selectionDiagnostics[0], /selection\[ready=yes matched=no coverage=0\.120 spill=0\.020 dark=0\.800 offset=5,5\]/u);
  h.step("none", 31001);
  h.state.debugMode = true;
  assert.match(h.getAutoStatusLines().join("\n"), /phase detail: idle[\s\S]*event=timeout[\s\S]*event=expired/u);
  h.step("loading", 32000);
  assert.equal(h.auto.selectionDiagnostics.length, 0);
  for (let time = 40000; time <= 80000; time += 10000) {
    h.step("none", time);
    h.step("loading", time + 100);
  }
  assert.equal(h.auto.selectionDiagnostics.length, 4);
});

test("manual, mode and media resets discard recovery history", () => {
  for (const reason of ["manual reset", "映像停止", "ready 待ち", "auto off", "auto on"]) {
    const h = createHarness();
    h.step("loading", 1000);
    h.step("none", 7001);
    h.resetAutoSnapCycle(reason);
    assert.equal(h.auto.phase, "idle");
    assert.equal(h.auto.loadingLastSeenAt, 0);
    assert.equal(h.auto.selectionDiagnostics.length, 0);
    assert.equal(h.step("selection", 7100), "idle");
    assert.equal(h.state.references.enemy.match, "old");
  }
});

test("monitor retains its ready, enabled, video and 16:9 requirements", () => {
  const h = createHarness();
  assert.equal(h.canRunAutoSnapMonitor(), true);
  for (const [owner, key, value] of [
    [h.state.streamInfo, "isSixteenByNine", false],
    [h.state, "mode", "edit"],
    [h.state, "videoReady", false],
    [h.state, "stream", null],
    [h.auto, "enabled", false],
  ]) {
    const original = owner[key];
    owner[key] = value;
    assert.equal(h.canRunAutoSnapMonitor(), false);
    owner[key] = original;
  }
});
