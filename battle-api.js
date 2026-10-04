// All remote image/statistics reads use this one in-memory transport. HTTP cache
// policy belongs to the provider; no raw data is written to application storage.
export const BATTLE_API_ORIGIN = "https://championsbattledata.com";
const IMAGE_PREFIX = "/pokemon_champions_assets/pokemon/";
const CATEGORIES = new Set(["move", "ability", "held_item", "stat_alignment"]);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const objectLike = (value) => value && typeof value === "object" && !Array.isArray(value);
export const toBattleId = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/gu, "");

export class BattleApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BattleApiError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function normalizeBattleRule(rule) {
  const value = String(rule || "").toLowerCase();
  if (value === "singles" || value === "シングル") return "Singles";
  if (value === "doubles" || value === "ダブル") return "Doubles";
  throw new BattleApiError("invalid-rule", "シングルまたはダブルを指定してください。");
}

export function validateBattleAssetUrl(value) {
  let url;
  let decoded;
  try {
    url = new URL(value, `${BATTLE_API_ORIGIN}/`);
    decoded = decodeURIComponent(url.pathname);
  } catch {
    throw new BattleApiError("invalid-asset", "比較画像のURLが不正です。");
  }
  if (url.origin !== BATTLE_API_ORIGIN || url.username || url.password || url.search || url.hash
    || !decoded.startsWith(IMAGE_PREFIX) || !decoded.endsWith(".png")
    || decoded.slice(IMAGE_PREFIX.length).includes("/") || /[\\\u0000-\u001f]/u.test(decoded)) {
    throw new BattleApiError("invalid-asset", "許可されていない比較画像のURLです。");
  }
  return url.href;
}

function invalid(message) {
  throw new BattleApiError("invalid-data", message);
}

/** Retain only identity, image locations and explicit current-statistics links. */
export function parseBattleIndex(raw, { catalog } = {}) {
  if (!objectLike(raw) || !Array.isArray(raw.pokemon) || raw.pokemon.length === 0
    || typeof raw.dataVersion !== "string" || !raw.dataVersion) {
    invalid("比較候補の一覧形式が不正です。");
  }
  const localById = new Map((catalog?.pokemon || []).map((entry) => [entry.id, entry]));
  const currentById = new Map();
  const explicit = new Map();
  const forms = new Map();
  const unsupported = [];
  const link = (id, canonicalName, battleName) => {
    if (!id || typeof battleName !== "string" || !battleName.trim()) return;
    const statsId = toBattleId(battleName);
    if (!statsId) invalid("統計の識別子が不正です。");
    const prior = explicit.get(id);
    if (prior && prior.statsId !== statsId) invalid(`統計の対応先が重複しています: ${id}`);
    explicit.set(id, { statsId, canonicalName, statsName: battleName, shared: id !== statsId });
  };
  for (const record of raw.pokemon) {
    if (!objectLike(record)) invalid("比較候補のレコードが不正です。");
    if ((record.battleDataCsvs != null && !Array.isArray(record.battleDataCsvs))
      || (record.summary?.forms != null && !Array.isArray(record.summary.forms))) invalid("比較候補の配列形式が不正です。");
    const recordId = toBattleId(record.showdownId);
    const battleId = toBattleId(record.battleName);
    if (recordId && battleId) link(recordId, record.showdownName || record.name, record.battleName);
    if (battleId) {
      const available = currentById.get(battleId) || { Singles: false, Doubles: false };
      for (const source of record.battleDataCsvs || []) {
        if (source?.season === "Current" && source.daily !== true && ["Singles", "Doubles"].includes(source.format)) {
          available[source.format] = true;
        }
      }
      currentById.set(battleId, available);
    }
    const records = [record.summary?.primary, ...(record.summary?.forms || [])].filter(Boolean);
    for (const form of records) {
      if (typeof form.showdown_name !== "string" || !form.showdown_name.trim()) {
        unsupported.push({ code: "missing-showdown-name", savedName: String(form.saved_name || "") });
        continue;
      }
      const id = toBattleId(form.showdown_name);
      if (!id) invalid("比較画像の識別子が不正です。");
      if (typeof form.image_path !== "string" || !form.image_path) {
        unsupported.push({ code: "missing-image", id, canonicalName: form.showdown_name });
        continue;
      }
      const imagePath = validateBattleAssetUrl(form.image_path);
      const prior = forms.get(id);
      if (prior && prior.path !== imagePath) invalid(`比較画像の対応先が重複しています: ${id}`);
      forms.set(id, { id, canonicalName: form.showdown_name, path: imagePath });
    }
  }
  if (raw.pokemonPages != null && !Array.isArray(raw.pokemonPages)) invalid("統計の対応一覧が不正です。");
  for (const page of raw.pokemonPages || []) {
    if (typeof page?.name === "string" && typeof page.battleName === "string") {
      link(toBattleId(page.name), page.name, page.battleName);
    }
  }
  const statsById = {};
  for (const [id, value] of explicit) {
    Object.defineProperty(statsById, id, { value: {
      ...value,
      availableCurrent: { ...(currentById.get(value.statsId) || { Singles: false, Doubles: false }) },
    }, enumerable: true });
  }
  const icons = [...forms.values()].map((form) => {
    const local = localById.get(form.id);
    const supported = Boolean(local && local.isFinalEvolution !== null && local.legendClass !== "unknown");
    if (!supported) unsupported.push({ code: "unknown-showdown-id", id: form.id, canonicalName: form.canonicalName });
    const name = local?.name || form.canonicalName;
    return {
      ...form,
      showdownId: form.id,
      name,
      pokemonName: name,
      translationStatus: local?.translationStatus || "unsupported",
      speciesKey: local?.speciesKey || "",
      variantKey: `variant:${form.id}`,
      isMega: local?.isMega ?? false,
      isFinalEvolution: local?.isFinalEvolution ?? null,
      legendClass: local?.legendClass || "unknown",
      source: "champions-battle-data",
      supported,
      isRecognitionCandidate: supported && !local.isMega,
      statsId: own(statsById, form.id) ? statsById[form.id].statsId : null,
    };
  }).sort((a, b) => a.id.localeCompare(b.id, "en"));
  if (icons.length === 0) invalid("比較画像が一覧にありません。");
  return {
    dataVersion: raw.dataVersion,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : null,
    icons,
    statsById,
    unsupported,
  };
}

export function parseBattleStats(raw, { statsId, rule, fetchedAt = new Date().toISOString() } = {}) {
  rule = normalizeBattleRule(rule);
  if (!/^[a-z0-9]+$/u.test(statsId || "")) throw new BattleApiError("invalid-id", "統計のIDが不正です。");
  if (!objectLike(raw) || !Array.isArray(raw.rows) || raw.showdownId !== statsId
    || raw.format !== rule || raw.season !== "Current") {
    invalid("統計の形式または対象が一致しません。");
  }
  const keys = new Set();
  const rows = [];
  for (const row of raw.rows) {
    if (!objectLike(row)) invalid("統計の行形式が不正です。");
    if (!CATEGORIES.has(row.category)) continue;
    if (typeof row.name !== "string" || !row.name.trim()
      || !Number.isInteger(row.rank) || row.rank < 1) invalid("統計の名前または順位が不正です。");
    const key = `${row.category}:${row.rank}`;
    if (keys.has(key)) invalid("統計の順位が重複しています。");
    keys.add(key);
    let value = row.percentage_value;
    if (value === undefined && typeof row.percentage === "string" && /^\d+(?:\.\d+)?%$/u.test(row.percentage.trim())) {
      value = Number(row.percentage.trim().slice(0, -1));
    }
    if (value === undefined || value === null || value === "") value = null;
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) {
      invalid("統計の使用率が不正です。");
    }
    rows.push({
      category: row.category,
      rank: row.rank,
      canonicalName: row.name,
      percentage: value === null ? null : `${value.toFixed(1)}%`,
      value,
    });
  }
  return {
    status: rows.length ? "ready" : "absent",
    statsId,
    rule,
    fetchedAt,
    date: typeof raw.date === "string" ? raw.date : null,
    source: typeof raw.source === "string" ? raw.source : null,
    rows,
  };
}

/** A single queue covers the index, all PNGs, and statistics for this page. */
export function createBattleApi({
  catalog,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  concurrency = 4,
  timeoutMs = 15000,
  retryDelayMs = 500,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof fetchImpl !== "function") throw new BattleApiError("unavailable", "この環境では通信できません。");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("Invalid battle API transport limits");
  }
  const pending = new Map();
  const queue = [];
  let active = 0;
  let index = null;
  let indexPromise = null;
  let indexState = "idle";
  let lastError = null;
  const pump = () => {
    while (active < concurrency && queue.length) {
      const { run, resolve, reject } = queue.shift();
      active += 1;
      Promise.resolve().then(run).then(resolve, reject).finally(() => { active -= 1; pump(); });
    }
  };
  const queued = (run) => new Promise((resolve, reject) => { queue.push({ run, resolve, reject }); pump(); });
  const attempt = (url, type) => queued(async () => {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new BattleApiError("timeout", "通信が時間内に完了しませんでした。", { transient: true }));
      }, timeoutMs);
    });
    try {
      return await Promise.race([timeout, (async () => {
        const response = await fetchImpl(url, { signal: controller.signal, credentials: "omit", cache: "default", mode: "cors", redirect: "error" });
        if (!response.ok) {
          const retryAfter = response.headers?.get?.("retry-after");
          const retryAfterMs = retryAfter && /^\d+(?:\.\d+)?$/u.test(retryAfter)
            ? Number(retryAfter) * 1000
            : retryAfter ? Math.max(0, Date.parse(retryAfter) - Date.parse(now())) : null;
          throw new BattleApiError(response.status === 404 ? "not-found" : response.status === 429 ? "rate-limited" : "http-error", "提供元からデータを取得できませんでした。", {
            httpStatus: response.status,
            transient: response.status === 408 || response.status === 429 || response.status >= 500,
            retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : null,
          });
        }
        if (type === "asset") {
          const bytes = await response.arrayBuffer();
          const png = new Uint8Array(bytes);
          if (png.length < 8 || [137, 80, 78, 71, 13, 10, 26, 10].some((value, i) => png[i] !== value)) {
            throw new BattleApiError("invalid-asset", "比較画像がPNGではありません。");
          }
          return bytes;
        }
        try { return await response.json(); }
        catch (error) {
          if (controller.signal.aborted) throw new BattleApiError("timeout", "通信が時間内に完了しませんでした。", { transient: true });
          if (error instanceof SyntaxError) throw new BattleApiError("invalid-data", "取得データがJSONではありません。");
          throw error;
        }
      })()]);
    } catch (error) {
      if (error instanceof BattleApiError) throw error;
      throw new BattleApiError(controller.signal.aborted ? "timeout" : "network", "提供元との通信に失敗しました。", { transient: true });
    } finally {
      clearTimeout(timer);
    }
  });
  const request = (url, type) => {
    const key = `${type}:${url}`;
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      for (let number = 0; ; number += 1) {
        try { return await attempt(url, type); }
        catch (error) {
          if (number >= 1 || !error.transient || error.retryAfterMs > timeoutMs) throw error;
          await new Promise((resolve) => setTimeout(resolve, error.retryAfterMs ?? retryDelayMs));
        }
      }
    })().finally(() => { pending.delete(key); });
    pending.set(key, task);
    return task;
  };
  const loadIndex = () => {
    if (index) return Promise.resolve(index);
    if (indexPromise) return indexPromise;
    indexState = "loading";
    lastError = null;
    indexPromise = request(`${BATTLE_API_ORIGIN}/api/index`, "json")
      .then((raw) => { index = parseBattleIndex(raw, { catalog }); indexState = "ready"; return index; })
      .catch((error) => { indexState = "error"; lastError = error.code || "invalid-data"; throw error; })
      .finally(() => { indexPromise = null; });
    return indexPromise;
  };
  return {
    loadIndex,
    retryIndex() {
      if (indexPromise) return indexPromise;
      index = null;
      return loadIndex();
    },
    async getStats(statsId, rule) {
      rule = normalizeBattleRule(rule);
      if (!/^[a-z0-9]+$/u.test(statsId || "")) throw new BattleApiError("invalid-id", "統計のIDが不正です。");
      try {
        const raw = await request(`${BATTLE_API_ORIGIN}/api/battle/${rule}/${statsId}`, "json");
        return parseBattleStats(raw, { statsId, rule, fetchedAt: now() });
      } catch (error) {
        if (error.code !== "not-found") throw error;
        return { status: "absent", statsId, rule, fetchedAt: now(), date: null, source: null, rows: [] };
      }
    },
    async fetchAsset(url) {
      const bytes = await request(validateBattleAssetUrl(url), "asset");
      // Each broker reply may transfer ownership to a Worker. Deduplicated
      // consumers must receive independent buffers, never a detached buffer.
      return bytes.slice(0);
    },
    get status() { return { index: indexState, active, queued: queue.length, lastError }; },
  };
}
