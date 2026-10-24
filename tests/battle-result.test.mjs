import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const signal = (matched = false, templateReady = true) => ({ templateReady, matched,
  coverageScore: matched ? 0.95 : 0, borderScore: matched ? 0.95 : 0,
  purpleScore: matched ? 0.96 : 0, spillScore: 0.01, offsetX: 0, offsetY: 0 });
function harness() {
  const output = [];
  const context = vm.createContext({ crypto: webcrypto, output,
    document: { addEventListener() {} }, window: { cancelAnimationFrame() {} } });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, `
    getBattleHudSignal = (metrics) => ({ matched: metrics.hud });
    matchBattleResultTemplate = (crop) => globalThis.signals[crop.x < 1000 ? "left" : "right"];
    matchDrawResultTemplate = () => globalThis.signals.draw;
    appendTerminalEntry = (lines) => output.push(...lines);
    elements.video = { videoWidth: 1920, videoHeight: 1080 };
    globalThis.api = { state, updateBattleResultDetection, resetBattleResultDetection, startMatchLog,
      formatMatchLog, buildDrawResultTemplate,
      compareDrawResultPixels: (data, template) => compareDrawResultMask(createDrawResultMask(data), template), DRAW_RESULT_CONFIG };
  })();`), context);
  const api = context.api;
  api.state.references.enemy = {};
  api.startMatchLog(1000, {});
  context.signals = { left: signal(), right: signal(), draw: signal() };
  const step = (now, hud = false) => api.updateBattleResultDetection({ hud }, now);
  const arm = () => { step(1000, true); step(1320, true); };
  return { ...api, context, output, step, arm, signals: context.signals };
}

test("DRAW requires a reference, battle HUD and two spaced observations; completes a log only once", () => {
  const h = harness(); h.signals.draw = signal(true);
  h.state.references.enemy = null; h.step(1000, true); h.step(1320, true);
  assert.equal(h.state.battleResultDetection.armed, false);
  h.state.references.enemy = {}; h.step(1640); h.step(1960);
  assert.equal(h.state.battleResultDetection.armed, false);
  h.step(2280, true); h.step(2600, true); h.step(2920);
  assert.equal(h.state.battleResultDetection.drawStreak, 1);
  h.step(3000); assert.equal(h.state.battleResultDetection.result, "");
  h.step(3240); h.step(3560);
  assert.equal(h.state.battleResultDetection.result, "DRAW");
  assert.equal(h.state.battleResultDetection.event.source, "draw-template");
  assert.equal(h.state.battleResultDetection.event.draw.purpleScore, 0.96);
  assert.equal(h.output.filter(line => line === "[result] DRAW").length, 1);
  const log = h.state.matchLog.completed.at(-1);
  assert.equal(log.result, "DRAW");
  assert.match(h.formatMatchLog(log), /result accepted: DRAW/u);
  h.resetBattleResultDetection();
  assert.equal(h.state.battleResultDetection.drawStreak, 0);
  assert.equal(h.state.battleResultDetection.result, "");
});

test("conflicting WIN/LOSE and DRAW, or both gold icons, never publish a result", () => {
  for (const side of ["left", "right", "both"]) {
    const h = harness(); h.arm(); h.signals.draw = signal(true);
    if (side !== "right") h.signals.left = signal(true);
    if (side !== "left") h.signals.right = signal(true);
    h.step(1640); h.step(1960); h.step(2280);
    assert.equal(h.state.battleResultDetection.result, "");
    if (side === "both") {
      h.signals.draw = signal(); h.step(2600); h.step(2920);
      assert.equal(h.state.battleResultDetection.result, "");
    }
  }
});

test("mismatch, unreadable/missing template, conflict and long gap restart DRAW confirmation", () => {
  for (const interruption of ["mismatch", "missing", "read-failed", "conflict", "gap", "missing-win"]) {
    const h = harness(); h.arm(); h.signals.draw = signal(true); h.step(1640);
    if (interruption === "mismatch") h.signals.draw = signal();
    if (interruption === "missing") h.signals.draw = signal(false, false);
    if (interruption === "read-failed") h.signals.draw = { ...signal(), readFailed: true };
    if (interruption === "conflict") h.signals.left = signal(true);
    if (interruption === "missing-win") h.signals.left = signal(false, false);
    const now = interruption === "gap" ? 3000 : 1960;
    h.step(now); assert.equal(h.state.battleResultDetection.result, "", interruption);
    h.signals.draw = signal(true); h.signals.left = signal();
    if (interruption !== "gap") { h.step(now + 320); assert.equal(h.state.battleResultDetection.result, ""); }
    h.step(now + 640); assert.equal(h.state.battleResultDetection.result, "DRAW", interruption);
  }
});

test("WIN and LOSE still complete with the DRAW template unavailable", () => {
  for (const [side, expected] of [["left", "WIN"], ["right", "LOSE"]]) {
    const h = harness(); h.arm(); h.signals[side] = signal(true); h.signals.draw = signal(false, false);
    h.step(1640); h.step(1960);
    assert.equal(h.state.battleResultDetection.result, expected);
    assert.equal(h.state.battleResultDetection.event.source, "win-icon-template");
  }
});

test("shape comparison rejects flat colors, absent outline/fill and excess pale pixels", () => {
  const h = harness();
  const { sampleWidth: w, sampleHeight: height } = h.DRAW_RESULT_CONFIG;
  const colors = [[12, 12, 12, 255], [185, 185, 225, 255], [120, 80, 195, 255]];
  const data = new Uint8ClampedArray(w * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < w; x++) data.set(colors[x % 20 < 4 ? 1 : x % 20 < 15 ? 2 : 0], (y * w + x) * 4);
  const template = h.buildDrawResultTemplate(data);
  assert.equal(template.status, "ready");
  assert.equal(h.compareDrawResultPixels(data, template).matched, true);
  for (const color of colors) {
    const solid = data.slice(); for (let i = 0; i < solid.length; i += 4) solid.set(color, i);
    assert.equal(h.compareDrawResultPixels(solid, template).matched, false);
    assert.equal(h.buildDrawResultTemplate(solid).status, "error");
  }
  for (const removed of [1, 2]) {
    const missing = data.slice();
    for (let i = 0; i < template.mask.length; i++) if (template.mask[i] === removed) missing.set(colors[0], i * 4);
    assert.equal(h.compareDrawResultPixels(missing, template).matched, false);
  }
  const excess = data.slice();
  for (let i = 0; i < template.mask.length; i++) if (!template.mask[i]) excess.set(colors[1], i * 4);
  assert.equal(h.compareDrawResultPixels(excess, template).matched, false);
  assert.equal(h.buildDrawResultTemplate(null).status, "error");
});
