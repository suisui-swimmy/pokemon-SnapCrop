import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

function extractVersion(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `${label} version was not found`);
  return match[1];
}

test("app, benchmark, and Service Worker versions stay synchronized", () => {
  const appVersion = extractVersion(
    read("../app.js"),
    /const APP_VERSION = "(pokemon-snapcrop-v[^"]+)"/u,
    "app",
  );
  const benchmarkVersion = extractVersion(
    read("../tools/pokemon-icon-benchmark.js"),
    /const BENCHMARK_APP_VERSION = "(pokemon-snapcrop-v[^"]+)"/u,
    "benchmark",
  );
  const cacheVersion = extractVersion(
    read("../sw.js"),
    /const CACHE_NAME = "(pokemon-snapcrop-v[^"]+)"/u,
    "Service Worker",
  );
  assert.equal(appVersion, "pokemon-snapcrop-v1.5.3");
  assert.equal(benchmarkVersion, appVersion);
  assert.equal(cacheVersion, appVersion);
});
