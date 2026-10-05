import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {
  DEFAULT_STATS_SETTINGS, STATS_STORAGE_KEY, restoreStatsSettings, parseStatsCommand,
  getStatsCommandSuggestions, formatStatisticsRows, createStatisticsPresenter,
} from "../battle-statistics.js";

const catalog = {
  pokemon: [
    { id: "kingambit", canonicalName: "Kingambit", name: "ドドゲザン", translationStatus: "localized" },
    { id: "charizard", canonicalName: "Charizard", name: "リザードン", translationStatus: "localized" },
    { id: "charizardmegax", canonicalName: "Charizard-Mega-X", name: "メガリザードンＸ", translationStatus: "localized" },
  ],
  translations: {
    move: { kowtowcleave: { name: "ドゲザン", status: "localized" } },
    ability: { defiant: { name: "まけんき", status: "localized" }, uncertain: { name: "仮訳", status: "unverified" } },
    nature: { adamant: { name: "いじっぱり", status: "localized" } },
  },
};
const index = { statsById: {
  kingambit: { statsId: "kingambit", shared: false, availableCurrent: { Singles: true, Doubles: true } },
  charizard: { statsId: "charizard", shared: false },
  charizardmegax: { statsId: "charizard", statsName: "Charizard", shared: true },
} };
const row = (category, rank, canonicalName, value) => ({ category, rank, canonicalName, value, percentage: `${value}%` });
const ready = (name = "Kowtow Cleave", value = 97.4) => ({ status: "ready", date: "2026-10-04", fetchedAt: "2026-10-04T00:00:00Z", rows: [row("move", 1, name, value)] });
const settings = (rule = "Doubles") => ({ ...DEFAULT_STATS_SETTINGS, rule, fields: [...DEFAULT_STATS_SETTINGS.fields], top: { ...DEFAULT_STATS_SETTINGS.top } });
const settle = async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.text = ""; this.removed = false; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join("\n"); }
  replaceChildren(...children) { this.children = children; this.text = ""; }
  remove() { this.removed = true; }
}
function harness(options = {}) {
  const h = { settings: settings(), index, indexError: null, calls: [], entries: [], updates: [], diagnostics: [] };
  h.api = { getStats(statsId, rule) { const pending = deferred(); h.calls.push({ statsId, rule, ...pending }); return pending.promise; } };
  h.presenter = createStatisticsPresenter({
    api: h.api, catalog, getSettings: () => h.settings, getIndex: () => h.index, getIndexError: () => h.indexError,
    appendElement: (entry) => h.entries.push(entry), onUpdate: (entry) => h.updates.push(entry),
    onDiagnostic: (entry) => h.diagnostics.push(entry), document: { createElement: (tag) => new Element(tag) }, ...options,
  });
  h.presenter.setCapture("capture-1", "match-1");
  h.select = (formId = "kingambit", order = 1) => h.presenter.setAutomaticSelections([{ refIndex: 0, order, formId }]);
  return h;
}

test("settings restore is safe, validates persisted values and retains hidden-category counts", () => {
  assert.equal(STATS_STORAGE_KEY, "pokemon-snapcrop.stats-settings.v1");
  assert.deepEqual(restoreStatsSettings({ getItem() { throw Error("disabled"); } }), DEFAULT_STATS_SETTINGS);
  assert.deepEqual(restoreStatsSettings({ getItem: () => "{" }), DEFAULT_STATS_SETTINGS);
  const restored = restoreStatsSettings({ getItem: () => JSON.stringify({ rule: "Singles", fields: ["move"], top: { move: 9, ability: 2 }, min: 0.3 }) });
  assert.equal(restored.rule, "Singles"); assert.equal(restored.top.ability, 2); assert.equal(restored.min, 0.3);
  const invalid = restoreStatsSettings({ getItem: () => JSON.stringify({ rule: "Triples", fields: ["bad"], top: { move: 0 }, min: 101 }) });
  assert.deepEqual(invalid, DEFAULT_STATS_SETTINGS);
});

test("commands use 性格, do not mutate input and reject invalid settings atomically", () => {
  const current = settings(); const before = JSON.stringify(current);
  assert.equal(parseStatsCommand("stats rule シングル", current).settings.rule, "Singles");
  assert.deepEqual(parseStatsCommand("stats show 性格 技", current).settings.fields, ["stat_alignment", "move"]);
  assert.equal(parseStatsCommand("stats top 性格 all", current).settings.top.stat_alignment, "all");
  assert.equal(parseStatsCommand("stats top 技 101", current).settings.top.move, 101);
  assert.equal(parseStatsCommand("stats min 0.1", current).settings.min, 0.1);
  assert.equal(parseStatsCommand("stats rule", current).openRulePicker, true);
  assert.equal(parseStatsCommand("stats status", current).status, true);
  assert.equal(parseStatsCommand("ドドゲザン", current).handled, false);
  for (const command of ["stats top 技 0", "stats top 技 9007199254740992", "stats top 技 2.1", "stats min -1", "stats min 101", "stats show 能力補正", "stats rule ダブル extra", "stats rule constructor", "stats show", "stats status extra"]) {
    const result = parseStatsCommand(command, current); assert.ok(result.error, command); assert.equal(result.settings, undefined);
  }
  assert.equal(JSON.stringify(current), before);
});

test("command suggestions retain separate display text and complete command submission", () => {
  assert.deepEqual(getStatsCommandSuggestions("stats rule"), [
    { name: "シングル", command: "stats rule シングル" }, { name: "ダブル", command: "stats rule ダブル" },
  ]);
  assert.deepEqual(getStatsCommandSuggestions("stats rule ダ"), [{ name: "ダブル", command: "stats rule ダブル" }]);
  assert.deepEqual(getStatsCommandSuggestions("ドド"), []);
  assert.deepEqual(getStatsCommandSuggestions("stats top 技 5"), []);
  assert.deepEqual(getStatsCommandSuggestions("stats show 技 性"), [{ name: "性格", command: "stats show 技 性格" }]);
});

test("statistics preserve rank and rates, filter then limit, and use English for uncertain translations", () => {
  const config = settings(); config.top.move = 2; config.min = 1;
  const rows = [row("move", 3, "Third", 60), row("move", 1, "Kowtow Cleave", 97.44), row("move", 2, "Second", 85),
    row("ability", 1, "Defiant", 99.1), row("ability", 2, "Uncertain", 1.1), row("stat_alignment", 1, "Adamant", 0.9)];
  assert.deepEqual(formatStatisticsRows({ rows }, config, catalog), [
    "技 | ドゲザン 97.44% | Second 85%", "特性 | まけんき 99.1% | Uncertain 1.1%", "持ち物 | 掲載なし", "性格 | 条件に合うデータなし",
  ]);
});

test("statistics render reviewed public API names and variant labels while preserving scope status", async () => {
  const generated = JSON.parse(fs.readFileSync(new URL("../data/pokemon-display-catalog.json", import.meta.url), "utf8"));
  const data = { ...ready(), rows: [
    row("move", 1, "Hidden Power Fire", 80), row("move", 2, "Hidden Power Ice", 20),
    row("ability", 1, "As One (Glastrier)", 60), row("ability", 2, "As One (Spectrier)", 40),
    row("held_item", 1, "Golisopite", 55), row("held_item", 2, "Dragoninite", 25), row("held_item", 3, "Absolite Z", 20),
    row("stat_alignment", 1, "Adamant", 82), row("stat_alignment", 2, "Modest", 18),
  ] };
  assert.deepEqual(formatStatisticsRows(data, settings(), generated), [
    "技 | めざめるパワー（ほのお） 80% | めざめるパワー（こおり） 20%",
    "特性 | じんばいったい（ブリザポス） 60% | じんばいったい（レイスポス） 40%",
    "持ち物 | グソクムシャナイト 55% | カイリュナイト 25% | アブソルナイトＺ 20%",
    "性格 | いじっぱり 82% | ひかえめ 18%",
  ]);
  const h = harness({ catalog: generated }); h.select(); await settle();
  h.calls[0].resolve({ ...ready(), rows: [row("move", 1, "Paleo Wave", 50), row("move", 2, "Baddy Bad", 40), row("move", 3, "Future Unknown Move", 10)] });
  await settle();
  assert.match(h.entries[0].textContent, /Paleo Wave 50% \| Baddy Bad 40% \| Future Unknown Move 10%/u);
  assert.deepEqual(h.diagnostics.at(-1).translationIssues, [
    { category: "move", id: "paleowave", status: "out-of-scope" },
    { category: "move", id: "baddybad", status: "unsupported" },
    { category: "move", id: "futureunknownmove", status: "not-found" },
  ]);
});

test("automatic display updates the same block with date and diagnostics but no repeated credit", async () => {
  const h = harness(); h.select(); await settle();
  assert.equal(h.entries.length, 1); assert.match(h.entries[0].textContent, /読み込み中/u);
  h.calls[0].resolve(ready()); await settle();
  assert.match(h.entries[0].textContent, /ドドゲザン［選出1／ダブル／2026-10-04］/u);
  assert.match(h.entries[0].textContent, /技 \| ドゲザン 97.4%/u);
  assert.doesNotMatch(h.entries[0].textContent, /出典:|Pokémon Champions Battle Data/u);
  assert.match(h.entries[0].textContent, /取得日時: 2026-10-04T00:00:00Z/u);
  const diagnostic = h.diagnostics.at(-1);
  assert.equal(diagnostic.state, "ready"); assert.equal(diagnostic.captureId, "capture-1"); assert.equal(diagnostic.matchId, "match-1");
  assert.equal(diagnostic.rows, undefined);
  h.select(); await settle(); assert.equal(h.calls.length, 1); assert.equal(h.entries.length, 1);
});

test("unknown rates remain unknown, precision is preserved and withheld translations are logged", async () => {
  const h = harness(); h.select(); await settle();
  const data = { ...ready(), rows: [row("move", 1, "Kowtow Cleave", 97.432),
    { category: "ability", rank: 1, canonicalName: "Uncertain", value: null, percentage: null }] };
  h.calls[0].resolve(data); await settle();
  assert.match(h.entries[0].textContent, /ドゲザン 97.432%/u);
  assert.match(h.entries[0].textContent, /Uncertain 使用率不明/u);
  assert.doesNotMatch(h.entries[0].textContent, /仮訳/u);
  assert.deepEqual(h.diagnostics.at(-1).translationIssues, [{ category: "ability", id: "uncertain", status: "unverified" }]);
  h.settings.min = 1; h.presenter.settingsChanged();
  assert.doesNotMatch(h.entries[0].textContent, /使用率不明/u);
});

test("display-only settings repaint existing data without requesting statistics again", async () => {
  const h = harness(); h.select(); await settle();
  h.calls[0].resolve({ ...ready(), rows: [row("move", 1, "Kowtow Cleave", 97.4), row("stat_alignment", 1, "Adamant", 82)] }); await settle();
  h.settings.fields = ["stat_alignment"]; h.settings.top.stat_alignment = 1; h.settings.min = 90;
  h.presenter.settingsChanged(); await settle();
  assert.equal(h.calls.length, 1); assert.match(h.entries[0].textContent, /性格 \| 条件に合うデータなし/u);
  assert.doesNotMatch(h.entries[0].textContent, /技 \|/u);
  h.settings.min = 0; h.presenter.settingsChanged(); await settle();
  assert.equal(h.calls.length, 1); assert.match(h.entries[0].textContent, /いじっぱり 82%/u);
});

test("no rule, pending index, failed index and explicitly absent statistics are distinct", async () => {
  const h = harness(); h.settings.rule = null; h.select();
  assert.match(h.entries[0].textContent, /stats rule/u); assert.equal(h.diagnostics.at(-1).state, "rule-unset");
  h.settings.rule = "Singles"; h.index = null; h.presenter.settingsChanged();
  assert.match(h.entries[0].textContent, /一覧を読み込み中/u); assert.equal(h.diagnostics.at(-1).state, "index-wait");
  h.indexError = Error("offline"); h.presenter.retry();
  assert.match(h.entries[0].textContent, /一覧を取得できません/u); assert.equal(h.diagnostics.at(-1).state, "error");
  h.indexError = null; h.index = { statsById: {} }; h.presenter.retry(); await settle();
  assert.match(h.entries[0].textContent, /掲載されていません/u); assert.equal(h.calls.length, 0);
});

test("shared statistics only use explicit provider mapping; availability prevents unnecessary fetch", async () => {
  const h = harness(); h.select("charizardmegax"); await settle();
  assert.equal(h.calls[0].statsId, "charizard"); assert.match(h.entries[0].textContent, /リザードンと共通/u);
  h.calls[0].resolve(ready()); await settle();
  h.index = { statsById: { kingambit: { statsId: "kingambit", availableCurrent: { Doubles: false } } } };
  h.select(); await settle(); assert.equal(h.calls.length, 1); assert.match(h.entries.at(-1).textContent, /掲載されていません/u);
});

test("rule change ignores old automatic response, while manual response keeps query-time rule", async () => {
  const h = harness(); h.select(); h.presenter.addManual("kingambit"); await settle();
  assert.equal(h.calls.length, 1);
  h.settings.rule = "Singles"; h.presenter.settingsChanged(); await settle();
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1].rule, "Singles");
  h.calls[1].resolve(ready("Singles Move", 40)); await settle();
  h.calls[0].resolve(ready("Doubles Move", 90)); await settle();
  assert.match(h.entries[0].textContent, /シングル/u); assert.match(h.entries[0].textContent, /Singles Move/u); assert.doesNotMatch(h.entries[0].textContent, /Doubles Move/u);
  assert.match(h.entries[1].textContent, /ダブル/u); assert.match(h.entries[1].textContent, /Doubles Move/u);
});

test("new capture and pick correction invalidate pending responses without contaminating current output", async () => {
  const h = harness(); h.select(); await settle();
  h.presenter.setCapture("capture-2", "match-2"); h.select("charizard"); await settle();
  h.calls[0].resolve(ready("Old Match", 90)); await settle();
  assert.doesNotMatch(h.entries[0].textContent, /Old Match/u); assert.match(h.entries[0].textContent, /中断/u);
  h.select("kingambit", 2); await settle();
  h.calls[1].resolve(ready("Wrong Pick", 80)); await settle();
  assert.doesNotMatch(h.entries[1].textContent, /Wrong Pick/u);
  h.calls[2].resolve(ready()); await settle();
  assert.equal(h.diagnostics.at(-1).captureId, "capture-2"); assert.equal(h.diagnostics.at(-1).order, 2);
});

test("terminal clear suppresses identical automatic selection and never resurrects delayed/manual output", async () => {
  const h = harness(); h.select(); h.presenter.addManual("kingambit"); await settle();
  h.presenter.clear(); h.select(); h.presenter.retry(); await settle();
  assert.equal(h.entries.length, 2); assert.ok(h.entries.every((entry) => entry.removed));
  h.calls[0].resolve(ready("Late Result", 90)); await settle();
  assert.ok(h.entries.every((entry) => !entry.textContent.includes("Late Result")));
  h.select("charizard"); await settle(); assert.equal(h.entries.length, 3);
  h.presenter.setCapture("capture-2", "match-2"); h.select(); await settle(); assert.equal(h.entries.length, 4);
});

test("prefetch shares pending requests and failures are retryable without duplicate result blocks", async () => {
  const h = harness(); const prefetch = h.presenter.prefetch(["kingambit", "kingambit"]); h.select(); await settle();
  assert.equal(h.calls.length, 1);
  h.calls[0].reject(Object.assign(Error("offline"), { code: "network_error" })); await prefetch; await settle();
  assert.match(h.entries[0].textContent, /api retry/u); assert.equal(h.diagnostics.at(-1).state, "error");
  h.presenter.retry(); await settle(); assert.equal(h.calls.length, 2);
  h.calls[1].resolve({ status: "absent" }); await settle(); assert.equal(h.entries.length, 1); assert.equal(h.diagnostics.at(-1).state, "absent");
});
