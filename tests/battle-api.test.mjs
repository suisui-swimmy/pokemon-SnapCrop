import test from "node:test";
import assert from "node:assert/strict";
import {
  BATTLE_API_ORIGIN, BattleApiError, createBattleApi, parseBattleIndex,
  parseBattleStats, validateBattleAssetUrl,
} from "../battle-api.js";

const png = () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
const imageUrl = (name = "Kingambit") => `${BATTLE_API_ORIGIN}/pokemon_champions_assets/pokemon/${name}.png`;
const catalog = { pokemon: [
  { id: "aegislash", canonicalName: "Aegislash", name: "ギルガルド シールドフォルム", translationStatus: "localized", speciesKey: "species:aegislash", isMega: false, isFinalEvolution: true, legendClass: "normal" },
  { id: "aegislashblade", canonicalName: "Aegislash-Blade", name: "ギルガルド ブレードフォルム", translationStatus: "localized", speciesKey: "species:aegislash", isMega: false, isFinalEvolution: true, legendClass: "normal" },
  { id: "absolmega", canonicalName: "Absol-Mega", name: "メガアブソル", translationStatus: "localized", speciesKey: "species:absol", isMega: true, isFinalEvolution: true, legendClass: "normal" },
] };
function indexFixture() {
  return {
    dataVersion: "one", generatedAt: "2026-10-04T00:00:00Z",
    pokemon: [{
      showdownId: "aegislash", showdownName: "Aegislash", battleName: "Aegislash",
      battleDataCsvs: [{ season: "Current", format: "Doubles", path: "unused.csv" }, { season: "M6", format: "Singles", daily: true }],
      summary: {
        forms: ["Aegislash", "Aegislash-Blade", "Absol-Mega", "New-Unknown"].map((name) => ({ showdown_name: name, image_path: `pokemon_champions_assets/pokemon/${name}.png` })),
        battleSummary: { unused: "Never copy raw statistics into the reduced index" },
      },
    }],
    pokemonPages: [{ name: "Aegislash-Blade", battleName: "Aegislash" }],
  };
}
function statsFixture(id = "kingambit", rule = "Doubles") {
  return {
    showdownId: id, format: rule, season: "Current", date: null, source: "live.csv",
    rows: [
      { category: "move", rank: 1, name: "Kowtow Cleave", percentage: "97.4%", percentage_value: 97.4 },
      { category: "ability", rank: 1, name: "Defiant", percentage_value: 0 },
      { category: "stat_alignment", rank: 1, name: "Adamant", percentage_value: null },
      { category: "held_item", rank: 1, name: "Chople Berry", percentage: "41.7%" },
      { category: "teammate", rank: 1, name: "Pikachu", percentage_value: null },
    ],
  };
}
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test("index preserves form identity, explicit shared stats, mega exclusion and unknown diagnostics", () => {
  const parsed = parseBattleIndex(indexFixture(), { catalog });
  assert.equal(parsed.icons.length, 4);
  assert.equal(parsed.icons.find((entry) => entry.id === "aegislashblade").pokemonName, "ギルガルド ブレードフォルム");
  assert.equal(parsed.icons.find((entry) => entry.id === "absolmega").isRecognitionCandidate, false);
  assert.equal(parsed.icons.find((entry) => entry.id === "newunknown").supported, false);
  assert.deepEqual(parsed.statsById.aegislashblade, {
    statsId: "aegislash", canonicalName: "Aegislash-Blade", statsName: "Aegislash", shared: true,
    availableCurrent: { Singles: false, Doubles: true },
  });
  assert.equal(parsed.statsById.absolmega, undefined, "never strip a suffix to invent statistics linkage");
  assert.equal(JSON.stringify(parsed).includes("Never copy raw statistics"), false);
  assert.deepEqual(parsed.unsupported, [{ code: "unknown-showdown-id", id: "newunknown", canonicalName: "New-Unknown" }]);
});

test("index allows known provider pre-evolutions and keeps uncertain labels in English", () => {
  const input = indexFixture();
  const local = structuredClone(catalog);
  local.pokemon[0].isFinalEvolution = false;
  local.pokemon[0].name = "Aegislash";
  local.pokemon[0].translationStatus = "needs-confirmation";
  const parsed = parseBattleIndex(input, { catalog: local });
  assert.equal(parsed.icons.find((entry) => entry.id === "aegislash").isRecognitionCandidate, true);
  assert.equal(parsed.icons.find((entry) => entry.id === "aegislash").pokemonName, "Aegislash");
});

test("invalid source URLs, conflicting mappings and malformed index are rejected", () => {
  for (const path of ["https://other.test/pokemon_champions_assets/pokemon/A.png", "//other.test/A.png", "/pokemon_champions_assets/pokemon/../../A.png", "/pokemon_champions_assets/pokemon/A.png?keep=forever", "/pokemon_champions_assets/pokemon/A%2fB.png", "/pokemon_champions_assets/pokemon/A.webp"]) {
    assert.throws(() => validateBattleAssetUrl(path), { code: "invalid-asset" });
  }
  assert.equal(validateBattleAssetUrl("pokemon_champions_assets/pokemon/Paldean Tauros.png"), imageUrl("Paldean%20Tauros"));
  assert.throws(() => parseBattleIndex({ pokemon: [] }, { catalog }), { code: "invalid-data" });
  const bad = indexFixture();
  bad.pokemonPages.push({ name: "Aegislash", battleName: "Pikachu" });
  assert.throws(() => parseBattleIndex(bad, { catalog }), { code: "invalid-data" });
  const duplicate = indexFixture();
  duplicate.pokemon[0].summary.forms.push({ showdown_name: "Aegislash", image_path: "pokemon_champions_assets/pokemon/Other.png" });
  assert.throws(() => parseBattleIndex(duplicate, { catalog }), { code: "invalid-data" });
  const malformed = indexFixture();
  malformed.pokemon[0].summary.forms = {};
  assert.throws(() => parseBattleIndex(malformed, { catalog }), { code: "invalid-data" });
});

test("statistics retain raw category identity and distinguish null from zero", () => {
  const parsed = parseBattleStats(statsFixture(), { statsId: "kingambit", rule: "ダブル", fetchedAt: "now" });
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.rows.length, 4);
  assert.equal(parsed.rows[0].value, 97.4);
  assert.equal(parsed.rows[1].value, 0);
  assert.equal(parsed.rows[1].percentage, "0.0%");
  assert.equal(parsed.rows[2].value, null);
  assert.equal(parsed.rows[2].category, "stat_alignment");
  assert.equal(parsed.rows[3].value, 41.7);
  assert.equal(parsed.fetchedAt, "now");
  assert.equal(parsed.date, null, "do not present fetched time as provider data date");
});

test("wrong species/rule/season, duplicate ranks and invalid percentages are errors", () => {
  const options = { statsId: "kingambit", rule: "Doubles" };
  for (const change of [{ showdownId: "pikachu" }, { format: "Singles" }, { season: "M6" }, { rows: null }]) {
    assert.throws(() => parseBattleStats({ ...statsFixture(), ...change }, options), { code: "invalid-data" });
  }
  for (const value of [-1, 101, NaN, "97.4"]) {
    const bad = statsFixture(); bad.rows[0].percentage_value = value;
    assert.throws(() => parseBattleStats(bad, options), { code: "invalid-data" });
  }
  const duplicate = statsFixture(); duplicate.rows.push(duplicate.rows[0]);
  assert.throws(() => parseBattleStats(duplicate, options), { code: "invalid-data" });
  assert.equal(parseBattleStats({ ...statsFixture(), rows: [] }, options).status, "absent");
});

test("one queue caps all index, asset and statistics requests at four including body reads", async () => {
  let active = 0; let maximum = 0; const calls = [];
  const api = createBattleApi({ catalog, fetchImpl: async (url, options) => {
    calls.push({ url, options }); active += 1; maximum = Math.max(maximum, active);
    const body = async (value) => { await new Promise((resolve) => setTimeout(resolve, 5)); active -= 1; return value; };
    return { ok: true, json: () => body(url.endsWith("/api/index") ? indexFixture() : statsFixture(url.split("/").at(-1))), arrayBuffer: () => body(png()) };
  } });
  await Promise.all([api.loadIndex(), ...Array.from({ length: 6 }, (_, i) => api.fetchAsset(imageUrl(`Image${i}`))), ...Array.from({ length: 6 }, (_, i) => api.getStats(`mon${i}`, "Doubles"))]);
  assert.equal(maximum, 4);
  assert.equal(calls.length, 13);
  assert.ok(calls.every(({ options }) => options.credentials === "omit" && options.cache === "default" && options.mode === "cors"));
});

test("index is reduced in memory, retryIndex reloads, stats are fetched for every new action", async () => {
  const calls = [];
  const api = createBattleApi({ catalog, fetchImpl: async (url) => {
    calls.push(url); return jsonResponse(url.endsWith("/api/index") ? indexFixture() : statsFixture());
  } });
  const [a, b] = await Promise.all([api.loadIndex(), api.loadIndex()]);
  assert.equal(a, b);
  await api.loadIndex();
  assert.equal(calls.length, 1);
  await api.retryIndex();
  assert.equal(calls.length, 2);
  await Promise.all([api.getStats("kingambit", "Doubles"), api.getStats("kingambit", "Doubles")]);
  assert.equal(calls.length, 3);
  await api.getStats("kingambit", "Doubles");
  assert.equal(calls.length, 4, "no permanent parsed/raw stats cache");
});

test("deduplicated asset consumers receive separate transferable buffers", async () => {
  let calls = 0;
  const api = createBattleApi({ fetchImpl: async () => { calls += 1; return new Response(png()); } });
  const [first, second] = await Promise.all([api.fetchAsset(imageUrl()), api.fetchAsset(imageUrl())]);
  assert.equal(calls, 1);
  assert.notEqual(first, second);
  structuredClone(first, { transfer: [first] });
  assert.equal(first.byteLength, 0);
  assert.equal(second.byteLength, 8);
});

test("404 means missing statistics, while invalid JSON/PNG and 403 are failures without retry", async () => {
  let calls = 0;
  const missing = createBattleApi({ fetchImpl: async () => { calls += 1; return new Response("missing", { status: 404 }); } });
  assert.equal((await missing.getStats("kingambit", "Singles")).status, "absent");
  await assert.rejects(missing.fetchAsset(imageUrl()), { code: "not-found" });
  assert.equal(calls, 2);
  for (const [response, code] of [[new Response("broken"), "invalid-data"], [new Response("forbidden", { status: 403 }), "http-error"]]) {
    let count = 0;
    const api = createBattleApi({ retryDelayMs: 0, fetchImpl: async () => { count += 1; return response; } });
    await assert.rejects(api.getStats("kingambit", "Doubles"), { code });
    assert.equal(count, 1);
  }
  const badPng = createBattleApi({ fetchImpl: async () => new Response("not a PNG") });
  await assert.rejects(badPng.fetchAsset(imageUrl()), { code: "invalid-asset" });
});

test("transient failures retry once, Retry-After prevents immediate repeated requests", async () => {
  let calls = 0;
  const api = createBattleApi({ retryDelayMs: 0, fetchImpl: async () => ++calls === 1 ? new Response("try later", { status: 503 }) : jsonResponse(statsFixture()) });
  assert.equal((await api.getStats("kingambit", "Doubles")).status, "ready");
  assert.equal(calls, 2);
  calls = 0;
  const rate = createBattleApi({ retryDelayMs: 0, fetchImpl: async () => { calls += 1; return new Response("wait", { status: 429, headers: { "Retry-After": "60" } }); } });
  await assert.rejects(rate.getStats("kingambit", "Doubles"), { code: "rate-limited", retryAfterMs: 60000 });
  assert.equal(calls, 1);
});

test("timeout covers stalled response bodies and aborts each of at most two attempts", async () => {
  const signals = [];
  const api = createBattleApi({ timeoutMs: 10, retryDelayMs: 0, fetchImpl: async (_url, { signal }) => {
    signals.push(signal); return { ok: true, json: () => new Promise(() => {}) };
  } });
  await assert.rejects(api.getStats("kingambit", "Doubles"), { code: "timeout" });
  assert.equal(signals.length, 2);
  assert.ok(signals.every((signal) => signal.aborted));
});

test("invalid inputs cannot send remote requests and parser errors are typed", async () => {
  const api = createBattleApi({ fetchImpl: async () => assert.fail("unexpected network request") });
  await assert.rejects(api.getStats("../secret", "Doubles"), { code: "invalid-id" });
  await assert.rejects(api.getStats("kingambit", "Triples"), { code: "invalid-rule" });
  await assert.rejects(api.fetchAsset("https://other.test/A.png"), { code: "invalid-asset" });
  assert.throws(() => parseBattleIndex(null), BattleApiError);
});
