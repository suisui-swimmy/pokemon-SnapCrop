import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import * as matcher from "../pokemon-icon-matcher.js";

const source = readFileSync(new URL("../pokemon-icon-worker.js", import.meta.url), "utf8")
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/pokemon-icon-matcher.js";/u, "");

function harness() {
  const messages = [];
  let listener;
  let networkCalls = 0;
  const dispatch = (data) => listener({ data });
  class Canvas {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext() {
      let bitmap;
      return {
        clearRect() {}, drawImage(value) { bitmap = value; },
        getImageData() {
          const data = new Uint8ClampedArray(16 * 16 * 4);
          for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) {
            if (bitmap.shape === 2 && x > 8) continue;
            data.set([80 + bitmap.shape * 40, 180, 90, 255], (y * 16 + x) * 4);
          }
          return { data };
        },
      };
    }
  }
  const self = {
    location: { href: "https://snapcrop.example/pokemon-icon-worker.js" },
    postMessage(value) { messages.push(structuredClone(value)); },
    addEventListener(type, callback) { if (type === "message") listener = callback; },
    createImageBitmap: async (blob) => ({ width: 16, height: 16, shape: new Uint8Array(await blob.arrayBuffer())[0], close() {} }),
    OffscreenCanvas: Canvas,
  };
  vm.runInNewContext(source, {
    ...matcher, self, OffscreenCanvas: Canvas, Blob, ArrayBuffer, Uint8ClampedArray,
    URL, performance, setTimeout, fetch: async () => { networkCalls++; throw new Error("Worker must use broker"); },
  });
  return { messages, dispatch, networkCalls: () => networkCalls };
}

const icon = (id) => ({ id, showdownId: id, pokemonName: `名前${id}`, speciesKey: id, path: `https://championsbattledata.com/pokemon_champions_assets/pokemon/${id}.png`, source: "champions-battle-data" });
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function until(check) {
  for (let index = 0; index < 100; index++) { if (check()) return; await tick(); }
  assert.fail("Worker did not reach expected state");
}
function respond(h, request, shape = 1, ok = true) {
  h.dispatch({ type: "asset-response", assetRequestId: request.assetRequestId, ok,
    buffer: Uint8Array.of(shape).buffer, error: ok ? "" : "HTTP 503" });
}

test("remote worker fails closed and retries only failed assets", async () => {
  const h = harness();
  h.dispatch({ type: "init", remoteAssets: true, manifest: { icons: [icon("a"), icon("b")] } });
  const requests = h.messages.filter((entry) => entry.type === "asset-fetch");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].protocolVersion, 2);
  respond(h, requests[0]);
  respond(h, requests[1], 2, false);
  await until(() => h.messages.some((entry) => entry.type === "prewarm-error"));
  const failure = h.messages.find((entry) => entry.type === "prewarm-error");
  assert.equal(failure.stats.ready, false);
  assert.equal(failure.stats.loadedCount, 1);
  assert.equal(failure.failures[0].id, "b");
  h.dispatch({ type: "recognize", requestId: 1, slots: [] });
  await until(() => h.messages.some((entry) => entry.type === "recognition-error"));
  assert.equal(h.messages.filter((entry) => entry.type === "asset-fetch").length, 2);
  h.dispatch({ type: "retry-prewarm" });
  const retry = h.messages.filter((entry) => entry.type === "asset-fetch").at(-1);
  assert.equal(retry.url, icon("b").path);
  respond(h, retry, 2);
  await until(() => h.messages.some((entry) => entry.type === "prewarm-complete"));
  const ready = h.messages.find((entry) => entry.type === "prewarm-complete");
  assert.equal(ready.stats.ready, true);
  assert.equal(ready.stats.assetCount, 2);
  assert.equal(ready.stats.assetFingerprints.length, 2);
  assert.equal(h.networkCalls(), 0);
});

test("reinitialization ignores late broker replies and old prewarm completion", async () => {
  const h = harness();
  h.dispatch({ type: "init", remoteAssets: true, manifest: { icons: [icon("old")] } });
  const old = h.messages.find((entry) => entry.type === "asset-fetch");
  h.dispatch({ type: "init", remoteAssets: true, manifest: { icons: [icon("new")] } });
  const next = h.messages.filter((entry) => entry.type === "asset-fetch").at(-1);
  respond(h, old);
  respond(h, next, 2);
  await until(() => h.messages.some((entry) => entry.type === "prewarm-complete"));
  await tick();
  const completes = h.messages.filter((entry) => entry.type === "prewarm-complete");
  assert.equal(completes.length, 1);
  assert.deepEqual(completes[0].stats.assetFingerprints.map((entry) => entry.id), ["new"]);
  assert.equal(h.messages.some((entry) => entry.type === "prewarm-error"), false);
});

test("identical sprites with different canonical IDs remain a visual collision", async () => {
  const h = harness();
  h.dispatch({ type: "init", remoteAssets: true, manifest: { icons: [
    { ...icon("a"), pokemonName: "同名" }, { ...icon("b"), pokemonName: "同名" },
  ] } });
  h.messages.filter((entry) => entry.type === "asset-fetch").forEach((request) => respond(h, request));
  await until(() => h.messages.some((entry) => entry.type === "prewarm-complete"));
  const ready = h.messages.find((entry) => entry.type === "prewarm-complete");
  assert.equal(ready.stats.loadedCount, 2);
  assert.equal(ready.visualCollisions.length, 1);
  assert.deepEqual(ready.visualCollisions[0].showdownIds, ["a", "b"]);
});
