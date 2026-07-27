const elements = {
  files: document.getElementById("bundle-files"),
  coarseLimit: document.getElementById("coarse-limit"),
  templatesPerName: document.getElementById("templates-per-name"),
  scoreMin: document.getElementById("score-min"),
  marginMin: document.getElementById("margin-min"),
  addSynthetic: document.getElementById("add-synthetic"),
  runCurrent: document.getElementById("run-current"),
  runBoth: document.getElementById("run-both"),
  saveLabeled: document.getElementById("save-labeled"),
  status: document.getElementById("status"),
  candidateStatus: document.getElementById("candidate-status"),
  metrics: document.getElementById("metrics"),
  bundles: document.getElementById("bundles"),
};

const state = {
  worker: null,
  workerReady: false,
  prewarmReady: false,
  requestSequence: 0,
  pending: new Map(),
  bundles: [],
  manifest: null,
  candidateStats: null,
  candidateFailures: [],
  visualCollisions: [],
  longTasks: [],
  manifestFetchMs: 0,
};

initialize();

async function initialize() {
  bindEvents();
  observeLongTasks();
  try {
    const manifestStartedAt = performance.now();
    const response = await fetch("../data/pokemon-icon-reference.json");
    if (!response.ok) {
      throw new Error(`manifest HTTP ${response.status}`);
    }
    const manifest = await response.json();
    state.manifestFetchMs = performance.now() - manifestStartedAt;
    state.manifest = manifest;
    const worker = new Worker(new URL("../pokemon-icon-worker.js", window.location.href), {
      type: "module",
      name: "pokemon-icon-benchmark",
    });
    state.worker = worker;
    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", (event) => {
      setStatus(`Worker error: ${event.message}`, true);
      rejectAllPending(new Error(event.message));
    });
    worker.postMessage({
      type: "init",
      manifest,
      prewarm: true,
    });
    setStatus(`manifest ${manifest.stats?.canonicalCandidateCount || manifest.icons.length}件をprewarmしています…`);
  } catch (error) {
    setStatus(`初期化に失敗しました: ${error.message}`, true);
  }
}

function bindEvents() {
  elements.files.addEventListener("change", handleBundleFiles);
  elements.addSynthetic.addEventListener("click", () => {
    void addSyntheticBundle();
  });
  elements.runCurrent.addEventListener("click", () => {
    void runBenchmarks(["new"]);
  });
  elements.runBoth.addEventListener("click", () => {
    void runBenchmarks(["new", "legacy"]);
  });
  elements.saveLabeled.addEventListener("click", saveLabeledBundles);
}

function observeLongTasks() {
  if (typeof PerformanceObserver !== "function") {
    return;
  }
  try {
    const observer = new PerformanceObserver((list) => {
      state.longTasks.push(...list.getEntries().map((entry) => ({
        startTime: entry.startTime,
        duration: entry.duration,
      })));
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // Long Task API is optional.
  }
}

function handleWorkerMessage(event) {
  const message = event.data || {};
  if (message.stats) {
    state.candidateStats = message.stats;
  }
  if (Array.isArray(message.failures)) {
    state.candidateFailures = message.failures;
  }
  if (Array.isArray(message.visualCollisions)) {
    state.visualCollisions = message.visualCollisions;
  }
  if (message.type === "worker-ready") {
    state.workerReady = true;
    renderCandidateStatus();
    return;
  }
  if (message.type === "prewarm-progress") {
    setStatus(
      `prewarm中: attempted=${message.stats?.attemptedCount || 0} loaded=${message.stats?.loadedBeforeDedupe || 0} failure=${message.stats?.loadFailureCount || 0}`,
    );
    renderCandidateStatus();
    return;
  }
  if (message.type === "prewarm-complete") {
    state.prewarmReady = true;
    setStatus(`Worker ready: ${message.stats?.loadedCount || 0} candidates`);
    syncControls();
    renderCandidateStatus();
    return;
  }
  if (["worker-unsupported", "prewarm-error"].includes(message.type)) {
    setStatus(`Workerを準備できませんでした: ${message.error || message.type}`, true);
    renderCandidateStatus();
    return;
  }
  if (message.type === "recognition-result") {
    const key = `${message.requestId}:${message.mode || "new"}`;
    const pending = state.pending.get(key);
    if (pending) {
      state.pending.delete(key);
      pending.resolve(message);
    }
    return;
  }
  if (["recognition-error", "recognition-cancelled"].includes(message.type)) {
    const key = `${message.requestId}:${message.mode || "new"}`;
    const pending = state.pending.get(key);
    if (pending) {
      state.pending.delete(key);
      pending.reject(new Error(message.error || message.reason || message.type));
    }
  }
}

function rejectAllPending(error) {
  state.pending.forEach((pending) => pending.reject(error));
  state.pending.clear();
}

async function handleBundleFiles(event) {
  const files = [...(event.target.files || [])];
  const loaded = [];
  for (const file of files) {
    try {
      const bundle = JSON.parse(await file.text());
      validateBundle(bundle);
      loaded.push({
        fileName: file.name,
        bundle,
        labels: getBundleLabels(bundle),
        runs: {},
      });
    } catch (error) {
      setStatus(`${file.name}: ${error.message}`, true);
      return;
    }
  }
  state.bundles = loaded;
  renderBundles();
  renderMetrics();
  syncControls();
  setStatus(`${loaded.length} bundleを読み込みました。ラベルを確認してbenchmarkを実行できます。`);
}

async function addSyntheticBundle() {
  if (!state.manifest?.icons?.length) {
    return;
  }
  setBusy(true);
  try {
    const selected = [];
    const seenNames = new Set();
    const seenSpecies = new Set();
    for (const icon of state.manifest.icons) {
      if (
        seenNames.has(icon.pokemonName)
        || seenSpecies.has(icon.speciesKey)
        || icon.visualCollisionId
      ) {
        continue;
      }
      selected.push(icon);
      seenNames.add(icon.pokemonName);
      seenSpecies.add(icon.speciesKey);
      if (selected.length === 6) {
        break;
      }
    }
    if (selected.length !== 6) {
      throw new Error("合成fixture用の重複しない6候補を選べませんでした。");
    }
    const slots = await Promise.all(selected.map(async (icon, index) => ({
      index,
      label: icon.pokemonName,
      speciesKey: icon.speciesKey,
      templateId: icon.id,
      dataUrl: await renderSyntheticSlot(icon, index),
    })));
    const bundle = {
      kind: "pokemon-snapcrop-icon-diagnostic",
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      source: "benchmark-synthetic-fixture",
      labels: {
        pokemonNames: selected.map((icon) => icon.pokemonName),
      },
      settings: {
        inputWidth: 114,
        inputHeight: 114,
        note: "Candidate assets composited on a shared noisy background for deterministic browser smoke testing.",
      },
      slots,
    };
    state.bundles.push({
      fileName: `synthetic-${state.bundles.length + 1}.json`,
      bundle,
      labels: getBundleLabels(bundle),
      runs: {},
    });
    renderBundles();
    renderMetrics();
    syncControls();
    setStatus("6枠の合成fixtureを追加しました。current / legacy比較を実行できます。");
  } catch (error) {
    setStatus(`合成fixtureの作成に失敗しました: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
}

async function renderSyntheticSlot(icon, slotIndex) {
  const image = await loadImage(new URL(
    `../${String(icon.path).replace(/^\.\//u, "")}`,
    window.location.href,
  ).href);
  const canvas = document.createElement("canvas");
  canvas.width = 114;
  canvas.height = 114;
  const context = canvas.getContext("2d");
  const background = context.createLinearGradient(0, 0, 114, 114);
  background.addColorStop(0, "#263142");
  background.addColorStop(1, "#121923");
  context.fillStyle = background;
  context.fillRect(0, 0, 114, 114);
  const random = createDeterministicRandom(0x51a7 + slotIndex);
  for (let index = 0; index < 90; index += 1) {
    const value = 20 + Math.floor(random() * 25);
    context.fillStyle = `rgba(${value}, ${value + 5}, ${value + 12}, 0.15)`;
    context.fillRect(Math.floor(random() * 114), Math.floor(random() * 114), 2, 2);
  }
  const scale = 0.78 + ((slotIndex % 3) * 0.02);
  const maxSide = 86 * scale;
  const imageScale = Math.min(maxSide / image.naturalWidth, maxSide / image.naturalHeight);
  const width = image.naturalWidth * imageScale;
  const height = image.naturalHeight * imageScale;
  const offsetX = ((slotIndex % 2) * 2) - 1;
  const offsetY = (((slotIndex + 1) % 3) - 1) * 1.5;
  context.drawImage(
    image,
    ((114 - width) / 2) + offsetX,
    ((114 - height) / 2) + offsetY,
    width,
    height,
  );
  return canvas.toDataURL("image/png");
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`画像を読み込めませんでした: ${url}`));
    image.src = url;
  });
}

function createDeterministicRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function validateBundle(bundle) {
  if (bundle?.kind !== "pokemon-snapcrop-icon-diagnostic") {
    throw new Error("pokemon-SnapCropのicon diagnostic bundleではありません。");
  }
  if (!Array.isArray(bundle.slots) || bundle.slots.length !== 6) {
    throw new Error("6枠のROIがありません。");
  }
  bundle.slots.forEach((slot, index) => {
    if (!slot?.dataUrl) {
      throw new Error(`slot ${index + 1} の画像がありません。`);
    }
  });
}

function getBundleLabels(bundle) {
  const topLevel = bundle.labels?.pokemonNames || [];
  return bundle.slots.map((slot, index) => String(slot.label || topLevel[index] || ""));
}

function renderBundles() {
  elements.bundles.replaceChildren();
  if (!state.bundles.length) {
    elements.bundles.textContent = "bundleはまだありません。";
    return;
  }
  state.bundles.forEach((entry, bundleIndex) => {
    const card = document.createElement("article");
    card.className = "bundle-card";
    const heading = document.createElement("h3");
    heading.textContent = `${entry.fileName} (${entry.bundle.capturedAt || "日時不明"})`;
    card.append(heading);
    const slots = document.createElement("div");
    slots.className = "slots";
    entry.bundle.slots.forEach((slot, slotIndex) => {
      const container = document.createElement("label");
      container.className = "slot";
      container.textContent = `slot ${slotIndex + 1}`;
      const image = document.createElement("img");
      image.src = slot.dataUrl;
      image.alt = `slot ${slotIndex + 1}`;
      const input = document.createElement("input");
      input.value = entry.labels[slotIndex] || "";
      input.placeholder = "正解pokemonName";
      input.dataset.bundleIndex = String(bundleIndex);
      input.dataset.slotIndex = String(slotIndex);
      input.addEventListener("input", () => {
        entry.labels[slotIndex] = input.value.trim();
        renderMetrics();
      });
      const result = document.createElement("small");
      result.textContent = formatSlotRuns(entry, slotIndex);
      container.append(image, input, result);
      slots.append(container);
    });
    card.append(slots);
    elements.bundles.append(card);
  });
}

function formatSlotRuns(entry, slotIndex) {
  const values = [];
  ["new", "legacy"].forEach((mode) => {
    const result = entry.runs[mode]?.message?.result?.results?.[slotIndex];
    if (!result) {
      return;
    }
    values.push(
      `${mode}: ${result.matched ? result.pokemonName : `reject(${result.rejectionReason || "unknown"})`} score=${formatNumber(result.score ?? result.bestScore)} time=${formatMs(result.durationMs)}`,
    );
  });
  return values.join("\n") || "未実行";
}

function getMatcherConfig() {
  return {
    coarseNameLimit: Number(elements.coarseLimit.value) || 24,
    templatesPerName: Number(elements.templatesPerName.value) || 2,
    confidence: {
      scoreMin: Number(elements.scoreMin.value) || 0.74,
      marginMin: Number(elements.marginMin.value) || 0.035,
    },
  };
}

async function runBenchmarks(modes) {
  if (!state.prewarmReady || !state.bundles.length) {
    return;
  }
  setBusy(true);
  state.longTasks = [];
  const runStartedAt = performance.now();
  try {
    for (let bundleIndex = 0; bundleIndex < state.bundles.length; bundleIndex += 1) {
      const entry = state.bundles[bundleIndex];
      const slots = await Promise.all(entry.bundle.slots.map((slot) => dataUrlToSlot(slot.dataUrl)));
      for (const mode of modes) {
        setStatus(`${entry.fileName}: ${mode}実行中…`);
        const message = await requestRecognition(slots, mode, getMatcherConfig());
        entry.runs[mode] = {
          message,
          completedAt: new Date().toISOString(),
        };
      }
    }
    const runEndedAt = performance.now();
    const longTasks = state.longTasks.filter(
      (entry) => entry.startTime >= runStartedAt && entry.startTime <= runEndedAt,
    );
    state.lastMainThreadBlocking = {
      totalMs: longTasks.reduce((total, entry) => total + entry.duration, 0),
      maxMs: longTasks.reduce((maximum, entry) => Math.max(maximum, entry.duration), 0),
      count: longTasks.length,
    };
    setStatus(`${state.bundles.length} bundle × ${modes.length} modeを完了しました。`);
    renderBundles();
    renderMetrics();
  } catch (error) {
    setStatus(`benchmark失敗: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
}

async function dataUrlToSlot(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return {
      width: bitmap.width,
      height: bitmap.height,
      data: imageData.data,
    };
  } finally {
    bitmap.close();
  }
}

function requestRecognition(slotInputs, mode, config) {
  const requestId = state.requestSequence + 1;
  state.requestSequence = requestId;
  const slots = slotInputs.map((slot) => {
    const copy = new Uint8ClampedArray(slot.data);
    return {
      width: slot.width,
      height: slot.height,
      buffer: copy.buffer,
    };
  });
  const transfer = slots.map((slot) => slot.buffer);
  return new Promise((resolve, reject) => {
    state.pending.set(`${requestId}:${mode}`, {
      resolve,
      reject,
    });
    state.worker.postMessage({
      type: "recognize",
      requestId,
      mode,
      config,
      slots,
    }, transfer);
  });
}

function calculateMetrics(mode) {
  const rows = [];
  state.bundles.forEach((entry) => {
    const message = entry.runs[mode]?.message;
    if (!message) {
      return;
    }
    message.result.results.forEach((result, slotIndex) => {
      rows.push({
        bundle: entry.fileName,
        slot: slotIndex + 1,
        label: entry.labels[slotIndex] || "",
        result,
        workerTiming: message.workerTiming,
        totalMs: message.result.timings?.totalMs || 0,
      });
    });
  });
  const labeled = rows.filter((row) => row.label);
  const accepted = labeled.filter((row) => row.result.matched);
  const acceptedCorrect = accepted.filter((row) => row.result.pokemonName === row.label);
  const acceptedWrong = accepted.filter((row) => row.result.pokemonName !== row.label);
  const refinedTop1Correct = labeled.filter(
    (row) => row.result.refinedTopCandidates?.[0]?.pokemonName === row.label,
  ).length;
  const coarseTop1Correct = labeled.filter(
    (row) => row.result.coarseTopCandidates?.[0]?.pokemonName === row.label,
  ).length;
  const recall = (limit) => labeled.filter(
    (row) => row.result.coarseTopCandidates
      ?.slice(0, limit)
      .some((candidate) => candidate.pokemonName === row.label),
  ).length;
  const rejectionReasons = {};
  rows.filter((row) => !row.result.matched).forEach((row) => {
    const reason = row.result.rejectionReason || "unknown";
    rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
  });
  const confusionPairs = {};
  acceptedWrong.forEach((row) => {
    const key = `${row.label} → ${row.result.pokemonName}`;
    confusionPairs[key] = (confusionPairs[key] || 0) + 1;
  });
  const bundleTimes = state.bundles
    .map((entry) => entry.runs[mode]?.message?.result?.timings?.totalMs)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const slotTimes = rows
    .map((row) => row.result.durationMs)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  return {
    mode,
    rows: rows.length,
    labeled: labeled.length,
    rawCandidateCount: state.candidateStats?.rawManifestCount || 0,
    canonicalCandidateCount: state.candidateStats?.canonicalManifestCount || 0,
    loadedCandidateCount: state.candidateStats?.loadedCount || 0,
    duplicateReduction: (
      (state.candidateStats?.buildMergedDuplicateCount || 0)
      + (state.candidateStats?.runtimeNormalizedDuplicateCount || 0)
    ),
    uniquePokemonNameCount: state.candidateStats?.uniquePokemonNameCount || 0,
    uniqueSvOnlyNameCount: state.candidateStats?.svOnlyPokemonNameCount || 0,
    coarseTop1Accuracy: ratio(coarseTop1Correct, labeled.length),
    coarseRecall10: ratio(recall(10), labeled.length),
    coarseRecall24: ratio(recall(24), labeled.length),
    coarseRecall48: ratio(recall(48), labeled.length),
    refinedTop1Accuracy: ratio(refinedTop1Correct, labeled.length),
    acceptedCount: accepted.length,
    acceptedCorrect: acceptedCorrect.length,
    acceptedWrong: acceptedWrong.length,
    acceptedPrecision: ratio(acceptedCorrect.length, accepted.length),
    coverage: ratio(accepted.length, labeled.length),
    rejectedCount: rows.filter((row) => !row.result.matched).length,
    confusionPairs,
    rejectionReasons,
    totalP50: percentile(bundleTimes, 0.50),
    totalP95: percentile(bundleTimes, 0.95),
    slotP50: percentile(slotTimes, 0.50),
    slotP95: percentile(slotTimes, 0.95),
    workerTime: percentile(
      state.bundles
        .map((entry) => entry.runs[mode]?.message?.workerTiming?.totalWorkerMs)
        .filter(Number.isFinite)
        .sort((left, right) => left - right),
      0.50,
    ),
    phaseP50: Object.fromEntries(
      ["foregroundMs", "coarseMs", "globalTransformMs", "refineMs", "assignmentMs"]
        .map((field) => [
          field,
          percentile(
            state.bundles
              .map((entry) => entry.runs[mode]?.message?.result?.timings?.[field])
              .filter(Number.isFinite)
              .sort((left, right) => left - right),
            0.50,
          ),
        ]),
    ),
  };
}

function renderMetrics() {
  const modes = ["new", "legacy"].filter(
    (mode) => state.bundles.some((entry) => entry.runs[mode]),
  );
  if (!modes.length) {
    elements.metrics.textContent = "benchmarkは未実行です。";
    return;
  }
  const table = document.createElement("table");
  const header = document.createElement("tr");
  [
    "mode",
    "labeled",
    "coarse top-1",
    "recall@10",
    "recall@24",
    "recall@48",
    "refined top-1",
    "accepted",
    "correct",
    "wrong",
    "precision",
    "coverage",
    "rejected",
    "total p50 / p95",
    "slot p50 / p95",
    "Worker p50",
  ].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    header.append(th);
  });
  table.append(header);
  modes.map(calculateMetrics).forEach((metrics) => {
    const row = document.createElement("tr");
    [
      metrics.mode,
      metrics.labeled,
      percent(metrics.coarseTop1Accuracy),
      percent(metrics.coarseRecall10),
      percent(metrics.coarseRecall24),
      percent(metrics.coarseRecall48),
      percent(metrics.refinedTop1Accuracy),
      metrics.acceptedCount,
      metrics.acceptedCorrect,
      metrics.acceptedWrong,
      percent(metrics.acceptedPrecision),
      percent(metrics.coverage),
      metrics.rejectedCount,
      `${formatMs(metrics.totalP50)} / ${formatMs(metrics.totalP95)}`,
      `${formatMs(metrics.slotP50)} / ${formatMs(metrics.slotP95)}`,
      formatMs(metrics.workerTime),
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      row.append(td);
    });
    table.append(row);
  });
  const details = document.createElement("pre");
  details.textContent = JSON.stringify({
    candidate: {
      raw: state.candidateStats?.rawManifestCount || 0,
      canonical: state.candidateStats?.canonicalManifestCount || 0,
      loaded: state.candidateStats?.loadedCount || 0,
      buildDuplicates: state.candidateStats?.buildMergedDuplicateCount || 0,
      runtimeDuplicates: state.candidateStats?.runtimeNormalizedDuplicateCount || 0,
      collisions: state.candidateStats?.runtimeVisualCollisionGroupCount || 0,
      loadFailures: state.candidateFailures.length,
      champions: state.candidateStats?.championsRawCount || 0,
      sv: state.candidateStats?.svRawCount || 0,
      svOnlyNames: state.candidateStats?.svOnlyPokemonNameCount || 0,
    },
    manifestFetchMs: state.manifestFetchMs,
    mainThreadBlocking: state.lastMainThreadBlocking || null,
    modes: modes.map(calculateMetrics).map((metrics) => ({
      mode: metrics.mode,
      rejectionReasons: metrics.rejectionReasons,
      confusionPairs: metrics.confusionPairs,
      phaseP50: metrics.phaseP50,
    })),
    legacyRecordedBaseline: {
      totalMs: "7200-8200",
      slotMs: "1100-1600",
      source: "PROGRESS.md historical debug logs",
    },
  }, null, 2);
  elements.metrics.replaceChildren(table, details);
}

function renderCandidateStatus() {
  if (!state.candidateStats) {
    elements.candidateStatus.textContent = "Workerからcandidate状態を待っています。";
    return;
  }
  const stats = state.candidateStats;
  const table = document.createElement("table");
  const values = [
    ["raw", stats.rawManifestCount],
    ["canonical", stats.canonicalManifestCount],
    ["loaded", stats.loadedCount],
    ["load coverage", percent(ratio(stats.loadedCount, stats.canonicalManifestCount))],
    ["build duplicate", stats.buildMergedDuplicateCount],
    ["runtime normalized duplicate", stats.runtimeNormalizedDuplicateCount],
    ["visual collision groups", stats.runtimeVisualCollisionGroupCount],
    ["load failures", stats.loadFailureCount],
    ["unique pokemonName", stats.uniquePokemonNameCount],
    ["unique speciesKey", stats.uniqueSpeciesKeyCount],
    ["Champions raw", stats.championsRawCount],
    ["SV raw", stats.svRawCount],
    ["SV-only pokemonName", stats.svOnlyPokemonNameCount],
    ["manifest fetch + parse", formatMs(state.manifestFetchMs)],
    ["candidate fetch (sum)", formatMs(stats.timings?.candidateFetchMs)],
    ["candidate decode (sum)", formatMs(stats.timings?.candidateDecodeMs)],
    ["candidate preprocess", formatMs(stats.timings?.candidatePreprocessMs)],
    ["runtime dedupe", formatMs(stats.timings?.dedupeMs)],
    ["prewarm total", formatMs(stats.timings?.prewarmTotalMs)],
  ];
  values.forEach(([label, value]) => {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = String(value ?? 0);
    row.append(th, td);
    table.append(row);
  });
  elements.candidateStatus.replaceChildren(table);
}

function saveLabeledBundles() {
  state.bundles.forEach((entry) => {
    const bundle = structuredClone(entry.bundle);
    bundle.labels = {
      ...(bundle.labels || {}),
      pokemonNames: [...entry.labels],
    };
    bundle.slots = bundle.slots.map((slot, index) => ({
      ...slot,
      label: entry.labels[index] || "",
    }));
    bundle.benchmark = {
      savedAt: new Date().toISOString(),
      settings: getMatcherConfig(),
      runs: Object.fromEntries(
        Object.entries(entry.runs).map(([mode, run]) => [mode, {
          completedAt: run.completedAt,
          result: run.message.result,
          workerTiming: run.message.workerTiming,
        }]),
      ),
    };
    downloadJson(bundle, entry.fileName.replace(/\.json$/iu, "-labeled.json"));
  });
  setStatus(`${state.bundles.length}件のラベル付きbundleを保存しました。`);
}

function downloadJson(value, fileName) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setBusy(busy) {
  elements.runCurrent.disabled = busy || !state.prewarmReady || !state.bundles.length;
  elements.runBoth.disabled = busy || !state.prewarmReady || !state.bundles.length;
  elements.saveLabeled.disabled = busy || !state.bundles.length;
  elements.addSynthetic.disabled = busy || !state.manifest || !state.prewarmReady;
  elements.files.disabled = busy;
}

function syncControls() {
  setBusy(false);
}

function setStatus(message, error = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", error);
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function percentile(values, quantile) {
  if (!values.length) {
    return 0;
  }
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * quantile) - 1));
  return values[index];
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return Number(value || 0).toFixed(3);
}

function formatMs(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 100 ? numeric.toFixed(0) : numeric.toFixed(1)}ms`;
}
