import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { harness, samples, best } from "./helpers/faint-harness.mjs";

test("debug-off diagnostics record shape, identity and three consecutive observations", () => {
  const h = harness(); h.step();
  let row = h.diagnostic.comparisons[0].hud[0];
  assert.equal(h.state.debugMode, false);
  assert.equal(row.outcome, "pending");
  assert.equal(row.samples.icon.shape.matched, true);
  assert.equal(row.checks.iconShapeMatched, true);
  assert.equal(row.decision.requiredStreak, 3);
  assert.equal(h.context.sampleCalls, 6);
  h.step([], 100);
  assert.equal(h.diagnostic.comparisonCount, 1);
  assert.equal(h.context.sampleCalls, 6);
  h.repeat(2);
  const entry = h.diagnostic.comparisons.at(-1); row = entry.hud[0];
  assert.equal(row.outcome, "accepted");
  assert.equal(row.decision.streak, 3);
  assert.ok(row.decision.durationMs >= 500);
  assert.equal(entry.captureId, h.state.matchLog.references.enemy.captureId);
  assert.equal(entry.matchId, h.match.diagnostic.matchId);
  assert.equal(row.crops.percent.width, 57);
  h.step(); assert.equal(h.diagnostic.comparisons.at(-1).hud[0].outcome, "mark_consumed");
});

test("mark shape is required while background, colour ratios and percent are diagnostic only", () => {
  for (const shape of [{ templateReady: true, matched: false }, { templateReady: false, matched: true }, undefined]) {
    const h = harness(); h.context.inputs[0].icon.shape = shape; h.repeat(5);
    assert.equal(h.pick.faintedByRefIndex[0], false);
  }
  for (const [part, key, value] of [["icon", "pink", 0.8], ["color", "red", 0.8], ["percent", "white", 0]]) {
    const h = harness(); h.context.inputs[0][part][key] = value; h.repeat();
    assert.equal(h.pick.faintedByRefIndex[0], true);
  }
  const h = harness(); h.context.inputs[0].color = null; h.context.inputs[0].percent = null; h.repeat();
  assert.equal(h.pick.faintedByRefIndex[0], true);
});

test("strong and weak signals both need three uninterrupted observations", () => {
  for (const kind of ["strong", "weak"]) {
    const h = harness(); h.context.inputs[0] = samples(kind); h.repeat(2);
    assert.equal(h.pick.faintedByRefIndex[0], false);
    h.context.inputs[0] = samples("normal"); h.step();
    assert.equal(h.diagnostic.comparisons.at(-1).hud[0].pendingTransition, "cleared");
    h.context.inputs[0] = samples(kind); h.repeat(2);
    assert.equal(h.pick.faintedByRefIndex[0], false);
    h.step(); assert.equal(h.pick.faintedByRefIndex[0], true);
    assert.equal(h.diagnostic.reasons.pending_kept.count, 0);
  }
});

test("long sample gaps restart confirmation", () => {
  const h = harness(); h.repeat(2); h.step(undefined, 751);
  assert.equal(h.pick.faintedByRefIndex[0], false);
  assert.equal(h.pick.pendingFaintsByHudIndex[0].streak, 1);
});

test("mapping requires two strong selected observations", () => {
  const h = harness({ stable: false }); h.context.inputs[0] = samples("normal");
  h.repeat(4, [best(0, "weak")]); assert.equal(h.pick.faintSlotCacheByHudIndex[0], null);
  h.step([best(0)]); assert.equal(h.pick.faintSlotCacheByHudIndex[0], null);
  h.step([best(0)]); assert.equal(h.pick.faintSlotCacheByHudIndex[0].refIndex, 0);
});

test("reported unselected Hatterene guess cannot replace fainted Milotic", () => {
  const h = harness({ selected: [2, 0, 1, 0, 3, 4], stable: false });
  h.context.inputs[1] = samples("normal"); h.repeat(2, [best(2), best(0)]);
  h.pick.faintedByRefIndex[0] = true;
  h.step([best(2), { refIndex: 1, tier: "weak", bestScore: 0.7052829892, margin: 0.1412609886 }]);
  assert.equal(h.pick.faintSlotCacheByHudIndex[1].refIndex, 0);
  h.context.inputs[1] = samples(); h.step([], 7839); h.repeat(3, []);
  assert.equal(h.pick.faintedByRefIndex[1], false);
});

test("a weak competing candidate cannot replace or erase a confirmed occupant", () => {
  const h = harness(); h.context.inputs[0] = samples("normal"); h.step([best(2, "weak")]);
  assert.equal(h.pick.faintSlotCacheByHudIndex[0].refIndex, 0);
  h.context.inputs[0] = samples(); h.repeat(3, []);
  assert.equal(h.pick.faintedByRefIndex[0], true); assert.equal(h.pick.faintedByRefIndex[2], false);
});

test("a verified occupant survives a 158-second animation without another identity reading", () => {
  const h = harness(); h.context.inputs[0] = samples("normal"); h.context.inputs[0].percent.white = 0;
  h.step([], 158000, [{ ready: false }, { ready: false }]);
  assert.equal(h.pick.faintSlotCacheByHudIndex[0].refIndex, 0);
  h.context.inputs[0] = samples(); h.repeat(3, [], 250, [{ ready: false }, { ready: false }]);
  assert.equal(h.pick.faintedByRefIndex[0], true);
  assert.ok(h.diagnostic.reasons.accepted.first.cacheBefore.ageMs > 158000);
});

test("a fixed faint mark confirms the retained occupant when the scene colour gate is unavailable", () => {
  const h = harness(); h.repeat(3, [best(2)], 250, [{ ready: true }], false);
  assert.equal(h.pick.faintedByRefIndex[0], true); assert.equal(h.pick.faintedByRefIndex[2], false);
  assert.equal(h.diagnostic.reasons.accepted.first.screenAllowed, false);
});

test("hidden HUD resets a pending faint but retains the occupant", () => {
  const h = harness(); h.repeat(2); h.context.inputs[0] = samples("normal"); h.context.inputs[0].percent.white = 0;
  h.step([]); assert.equal(h.pick.faintSlotCacheByHudIndex[0].refIndex, 0);
  assert.equal(h.pick.pendingFaintsByHudIndex[0], null);
  h.context.inputs[0] = samples(); h.repeat(2, []); assert.equal(h.pick.faintedByRefIndex[0], false);
  h.step([]); assert.equal(h.pick.faintedByRefIndex[0], true);
});

test("the four-slot safety limit prevents a fifth faint flag", () => {
  const h = harness({ selected: [1, 2, 3, 4, 5, 6], stable: false });
  h.pick.faintedByRefIndex = [true, true, true, true, false, false]; h.repeat(5, [best(4)]);
  assert.equal(h.pick.faintedByRefIndex.filter(Boolean).length, 4);
  assert.ok(h.diagnostic.reasons.faint_limit.count > 0);
});

test("a simulated double battle confirms 3 -> 1 -> 5 -> 6 and leaves unselected slots alone", () => {
  const h = harness({ selected: [2, 0, 1, 0, 3, 4], stable: false });
  for (const refIndex of [2, 0, 4, 5]) {
    h.context.inputs[0] = samples("normal"); h.repeat(2, [best(refIndex)]);
    h.context.inputs[0] = samples(); h.repeat(3, []);
  }
  const accepted = h.diagnostic.comparisons.flatMap(x => x.hud.filter(y => y.outcome === "accepted").map(y => y.resolved.refIndex + 1));
  assert.deepEqual(Array.from(accepted), [3, 1, 5, 6]);
  assert.deepEqual(Array.from(h.pick.faintedByRefIndex), [true, false, true, false, true, true]);
});

test("missing mapping and failed ROI remain distinct", () => {
  const h = harness({ stable: false }); h.step([]);
  assert.equal(h.diagnostic.comparisons.at(-1).hud[0].outcome, "missing_slot");
  h.context.inputs[0].icon = null; h.repeat(2);
  let row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.outcome, "roi_read_failed");
  assert.equal(row.samples.icon, null); assert.equal(row.samples.color.red, 0.02);
  h.elements.video.videoWidth = 0; h.elements.video.videoHeight = 0; h.repeat(2);
  row = h.diagnostic.comparisons.at(-1).hud[0];
  assert.equal(row.crops.icon, null);
});

test("nested shape snapshots detach and unchanged outcomes do not flood events", () => {
  const h = harness(); h.context.inputs[0] = samples("normal"); h.step();
  const count = h.diagnostic.eventCount; h.step(); assert.equal(h.diagnostic.eventCount, count);
  h.context.inputs[0].icon.shape.whiteCoverage = 0;
  assert.equal(h.diagnostic.comparisons[0].hud[0].samples.icon.shape.whiteCoverage, 0.95);
});

test("manual correction and reset clear mapping candidates along with the cache", () => {
  const h = harness(); const id = h.state.matchLog.references.enemy.captureId;
  h.repeat(); h.setPickOverlayOrderSlot(1, 2);
  assert.equal(h.diagnostic.reasons.manual_set.last.after.fainted[2], true);
  assert.equal(h.pick.faintMappingCandidatesByHudIndex[0], null);
  h.clearPickOverlaySlot(2); assert.equal(h.diagnostic.reasons.manual_clear.count, 1);
  h.resetFaintOverlayState("manual reset"); h.resetPickOverlayState("相手参照更新", { redraw: false }); h.clearReferenceImages();
  assert.equal(h.diagnostic.reasons.reset.last.captureId, id);
});

test("completed logs freeze and previous/unlinked images stay outside current-match counts", () => {
  const h = harness(); h.repeat(); const pending = h.beginFaintDiagnosticComparison(h.clock.now);
  h.finishMatchLog("completed", "WIN", h.clock.now); const frozen = JSON.stringify(h.diagnostic);
  h.startMatchLog(h.clock.now + 1, {}); h.finishFaintDiagnosticComparison(pending); h.step();
  const d = h.state.matchLog.current.faintDiagnostic;
  assert.equal(d.comparisonCount, 1); assert.equal(d.comparisons[0].association, "previous");
  assert.equal(d.hud[0].current.observations, 0); assert.equal(JSON.stringify(h.diagnostic), frozen);
  h.state.matchLog.references.enemy = null; h.step();
  assert.equal(d.comparisons.at(-1).association, "unlinked"); assert.equal(d.hud[0].current.accepted, 0);
});

test("bounded rings export new evidence without images or history mutation", () => {
  const h = harness(); h.repeat(7203);
  for (let i = 0; i < 260; i++) h.recordFaintDiagnosticEvent("reset", { cause: "test" });
  assert.equal(h.diagnostic.comparisons.length, 7200); assert.equal(h.diagnostic.comparisonDropped, 3);
  assert.equal(h.diagnostic.events.length, 256); assert.ok(h.diagnostic.eventDropped > 0);
  assert.equal(h.match.events.length, 1); assert.equal(h.match.pickDiagnostic.comparisonCount, 0);
  assert.equal(h.diagnostic.reasons.mark_consumed.count, 7200); assert.equal(h.diagnostic.reasons.accepted.first.at, 1750);
  const before = JSON.stringify(h.diagnostic), text = h.formatMatchLog(h.match);
  assert.equal(JSON.stringify(h.diagnostic), before); assert.match(text, /"version":3/u);
  assert.doesNotMatch(text, /data:image|"dataUrl"|"imageData"|"mask"/u);
  const rows = text.split("--- 瀕死の詳細判定 ---")[1].split(/\r?\n--- /u)[0].trim().split("\r\n");
  assert.equal(JSON.parse(rows[0].slice(25)).comparison, 4); assert.equal(JSON.parse(rows.at(-1).slice(25)).comparison, 7203);
});

test("logging ON/OFF has identical state, output and image-read count", () => {
  const on = harness(), off = harness({ logging: false });
  for (const h of [on, off]) {
    h.repeat(2); h.context.inputs[0] = samples("normal"); h.step([]);
    h.context.inputs[0] = samples("weak"); h.repeat(); h.step([best(2)]);
  }
  assert.equal(JSON.stringify(on.pick), JSON.stringify(off.pick));
  assert.deepEqual(on.output, off.output); assert.equal(on.context.sampleCalls, off.context.sampleCalls);
});

test("a strong conflicting identity suspends fallback until a confirmed identity resolves it", () => {
  const h = harness(); h.step([best(2)]);
  assert.equal(h.pick.faintedByRefIndex[0], false);
  assert.equal(h.pick.faintSlotCacheByHudIndex[0].conflictingRefIndex, 2);
  h.repeat(4, []);
  assert.equal(h.pick.faintedByRefIndex.some(Boolean), false);
  assert.equal(h.diagnostic.comparisons.at(-1).hud[0].resolved.source, "mapping-conflict");
  h.repeat(2, [best(2)]); h.repeat(2, []);
  assert.equal(h.pick.faintedByRefIndex[2], true);
  assert.equal(h.pick.faintedByRefIndex[0], false);
});

test("a strong unselected conflict is held without becoming a faint target", () => {
  const h = harness(); h.repeat(4, [best(5)]); h.repeat(4, []);
  assert.equal(h.pick.faintedByRefIndex.some(Boolean), false);
  assert.equal(h.pick.faintSlotCacheByHudIndex[0].refIndex, 0);
  h.repeat(3, [best(0)]);
  assert.equal(h.pick.faintedByRefIndex[0], true);
  assert.equal(h.pick.faintSlotCacheByHudIndex[0].conflictingRefIndex, null);
});

test("one persistent mark cannot mark a second occupant, including across a one-frame dropout", () => {
  const h = harness(); h.repeat(); h.repeat(5, [best(2)]);
  assert.equal(h.pick.faintedByRefIndex[2], false);
  h.context.inputs[0] = samples("normal"); h.step([]);
  h.context.inputs[0] = samples(); h.repeat(4, []);
  assert.equal(h.pick.faintedByRefIndex[2], false);
  h.context.inputs[0] = samples("normal"); h.repeat(2, []);
  h.context.inputs[0] = samples(); h.repeat(3, []);
  assert.equal(h.pick.faintedByRefIndex[2], true);
  assert.equal(h.diagnostic.reasons.accepted.count, 2);
});

test("failed template reads cannot rearm a consumed mark", () => {
  const h = harness(); h.repeat(); h.repeat(2, [best(2)]);
  h.context.inputs[0].icon.shape = { templateReady: false, matched: false }; h.repeat(4, []);
  h.context.inputs[0] = samples(); h.repeat(4, []);
  assert.equal(h.pick.faintedByRefIndex[2], false);
});

test("simultaneous faint marks on the two HUDs are independent", () => {
  const h = harness(); h.context.inputs[1] = samples(); h.repeat();
  assert.deepEqual(Array.from(h.pick.faintedByRefIndex), [true, true, false, false, false, false]);
  assert.equal(h.diagnostic.reasons.accepted.count, 2);
});

test("reset discards retained occupants and consumed marks", () => {
  const h = harness(); h.repeat(); h.resetFaintOverlayState("reset", { redraw: false });
  h.repeat(4, []);
  assert.equal(h.pick.faintedByRefIndex.some(Boolean), false);
  assert.ok(h.pick.faintMarksByHudIndex.every(mark => !mark.consumed));
  assert.ok(h.pick.faintSlotCacheByHudIndex.every(cache => !cache));
});

test("the recorded 1546-comparison match confirms exactly 3 -> 1 -> 5 -> 6", () => {
  const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/faint-mark-replay.json", import.meta.url), "utf8"));
  const h = harness({ stable: false, selected: [0, 0, 0, 0, 0, 0] });
  for (const [elapsed, orders, screenAllowed, hud] of fixture.frames) {
    h.pick.ordersByRefIndex = [...orders];
    h.context.inputs = hud.map(([, , , , , matched, ready]) => {
      const values = samples("normal");
      // Recorded shape decisions drive the replay. Other colours deliberately do not resemble a faint HUD.
      values.color.red = 1; values.percent.white = 0;
      values.icon.shape = { matched, templateReady: ready };
      return values;
    });
    h.clock.now = 1000 + elapsed - 250;
    h.step(hud.map(([refIndex, tier, score, margin]) => ({ refIndex: refIndex ?? -1, tier: tier ?? "", bestScore: score ?? 0, margin: margin ?? 0 })),
      250, hud.map(([, , , , ready]) => ready == null ? null : { ready }), screenAllowed);
  }
  const accepted = h.diagnostic.comparisons.flatMap(row => row.hud.filter(item => item.outcome === "accepted").map(item => item.resolved.refIndex + 1));
  assert.equal(h.diagnostic.comparisonCount, 1546);
  assert.deepEqual(Array.from(accepted), fixture.expectedSlots);
  assert.deepEqual(Array.from(h.pick.faintedByRefIndex), [true, false, true, false, true, true]);
});

function markImage(shift = 0, shuffled = false) {
  const data = new Uint8ClampedArray(50 * 50 * 4);
  for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) {
    const distance = Math.hypot(x - 25 - shift, y - 25);
    const rgb = distance > 19 && distance < 23 ? [235, 235, 235] : distance < 10 ? [230, 25, 80] : [15, 20, 45];
    const targetX = shuffled ? (x + (y % 2 ? 13 : 27)) % 50 : x;
    data.set([...rgb, 255], (y * 50 + targetX) * 4);
  }
  return data;
}

test("shape matching checks arrangement instead of totals and tolerates a small offset", () => {
  const h = harness(), original = markImage(), template = h.createFaintIconMask(original, 50, 50);
  for (const shift of [0, 1, 2]) assert.equal(h.matchFaintIconShape(markImage(shift), 50, 50, template).matched, true);
  const shuffled = markImage(0, true);
  assert.deepEqual(Array.from(h.createFaintIconMask(shuffled, 50, 50).counts), Array.from(template.counts));
  assert.equal(h.matchFaintIconShape(shuffled, 50, 50, template).matched, false);
  assert.equal(h.matchFaintIconShape(original, 50, 50, null).matched, false);
});
