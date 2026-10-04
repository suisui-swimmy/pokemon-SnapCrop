import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
function sample(values, quality = {}) {
  const normSquared = values.reduce((sum, n) => sum + n * n, 0);
  return { values, normSquared, edgeValues: values, edgeNormSquared: normSquared,
    colorValues: values, colorNormSquared: normSquared, mean: 100, contrast: 40, brightRatio: 0.5, ...quality };
}
function basis(index) { return sample(Array.from({ length: 8 }, (_, i) => i === index ? 1 : 0)); }
function scored(first, second) {
  const a = (first - 0.5) / 0.56;
  const b = (second - 0.5) / 0.56;
  return sample([a, b, 0, 0, 0, 0, Math.sqrt(1 - a * a - b * b), 0]);
}

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
    // Keep the real gate, scoring, candidate selection, streak and assignment paths.
    samplePickOverlayHudCandidates = () => {
      const input = globalThis.hudInputs[globalThis.hudCursor++];
      return input ? [{sample: input, gateState: evaluatePickOverlayHudGate(input), offsetX: -3, offsetY: 0}] : [];
    };
    samplePickOverlaySource = (_, rect) => globalThis.refInputs[Math.round((rect.y - 92) / 126)] || null;
    updateFaintDetection = () => {};
    drawCropPanel = () => {};
    refreshCropPanels = () => {};
    triggerPickOverlayFlashFrame = () => {};
    triggerPickOverlayCorrectionFrame = () => {};
    appendTerminalEntry = (lines) => output.push(...lines);
    appendPokemonResultEntry = (pokemon) => output.push(pokemon.name);
    elements.video = {videoWidth: 1920, videoHeight: 1080};
    globalThis.api = {state, elements, startMatchLog, finishMatchLog, formatMatchLog, createDiagnosticIdentity,
      updatePickOverlayDetection, resetPickOverlayState, setPickOverlayOrderSlot, clearPickOverlaySlot,
      flushPickOverlayPokemonResults, recordPickDisplayDiagnostic, recordPickDiagnosticEvent, recordStatisticsDiagnostic,
      recordMatchLogFrame, clearReferenceImages, PICK_DIAGNOSTIC_CONFIG, PICK_DIAGNOSTIC_REASONS};
  })();`), context);
  const api = context.api;
  api.state.streamInfo = { width: 1920, height: 1080, isSixteenByNine: true };
  api.state.mode = "ready";
  api.state.catalogReady = true;
  api.startMatchLog(clock.now, {});
  const match = api.state.matchLog.current;
  if (!logging) match.pickDiagnostic = null;
  const reference = { width: 299, height: 807 };
  api.state.references.enemy = reference;
  api.state.matchLog.references.enemy = { reference, matchId: match.id, diagnostic: match.diagnostic,
    captureId: webcrypto.randomUUID(), capturedAt: clock.now };
  api.state.pokemonIconRecognition.reference = reference;
  api.state.autoSnap.phase = "snapped";
  context.refInputs = Array.from({ length: 6 }, (_, i) => basis(i));
  context.hudInputs = [basis(0), basis(1)];
  const signal = { templateReady: true, matched: false, coverageScore: 0, spillScore: 0, darkBackground: 0 };
  const metrics = { battleHud: { blue: 0.7, white: 0.2, chroma: 0.1, bright: 0.7 },
    selectionRight: { red: 0, chroma: 0 }, loadingTemplate: { ...signal },
    selectionTimerIcon: { ...signal }, waitingTimerIcon: { ...signal } };
  const step = (advance = 250) => {
    clock.now += advance;
    context.hudCursor = 0;
    api.recordMatchLogFrame(metrics, clock.now);
    api.updatePickOverlayDetection(metrics, clock.now);
  };
  return { ...api, clock, match, context, metrics, output, step,
    diagnostic: match.pickDiagnostic, pick: api.state.autoSnap.pickOverlay };
}

test("real comparisons record all six scores, streaks and acceptance with debug off", () => {
  const h = harness();
  h.step(); h.step();
  assert.equal(h.state.debugMode, false);
  assert.equal(h.diagnostic.comparisons.length, 2);
  const [pending, accepted] = h.diagnostic.comparisons;
  assert.equal(pending.hud[0].scores.length, 6);
  assert.equal(pending.hud[0].bestRefIndex, 0);
  assert.equal(pending.hud[0].bestScore, 1);
  assert.equal(pending.hud[0].pendingAfter.streak, 1);
  assert.equal(accepted.hud[0].decisionStreak, 2);
  assert.equal(accepted.hud[0].requiredStreak, 2);
  assert.equal(accepted.hud[0].outcome, "accepted");
  assert.equal(accepted.hud[1].order, 2);
  assert.equal(accepted.captureId, h.state.matchLog.references.enemy.captureId);
  assert.equal(h.diagnostic.hud[0].current.accepted, 1);
  assert.equal(h.output.length, 0);
  h.step();
  assert.equal(h.diagnostic.comparisons.at(-1).hud[0].outcome, "already_assigned");
});

test("every pre-comparison stop has a reason and normal interval waits are separate", () => {
  for (const [reason, setup] of [
    ["no_reference", h => { h.state.references.enemy = null; }],
    ["phase_wait", h => { h.state.autoSnap.phase = "idle"; }],
    ["interval_wait", h => { h.pick.lastCompareAt = 1200; }],
    ["screen_blocked", h => { h.metrics.selectionTimerIcon.matched = true; }],
    ["video_missing", h => { h.state.streamInfo = null; h.elements.video.videoWidth = 0; h.elements.video.videoHeight = 0; }],
    ["hud_read_failed", h => { h.context.hudInputs[0] = null; }],
    ["hud_quality_rejected", h => { h.context.hudInputs = [basis(0), basis(1)].map(s => ({ ...s, mean: 1, contrast: 1, brightRatio: 0 })); }],
    ["reference_read_failed", h => { h.context.refInputs[2] = null; }],
  ]) {
    const h = harness(); setup(h); h.step();
    assert.equal(h.diagnostic.reasons[reason].count, 1, reason);
    assert.equal(h.match.window.pick.latest.reason, reason);
    assert.equal(h.diagnostic.comparisons.length, 0);
    if (reason === "interval_wait") assert.equal(h.diagnostic.events.length, 0);
  }
});

test("HUD quality rejection preserves raw measurements and no fabricated scores", () => {
  const h = harness();
  h.context.hudInputs[1] = { ...basis(1), mean: 1, contrast: 1, brightRatio: 0 };
  h.step();
  const row = h.diagnostic.comparisons[0].hud[1];
  assert.equal(row.outcome, "hud_quality_rejected");
  assert.equal(row.gate.mean, 1);
  assert.equal(row.gate.reason, "dark+flat+dim");
  assert.equal(row.scores, null);
  assert.equal(row.bestScore, null);
});

test("score, margin, weak collision and strong collision use real scoring decisions", () => {
  const cases = [[scored(0.68, 0.52), "threshold_rejected"], [scored(0.82, 0.80), "threshold_rejected"],
    [scored(0.72, 0.56), "contested"]];
  for (const [input, expected] of cases) {
    const h = harness(); h.context.hudInputs = [input, input]; h.step();
    assert.equal(h.diagnostic.comparisons[0].hud[0].outcome, expected);
    assert.equal(h.pick.ordersByRefIndex.some(Boolean), false);
  }
  const h = harness(); h.context.hudInputs = [basis(0), basis(0)]; h.step();
  assert.equal(h.diagnostic.comparisons[0].hud[0].outcome, "pending");
  assert.equal(h.diagnostic.comparisons[0].hud[1].outcome, "contested");
});

test("HUD-only route waits four comparisons and reports its threshold route", () => {
  const h = harness(); h.metrics.battleHud = { blue: 0, white: 0, chroma: 0, bright: 0 };
  for (let i = 0; i < 4; i += 1) h.step();
  const row = h.diagnostic.comparisons.at(-1);
  assert.equal(row.mode, "hud-only");
  assert.equal(row.hud[0].outcome, "accepted");
  assert.equal(row.hud[0].requiredStreak, 4);
  assert.equal(row.hud[0].thresholdChecks[0].route, "hud-only");
});

test("weak matches retain their three-comparison requirement and selected-position quality", () => {
  const h = harness(); h.context.hudInputs = [scored(0.72, 0.56), basis(2)];
  h.step(); h.step();
  assert.equal(h.pick.ordersByRefIndex[0], 0);
  h.step();
  const row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.outcome, "accepted");
  assert.equal(row.requiredStreak, 3);
  assert.equal(row.decisionStreak, 3);
  assert.equal(row.candidateGate.mean, 100);
  assert.equal(row.offsetX, -3);
});

test("blocked observations aggregate by second without repeating unchanged events", () => {
  const h = harness(); h.metrics.selectionTimerIcon.matched = true;
  for (let i = 0; i < 5; i += 1) h.step(100);
  assert.equal(h.match.window.pick.reasons.screen_blocked, 5);
  assert.equal(h.diagnostic.events.length, 1);
  assert.equal(h.diagnostic.config.screen.hudAccentMin, 0.56);
  assert.equal(h.match.window.pick.latest.screen.selectionTimer.matched, true);
  h.step(1000);
  assert.equal(h.match.samples[0].pick.reasons.screen_blocked, 5);
  assert.equal(h.match.window.pick.reasons.screen_blocked, 1);
  assert.equal(h.diagnostic.reasons.screen_blocked.byAssociation.current, 6);
});

test("candidate change, loss and gate grace expiry retain the prior streak", () => {
  const h = harness(); h.step();
  h.context.hudInputs[0] = basis(2); h.step();
  assert.equal(h.diagnostic.reasons.candidate_changed.last.before.refIndex, 0);
  assert.equal(h.diagnostic.reasons.candidate_changed.last.after.refIndex, 2);
  h.metrics.selectionTimerIcon.matched = true; h.step();
  assert.equal(h.diagnostic.reasons.grace_kept.count, 1);
  h.step(); assert.equal(h.diagnostic.reasons.grace_kept.count, 1);
  h.step(1600);
  assert.ok(h.diagnostic.reasons.grace_expired.count > 0);
  h.metrics.selectionTimerIcon.matched = false; h.step();
  h.context.hudInputs[0] = scored(0.65, 0.52); h.step();
  assert.equal(h.diagnostic.reasons.pending_cleared.last.before.refIndex, 2);
});

test("order limit is reported without claiming an accepted assignment", () => {
  const h = harness(); h.pick.nextOrder = 5; h.step(); h.step();
  assert.equal(h.diagnostic.comparisons.at(-1).hud[0].outcome, "order_limit");
  assert.equal(h.diagnostic.hud[0].current.accepted, 0);
  assert.equal(h.diagnostic.comparisons.at(-1).nextOrderBefore, 5);
  assert.equal(h.diagnostic.comparisons.at(-1).hud[0].decisionStreak, 2);
});

test("manual edits, reset and reference clear preserve their causes and image IDs", () => {
  const h = harness(); const captureId = h.state.matchLog.references.enemy.captureId;
  h.setPickOverlayOrderSlot(1, 2); h.clearPickOverlaySlot(2);
  assert.equal(h.diagnostic.reasons.manual_set.count, 1);
  assert.equal(h.diagnostic.reasons.manual_clear.count, 1);
  h.resetPickOverlayState("auto off", { redraw: false });
  assert.equal(h.diagnostic.reasons.reset.last.cause, "auto off");
  h.clearReferenceImages();
  assert.equal(h.diagnostic.reasons.reset.last.captureId, captureId);
});

test("display wait transitions deduplicate and stale results cannot contaminate a new match", () => {
  const h = harness(); h.pick.ordersByRefIndex[0] = 1;
  const recognition = h.state.pokemonIconRecognition;
  h.flushPickOverlayPokemonResults(); h.flushPickOverlayPokemonResults();
  assert.equal(h.diagnostic.reasons.recognition_wait.count, 1);
  recognition.resultsByRefIndex[0] = { matched: false };
  h.flushPickOverlayPokemonResults(); assert.equal(h.diagnostic.reasons.name_unresolved.count, 1);
  h.state.catalogReady = false; h.flushPickOverlayPokemonResults(); assert.equal(h.diagnostic.reasons.data_wait.count, 1);
  h.state.catalogReady = true; recognition.resultsByRefIndex[0] = { matched: true, showdownId: "pikachu", pokemonName: "ピカチュウ" };
  const event = { captureId: h.state.matchLog.references.enemy.captureId, matchId: h.match.diagnostic.matchId,
    refIndex: 0, formId: "pikachu", statsId: "pikachu", rule: "Doubles" };
  h.recordStatisticsDiagnostic({ ...event, state: "loading" });
  assert.equal(h.diagnostic.reasons.stats_wait.count, 1);
  h.recordStatisticsDiagnostic({ ...event, state: "absent" });
  assert.equal(h.diagnostic.reasons.stats_absent.count, 1);
  h.recordStatisticsDiagnostic({ ...event, state: "ready" });
  assert.equal(h.diagnostic.reasons.emitted.count, 1);
  h.finishMatchLog("completed", "WIN", h.clock.now);
  const frozen = JSON.stringify(h.match.pickDiagnostic);
  h.startMatchLog(h.clock.now + 1, {});
  h.recordPickDisplayDiagnostic(0, "emitted", recognition);
  assert.equal(h.state.matchLog.current.pickDiagnostic.reasons.emitted.count, 0);
  assert.equal(JSON.stringify(h.match.pickDiagnostic), frozen);
});

test("previous-match comparisons carry origin IDs and are excluded from current-image totals", () => {
  const h = harness(); const originMatchId = h.match.diagnostic.matchId;
  h.finishMatchLog("unfinished", "next", h.clock.now); h.startMatchLog(h.clock.now + 1, {});
  h.step(); h.step();
  const d = h.state.matchLog.current.pickDiagnostic;
  assert.equal(d.comparisons[0].association, "previous");
  assert.equal(d.comparisons[0].imageMatchId, originMatchId);
  assert.equal(d.hud[0].current.comparisons, 0);
  assert.equal(d.hud[0].other.comparisons, 2);
  assert.equal(d.reasons.compared.byAssociation.current, 0);
  assert.equal(d.reasons.compared.byAssociation.previous, 2);
});

test("rings stay bounded, summaries survive truncation and exporting does not mutate records", () => {
  const h = harness();
  for (let i = 0; i < 7203; i += 1) h.step();
  for (let i = 0; i < 260; i += 1) h.recordPickDiagnosticEvent("manual_clear", { refIndex: i % 6 });
  const d = h.diagnostic;
  assert.equal(d.comparisons.length, 7200);
  assert.equal(d.comparisonDropped, 3);
  assert.equal(d.events.length, 256);
  assert.ok(d.eventDropped > 0);
  assert.equal(d.reasons.compared.count, 7203);
  assert.equal(d.reasons.compared.first.at, 1250);
  assert.equal(d.reasons.compared.last.at, h.clock.now);
  const before = JSON.stringify(d);
  const text = h.formatMatchLog(h.match);
  assert.equal(JSON.stringify(d), before);
  assert.match(text, /--- 採番の詳細比較 ---/u);
  assert.match(text, /"comparisonDropped":3/u);
  assert.doesNotMatch(text, /data:image|"edgeValues"|"colorValues"/u);
  const detailLines = text.split("--- 採番の詳細比較 ---")[1].split(/\r?\n--- /u)[0].trim().split("\r\n");
  assert.equal(JSON.parse(detailLines[0].slice(25)).comparison, 4);
  assert.equal(JSON.parse(detailLines.at(-1).slice(25)).comparison, 7203);
});

test("recording leaves assignment, pending state and displayed output unchanged", () => {
  const on = harness(); const off = harness({ logging: false });
  for (const h of [on, off]) {
    h.step(); h.metrics.selectionTimerIcon.matched = true; h.step();
    h.metrics.selectionTimerIcon.matched = false; h.step();
    h.context.hudInputs[0] = basis(2); h.step(); h.step();
  }
  assert.equal(JSON.stringify(on.pick), JSON.stringify(off.pick));
  assert.deepEqual(on.output, off.output);
});
