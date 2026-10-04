export const STATS_STORAGE_KEY = "pokemon-snapcrop.stats-settings.v1";
export const STATS_FIELD_LABELS = Object.freeze({ move: "技", ability: "特性", held_item: "持ち物", stat_alignment: "性格" });
export const DEFAULT_STATS_SETTINGS = Object.freeze({
  rule: null,
  fields: Object.freeze(Object.keys(STATS_FIELD_LABELS)),
  top: Object.freeze({ move: 5, ability: "all", held_item: 5, stat_alignment: 3 }),
  min: 0,
});
const RULE_LABELS = { Singles: "シングル", Doubles: "ダブル" };
const TRANSLATION_KINDS = { move: "move", ability: "ability", held_item: "item", stat_alignment: "nature" };
const SOURCE_URL = "https://championsbattledata.com/";
const toId = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/gu, "");
const cloneSettings = (settings = DEFAULT_STATS_SETTINGS) => ({ ...settings, fields: [...settings.fields], top: { ...settings.top } });
const fieldKey = (name) => Object.keys(STATS_FIELD_LABELS).find((key) => key === name || STATS_FIELD_LABELS[key] === name);
const validCount = (value) => value === "all" || (Number.isSafeInteger(value) && value >= 1);

export function restoreStatsSettings(storage) {
  const defaults = cloneSettings();
  try {
    const value = JSON.parse(storage?.getItem(STATS_STORAGE_KEY) || "null");
    if (!value || typeof value !== "object") return defaults;
    if (value.rule === null || Object.hasOwn(RULE_LABELS, value.rule)) defaults.rule = value.rule;
    if (Array.isArray(value.fields) && value.fields.length && value.fields.every((field) => Object.hasOwn(STATS_FIELD_LABELS, field))) {
      defaults.fields = [...new Set(value.fields)];
    }
    for (const field of Object.keys(STATS_FIELD_LABELS)) {
      if (validCount(value.top?.[field])) defaults.top[field] = value.top[field];
    }
    if (typeof value.min === "number" && Number.isFinite(value.min) && value.min >= 0 && value.min <= 100) defaults.min = value.min;
  } catch { /* An unavailable or damaged settings store must not stop the terminal. */ }
  return defaults;
}

export function formatStatsSettings(settings) {
  return [
    `[stats] ルール: ${RULE_LABELS[settings.rule] || "未選択（stats rule で選択）"}`,
    `[stats] 表示: ${settings.fields.map((field) => STATS_FIELD_LABELS[field]).join(" / ")} / 最低使用率: ${settings.min}%`,
    `[stats] 件数: ${Object.keys(STATS_FIELD_LABELS).map((field) => `${STATS_FIELD_LABELS[field]} ${settings.top[field] === "all" ? "全件" : settings.top[field]}`).join(" / ")}`,
  ];
}

export function parseStatsCommand(query, currentSettings = DEFAULT_STATS_SETTINGS) {
  const [command, action = "status", ...args] = String(query || "").trim().split(/\s+/u);
  if (command?.toLowerCase() !== "stats") return { handled: false };
  const settings = cloneSettings(currentSettings);
  const invalid = (error) => ({ handled: true, error });
  switch (action.toLowerCase()) {
    case "rule": {
      if (!args.length) return { handled: true, openRulePicker: true };
      const rule = Object.keys(RULE_LABELS).find((key) => key.toLowerCase() === args[0]?.toLowerCase() || RULE_LABELS[key] === args[0]);
      if (args.length !== 1 || !rule) return invalid("stats rule は シングル / ダブル を指定してください。");
      settings.rule = rule;
      break;
    }
    case "show": {
      const fields = args.map(fieldKey);
      if (!fields.length || fields.some((field) => !field)) return invalid("stats show は 技 / 特性 / 持ち物 / 性格 を指定してください。");
      settings.fields = [...new Set(fields)];
      break;
    }
    case "top": {
      const field = fieldKey(args[0]);
      const count = args[1]?.toLowerCase() === "all" ? "all" : /^\d+$/u.test(args[1] || "") ? Number(args[1]) : null;
      if (args.length !== 2 || !field || !validCount(count)) return invalid("stats top <技|特性|持ち物|性格> <1以上の整数|all> を指定してください。");
      settings.top[field] = count;
      break;
    }
    case "min": {
      const value = /^\d+(?:\.\d+)?$/u.test(args[0] || "") ? Number(args[0]) : NaN;
      if (args.length !== 1 || !Number.isFinite(value) || value < 0 || value > 100) return invalid("stats min は 0〜100 の使用率を指定してください。");
      settings.min = value;
      break;
    }
    case "status":
      return args.length ? invalid("stats status に追加の指定は不要です。") : { handled: true, status: true, lines: formatStatsSettings(settings) };
    default:
      return invalid("stats は rule / show / top / min / status を指定してください。");
  }
  return { handled: true, settings, lines: formatStatsSettings(settings) };
}

export function getStatsCommandSuggestions(query) {
  const input = String(query || "").trimStart();
  const ruleMatch = /^stats\s+rule(?:\s+(\S*))?\s*$/iu.exec(input);
  if (ruleMatch) {
    const prefix = ruleMatch[1] || "";
    return Object.entries(RULE_LABELS).filter(([rule, label]) => label.startsWith(prefix) || rule.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(([, name]) => ({ name, command: `stats rule ${name}` }));
  }
  const fieldMatch = /^stats\s+(show|top)\s+(.*)$/iu.exec(input);
  if (!fieldMatch) return [];
  const action = fieldMatch[1].toLowerCase();
  const words = fieldMatch[2].split(/\s+/u);
  const prefix = words.pop() || "";
  if (action === "top" && words.length) return [];
  return Object.entries(STATS_FIELD_LABELS).filter(([key, name]) => !words.includes(name) && !words.includes(key) && (name.startsWith(prefix) || key.startsWith(prefix)))
    .map(([, name]) => ({ name, command: `stats ${action} ${[...words, name].join(" ")}` }));
}

export function translateStatsName(catalog, category, canonicalName) {
  const translation = catalog.translations?.[TRANSLATION_KINDS[category]]?.[toId(canonicalName)];
  return translation?.status === "localized" && translation.name ? translation.name : canonicalName;
}

export function formatStatisticsRows(data, settings, catalog) {
  return settings.fields.map((category) => {
    const rows = (data.rows || []).filter((row) => row.category === category);
    if (!rows.length) return `${STATS_FIELD_LABELS[category]} | 掲載なし`;
    const eligible = rows.filter((row) => row.value === null ? settings.min === 0 : typeof row.value === "number" && Number.isFinite(row.value) && row.value >= settings.min)
      .sort((a, b) => a.rank - b.rank);
    const selected = settings.top[category] === "all" ? eligible : eligible.slice(0, settings.top[category]);
    if (!selected.length) return `${STATS_FIELD_LABELS[category]} | 条件に合うデータなし`;
    return `${STATS_FIELD_LABELS[category]} | ${selected.map((row) => `${translateStatsName(catalog, category, row.canonicalName)} ${row.value === null ? "使用率不明" : row.percentage || `${row.value}%`}`).join(" | ")}`;
  });
}

/** Presenter owns only its result blocks. The caller owns input focus, scrolling and the terminal log. */
export function createStatisticsPresenter({ api, catalog, getIndex, getIndexError = () => null, getSettings, appendElement, onUpdate = () => {}, onDiagnostic = () => {}, document: dom = globalThis.document }) {
  const pokemon = new Map(catalog.pokemon.map((entry) => [entry.id, entry]));
  const automatic = new Map();
  const manual = new Set();
  const inFlight = new Map();
  const suppressed = new Set();
  let captureId = null;
  let matchId = null;
  let generation = 0;
  const selectionKey = (selection) => `${selection.refIndex}:${selection.order}:${selection.formId}`;

  function diagnostic(block, reason, detail = {}) {
    const key = `${reason}:${block.settings.rule}:${block.statsId || ""}`;
    if (block.lastDiagnostic === key) return;
    block.lastDiagnostic = key;
    onDiagnostic({ source: block.source, captureId: block.captureId, matchId: block.matchId,
      refIndex: block.refIndex ?? null, order: block.order ?? null, formId: block.formId,
      statsId: block.statsId || null, rule: block.settings.rule, reason,
      state: { rule_unset: "rule-unset", index_wait: "index-wait", stats_wait: "loading", stats_absent: "absent", stats_error: "error", stats_displayed: "ready" }[reason],
      translationStatus: pokemon.get(block.formId)?.translationStatus || "missing", ...detail });
  }

  function paint(block, lines, result = null) {
    const entry = pokemon.get(block.formId);
    const heading = dom.createElement("div");
    heading.className = "terminal-statistics__heading";
    heading.textContent = `> ${entry?.name || entry?.canonicalName || block.formId}［${block.source === "auto" ? `選出${block.order}／` : ""}${RULE_LABELS[block.settings.rule] || "ルール未選択"}${result?.date ? `／${result.date}` : "／最新"}］`;
    const body = dom.createElement("div");
    body.className = "terminal-statistics__body";
    body.textContent = lines.join("\n");
    const source = dom.createElement("a");
    source.className = "terminal-entry__link terminal-statistics__source";
    source.href = SOURCE_URL;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "出典: Pokémon Champions Battle Data";
    const children = [heading];
    if (block.mapping?.shared) {
      const shared = dom.createElement("div");
      shared.className = "terminal-statistics__shared";
      shared.textContent = `統計: ${pokemon.get(block.statsId)?.name || block.mapping.statsName || block.statsId}と共通`;
      children.push(shared);
    }
    children.push(body);
    if (result?.fetchedAt) {
      const fetched = dom.createElement("div");
      fetched.className = "terminal-statistics__fetched";
      fetched.textContent = `取得日時: ${result.fetchedAt}`;
      children.push(fetched);
    }
    block.element.replaceChildren(...children, source);
    if (block.appended) onUpdate(block.element);
  }

  function request(statsId, rule) {
    const key = `${rule}:${statsId}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const pending = Promise.resolve().then(() => api.getStats(statsId, rule));
    inFlight.set(key, pending);
    pending.finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key); }).catch(() => {});
    return pending;
  }

  function active(block, version) {
    return block.generation === generation && block.version === version && !block.stopped
      && (block.source === "manual" || (block.captureId === captureId && automatic.get(block.refIndex) === block));
  }

  async function update(block) {
    const version = ++block.version;
    block.data = null;
    block.mapping = null;
    block.statsId = null;
    if (!block.settings.rule) {
      block.status = "rule_unset";
      paint(block, ["stats rule でシングル / ダブルを選んでください。"]);
      diagnostic(block, "rule_unset");
      return;
    }
    const index = getIndex();
    if (!index) {
      block.status = getIndexError() ? "error" : "index_wait";
      paint(block, [block.status === "error" ? "統計の一覧を取得できませんでした。api retry で再試行できます。" : "統計の一覧を読み込み中です。"]);
      diagnostic(block, block.status === "error" ? "stats_error" : "index_wait");
      return;
    }
    const mapping = index.statsById?.[block.formId];
    block.mapping = mapping || null;
    block.statsId = mapping?.statsId || null;
    if (!block.statsId || mapping.availableCurrent?.[block.settings.rule] === false) {
      block.status = "absent";
      paint(block, ["このルールの最新統計は掲載されていません。"]);
      diagnostic(block, "stats_absent");
      return;
    }
    block.status = "loading";
    paint(block, ["バトル統計を読み込み中です。"]);
    diagnostic(block, "stats_wait");
    try {
      const result = await request(block.statsId, block.settings.rule);
      if (!active(block, version)) return;
      if (result.status === "absent") {
        block.status = "absent";
        block.data = result;
        paint(block, ["このルールの最新統計は掲載されていません。"]);
        diagnostic(block, "stats_absent");
      } else {
        block.status = "ready";
        block.data = result;
        paint(block, formatStatisticsRows(result, block.settings, catalog), result);
        const translationIssues = result.rows.filter((row) => block.settings.fields.includes(row.category)).flatMap((row) => {
          const id = toId(row.canonicalName);
          const translation = catalog.translations?.[TRANSLATION_KINDS[row.category]]?.[id];
          return translation?.status === "localized" ? [] : [{ category: row.category, id, status: translation?.status || "not-found" }];
        });
        diagnostic(block, "stats_displayed", { date: result.date || null, fetchedAt: result.fetchedAt || null, translationIssues });
      }
    } catch (error) {
      if (!active(block, version)) return;
      block.status = "error";
      paint(block, ["統計を取得できませんでした。api retry で再試行できます。"]);
      diagnostic(block, "stats_error", { error: error?.code || error?.name || "fetch_error" });
    }
  }

  function createBlock(selection, source) {
    const block = { ...selection, source, captureId: source === "auto" ? captureId : null,
      matchId: source === "auto" ? matchId : null, settings: cloneSettings(getSettings()),
      generation, version: 0, stopped: false, appended: false, element: dom.createElement("div") };
    block.element.className = "terminal-entry terminal-entry--success terminal-entry--statistics";
    return block;
  }

  function start(block) {
    void update(block);
    appendElement(block.element);
    block.appended = true;
    return block.element;
  }

  function stop(block) {
    block.stopped = true;
    block.version += 1;
    if (["loading", "index_wait"].includes(block.status)) paint(block, ["取得を中断しました。"]);
  }

  return {
    setCapture(nextCaptureId, nextMatchId) {
      if (captureId === nextCaptureId && matchId === nextMatchId) return;
      for (const block of automatic.values()) stop(block);
      automatic.clear();
      suppressed.clear();
      captureId = nextCaptureId;
      matchId = nextMatchId;
    },
    setAutomaticSelections(selections) {
      const selected = new Map(selections.map((entry) => [entry.refIndex, entry]));
      const selectedKeys = new Set(selections.map(selectionKey));
      for (const key of suppressed) if (!selectedKeys.has(key)) suppressed.delete(key);
      for (const [refIndex, block] of automatic) {
        const next = selected.get(refIndex);
        if (!next || next.formId !== block.formId || next.order !== block.order) {
          stop(block);
          automatic.delete(refIndex);
        }
      }
      for (const selection of selected.values()) {
        if (automatic.has(selection.refIndex) || suppressed.has(selectionKey(selection))) continue;
        const block = createBlock(selection, "auto");
        automatic.set(selection.refIndex, block);
        start(block);
      }
    },
    addManual(formId) {
      const block = createBlock({ formId }, "manual");
      manual.add(block);
      return start(block);
    },
    settingsChanged() {
      for (const block of automatic.values()) {
        const previousRule = block.settings.rule;
        block.settings = cloneSettings(getSettings());
        if (previousRule === block.settings.rule && block.data) {
          paint(block, block.data.status === "absent"
            ? ["このルールの最新統計は掲載されていません。"]
            : formatStatisticsRows(block.data, block.settings, catalog), block.data);
          continue;
        }
        void update(block);
      }
    },
    clear() {
      generation += 1;
      for (const block of automatic.values()) suppressed.add(selectionKey(block));
      for (const block of [...automatic.values(), ...manual]) { block.stopped = true; block.version += 1; block.element.remove(); }
      automatic.clear();
      manual.clear();
    },
    retry() {
      for (const block of automatic.values()) void update(block);
      for (const block of manual) {
        if (["index_wait", "error"].includes(block.status)) void update(block);
      }
    },
    async prefetch(formIds) {
      const rule = getSettings().rule;
      const index = getIndex();
      if (!rule || !index) return;
      const ids = [...new Set(formIds.map((id) => index.statsById?.[id]).filter((mapping) => mapping?.statsId && mapping.availableCurrent?.[rule] !== false).map((mapping) => mapping.statsId))];
      await Promise.allSettled(ids.map((id) => request(id, rule)));
    },
  };
}
