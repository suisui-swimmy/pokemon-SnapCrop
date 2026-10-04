import {
  buildCandidateFeature,
  dedupeNormalizedPokemonIconCandidates,
  createPokemonIconRequestGate,
  buildInputFeature,
  DEFAULT_MATCHER_CONFIG,
  fingerprintRgba,
  legacyScoreFeaturePair,
  normalizeCandidateRgba,
  pokemonIconIdentity,
  recognizePokemonIconParty,
  resizeRgba,
} from "./pokemon-icon-matcher.js";

const WORKER_PROTOCOL_VERSION = 2;
const LOAD_CONCURRENCY = 4;
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
let remoteAssets = false;
let assetRequestSequence = 0;
const pendingAssets = new Map();
const successfulCandidates = new Map();

function candidateKey(entry) {
  return `${entry.id}:${entry.path}`;
}

function cancelPendingAssets() {
  pendingAssets.forEach(({ reject }) => reject(Object.assign(new Error("prewarm cancelled"), { code: "cancelled" })));
  pendingAssets.clear();
}

async function fetchCandidateBlob(url, generation) {
  if (!remoteAssets) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  }
  return new Promise((resolve, reject) => {
    const assetRequestId = ++assetRequestSequence;
    pendingAssets.set(assetRequestId, { generation, resolve, reject });
    post("asset-fetch", { assetRequestId, url });
  });
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function createWorkerStats() {
  return {
    protocolVersion: WORKER_PROTOCOL_VERSION,
    workerStatus: "idle",
    prewarmStatus: "idle",
    ready: false,
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

function manifestStatsToWorkerStats(nextManifest) {
  const stats = nextManifest?.stats || {};
  const icons = nextManifest?.icons || [];
  return {
    rawManifestCount: Number(stats.rawCandidateCount || nextManifest?.rawCandidates?.length || icons.length),
    canonicalManifestCount: Number(stats.canonicalCandidateCount || nextManifest?.icons?.length || 0),
    buildMergedDuplicateCount: Number(stats.mergedDuplicateCount || 0),
    buildVisualCollisionCount: Number(stats.visualCollisionGroupCount || 0),
    uniquePokemonNameCount: Number(stats.uniquePokemonNameCount || new Set(icons.map(pokemonIconIdentity)).size),
    uniqueSpeciesKeyCount: Number(stats.uniqueSpeciesKeyCount || new Set(icons.map((entry) => entry.speciesKey)).size),
    providerDataVersion: nextManifest?.dataVersion || null,
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
  const stats = workerStats;
  if (generation !== prewarmGeneration) {
    return {
      failure: createFailure(entry, "cancelled", "prewarm generation changed"),
    };
  }
  const candidateUrl = new URL(entry.path, self.location.href).href;
  const fetchStartedAt = now();
  let blob;
  try {
    blob = await fetchCandidateBlob(candidateUrl, generation);
    stats.timings.candidateFetchMs += now() - fetchStartedAt;
    if (generation !== prewarmGeneration) return { failure: createFailure(entry, "cancelled") };
    stats.fetchedCount += 1;
  } catch (error) {
    stats.timings.candidateFetchMs += now() - fetchStartedAt;
    return {
      failure: createFailure(entry, generation === prewarmGeneration ? "fetch_error" : "cancelled", error),
    };
  }

  let decoded;
  const decodeStartedAt = now();
  try {
    decoded = await decodeCandidateBlob(blob, entry);
    if (generation !== prewarmGeneration) return { failure: createFailure(entry, "cancelled") };
    stats.timings.candidateDecodeMs += now() - decodeStartedAt;
    stats.decodedCount += 1;
  } catch (error) {
    stats.timings.candidateDecodeMs += now() - decodeStartedAt;
    return {
      failure: createFailure(entry, error?.reason || "decode_error", error),
      unsupported: Boolean(error?.workerUnsupported),
    };
  }

  const preprocessStartedAt = now();
  try {
    const normalized = normalizeCandidateRgba(decoded, matcherConfig);
    if (!normalized.valid) {
      stats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
      return {
        failure: createFailure(entry, normalized.reason || "sample_error"),
      };
    }
    const feature = buildCandidateFeature(normalized, matcherConfig);
    if (!feature.maskSum) {
      stats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
      return {
        failure: createFailure(entry, "no_alpha_foreground"),
      };
    }
    stats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
    stats.preprocessedCount += 1;
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
    stats.timings.candidatePreprocessMs += now() - preprocessStartedAt;
    return {
      failure: createFailure(entry, "sample_error", error),
    };
  }
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
      if (generation !== prewarmGeneration) return;
      if (result.candidate) {
        loaded.push(result.candidate);
        successfulCandidates.set(candidateKey(entry), result.candidate);
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

async function ensurePrewarmed({ retry = false } = {}) {
  if (candidates.length && workerStats.prewarmStatus === "ready") return candidates;
  if (prewarmPromise) return prewarmPromise;
  if (!manifest?.icons?.length) throw new Error("Pokemon icon manifest is not initialized");
  if (!retry && ["failed", "unsupported"].includes(workerStats.prewarmStatus)) {
    throw new Error("Candidate assets are incomplete; retry-prewarm is required");
  }
  const generation = ++prewarmGeneration;
  const startedAt = now();
  workerStats = {
    ...createWorkerStats(),
    ...manifestStatsToWorkerStats(manifest),
    workerStatus: "prewarming",
    prewarmStatus: "loading",
    retainedCount: successfulCandidates.size,
  };
  candidateFailures = [];
  runtimeVisualCollisions = [];
  runtimeMergedDuplicates = [];
  post("prewarm-start", { stats: workerStats });
  const pendingEntries = manifest.icons.filter((entry) => !successfulCandidates.has(candidateKey(entry)));
  const promise = loadCandidates(pendingEntries, generation)
    .then((loadedResult) => {
      if (generation !== prewarmGeneration) throw Object.assign(new Error("prewarm cancelled"), { code: "cancelled" });
      candidateFailures = loadedResult.failures;
      workerStats.loadFailureCount = candidateFailures.length;
      workerStats.loadedCount = successfulCandidates.size;
      workerStats.timings.prewarmTotalMs = now() - startedAt;
      if (candidateFailures.length || successfulCandidates.size !== manifest.icons.length) {
        candidates = [];
        workerStats.workerStatus = loadedResult.unsupported ? "unsupported" : "failed";
        workerStats.prewarmStatus = workerStats.workerStatus;
        throw Object.assign(new Error("Not all eligible candidate images could be loaded"), {
          code: loadedResult.unsupported ? "unsupported" : "incomplete_assets",
        });
      }
      const dedupeStartedAt = now();
      const deduped = dedupeNormalizedPokemonIconCandidates([...successfulCandidates.values()]);
      workerStats.timings.dedupeMs = now() - dedupeStartedAt;
      candidates = deduped.candidates;
      runtimeVisualCollisions = deduped.collisions;
      runtimeMergedDuplicates = deduped.merged;
      workerStats.loadedCount = candidates.length;
      workerStats.assetCount = successfulCandidates.size;
      workerStats.assetFingerprints = [...successfulCandidates.values()].map((entry) => ({
        id: entry.id, showdownId: entry.showdownId || "", path: entry.path,
        fingerprint: entry.normalizedFingerprint,
      }));
      workerStats.runtimeNormalizedDuplicateCount = runtimeMergedDuplicates.length;
      workerStats.runtimeVisualCollisionGroupCount = runtimeVisualCollisions.length;
      workerStats.runtimeVisualCollisionEntryCount = runtimeVisualCollisions.reduce((total, collision) => total + collision.entries.length, 0);
      workerStats.prewarmStatus = "ready";
      workerStats.workerStatus = "ready";
      workerStats.ready = true;
      workerStats.timings.prewarmTotalMs = now() - startedAt;
      post("prewarm-complete", {
        stats: workerStats, failures: [], runtimeMergedDuplicates,
        visualCollisions: [...(manifest.visualCollisions || []), ...runtimeVisualCollisions],
      });
      return candidates;
    })
    .catch((error) => {
      if (generation === prewarmGeneration && error?.code !== "cancelled") {
        workerStats.ready = false;
        workerStats.workerStatus = error?.code === "unsupported" ? "unsupported" : "failed";
        workerStats.prewarmStatus = workerStats.workerStatus;
        workerStats.timings.prewarmTotalMs = now() - startedAt;
        post(error?.code === "unsupported" ? "worker-unsupported" : "prewarm-error", {
          stats: workerStats, error: normalizeError(error), failures: candidateFailures,
        });
      }
      throw error;
    })
    .finally(() => {
      if (prewarmPromise === promise) prewarmPromise = null;
    });
  prewarmPromise = promise;
  return promise;
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
    const second = ranked.find((candidate) => pokemonIconIdentity(candidate) !== pokemonIconIdentity(best));
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
      showdownId: matched ? best.showdownId || "" : "",
      bestShowdownId: best?.showdownId || "",
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
        showdownId: candidate.showdownId || "",
        speciesKey: candidate.speciesKey,
        id: candidate.id,
        source: candidate.source,
        score: candidate.score,
      })),
      refinedTopCandidates: ranked.slice(0, 12).map((candidate) => ({
        pokemonName: candidate.pokemonName,
        showdownId: candidate.showdownId || "",
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
        mode: message.mode || "new",
        reason: error.code,
        error: normalizeError(error),
      });
      return;
    }
    post("recognition-error", {
      requestId,
      mode: message.mode || "new",
      error: normalizeError(error),
      stats: workerStats,
    });
  } finally {
    requestGate.complete(requestId);
  }
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "asset-response") {
    const pending = pendingAssets.get(message.assetRequestId);
    if (!pending) return;
    pendingAssets.delete(message.assetRequestId);
    if (pending.generation !== prewarmGeneration) pending.reject(Object.assign(new Error("prewarm cancelled"), { code: "cancelled" }));
    else if (message.ok && message.buffer instanceof ArrayBuffer) pending.resolve(new Blob([message.buffer]));
    else pending.reject(new Error(message.error || "Asset fetch failed"));
    return;
  }
  if (message.type === "init") {
    const initStartedAt = now();
    cancelPendingAssets();
    requestGate.reset();
    prewarmPromise = null;
    successfulCandidates.clear();
    remoteAssets = message.remoteAssets === true;
    manifest = message.manifest ? {
      ...message.manifest,
      icons: (message.manifest.icons || []).map((entry) => ({ ...entry, pokemonName: entry.pokemonName || entry.name || entry.canonicalName || entry.showdownId || "" })),
    } : null;
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

  if (message.type === "prewarm" || message.type === "retry-prewarm") {
    void ensurePrewarmed({ retry: message.type === "retry-prewarm" }).catch(() => {});
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
