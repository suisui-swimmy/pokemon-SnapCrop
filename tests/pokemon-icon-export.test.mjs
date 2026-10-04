import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1kAAAAASUVORK5CYII=",
  "base64",
);
const dataUrl = `data:image/png;base64,${pngBytes.toString("base64")}`;

function harness(debugMode) {
  const downloads = [];
  const output = [];
  const context = vm.createContext({
    Blob, atob, crypto: webcrypto, downloads, output,
    document: { addEventListener() {} },
  });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, `
    createPokemonIconDiagnosticRoiImages = () => Array.from({length: 6}, () => ({width: 1, height: 1, dataUrl: "roi"}));
    downloadBlobFile = (blob, fileName) => downloads.push({blob, fileName});
    appendTerminalEntry = (lines) => output.push(...lines);
    appendTerminalError = (message) => output.push(message);
    globalThis.api = {state, exportPokemonIconDiagnosticBundle};
  })();`), context);
  context.api.state.debugMode = debugMode;
  return { ...context.api, downloads, output };
}

for (const debugMode of [false, true]) {
  test(`icon export pairs JSON and original PNG with debug=${debugMode}`, async () => {
    const h = harness(debugMode);
    h.state.references.enemy = { width: 1, height: 1, toDataURL: () => dataUrl };
    h.state.pokemonIconRecognition.candidateStats = { assetFingerprints: [{ id: "pikachu", fingerprint: "normalized-test" }] };
    await h.exportPokemonIconDiagnosticBundle();
    assert.equal(h.downloads.length, 2);
    const [json, png] = h.downloads;
    assert.equal(png.fileName, json.fileName.replace(/\.json$/u, ".png"));
    assert.equal(json.blob.type, "application/json");
    assert.equal(png.blob.type, "image/png");
    const bundle = JSON.parse(await json.blob.text());
    assert.equal(json.fileName, `${bundle.export.filePrefix}__icons-001.json`);
    assert.match(json.fileName, /^snapcrop-unlinked-/u);
    assert.equal(bundle.provenance.matchId, null);
    assert.equal(bundle.provenance.association, "unlinked");
    assert.equal(bundle.export.exportedAt, bundle.capturedAt);
    assert.equal(bundle.referenceImage.dataUrl, dataUrl);
    assert.deepEqual(bundle.remoteSource.assets, [{ id: "pikachu", fingerprint: "normalized-test" }]);
    assert.equal(bundle.slots.length, 6);
    assert.deepEqual(bundle.labels.pokemonNames, ["", "", "", "", "", ""]);
    assert.deepEqual(Buffer.from(await png.blob.arrayBuffer()), pngBytes);
    assert.equal(h.state.debugMode, debugMode);
    assert.match(h.output.at(-1), /ダウンロードを開始しました/u);
  });
}

test("icon export without a reference downloads neither file", async () => {
  const h = harness(false);
  await h.exportPokemonIconDiagnosticBundle();
  assert.equal(h.downloads.length, 0);
  assert.match(h.output.at(-1), /相手側の参照画像がありません/u);
});

test("image encoding failure reports an error before either download", async () => {
  const h = harness(false);
  h.state.references.enemy = { toDataURL() { throw new Error("canvas encoding failed"); } };
  await h.exportPokemonIconDiagnosticBundle();
  assert.equal(h.downloads.length, 0);
  assert.match(h.output.at(-1), /保存できませんでした/u);
});
