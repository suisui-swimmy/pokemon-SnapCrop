import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
function samples(kind = "strong") {
  return {
    icon: { red: 0.2, pink: kind === "normal" ? 0.4 : 0.02, white: kind === "weak" ? 0.12 : 0.25, dark: 0.1, meanPeak: 0.5 },
    color: { red: 0.02, pink: 0, white: 0.02, dark: 0.2, meanPeak: 0.2 },
    percent: { red: 0, pink: 0, white: 0.3, dark: 0.1, meanPeak: 0.5 },
  };
}
const best = (refIndex, tier = "strong") => ({ refIndex, tier, bestScore: tier === "strong" ? 0.95 : 0.72, margin: 0.2 });

function harness({ logging = true } = {}) {
  const clock = { now: 1000 };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  }
  const output = [];
  const context = vm.createContext({ crypto: webcrypto, Date: ClockDate, output,
    document: { addEventListener() {} }, window: { cancelAnimationFrame() {} } });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, `
    // Mock only the image reading and rendering; signal checks, slot resolution and streaks are real.
    sampleFaintHudRoi = (_, crop) => {
      globalThis.sampleCalls++;
      const side = crop.x > 1500 ? 1 : 0;
      const key = crop.width > 56 ? "percent" : crop.width > 49 ? "icon" : "color";
      return globalThis.inputs[side][key];
    };
    drawCropPanel = () => {};
    refreshCropPanels = () => {};
    triggerPickOverlayCorrectionFrame = () => {};
    appendTerminalEntry = (lines) => output.push(...lines);
    elements.video = {videoWidth: 1920, videoHeight: 1080};
    globalThis.api = { state, elements, updateFaintDetection, startMatchLog, finishMatchLog,
      formatMatchLog, resetFaintOverlayState, resetPickOverlayState, clearReferenceImages,
      setPickOverlayOrderSlot, clearPickOverlaySlot, recordFaintDiagnosticEvent,
      beginFaintDiagnosticComparison, finishFaintDiagnosticComparison, createFaintDiagnosticState };
  })();`), context);
  const api = context.api;
  api.state.mode = "ready";
  api.startMatchLog(clock.now, {});
  const match = api.state.matchLog.current;
  if (!logging) match.faintDiagnostic = null;
  const reference = { width: 299, height: 807 };
  api.state.references.enemy = reference;
  api.state.matchLog.references.enemy = { reference, matchId: match.id, diagnostic: match.diagnostic,
    captureId: webcrypto.randomUUID(), capturedAt: clock.now };
  context.inputs = [samples(), samples("normal")];
  context.sampleCalls = 0;
  const step = (candidates = [best(0), best(1)], advance = 250, gates = [{ready:true}, {ready:true}]) => {
    clock.now += advance;
    api.updateFaintDetection(candidates, gates, clock.now);
  };
  return { ...api, context, clock, output, match, step, diagnostic: match.faintDiagnostic, pick: api.state.autoSnap.pickOverlay };
}

test("debug-off diagnostics preserve raw numbers, checks, exact IDs and one-check strong acceptance", () => {
  const h = harness(); h.step();
  const entry = h.diagnostic.comparisons[0]; const row = entry.hud[0];
  assert.equal(h.state.debugMode, false);
  assert.equal(row.outcome, "accepted");
  assert.equal(row.resolved.source, "live");
  assert.equal(row.samples.icon.white, 0.25);
  assert.equal(row.samples.percent.white, 0.3);
  assert.deepEqual(JSON.parse(JSON.stringify(row.checks)), {iconMatched:true,colorMatched:true,percentVisible:true});
  assert.equal(row.decision.streak, 1);
  assert.equal(row.decision.requiredStreak, 1);
  assert.equal(entry.captureId, h.state.matchLog.references.enemy.captureId);
  assert.equal(entry.matchId, h.match.diagnostic.matchId);
  assert.equal(entry.matchElapsedMs, 250);
  assert.equal(row.crops.percent.width, 57);
  assert.equal(h.context.sampleCalls, 6);
  h.step([], 100);
  assert.equal(h.diagnostic.comparisonCount, 1);
  assert.equal(h.context.sampleCalls, 6);
  h.step(); assert.equal(h.diagnostic.comparisons.at(-1).hud[0].outcome, "already_fainted");
});

test("each image condition can reject without changing matching rules", () => {
  for (const [part, property, value, check] of [
    ["icon","pink",0.4,"iconMatched"], ["color","red",0.4,"colorMatched"], ["percent","white",0.01,"percentVisible"],
  ]) {
    const h = harness(); h.context.inputs[0][part][property] = value; h.step();
    const row = h.diagnostic.comparisons[0].hud[0];
    assert.equal(row.outcome, "not_matched");
    assert.equal(row.checks[check], false);
    assert.equal(h.pick.faintedByRefIndex[0], false);
  }
});

test("missing slot and failed image reading remain distinguishable with nulls", () => {
  const h = harness(); h.step([{refIndex:-1,bestScore:0,margin:0}]);
  let row = h.diagnostic.comparisons[0].hud[0];
  assert.equal(row.outcome, "missing_slot"); assert.equal(row.resolved.refIndex, null);
  assert.equal(row.candidate.score, null);
  assert.equal(row.matched, true);
  h.context.inputs[0].color = null; h.step();
  row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.outcome, "roi_read_failed");
  assert.equal(row.samples.color, null); assert.equal(row.samples.icon.white, 0.25);
  assert.equal(row.matched, null);
  h.elements.video.videoWidth = 0; h.elements.video.videoHeight = 0; h.step();
  row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.crops.icon, null); assert.equal(row.samples.icon, null);
});

test("weak condition keeps its three hits and records preserved gaps and expiration", () => {
  const h = harness(); h.context.inputs[0] = samples("weak"); h.step();
  assert.equal(h.diagnostic.comparisons.at(-1).hud[0].outcome, "pending");
  h.context.inputs[0] = samples("normal"); h.step(); h.step();
  assert.equal(h.diagnostic.reasons.pending_kept.count, 1);
  h.step([], 2300);
  assert.equal(h.diagnostic.reasons.pending_expired.count, 1);
  h.context.inputs[0] = samples("weak"); h.step(); h.step(); h.step();
  const row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.outcome, "accepted"); assert.equal(row.decision.requiredStreak, 3);
  assert.equal(row.decision.streak, 3);
});

test("unexpired pending-only mapping and changed target are recorded", () => {
  const h = harness(); h.context.inputs[0] = samples("weak"); h.step();
  h.pick.faintSlotCacheByHudIndex[0] = null;
  h.context.inputs[0] = samples(); h.step([]);
  let row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.resolved.source, "pending"); assert.equal(row.decision.requiredStreak, 2);
  h.resetFaintOverlayState("test", {redraw:false});
  h.context.inputs[0] = samples("weak"); h.step();
  h.context.inputs[0] = samples(); h.step([best(2)]);
  row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.resolved.refIndex, 2); assert.equal(row.decision.streak, 1);
  assert.equal(h.diagnostic.reasons.candidate_changed.count, 1);
});

test("indefinitely cached and cache-over-weak mappings show their age and conflicting live candidate", () => {
  const h = harness(); h.context.inputs[0] = samples("normal"); h.step();
  h.step([], 100000);
  let row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.resolved.source, "cache"); assert.equal(row.cacheBefore.ageMs, 100000);
  assert.equal(h.diagnostic.config.slotCacheTtlMs, 0);
  h.step([best(2, "weak")]);
  row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.resolved.source, "cache-live-weak");
  assert.equal(row.resolved.refIndex, 0); assert.equal(row.candidate.refIndex, 2);
  h.step([best(2)]);
  row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.resolved.source, "live"); assert.equal(row.cacheAfter.refIndex, 2);
});

test("pending carry-forward records the required streak actually used, even when strength changes", () => {
  const h = harness();
  h.pick.pendingFaintsByHudIndex[0] = { refIndex:0,streak:1,requiredStreak:2,firstSeenAt:1000,lastSeenAt:1000 };
  h.context.inputs[0] = samples("weak"); h.step();
  const row = h.diagnostic.comparisons[0].hud[0];
  assert.equal(row.currentRequiredStreak, 3); assert.equal(row.decision.requiredStreak, 2);
  assert.equal(row.outcome, "accepted");
});

test("snapshots do not keep mutable samples and repeated unchanged outcomes do not flood events", () => {
  const h = harness(); h.context.inputs[0] = samples("normal"); h.step();
  const count = h.diagnostic.eventCount;
  h.step(); assert.equal(h.diagnostic.eventCount, count);
  h.context.inputs[0].icon.pink = 0.9;
  assert.equal(h.diagnostic.comparisons[0].hud[0].samples.icon.pink, 0.4);
});

test("manual correction, faint reset, reference reset and clear preserve the original image identity", () => {
  const h = harness(); const id = h.state.matchLog.references.enemy.captureId;
  h.setPickOverlayOrderSlot(1, 0); h.step(); h.setPickOverlayOrderSlot(1, 2);
  assert.equal(h.diagnostic.reasons.manual_set.last.after.fainted[2], true);
  h.clearPickOverlaySlot(2); assert.equal(h.diagnostic.reasons.manual_clear.count, 1);
  h.resetFaintOverlayState("manual reset");
  assert.equal(h.diagnostic.reasons.reset.last.cause, "manual reset");
  h.resetPickOverlayState("相手参照更新", {redraw:false});
  h.clearReferenceImages();
  assert.equal(h.diagnostic.reasons.reset.last.captureId, id);
  assert.equal(h.diagnostic.reasons.reset.last.cause, "参照画像クリア");
});

test("finished logs are frozen, previous-match results stay separate and stale comparisons are discarded", () => {
  const h = harness(); h.step();
  const pendingComparison = h.beginFaintDiagnosticComparison(h.clock.now);
  h.finishMatchLog("completed", "WIN", h.clock.now);
  const frozen = JSON.stringify(h.diagnostic);
  h.startMatchLog(h.clock.now + 1, {});
  h.finishFaintDiagnosticComparison(pendingComparison);
  h.step();
  const d = h.state.matchLog.current.faintDiagnostic;
  assert.equal(d.comparisonCount, 1);
  assert.equal(d.comparisons[0].association, "previous");
  assert.equal(d.hud[0].current.observations, 0);
  assert.equal(d.hud[0].other.observations, 1);
  assert.equal(JSON.stringify(h.diagnostic), frozen);
});

test("unlinked image observations never count as current-match successes", () => {
  const h = harness(); h.state.matchLog.references.enemy = null; h.step();
  assert.equal(h.diagnostic.comparisons[0].association, "unlinked");
  assert.equal(h.diagnostic.comparisons[0].imageMatchId, null);
  assert.equal(h.diagnostic.hud[0].current.accepted, 0);
  assert.equal(h.diagnostic.hud[0].other.accepted, 1);
});

test("dedicated rings are bounded and preserve summaries without mutating on export", () => {
  const h = harness();
  for (let i=0;i<7203;i++) h.step();
  for (let i=0;i<260;i++) h.recordFaintDiagnosticEvent("reset", {cause:"test"});
  assert.equal(h.diagnostic.comparisons.length, 7200); assert.equal(h.diagnostic.comparisonDropped, 3);
  assert.equal(h.diagnostic.events.length, 256); assert.ok(h.diagnostic.eventDropped > 0);
  assert.equal(h.match.events.length, 1);
  assert.equal(h.match.pickDiagnostic.comparisonCount, 0);
  assert.equal(h.diagnostic.reasons.already_fainted.count, 7202);
  assert.equal(h.diagnostic.reasons.accepted.first.at, 1250);
  const before = JSON.stringify(h.diagnostic); const text = h.formatMatchLog(h.match);
  assert.equal(JSON.stringify(h.diagnostic), before);
  assert.match(text, /--- 瀕死診断の設定・集計 ---/u); assert.match(text, /"comparisonDropped":3/u);
  assert.doesNotMatch(text, /data:image|"dataUrl"|"imageData"/u);
  const rows=text.split("--- 瀕死の詳細判定 ---")[1].split(/\r?\n--- /u)[0].trim().split("\r\n");
  assert.equal(JSON.parse(rows[0].slice(25)).comparison, 4);
  assert.equal(JSON.parse(rows.at(-1).slice(25)).comparison, 7203);
});

test("recording does not change flags, cache, pending, terminal output or image read count", () => {
  const on = harness(); const off = harness({logging:false});
  for (const h of [on,off]) {
    h.context.inputs[0]=samples("weak"); h.step(); h.step();
    h.context.inputs[0]=samples("normal"); h.step([]);
    h.context.inputs[0]=samples("weak"); h.step([]); h.step([best(2)]);
  }
  assert.equal(JSON.stringify(on.pick), JSON.stringify(off.pick));
  assert.deepEqual(on.output, off.output);
  assert.equal(on.context.sampleCalls, off.context.sampleCalls);
});
