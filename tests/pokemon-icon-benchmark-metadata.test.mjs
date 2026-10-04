import assert from "node:assert/strict";
import test from "node:test";
import {
  createBenchmarkEnvironment,
  createBenchmarkRunRecord,
  createBenchmarkLabelResolver,
} from "../tools/pokemon-icon-benchmark-metadata.mjs";

test("benchmark environment records the rerun app, manifest, and candidate state", () => {
  assert.deepEqual(createBenchmarkEnvironment({
    appVersion: "pokemon-snapcrop-v1.5.4",
    manifest: {
      schemaVersion: 5,
      icons: Array.from({ length: 788 }),
    },
    candidateStats: {
      loadedCount: 788,
      protocolVersion: 1,
    },
  }), {
    appVersion: "pokemon-snapcrop-v1.5.4",
    manifestSchemaVersion: 5,
    recognitionCandidateCount: 788,
    loadedCandidateCount: 788,
    workerProtocolVersion: 1,
    providerDataVersion: null,
    providerGeneratedAt: null,
    assetFingerprints: [],
  });
});

test("legacy diagnostic labels resolve uniquely without collapsing forms", () => {
  const resolve = createBenchmarkLabelResolver({ pokemon: [
    { id: "aqua", canonicalName: "Tauros-Paldea-Aqua", name: "ケンタロス（水）", aliases: ["水ケンタロス", "ケンタロス"] },
    { id: "blaze", canonicalName: "Tauros-Paldea-Blaze", name: "ケンタロス（炎）", aliases: ["ケンタロス"] },
  ] });
  assert.deepEqual(resolve("水ケンタロス"), { status: "resolved", showdownId: "aqua" });
  assert.deepEqual(resolve("Ｔａｕｒｏｓ-Paldea-Aqua"), { status: "resolved", showdownId: "aqua" });
  assert.deepEqual(resolve("ケンタロス"), { status: "ambiguous", showdownId: "", candidates: ["aqua", "blaze"] });
  assert.equal(resolve("不明").status, "unknown");
});

test("benchmark run record keeps the matcher version beside its result", () => {
  const result = {
    version: 5,
    results: [],
  };
  const workerTiming = {
    totalWorkerMs: 123,
  };
  assert.deepEqual(createBenchmarkRunRecord({
    completedAt: "2026-07-28T12:34:56.000Z",
    message: {
      result,
      workerTiming,
    },
  }), {
    completedAt: "2026-07-28T12:34:56.000Z",
    matcherVersion: 5,
    result,
    workerTiming,
  });
});
