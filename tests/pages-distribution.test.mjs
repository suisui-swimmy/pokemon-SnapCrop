import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { buildPages, PUBLIC_FILES } from "../tools/build-pages.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const listFiles = (root, prefix = "") => fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
  const relative = prefix + entry.name;
  return entry.isDirectory() ? listFiles(path.join(root, entry.name), `${relative}/`) : [relative];
});

test("Pages builds only allowlisted runtime assets and discards stale output", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "snapcrop-pages-"));
  try {
    for (const relative of PUBLIC_FILES) {
      const target = path.join(sandbox, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, relative), target);
    }
    for (const relative of ["others/private.txt", "debug-logs/match.txt", "assets/pokemon-icons/old.png", "data/pokemon-reference.csv", "data/pokemon-icon-reference.json", "dist/old-export.json"]) {
      const target = path.join(sandbox, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, "private-or-legacy");
    }
    const built = buildPages({ root: sandbox });
    assert.deepEqual(listFiles(built.output).sort(), [...PUBLIC_FILES, ".nojekyll"].sort());
    assert.ok(!listFiles(built.output).some((file) => /pokemon-icons|pokemon-reference\.csv|pokemon-icon-reference|others|debug-logs/u.test(file)));
    const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/deploy.yml"), "utf8");
    assert.match(workflow, /node-version: 24/u); assert.match(workflow, /npm run build:pages/u); assert.match(workflow, /path: dist/u);
  } finally {
    assert.equal(path.dirname(sandbox), fs.realpathSync(os.tmpdir()));
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test("every local runtime asset reference is included in Pages", () => {
  for (const filename of ["app.js", "style.css", "index.html", "pokemon-icon-worker.js", "sw.js"]) {
    const text = fs.readFileSync(path.join(ROOT, filename), "utf8");
    const references = [...text.matchAll(/["'`]\.\/(assets\/[^"'`]+|data\/[^"'`]+|(?:battle-api|battle-statistics|pokemon-icon-worker|pokemon-icon-matcher)\.js)["'`]/gu)];
    for (const [, relative] of references) assert.ok(PUBLIC_FILES.includes(relative), `${filename}: ${relative}`);
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/pokemon-display-catalog.json"), "utf8"));
  assert.equal(catalog.provenance.usage, "display-only");
  assert.ok(PUBLIC_FILES.includes("data/showdown-LICENSE.txt"));
  const serialized = JSON.stringify(catalog);
  assert.doesNotMatch(serialized, /data:image|pokemon_champions_assets|image_path|baseStats|"artwork"/u);
});

function workerHarness() {
  const listeners = new Map(); const puts = []; const removed = []; const fetched = [];
  const response = { status: 200, clone() { return this; } };
  const context = vm.createContext({ URL, Set, Promise,
    self: { registration: { scope: "https://example.test/pokemon-SnapCrop/" }, location: { origin: "https://example.test" },
      addEventListener: (name, callback) => listeners.set(name, callback), clients: { claim() {} }, skipWaiting() {} },
    caches: { keys: async () => ["pokemon-snapcrop-v1.7.0", "pokemon-snapcrop-v1.7.3", "another-app"], delete: async (key) => removed.push(key),
      match: async () => null, open: async () => ({ addAll: async () => {}, put: async (request) => puts.push(request.url) }) },
    fetch: async (request) => { fetched.push(request.url); return response; },
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), context);
  return { context, listeners, puts, removed, fetched, response };
}

test("Service Worker bypasses all external requests and only expires SnapCrop caches", async () => {
  const h = workerHarness(); let claimed = false;
  for (const url of ["https://championsbattledata.com/api/pokemon", "https://championsbattledata.com/pokemon_champions_assets/pokemon/Tauros.png"]) {
    h.listeners.get("fetch")({ request: { method: "GET", url }, respondWith() { claimed = true; } });
  }
  assert.equal(claimed, false); assert.deepEqual(h.fetched, []); assert.deepEqual(h.puts, []);
  await h.context.cacheResponse({ url: "https://championsbattledata.com/api/pokemon" }, h.response);
  assert.deepEqual(h.puts, []);
  let activation; h.listeners.get("activate")({ waitUntil(promise) { activation = promise; } }); await activation;
  assert.deepEqual(h.removed, ["pokemon-snapcrop-v1.7.0"]);
  let loaded; h.listeners.get("fetch")({ request: { method: "GET", url: "https://example.test/pokemon-SnapCrop/app.js" }, respondWith(promise) { loaded = promise; } }); await loaded;
  assert.deepEqual(h.puts, ["https://example.test/pokemon-SnapCrop/app.js"]);
});
