import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import * as statisticsModule from "../battle-statistics.js";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const catalog = JSON.parse(fs.readFileSync(new URL("../data/pokemon-display-catalog.json", import.meta.url), "utf8"));
const settle = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Only DOM/layout, HTTP and dynamic-module loading are simulated. The real
// app handlers, settings parser, presenter, search and diagnostic writers run.
class Element {
  constructor(tag, dom) {
    this.tagName = tag; this.dom = dom; this.children = []; this.parent = null;
    this.text = ""; this.value = ""; this.className = ""; this.attributes = {};
    this.style = { setProperty() {} };
    this.classList = {
      contains: (name) => this.className.split(/\s+/u).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/u).filter(Boolean), ...names])].join(" "); },
      remove: (...names) => { this.className = this.className.split(/\s+/u).filter((name) => !names.includes(name)).join(" "); },
    };
  }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join("\n"); }
  set textContent(value) { this.children.forEach((child) => { child.parent = null; }); this.children = []; this.text = String(value); }
  append(...children) {
    for (const child of children) {
      if (child.tagName === "fragment") this.append(...child.children);
      else { child.parent = this; this.children.push(child); }
    }
  }
  replaceChildren(...children) { this.textContent = ""; this.append(...children); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((entry) => entry !== this); this.parent = null; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key]; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  focus() { this.dom.activeElement = this; }
}

function harness({ storageThrows = false, catalogResponse = null } = {}) {
  const requests = [];
  const storageValues = new Map();
  const storage = {
    getItem: (key) => storageValues.get(key) ?? null,
    setItem(key, value) { if (storageThrows) throw new Error("storage disabled"); storageValues.set(key, value); },
  };
  const dom = { addEventListener() {}, activeElement: null };
  dom.createElement = (tag) => new Element(tag, dom);
  dom.createDocumentFragment = () => new Element("fragment", dom);
  dom.createTextNode = (text) => { const node = new Element("text", dom); node.textContent = text; return node; };
  const remoteApi = {
    getStats(statsId, rule) { const pending = deferred(); requests.push({ statsId, rule, ...pending }); return pending.promise; },
    loadIndex: async () => { throw new Error("fixture index unavailable"); },
  };
  const stats = { ...statisticsModule, createStatisticsPresenter: (options) => statisticsModule.createStatisticsPresenter({ ...options, document: dom }) };
  const context = vm.createContext({
    crypto: webcrypto, document: dom, window: { localStorage: storage }, localStorage: storage,
    fetch: async () => catalogResponse ? await catalogResponse : { ok: true, json: async () => catalog },
    testStatsModule: stats, testApiModule: { createBattleApi: () => remoteApi },
  });
  const source = appSource
    .replace('import("./battle-api.js")', "Promise.resolve(globalThis.testApiModule)")
    .replace('import("./battle-statistics.js")', "Promise.resolve(globalThis.testStatsModule)")
    .replace(/\}\)\(\);\s*$/u, `
      scrollTerminalToBottom = () => {};
      const realLoadPokemonIconReference = loadPokemonIconReference;
      loadPokemonIconReference = async () => {};
      globalThis.app = { state, elements, loadDisplayCatalog, realLoadPokemonIconReference, rebuildPokemonSearchIndex,
        handleTerminalInputKeydown, handleTerminalInputChange, handleTerminalSubmit,
        handleTerminalCompositionStart, handleTerminalCompositionEnd,
        handleTerminalCommand, refreshTerminalSuggestions, resolveTerminalSubmission,
        findExactPokemonMatch, getPokemonSuggestions, syncStatisticsSelection,
        recordStatisticsDiagnostic, startMatchLog, finishMatchLog };
    })();`);
  vm.runInContext(source, context);
  const h = { ...context.app, dom, context, requests, storageValues, remoteApi };
  Object.assign(h.elements, {
    terminalInput: dom.createElement("input"), terminalOutput: dom.createElement("output"),
    terminalSuggestions: dom.createElement("suggestions"), terminalGhost: dom.createElement("ghost"),
    terminalForm: { requestSubmit: () => h.handleTerminalSubmit({ preventDefault() {} }) },
    video: { videoWidth: 1920, videoHeight: 1080 },
  });
  h.elements.terminalInput.focus();
  h.state.remoteIndex = { statsById: Object.fromEntries([
    "kingambit", "charizard", "taurospaldeaaqua", "taurospaldeablaze", "taurospaldeacombat",
    "greninja", "greninjabond", "rockruff", "rockruffdusk", "meowsticmmega", "meowsticfmega",
    "basculegion", "basculegionf", "absolmega",
  ].map((id) => [id, { statsId: id, shared: false, availableCurrent: { Singles: true, Doubles: true } }])) };
  h.state.pokemonSearchStatus = "ready";
  h.type = (value) => { h.elements.terminalInput.value = value; h.handleTerminalInputChange(); };
  h.key = (key, extra = {}) => {
    const event = { key, isComposing: false, shiftKey: false, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
    h.handleTerminalInputKeydown(event); return event;
  };
  h.submit = (value) => { h.type(value); h.handleTerminalSubmit({ preventDefault() {} }); };
  h.output = () => h.elements.terminalOutput.textContent;
  h.beginCapture = () => {
    h.state.streamInfo = { width: 1920, height: 1080, isSixteenByNine: true };
    h.startMatchLog(Date.now(), {});
    const match = h.state.matchLog.current;
    const reference = { width: 299, height: 807 };
    h.state.references.enemy = reference;
    h.state.matchLog.references.enemy = { reference, matchId: match.id, diagnostic: match.diagnostic, captureId: webcrypto.randomUUID(), capturedAt: Date.now() };
    h.state.pokemonIconRecognition.reference = reference;
    return match;
  };
  return h;
}

test("real rule picker cycles with Tab/ShiftTab and submits full command on Enter", async () => {
  const h = harness(); await h.loadDisplayCatalog();
  assert.equal(h.state.rulePicker, true);
  assert.deepEqual(Array.from(h.state.suggestions, (item) => item.name), ["シングル", "ダブル"]);
  assert.equal(h.key("Tab").prevented, true);
  assert.equal(h.state.selectedSuggestionIndex, 0);
  h.key("Tab"); assert.equal(h.state.selectedSuggestionIndex, 1);
  h.key("Tab", { shiftKey: true }); assert.equal(h.state.selectedSuggestionIndex, 0);
  assert.equal(h.resolveTerminalSubmission("").query, "stats rule シングル");
  h.key("Enter");
  assert.equal(h.state.statsSettings.rule, "Singles");
  assert.equal(h.state.rulePicker, false);
  assert.equal(h.elements.terminalInput.value, "");
  assert.match(h.output(), /> stats rule シングル/u);
  assert.equal(h.dom.activeElement, h.elements.terminalInput);
});

test("rule picker Escape defers selection and composition keys never select or submit", async () => {
  const h = harness(); await h.loadDisplayCatalog();
  h.handleTerminalCompositionStart();
  for (const key of ["Tab", "Enter", "Escape"]) assert.equal(h.key(key, { isComposing: true }).prevented, false);
  assert.equal(h.state.statsSettings.rule, null);
  assert.equal(h.state.rulePicker, true);
  h.handleTerminalCompositionEnd();
  const escaped = h.key("Escape");
  assert.equal(escaped.prevented, true); assert.equal(escaped.stopped, true);
  assert.equal(h.state.rulePicker, false); assert.equal(h.state.suggestions.length, 0);
  assert.equal(h.state.statsSettings.rule, null);
  h.submit("stats rule");
  assert.equal(h.state.rulePicker, true);
  h.key("Tab", { shiftKey: true });
  assert.equal(h.state.selectedSuggestionIndex, 1);
  h.key("Enter");
  assert.equal(h.state.statsSettings.rule, "Doubles");
});

test("late catalog initialization preserves typed text, caret, focus and active IME", async () => {
  for (const composing of [false, true]) {
    const response = deferred(); const h = harness({ catalogResponse: response.promise });
    const loading = h.loadDisplayCatalog();
    h.type("ドドゲザン"); h.elements.terminalInput.setSelectionRange(2, 2);
    if (composing) h.handleTerminalCompositionStart();
    response.resolve({ ok: true, json: async () => catalog }); await loading;
    assert.equal(h.state.catalogReady, true);
    assert.equal(h.elements.terminalInput.value, "ドドゲザン");
    assert.equal(h.elements.terminalInput.selectionStart, 2);
    assert.equal(h.state.isComposing, composing);
    assert.equal(h.state.rulePicker, false);
    assert.equal(h.dom.activeElement, h.elements.terminalInput);
    if (composing) assert.equal(h.state.suggestions.length, 0);
  }
});

test("typed stats suggestions submit the command, not the displayed Japanese option", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.key("Escape");
  h.type("stats rule ダ");
  assert.equal(h.state.suggestions[0].name, "ダブル");
  h.key("Tab"); h.key("Enter");
  assert.equal(h.state.statsSettings.rule, "Doubles");
  h.type("stats show 技 性"); h.key("Tab");
  assert.equal(h.resolveTerminalSubmission(h.elements.terminalInput.value).query, "stats show 技 性格");
  h.key("Enter");
  assert.deepEqual(Array.from(h.state.statsSettings.fields), ["move", "stat_alignment"]);
  assert.doesNotMatch(h.output(), /該当するポケモンが見つかりません/u);
});

test("top field completion preserves an unfinished command so the count can be entered", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.key("Escape");
  h.type("stats top "); h.key("Tab"); h.key("Enter");
  assert.equal(h.elements.terminalInput.value, "stats top 技 ");
  assert.equal(h.state.statsSettings.top.move, 5);
  assert.doesNotMatch(h.output(), /\[error\]/u);
  h.submit(`${h.elements.terminalInput.value}7`);
  assert.equal(h.state.statsSettings.top.move, 7);
  assert.equal(h.elements.terminalInput.value, "");
});

test("typing a command dismisses the initial picker without changing the command text", async () => {
  const h = harness(); await h.loadDisplayCatalog();
  assert.equal(h.state.rulePicker, true);
  h.type("stats status");
  assert.equal(h.state.rulePicker, false);
  assert.equal(h.elements.terminalInput.value, "stats status");
  assert.equal(h.state.suggestions.length, 0);
  h.handleTerminalSubmit({ preventDefault() {} });
  assert.equal(h.state.statsSettings.rule, null);
  assert.match(h.output(), /\[stats\] ルール: 未選択/u);
});

test("Japanese, English and complete multiword aliases resolve IDs; ambiguous names need selection", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.key("Escape");
  for (const [query, id] of [["ドドゲザン", "kingambit"], ["Kingambit", "kingambit"], ["kingambit", "kingambit"], ["ケンタロス ウォーター種", "taurospaldeaaqua"]]) {
    assert.equal(h.findExactPokemonMatch(query)?.id, id, query);
    h.type(query); assert.equal(h.resolveTerminalSubmission(query).query, id);
  }
  h.type("パルデアケンタロス");
  assert.equal(h.findExactPokemonMatch("パルデアケンタロス"), null);
  assert.equal(h.state.selectedSuggestionIndex, -1);
  assert.equal(h.resolveTerminalSubmission("パルデアケンタロス").query, "パルデアケンタロス");
  const ids = new Set(h.state.suggestions.map((entry) => entry.id));
  for (const id of ["taurospaldeaaqua", "taurospaldeablaze", "taurospaldeacombat"]) assert.ok(ids.has(id));
  h.key("Tab");
  assert.ok(ids.has(h.resolveTerminalSubmission("パルデアケンタロス").query));
});

test("storage denial keeps commands and the real statistics presenter usable", async () => {
  const h = harness({ storageThrows: true }); await h.loadDisplayCatalog();
  h.submit("stats rule ダブル"); h.submit("stats show 技 性格"); h.submit("stats min 2");
  assert.equal(h.state.statsSettings.rule, "Doubles"); assert.equal(h.state.statsSettings.min, 2);
  assert.match(h.output(), /設定を保存できませんでした。このページでは適用します。/u);
  h.submit("ドドゲザン"); await settle();
  assert.equal(h.requests.length, 1); assert.equal(h.requests[0].statsId, "kingambit"); assert.equal(h.requests[0].rule, "Doubles");
  h.requests[0].resolve({ status: "ready", date: null, rows: [{ category: "move", rank: 1, canonicalName: "Kowtow Cleave", value: 97.4 }] });
  await settle(); assert.match(h.output(), /技 \| ドゲザン 97.4%/u);
  assert.equal(h.elements.terminalInput.value, ""); assert.equal(h.dom.activeElement, h.elements.terminalInput);
});

test("reviewed shared names require form selection and detailed labels resolve their original IDs", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.key("Escape");
  for (const [query, ids] of [
    ["ゲッコウガ", ["greninja", "greninjabond"]],
    ["イワンコ", ["rockruff", "rockruffdusk"]],
    ["メガニャオニクス", ["meowsticmmega", "meowsticfmega"]],
  ]) {
    h.type(query);
    assert.equal(h.findExactPokemonMatch(query), null, query);
    assert.equal(h.resolveTerminalSubmission(query).query, query);
    const found = new Set(h.state.suggestions.map((entry) => entry.id));
    for (const id of ids) assert.ok(found.has(id), id);
    assert.equal(h.state.selectedSuggestionIndex, -1);
    h.key("Tab");
    assert.ok(found.has(h.resolveTerminalSubmission(query).query));
  }
  for (const [query, id] of [
    ["ゲッコウガ（きずなへんげ）", "greninjabond"], ["Greninja", "greninja"],
    ["メガニャオニクス（オス）", "meowsticmmega"], ["メガニャオニクス（メス）", "meowsticfmega"],
    ["イダイトウ オスのすがた", "basculegion"], ["イダイトウ メスのすがた", "basculegionf"],
    ["アブソル メガアブソル", "absolmega"],
  ]) {
    assert.equal(h.findExactPokemonMatch(query)?.id, id, query);
    h.type(query); assert.equal(h.resolveTerminalSubmission(query).query, id);
  }
});

test("actual clear command suppresses current automatic results and late responses", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.submit("stats rule ダブル"); h.beginCapture();
  h.state.pokemonIconRecognition.resultsByRefIndex[0] = { matched: true, showdownId: "kingambit", pokemonName: "ドドゲザン" };
  h.state.autoSnap.pickOverlay.ordersByRefIndex[0] = 1;
  h.syncStatisticsSelection(); await settle();
  assert.equal(h.requests.length, 1); assert.match(h.output(), /バトル統計を読み込み中/u);
  h.submit("clear"); const cleared = h.output();
  assert.equal(cleared, "");
  h.requests[0].resolve({ status: "ready", date: null, rows: [{ category: "move", rank: 1, canonicalName: "Kowtow Cleave", value: 97.4 }] });
  await settle(); h.syncStatisticsSelection(); await settle();
  assert.equal(h.output(), cleared); assert.equal(h.requests.length, 1);
});

test("statistics diagnostics reject stale captures and cannot mutate completed or next match logs", async () => {
  const h = harness(); await h.loadDisplayCatalog(); const match = h.beginCapture();
  const event = { source: "auto", captureId: h.state.matchLog.references.enemy.captureId,
    matchId: match.diagnostic.matchId, refIndex: 0, order: 1, formId: "kingambit", statsId: "kingambit", rule: "Doubles", state: "ready" };
  const baseline = match.events.length;
  h.recordStatisticsDiagnostic({ ...event, captureId: "previous-capture" });
  h.recordStatisticsDiagnostic({ ...event, matchId: "previous-match" });
  assert.equal(match.events.length, baseline);
  h.recordStatisticsDiagnostic(event);
  assert.equal(match.events.filter((entry) => entry.kind === "battle-stats").length, 1);
  h.finishMatchLog("completed", "win");
  const completed = JSON.stringify(match);
  h.recordStatisticsDiagnostic(event); assert.equal(JSON.stringify(match), completed);
  h.startMatchLog(Date.now() + 1000, {});
  const next = h.state.matchLog.current; const nextBaseline = JSON.stringify(next);
  h.recordStatisticsDiagnostic(event);
  assert.equal(JSON.stringify(next), nextBaseline); assert.equal(JSON.stringify(match), completed);
});

test("search whitelist follows API current-rule availability including explicitly shared forms", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.key("Escape");
  h.state.remoteIndex = { statsById: {
    kingambit: { statsId: "kingambit", availableCurrent: { Singles: true, Doubles: false } },
    charizardmegax: { statsId: "charizard", shared: true, availableCurrent: { Singles: false, Doubles: true } },
    basculegion: { statsId: "basculegion", availableCurrent: { Singles: false, Doubles: false } },
    pikachu: { statsId: "pikachu" },
    eevee: { availableCurrent: { Singles: true, Doubles: true } },
    futureunknown: { statsId: "futureunknown", availableCurrent: { Singles: true, Doubles: true } },
  } };
  h.rebuildPokemonSearchIndex("ready");
  assert.deepEqual([...h.state.pokemonSearchIds].sort(), ["charizardmegax", "kingambit"]);
  assert.equal(h.findExactPokemonMatch("ドドゲザン")?.id, "kingambit");
  assert.equal(h.findExactPokemonMatch("ピカチュウ"), null);
  assert.equal(h.getPokemonSuggestions("ピカ").length, 0);
  h.submit("stats rule シングル");
  assert.deepEqual([...h.state.pokemonSearchIds], ["kingambit"]);
  h.submit("stats rule ダブル");
  assert.deepEqual([...h.state.pokemonSearchIds], ["charizardmegax"]);
  assert.equal(h.findExactPokemonMatch("ドドゲザン"), null);
  h.submit("メガリザードンX"); await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].statsId, "charizard");
  assert.equal(h.requests[0].rule, "Doubles");
});

test("unlisted species cannot bypass search by Japanese, English, ID or stale selected suggestion", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.submit("stats rule ダブル");
  for (const query of ["ピカチュウ", "Pikachu", "pikachu"]) {
    h.submit(query); await settle();
    assert.match(h.output(), /使用率が掲載されている検索対象に見つかりません/u);
  }
  h.type("ドドゲザン"); h.key("Tab");
  h.state.remoteIndex = { statsById: {} }; h.rebuildPokemonSearchIndex();
  // Even an obsolete UI selection must fail the final submission guard.
  h.handleTerminalSubmit({ preventDefault() {} }); await settle();
  assert.equal(h.requests.length, 0);
  assert.equal(h.dom.activeElement, h.elements.terminalInput);
});

test("index loading/failure fail closed; successful retry refreshes typed suggestions without changing focus or caret", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.submit("stats rule ダブル");
  const refreshed = { icons: [], statsById: {
    pikachu: { statsId: "pikachu", availableCurrent: { Singles: true, Doubles: true } },
  } };
  let pending = deferred(); h.remoteApi.loadIndex = () => pending.promise;
  let loading = h.realLoadPokemonIconReference();
  assert.equal(h.state.pokemonSearchStatus, "loading");
  assert.equal(h.state.pokemonSearchIndex.length, 0);
  h.submit("kingambit"); assert.match(h.output(), /使用率の一覧を読み込み中/u);
  pending.reject(new Error("offline")); await loading;
  assert.equal(h.state.pokemonSearchStatus, "failed");
  h.submit("kingambit"); assert.match(h.output(), /使用率の一覧を取得できませんでした。api retry/u);
  assert.equal(h.requests.length, 0);
  pending = deferred(); h.remoteApi.retryIndex = () => pending.promise;
  loading = h.realLoadPokemonIconReference(true);
  h.type("ピカ"); h.elements.terminalInput.setSelectionRange(1, 1);
  pending.resolve(refreshed); await loading;
  assert.equal(h.state.pokemonSearchStatus, "ready");
  assert.equal(h.elements.terminalInput.value, "ピカ");
  assert.equal(h.elements.terminalInput.selectionStart, 1);
  assert.equal(h.dom.activeElement, h.elements.terminalInput);
  assert.equal(h.state.suggestions[0].id, "pikachu");
  assert.equal(h.findExactPokemonMatch("ドドゲザン"), null);
  // Search statistics do not require an image candidate (or successful image preparation).
  assert.equal(h.state.pokemonIconReferenceReady, false);
  h.key("Tab"); h.key("Enter"); await settle();
  assert.equal(h.requests[0].statsId, "pikachu");
});

test("a successful empty API whitelist stays empty and index refresh does not interrupt IME", async () => {
  const h = harness(); await h.loadDisplayCatalog(); h.submit("stats rule ダブル");
  h.type("ピカ"); h.handleTerminalCompositionStart();
  h.remoteApi.loadIndex = async () => ({ icons: [], statsById: {} });
  await h.realLoadPokemonIconReference();
  assert.equal(h.state.pokemonSearchStatus, "ready");
  assert.equal(h.state.pokemonSearchIds.size, 0);
  assert.equal(h.state.suggestions.length, 0);
  assert.equal(h.state.isComposing, true);
  assert.equal(h.elements.terminalInput.value, "ピカ");
  h.handleTerminalCompositionEnd();
  h.submit("kingambit"); await settle();
  assert.equal(h.requests.length, 0);
  assert.match(h.output(), /検索対象に見つかりません/u);
});
