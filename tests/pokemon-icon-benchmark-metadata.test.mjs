import assert from "node:assert/strict";
import test from "node:test";
import {
  createBenchmarkEnvironment,
  createBenchmarkRunRecord,
} from "../tools/pokemon-icon-benchmark-metadata.mjs";

test("benchmark environment records the rerun app, manifest, and candidate state", () => {
  assert.deepEqual(createBenchmarkEnvironment({
    appVersion: "pokemon-snapcrop-v1.5.3",
    manifest: {
      schemaVersion: 5,
      icons: Array.from({ length: 788 }),
    },
    candidateStats: {
      loadedCount: 788,
      protocolVersion: 1,
    },
  }), {
    appVersion: "pokemon-snapcrop-v1.5.3",
    manifestSchemaVersion: 5,
    recognitionCandidateCount: 788,
    loadedCandidateCount: 788,
    workerProtocolVersion: 1,
  });
});

test("benchmark run record keeps the matcher version beside its result", () => {
  const result = {
    version: 4,
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
    matcherVersion: 4,
    result,
    workerTiming,
  });
});
