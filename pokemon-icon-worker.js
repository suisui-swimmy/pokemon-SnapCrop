import {
  buildCandidateFeature,
  createPokemonIconRequestGate,
  buildInputFeature,
  DEFAULT_MATCHER_CONFIG,
  equalRgba,
  fingerprintRgba,
  legacyScoreFeaturePair,
  normalizeCandidateRgba,
  recognizePokemonIconParty,
  resizeRgba,
} from "./pokemon-icon-matcher.js";

const WORKER_PROTOCOL_VERSION = 1;
const LOAD_CONCURRENCY = 12;
const SOURCE_PRIORITY = {
  champions: 0,
  sv: 1,
  supplemental: 2,
};
const LOAD_REASONS = new Set([
  "fetch_error",
  "decode_error",
  "no_alpha_foreground",
  "invalid_dimensions",
  "sample_error",
  "cancelled",
  "unknown_error",
]);

let manifest = null;
let matcherConfig = DEFAULT_MATCHER_CONFIG;
let candidates = [];
let prewarmPromise = null;
const requestGate = createPokemonIconRequestGate();
let prewarmGeneration = 0;
let candidateFailures = [];
let runtimeVisualCollisions = [];
let runtimeMergedDuplicates = [];
let workerStats = createWorkerStats();

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function createWorkerStats() {
  return {
    protocolVersion: WORKER_PROTOCOL_VERSION,
    workerStatus: "idle",
    prewarmStatus: "idle",
    rawManifestCount: 0,
    canonicalManifestCount: 0,
    buildMergedDuplicateCount: 0,
    buildVisualCollisionCount: 0,
    uniquePokemonNameCount: 0,
    uniqueSpeciesKeyCount: 0,
    championsRawCount: 0,
    svRawCount: 0,
    supplementalRawCount: 0,
    svOnlyPokemonNameCount: 0,
    fetchedCount: 0,
    decodedCount: 0,
    preprocessedCount: 0,
    loadedCount: 0,
    runtimeNormalizedDuplicateCount: 0,
    runtimeVisualCollisionGroupCount: 0,
    runtimeVisualCollisionEntryCount: 0,
    loadFailureCount: 0,
    timings: {
      manifestMs: 0,
      candidateFetchMs: 0,
      candidateDecodeMs: 0,
      candidatePreprocessMs: 0,
      dedupeMs: 0,
      prewarmTotalMs: 0,
    },
  };
}

function post(type, payload = {}, transfer = []) {
  self.postMessage({
    type,
    protocolVersion: WORKER_PROTOCOL_VERSION,
    ...payload,
  }, transfer);
}

function normalizeError(error) {
  return error instanceof Error ? error.message : String(error || "unknown error");
}

function createFailure(entry, reason, error = null) {
  const normalizedReason = LOAD_REASONS.has(reason) ? reason : "unknown_error";
  return {
    id: entry?.id || "",
    pokemonName: entry?.pokemonName || "",
    speciesKey: entry?.speciesKey || "",
    source: entry?.source || "",
    path: entry?.path || "",
    reason: normalizedReason,
    errorMessage: normalizeError(error || normalizedReason),
  };
}

function compareCandidatePriority(left, right) {
  const sourceDifference = (SOURCE_PRIORITY[left.source] ?? 99) - (SOURCE_PRIORITY[right.source] ?? 99);
  if (sourceDifference !== 0) {
    return sourceDifference;
  }
  return String(left.id || "").localeCompare(String(right.id || ""), "en");
}

function manifestStatsToWorkerStats(nextManifest) {
  const stats = nextManifest?.stats || {};
  return {
    rawManifestCount: Number(stats.rawCandidateCount || nextManifest?.rawCandidates?.length || 0),
    canonicalManifestCount: Number(stats.canonicalCandidateCount || nextManifest?.icons?.length || 0),
    buildMergedDuplicateCount: Number(stats.mergedDuplicateCount || 0),
    buildVisualCollisionCount: Number(stats.visualCollisionGroupCount || 0),
    uniquePokemonNameCount: Number(stats.uniquePokemonNameCount || 0),
    uniqueSpeciesKeyCount: Number(stats.uniqueSpeciesKeyCount || 0),
    championsRawCount: Number(stats.sourceCounts?.raw?.champions || 0),
    svRawCount: Number(stats.sourceCounts?.raw?.sv || 0),
    supplementalRawCount: Number(stats.sourceCounts?.raw?.supplemental || 0),
    svOnlyPokemonNameCount: Number(stats.svOnlyPokemonNameCount || 0),
  };
}

async function decodeCandidateBlob(blob, entry) {
  if (typeof self.createImageBitmap !== "function" || typeof self.OffscreenCanvas !== "function") {
    throw Object.assign(new Error("createImageBitmap / OffscreenCanvas is unavailable"), {
      reason: "decode_error",
      workerUnsupported: true,
    });
  }
  let bitmap;
  try {
    bitmap = await self.createImageBitmap(blob);
  } catch (error) {
    throw Object.assign(new Error(`createImageBitmap failed: ${normalizeError(error)}`), {
      reason: "decode_error",
    });
  }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 4096 || bitmap.height > 4096) {
      throw Object.assign(new Error(`invalid dimensions ${bitmap.width}x${bitmap.height}`), {
        reason: "invalid_dimensions",
      });
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context) {
      throw Object.assign(new Error("OffscreenCanvas 2D context unavailable"), {
        reason: "sample_error",
      });
    }
    context.clearRect(0, 0, bitmap.width, bitmap.height);
    context.drawImage(bitmap, 0, 0);
    let imageData;
    try {
      imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
    } catch (error) {
      throw Object.assign(new Error(`getImageData failed: ${normalizeError(error)}`), {
        reason: "sample_error",
      });
    }
    return {
      data: imageData.data,
      width: bitmap.width,
      height: bitmap.height,
      entry,
    };
  } finally {
    bitmap?.close?.();
  }
}

async function loadCandidate(entry, generation) {
  if (generation !== prewarmGeneration) {
    return {
      failure: createFailure(entry, "cancelled", "prewarm generation changed"),
    };
  }
  const candidateUrl = new URL(entry.path, self.location.href).href;
  const fetchStartedAt = now();
  let response;
  try {
    response = await fetch(candidateUrl);
    workerStats.timings.candidateFetchMs += now() - fetchStartedAt;
    if (!response.ok) {
      return {
        failure: createFailure(entry, "fetch_error", `HTTP ${response.status}`),
      };
    }
    workerStats.fetchedCount += 1;
  } catch (error) {
    workerStats.timings.candidateFetchMs += now() - fetchStartedAt;
    return {
      failure: createFailure(entry, "fetch_error", error),
    };
  }

  let decoded;
  const decodeStartedAt = now();
  try {
    decoded = await decodeCandidateBlob(await response.blob(), entry);
    workerStats.timings.candidateDecodeMs += now() - decodeStartedAt;
    workerStats.decodedCount += 1;
  } catch (error) {
    workerStats.timings.candidateDecodeMs += now() - decodeStartedAt;
    return {
      failure: createFailure(entry, error?.reason || "decode_error", error),
      unsupported: Boolean(error?.workerUnsupported),
    };
  }

  const preprocessStartedAt = now();
  try {
    const normalized = normalizeCandidateRgba(decoded, matcherConfig);
    if (!normalized.valid) {
      workerStats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
      return {
        failure: createFailure(entry, normalized.reason || "sample_error"),
      };
    }
    const feature = buildCandidateFeature(normalized, matcherConfig);
    if (!feature.maskSum) {
      workerStats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
      return {
        failure: createFailure(entry, "no_alpha_foreground"),
      };
    }
    workerStats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
    workerStats.preprocessedCount += 1;
    return {
      candidate: {
        ...entry,
        feature,
        normalizedRgba: normalized.data,
        normalizedFingerprint: fingerprintRgba(normalized.data),
        sourceDimensions: {
          width: decoded.width,
          height: decoded.height,
        },
        alphaBoundingBox: normalized.bbox,
        normalizedBounds: normalized.normalizedBounds,
        sourceActiveRatio: normalized.sourceActiveRatio,
      },
    };
  } catch (error) {
    workerStats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
    return {
      failure: createFailure(entry, "sample_error", error),
    };
  }
}

function splitExactNormalizedGroups(fingerprintEntries) {
  const exactGroups = [];
  fingerprintEntries.forEach((entry) => {
    const matching = exactGroups.find((group) => equalRgba(group[0].normalizedRgba, entry.normalizedRgba));
    if (matching) {
      matching.push(entry);
    } else {
      exactGroups.push([entry]);
    }
  });
  return exactGroups;
}

function dedupeNormalizedCandidates(loadedCandidates) {
  const fingerprintGroups = new Map();
  loadedCandidates.forEach((candidate) => {
    const group = fingerprintGroups.get(candidate.normalizedFingerprint) || [];
    group.push(candidate);
    fingerprintGroups.set(candidate.normalizedFingerprint, group);
  });
  const deduped = [];
  const merged = [];
  const collisions = [];

  [...fingerprintGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .forEach(([fingerprint, fingerprintEntries]) => {
      splitExactNormalizedGroups(fingerprintEntries).forEach((exactGroup, exactIndex) => {
        const byName = new Map();
        exactGroup.forEach((entry) => {
          const entries = byName.get(entry.pokemonName) || [];
          entries.push(entry);
          byName.set(entry.pokemonName, entries);
        });
        const pokemonNames = [...byName.keys()].sort((left, right) => left.localeCompare(right, "ja"));
        const collisionId = pokemonNames.length > 1
          ? `runtime:${fingerprint}:${exactIndex}`
          : "";
        if (collisionId) {
          collisions.push({
            id: collisionId,
            kind: "normalized_rgba",
            fingerprint,
            pokemonNames,
            entries: exactGroup.map((entry) => ({
              id: entry.id,
              pokemonName: entry.pokemonName,
              speciesKey: entry.speciesKey,
              source: entry.source,
              path: entry.path,
            })),
          });
        }
        [...byName.entries()]
          .sort(([left], [right]) => left.localeCompare(right, "ja"))
          .forEach(([, sameNameEntries]) => {
            const ordered = sameNameEntries.slice().sort(compareCandidatePriority);
            const canonical = ordered[0];
            const runtimeMergedIds = ordered.flatMap((entry) => entry.mergedIds || [entry.id]);
            const runtimeSources = [...new Set(ordered.flatMap((entry) => entry.sources || [entry.source]))]
              .sort((left, right) => (SOURCE_PRIORITY[left] ?? 99) - (SOURCE_PRIORITY[right] ?? 99));
            deduped.push({
              ...canonical,
              runtimeMergedIds,
              runtimeSources,
              runtimeVisualCollisionId: collisionId || null,
            });
            ordered.slice(1).forEach((entry) => {
              merged.push({
                id: entry.id,
                pokemonName: entry.pokemonName,
                speciesKey: entry.speciesKey,
                source: entry.source,
                path: entry.path,
                reason: "normalized_rgba_duplicate",
                canonicalId: canonical.id,
                fingerprint,
              });
            });
          });
      });
    });

  deduped.forEach((candidate) => {
    delete candidate.normalizedRgba;
  });
  return {
    candidates: deduped,
    merged,
    collisions,
  };
}

async function loadCandidates(entries, generation) {
  const loaded = [];
  const failures = [];
  let nextIndex = 0;
  let unsupportedCount = 0;
  const workerCount = Math.min(LOAD_CONCURRENCY, entries.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < entries.length && generation === prewarmGeneration) {
      const entry = entries[nextIndex];
      nextIndex += 1;
      const result = await loadCandidate(entry, generation);
      if (result.candidate) {
        loaded.push(result.candidate);
      }
      if (result.failure) {
        failures.push(result.failure);
      }
      if (result.unsupported) {
        unsupportedCount += 1;
      }
      if (nextIndex % 48 === 0) {
        post("prewarm-progress", {
          stats: {
            ...workerStats,
            prewarmStatus: "loading",
            attemptedCount: nextIndex,
            loadedBeforeDedupe: loaded.length,
            loadFailureCount: failures.length,
          },
        });
      }
    }
  });
  await Promise.all(workers);
  return {
    loaded,
    failures,
    unsupported: unsupportedCount > 0 && unsupportedCount === failures.length,
  };
}

async function ensurePrewarmed() {
  if (candidates.length && workerStats.prewarmStatus === "ready") {
    return candidates;
  }
  if (prewarmPromise) {
    return prewarmPromise;
  }
  if (!manifest?.icons?.length) {
    throw new Error("Pokemon icon manifest is not initialized");
  }
  const generation = prewarmGeneration + 1;
  prewarmGeneration = generation;
  const startedAt = now();
  workerStats = {
    ...createWorkerStats(),
    ...manifestStatsToWorkerStats(manifest),
    workerStatus: "prewarming",
    prewarmStatus: "loading",
  };
  candidateFailures = [];
  runtimeVisualCollisions = [];
  runtimeMergedDuplicates = [];
  post("prewarm-start", {
    stats: workerStats,
  });

  prewarmPromise = loadCandidates(manifest.icons, generation)
    .then((loadedResult) => {
      if (generation !== prewarmGeneration) {
        throw Object.assign(new Error("prewarm cancelled"), {
          code: "cancelled",
        });
      }
      const dedupeStartedAt = now();
      const deduped = dedupeNormalizedCandidates(loadedResult.loaded);
      workerStats.timings.dedupeMs = now() - dedupeStartedAt;
      candidates = deduped.candidates;
      candidateFailures = loadedResult.failures;
      runtimeVisualCollisions = deduped.collisions;
      runtimeMergedDuplicates = deduped.merged;
      workerStats.loadedCount = candidates.length;
      workerStats.runtimeNormalizedDuplicateCount = runtimeMergedDuplicates.length;
      workerStats.runtimeVisualCollisionGroupCount = runtimeVisualCollisions.length;
      workerStats.runtimeVisualCollisionEntryCount = runtimeVisualCollisions.reduce(
        (total, collision) => total + collision.entries.length,
        0,
      );
      workerStats.loadFailureCount = candidateFailures.length;
      workerStats.prewarmStatus = loadedResult.unsupported ? "unsupported" : "ready";
      workerStats.workerStatus = loadedResult.unsupported ? "unsupported" : "ready";
      workerStats.timings.prewarmTotalMs = now() - startedAt;
      post(loadedResult.unsupported ? "worker-unsupported" : "prewarm-complete", {
        stats: workerStats,
        failures: candidateFailures,
        runtimeMergedDuplicates,
        visualCollisions: [
          ...(manifest.visualCollisions || []),
          ...runtimeVisualCollisions,
        ],
      });
      if (loadedResult.unsupported) {
        throw Object.assign(new Error("Worker image APIs are unavailable"), {
          code: "unsupported",
        });
      }
      return candidates;
    })
    .catch((error) => {
      if (error?.code !== "cancelled" && error?.code !== "unsupported") {
        workerStats.workerStatus = "failed";
        workerStats.prewarmStatus = "failed";
        workerStats.timings.prewarmTotalMs = now() - startedAt;
        post("prewarm-error", {
          stats: workerStats,
          error: normalizeError(error),
          failures: candidateFailures,
        });
      }
      throw error;
    })
    .finally(() => {
      prewarmPromise = null;
    });
  return prewarmPromise;
}

function deserializeSlots(slots) {
  if (!Array.isArray(slots) || slots.length !== 6) {
    throw new TypeError("recognize requires six slots");
  }
  return slots.map((slot, index) => {
    if (!slot?.buffer || !slot.width || !slot.height) {
      throw new TypeError(`slot ${index + 1} is invalid`);
    }
    return {
      data: new Uint8ClampedArray(slot.buffer),
      width: slot.width,
      height: slot.height,
    };
  });
}

async function recognizeLegacyParty(slotInputs, loadedCandidates, requestId, config) {
  const resized = slotInputs.map((slot) => resizeRgba(slot, config.sampleWidth, config.sampleHeight));
  const inputFeatures = resized.map((slot) => buildInputFeature(slot, null, config));
  const startedAt = now();
  const results = [];
  const slotMs = [];
  for (let slotIndex = 0; slotIndex < inputFeatures.length; slotIndex += 1) {
    const slotStartedAt = now();
    const ranked = [];
    for (let candidateIndex = 0; candidateIndex < loadedCandidates.length; candidateIndex += 1) {
      if (!requestGate.isCurrent(requestId)) {
        throw Object.assign(new Error("legacy recognition cancelled"), {
          code: "cancelled",
        });
      }
      const candidate = loadedCandidates[candidateIndex];
      ranked.push({
        ...candidate,
        ...legacyScoreFeaturePair(inputFeatures[slotIndex], candidate.feature),
      });
      if ((candidateIndex + 1) % 32 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    ranked.sort((left, right) => right.score - left.score);
    const best = ranked[0];
    const second = ranked.find((candidate) => candidate.pokemonName !== best?.pokemonName);
    const margin = (best?.score || 0) - (second?.score || 0);
    const collision = best?.visualCollisionId || best?.runtimeVisualCollisionId;
    const matched = Boolean(
      best
      && !collision
      && best.score >= 0.74
      && margin >= 0.025
    );
    results.push({
      matched,
      pokemonName: matched ? best.pokemonName : "",
      speciesKey: best?.speciesKey || "",
      bestId: best?.id || "",
      bestSource: best?.source || "",
      bestScore: best?.score || 0,
      score: best?.score || 0,
      margin,
      rejectionReason: collision
        ? "visual_collision"
        : best?.score < 0.74
          ? "low_score"
          : margin < 0.025
            ? "low_margin"
            : "",
      coarseTopCandidates: ranked.slice(0, 48).map((candidate) => ({
        pokemonName: candidate.pokemonName,
        speciesKey: candidate.speciesKey,
        id: candidate.id,
        source: candidate.source,
        score: candidate.score,
      })),
      refinedTopCandidates: ranked.slice(0, 12).map((candidate) => ({
        pokemonName: candidate.pokemonName,
        speciesKey: candidate.speciesKey,
        id: candidate.id,
        source: candidate.source,
        score: candidate.score,
      })),
      durationMs: now() - slotStartedAt,
    });
    slotMs.push(results.at(-1).durationMs);
  }
  return {
    version: "legacy-adapter",
    results,
    assignment: null,
    globalTransform: null,
    timings: {
      slotMs,
      totalMs: now() - startedAt,
    },
    config,
  };
}

async function runRecognition(message) {
  const requestId = Number(message.requestId) || 0;
  requestGate.begin(requestId);
  const receiveStartedAt = now();
  try {
    const loadedCandidates = await ensurePrewarmed();
    if (!requestGate.isCurrent(requestId)) {
      throw Object.assign(new Error("recognition request is stale"), {
        code: "cancelled",
      });
    }
    const slotInputs = deserializeSlots(message.slots);
    post("recognition-start", {
      requestId,
      mode: message.mode || "new",
      candidateCount: loadedCandidates.length,
    });
    const recognizeStartedAt = now();
    const result = message.mode === "legacy"
      ? await recognizeLegacyParty(slotInputs, loadedCandidates, requestId, {
        ...matcherConfig,
        ...(message.config || {}),
      })
      : await recognizePokemonIconParty(slotInputs, loadedCandidates, {
        config: {
          ...matcherConfig,
          ...(message.config || {}),
        },
        isCancelled: () => !requestGate.isCurrent(requestId),
        yieldControl: () => new Promise((resolve) => setTimeout(resolve, 0)),
      });
    if (!requestGate.isCurrent(requestId)) {
      throw Object.assign(new Error("recognition result is stale"), {
        code: "cancelled",
      });
    }
    post("recognition-result", {
      requestId,
      mode: message.mode || "new",
      result,
      stats: workerStats,
      failures: candidateFailures,
      visualCollisions: [
        ...(manifest.visualCollisions || []),
        ...runtimeVisualCollisions,
      ],
      workerTiming: {
        receiveToStartMs: recognizeStartedAt - receiveStartedAt,
        recognitionMs: now() - recognizeStartedAt,
        totalWorkerMs: now() - receiveStartedAt,
      },
    });
  } catch (error) {
    if (error?.code === "cancelled" || error?.code === "unsupported") {
      post("recognition-cancelled", {
        requestId,
        reason: error.code,
        error: normalizeError(error),
      });
      return;
    }
    post("recognition-error", {
      requestId,
      error: normalizeError(error),
      stats: workerStats,
    });
  } finally {
    requestGate.complete(requestId);
  }
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "init") {
    const initStartedAt = now();
    manifest = message.manifest || null;
    matcherConfig = {
      ...DEFAULT_MATCHER_CONFIG,
      ...(message.config || {}),
    };
    candidates = [];
    prewarmGeneration += 1;
    candidateFailures = [];
    runtimeVisualCollisions = [];
    runtimeMergedDuplicates = [];
    workerStats = {
      ...createWorkerStats(),
      ...manifestStatsToWorkerStats(manifest),
      workerStatus: "initialized",
      timings: {
        ...createWorkerStats().timings,
        manifestMs: now() - initStartedAt,
      },
    };
    post("worker-ready", {
      stats: workerStats,
      capabilities: {
        createImageBitmap: typeof self.createImageBitmap === "function",
        offscreenCanvas: typeof self.OffscreenCanvas === "function",
      },
    });
    if (message.prewarm !== false) {
      void ensurePrewarmed().catch(() => {});
    }
    return;
  }

  if (message.type === "prewarm") {
    void ensurePrewarmed().catch(() => {});
    return;
  }

  if (message.type === "recognize") {
    requestGate.observe(message.requestId);
    void runRecognition(message);
    return;
  }

  if (message.type === "cancel") {
    const requestId = Number(message.requestId) || 0;
    requestGate.cancel(requestId);
    post("cancelled", {
      requestId,
    });
    return;
  }

  if (message.type === "reset") {
    const latestRequestId = requestGate.reset();
    post("reset-complete", {
      latestRequestId,
    });
  }
});

post("worker-loaded", {
  stats: workerStats,
});
