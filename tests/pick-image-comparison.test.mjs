import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const context = vm.createContext({ document: { addEventListener() {} } });
vm.runInContext(source.replace(/\}\)\(\);\s*$/u,
  "globalThis.api = { buildPickOverlaySample, comparePickOverlaySamples, evaluatePickOverlayHudPresence }; })();"), context);
const { buildPickOverlaySample, comparePickOverlaySamples, evaluatePickOverlayHudPresence } = context.api;

function pixels(background, shape = "body") {
  const data = new Uint8ClampedArray(60 * 75 * 4);
  for (let y = 0; y < 75; y += 1) for (let x = 0; x < 60; x += 1) {
    const i = (y * 60 + x) * 4;
    const body = shape === "body" ? x >= 13 && x < 47 && y >= 10 && y < 62
      : shape === "tiny" ? x >= 25 && x < 30 && y >= 30 && y < 35
        : shape === "other" ? x >= 4 && x < 18 && y >= 5 && y < 70 : false;
    const colour = body ? [40 + x % 20, 35 + (y % 30) * 2, 70 + (x + y) % 30] : background;
    data.set([...colour, 255], i);
  }
  return data;
}

test("a dark sprite matches across dark red and bright pink backgrounds", () => {
  const reference = buildPickOverlaySample(pixels([135, 0, 43]), 60, 75);
  const hud = buildPickOverlaySample(pixels([255, 25, 118]), 60, 75);
  const result = comparePickOverlaySamples(hud, reference);
  assert.ok(result.originalScore < 0.7, "fixture must reproduce the contrast reversal");
  assert.equal(result.matchSource, "foreground");
  assert.ok(result.score > 0.95);
  assert.equal(result.foregroundOverlap, 1);
  assert.notEqual(reference.mean, hud.mean, "quality metrics must still use original pixels");
});

test("matching backgrounds cannot rescue a different silhouette", () => {
  const reference = buildPickOverlaySample(pixels([135, 0, 43]), 60, 75);
  const other = buildPickOverlaySample(pixels([255, 25, 118], "other"), 60, 75);
  const result = comparePickOverlaySamples(other, reference);
  assert.ok(result.foregroundOverlap < 0.7);
  assert.equal(result.foregroundScore, 0);
  assert.ok(result.score < 0.7);
});

test("a tiny shared foreground or an empty background cannot use the foreground route", () => {
  for (const shape of ["tiny", "empty"]) {
    const reference = buildPickOverlaySample(pixels([135, 0, 43], shape), 60, 75);
    const hud = buildPickOverlaySample(pixels([255, 25, 118], shape), 60, 75);
    assert.equal(comparePickOverlaySamples(hud, reference).foregroundScore ?? 0, 0);
  }
});

test("the original route remains available for red foreground detail", () => {
  const data = pixels([160, 0, 50]);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 160 + ((i / 4) % 60);
    data[i + 1] = (i / 4) % 20;
    data[i + 2] = 50 + ((i / 4) % 30);
  }
  const sample = buildPickOverlaySample(data, 60, 75);
  const result = comparePickOverlaySamples(sample, sample);
  assert.equal(result.matchSource, "original");
  assert.ok(result.score > 0.95);
});

test("a crop with no separable pink background cannot use foreground matching", () => {
  const sample = buildPickOverlaySample(pixels([45, 60, 100]), 60, 75);
  const result = comparePickOverlaySamples(sample, sample);
  assert.equal(sample.foregroundCount, sample.foregroundArea);
  assert.equal(result.foregroundScore, 0);
});

test("the same silhouette with reversed interior markings cannot use the foreground route", () => {
  const patterned = (background, reversed) => {
    const data = pixels(background);
    for (let y = 10; y < 62; y += 1) for (let x = 13; x < 47; x += 1) {
      const colour = ((x < 30) !== reversed) ? [40, 80, 120] : [80, 130, 45];
      data.set([...colour, 255], (y * 60 + x) * 4);
    }
    return buildPickOverlaySample(data, 60, 75);
  };
  const hud = patterned([255, 25, 118], false);
  const correct = comparePickOverlaySamples(hud, patterned([135, 0, 43], false));
  const wrong = comparePickOverlaySamples(hud, patterned([135, 0, 43], true));
  assert.equal(wrong.foregroundOverlap, 1);
  assert.ok(wrong.foregroundDetailScore < 0.1);
  assert.equal(wrong.foregroundScore, 0);
  assert.ok(correct.score > wrong.score + 0.13);
});

test("a flat foreground cannot be confirmed from its outline alone", () => {
  const data = pixels([135, 0, 43]);
  for (let y = 10; y < 62; y += 1) for (let x = 13; x < 47; x += 1) {
    data.set([50, 65, 90, 255], (y * 60 + x) * 4);
  }
  const sample = buildPickOverlaySample(data, 60, 75);
  assert.equal(comparePickOverlaySamples(sample, sample).foregroundScore, 0);
});

function card({ top = true, bottom = true, name = true, hp = true } = {}) {
  const data = new Uint8ClampedArray(96 * 32 * 4);
  const fill = (x0, x1, y0, y1) => {
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      data.set([230, 230, 250, 255], (y * 96 + x) * 4);
    }
  };
  if (top) fill(8, 92, 1, 2);
  if (bottom) fill(6, 87, 30, 31);
  if (name) fill(35, 50, 6, 10);
  if (hp) fill(33, 85, 21, 23);
  return data;
}

test("opponent HUD requires both borders, the name band and the HP lane together", () => {
  assert.equal(evaluatePickOverlayHudPresence(card()).visible, true);
  for (const part of ["top", "bottom", "name", "hp"]) {
    assert.equal(evaluatePickOverlayHudPresence(card({ [part]: false })).visible, false, part);
  }
});

test("a bright full-frame effect is not an opponent HUD", () => {
  const glare = new Uint8ClampedArray(96 * 32 * 4).fill(255);
  assert.equal(evaluatePickOverlayHudPresence(glare).visible, false);
});
