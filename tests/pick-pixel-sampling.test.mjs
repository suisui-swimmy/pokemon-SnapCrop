import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
function harness({ failRead = false } = {}) {
  const reads = [], draws = [];
  let lastDraw;
  const context2d = {
    clearRect() {},
    drawImage(...args) { lastDraw = args; draws.push(args.slice(1)); },
    getImageData(_x, _y, width, height) {
      if (failRead) throw new Error("unreadable frame");
      reads.push({ width, height });
      const [, sx, sy] = lastDraw;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        data.set([(sx + x) % 256, (sy + y) % 256, (sx + x + sy + y) % 256, 255], (y * width + x) * 4);
      }
      return { data };
    },
  };
  const context = vm.createContext({ document: {
    addEventListener() {},
    createElement() { return { width: 300, height: 150, getContext: () => context2d }; },
  } });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u,
    `globalThis.api = {readPickOverlayPixels, resamplePickOverlayPixels, samplePickOverlayHudPresence,
      samplePickOverlayHudCandidates, getPickOverlayNormalizedRect, PICK_OVERLAY_CONFIG}; })();`), context);
  return { ...context.api, reads, draws };
}

function pixels() {
  return { x: 5, y: 7, width: 2, height: 2,
    data: Uint8ClampedArray.from([0, 0, 0, 255, 80, 80, 80, 255, 160, 160, 160, 255, 240, 240, 240, 255]) };
}

test("pixel-centre sampling preserves identity and computes a known four-pixel average", () => {
  const h = harness(), input = pixels(), crop = { x: 5, y: 7, width: 2, height: 2 };
  assert.deepEqual(Array.from(h.resamplePickOverlayPixels(input, crop, 2, 2)), Array.from(input.data));
  assert.deepEqual(Array.from(h.resamplePickOverlayPixels(input, crop, 1, 1)), [120, 120, 120, 255]);
});

test("fractional crop coordinates are retained and source edges are clamped", () => {
  const h = harness(), input = pixels();
  assert.deepEqual(Array.from(h.resamplePickOverlayPixels(input, { x: 5.5, y: 7, width: 1, height: 1 }, 1, 1)),
    [40, 40, 40, 255]);
  const result = h.resamplePickOverlayPixels(input, { x: 4, y: 6, width: 3, height: 3 }, 3, 3);
  assert.deepEqual(Array.from(result.slice(0, 4)), [0, 0, 0, 255]);
  assert.deepEqual(Array.from(result.slice(-4)), [240, 240, 240, 255]);
});

test("transparent pixels do not leak invisible RGB into the resized sample", () => {
  const h = harness(), input = { x: 0, y: 0, width: 2, height: 1,
    data: Uint8ClampedArray.from([255, 0, 0, 255, 0, 0, 255, 0]) };
  assert.deepEqual(Array.from(h.resamplePickOverlayPixels(input, { x: 0, y: 0, width: 2, height: 1 }, 1, 1)),
    [255, 0, 0, 128]);
});

test("all icon offset candidates share one native-size read at each supported scale", () => {
  for (const width of [1920, 1280, 960]) {
    const h = harness(), height = width * 9 / 16, input = { width, height };
    const roi = h.getPickOverlayNormalizedRect(h.PICK_OVERLAY_CONFIG.hudRois[1], width, height);
    const candidates = h.samplePickOverlayHudCandidates(input, roi, input);
    assert.equal(candidates.length, 17);
    assert.equal(candidates.pixelReadCount, 1);
    assert.equal(h.reads.length, 1);
    assert.deepEqual(Array.from(candidates, c => [c.offsetX, c.offsetY]),
      Array.from(h.PICK_OVERLAY_CONFIG.hudSearchOffsets, p => [p.x, p.y]));
    for (const [x, y, w, hh, dx, dy, dw, dh] of h.draws) {
      assert.ok([x, y, w, hh].every(Number.isInteger));
      assert.deepEqual([dx, dy, dw, dh], [0, 0, w, hh], "Canvas must never resize video pixels");
      assert.ok(x >= 0 && y >= 0 && x + w <= width && y + hh <= height);
    }
  }
});

test("HUD presence also reads once while searching all positions", () => {
  const h = harness(), dimensions = { width: 1920, height: 1080 };
  const result = h.samplePickOverlayHudPresence(dimensions, 0, dimensions);
  assert.equal(result.readCount, 1);
  assert.equal(result.candidateCount, 25);
  assert.equal(h.reads.length, 1);
  for (const [, , w, hh, , , dw, dh] of h.draws) assert.deepEqual([dw, dh], [w, hh]);
});

test("shared read near the bottom-right edge preserves each clamped candidate's pixels", () => {
  const h = harness(), dimensions = { width: 1920, height: 1080 };
  const candidates = h.samplePickOverlayHudCandidates(dimensions, { x: 1852, y: 996, width: 68, height: 84 }, dimensions);
  assert.equal(h.reads.length, 1);
  for (const candidate of candidates) {
    const x = Math.min(1852, 1852 + candidate.offsetX), y = Math.min(996, 996 + candidate.offsetY);
    const expectedGray = px => px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114;
    const at = (xx, yy) => [xx % 256, yy % 256, (xx + yy) % 256];
    const actualFirst = candidate.sample.values[0] + candidate.sample.mean;
    const actualLast = candidate.sample.values.at(-1) + candidate.sample.mean;
    assert.ok(Math.abs(actualFirst - expectedGray(at(x, y))) < 0.001);
    assert.ok(Math.abs(actualLast - expectedGray(at(x + 67, y + 83))) < 0.001);
  }
});

test("unreadable input remains a read failure, never fabricated dark pixels", () => {
  const h = harness({ failRead: true }), dimensions = { width: 1920, height: 1080 };
  const result = h.samplePickOverlayHudPresence(dimensions, 0, dimensions);
  assert.equal(result.visible, false);
  assert.equal(result.readFailed, true);
  assert.equal(result.candidateCount, 0);
  assert.equal(h.samplePickOverlayHudCandidates(dimensions, { x: 1113, y: 73, width: 68, height: 84 }, dimensions).length, 0);
  assert.equal(h.readPickOverlayPixels({ width: 0, height: 0 }, [{ x: 0, y: 0, width: 1, height: 1 }]), null);
});
