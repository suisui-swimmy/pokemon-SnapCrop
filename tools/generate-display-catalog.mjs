import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createShowdownClassificationResolver, loadShowdownClassificationData } from "./pokemon-showdown-classification.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, "utf8"));
const sha = (text) => createHash("sha256").update(text).digest("hex");

// Execute the upstream display APIs, including their overrides, without copying
// their implementation or requiring a browser runtime/bundler dependency.
async function loadLocalization(sourceRoot) {
  const prefix = pathToFileURL(`${sourceRoot}${path.sep}`).href;
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.startsWith(prefix) && specifier.startsWith(".") && !path.extname(specifier)) {
        specifier += ".ts";
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith(prefix) && url.endsWith(".json")) {
        return { format: "module", source: `export default ${fs.readFileSync(new URL(url), "utf8")}`, shortCircuit: true };
      }
      return next(url, context);
    },
  });
  try {
    return await import(pathToFileURL(path.join(sourceRoot, "src/showdown.ts")).href);
  } finally {
    hooks.deregister();
  }
}

function resolveDisplay(locale, entry) {
  const result = locale.resolveShowdownDisplayNameJa(entry.kind, entry.showdownId);
  // Catalog entries have exact, reviewed external IDs. A missing/ambiguous
  // result here is a source mismatch, not a reason to silently change identity.
  if (result.showdownId !== entry.showdownId || result.showdownName !== entry.showdownName) {
    throw new Error(`Display identity mismatch: ${entry.kind}:${entry.showdownId}`);
  }
  const localized = result.status === "localized";
  const fields = {
    name: localized
      ? result.displayNameJa + (result.variantLabelJa ? `（${result.variantLabelJa}）` : "")
      : entry.showdownName,
  };
  for (const key of ["displayNameJa", "variantLabelJa", "labelKind", "category", "noteJa", "reason"]) {
    if (result[key] !== undefined) fields[key] = result[key];
  }
  return { result, fields };
}

export async function buildDisplayCatalog({ root = ROOT } = {}) {
  const localeRoot = path.join(root, "others/damage-calc-ja-layer");
  const showdownRoot = path.join(root, "others/pokemon-showdown");
  const source = loadShowdownClassificationData([showdownRoot]);
  // Working-tree newline settings must not change the generated artifact.
  for (const file of Object.values(source.source.files)) {
    file.sha256 = sha(fs.readFileSync(path.join(showdownRoot, file.path), "utf8").replace(/\r\n/gu, "\n"));
  }
  source.source.hashNormalization = "LF";
  const classify = createShowdownClassificationResolver(source.pokedex);
  const locale = await loadLocalization(localeRoot);
  const mapping = readJson(path.join(localeRoot, "src/data/generated/showdown-display.gen.json"));
  const sourceCatalog = readJson(path.join(localeRoot, "src/data/generated/showdown-catalog.gen.json"));
  if (source.source.revision !== locale.showdownDisplayMetadata.showdownCommit) {
    throw new Error("Showdown checkout and Japanese display snapshot must use the same reviewed commit");
  }
  const aliases = readJson(path.join(localeRoot, "src/data/overrides/ja-aliases.json")).entries;
  const aliasByKey = new Map(aliases.map((entry) => [`${entry.kind}:${entry.id}`, entry.aliasesJa || []]));
  const pokemon = sourceCatalog.entries.filter((entry) => entry.kind === "pokemon").map((entry) => {
    const { result: display, fields } = resolveDisplay(locale, entry);
    const classification = classify.resolve(entry.showdownId);
    const explicitAliases = mapping.aliases.filter((alias) => alias.kind === "pokemon" && alias.targetId === entry.showdownId).map((alias) => alias.inputId);
    const names = [...new Set([
      fields.name, ...(display.status === "localized" ? [display.displayNameJa] : []),
      entry.showdownName, entry.showdownId, ...explicitAliases,
      ...(display.status === "localized" && display.dictionaryRef
        ? aliasByKey.get(`pokemon:${display.dictionaryRef.id}`) || [] : []),
    ])];
    return {
      id: entry.showdownId,
      canonicalName: entry.showdownName,
      ...fields,
      searchText: names.join(" "),
      aliases: names,
      translationStatus: display.status,
      speciesKey: `species:${classification?.baseSpeciesId || entry.showdownId}`,
      isMega: classification?.isMega ?? false,
      isFinalEvolution: classification?.isFinalEvolution ?? null,
      legendClass: classification?.legendClass ?? "unknown",
    };
  }).sort((a, b) => a.id.localeCompare(b.id, "en"));
  const translations = {};
  for (const kind of ["move", "ability", "item", "nature", "type"]) {
    const entries = sourceCatalog.entries.filter((entry) => entry.kind === kind)
      .sort((a, b) => a.showdownId.localeCompare(b.showdownId, "en"));
    translations[kind] = Object.fromEntries(entries.map((entry) => {
      const { result, fields } = resolveDisplay(locale, entry);
      return [entry.showdownId, {
        canonicalName: entry.showdownName,
        ...fields,
        status: result.status,
      }];
    }));
  }
  const files = [
    "src/data/generated/showdown-display.gen.json", "src/data/generated/showdown-catalog.gen.json",
    "src/data/overrides/ja-label-overrides.json", "src/data/overrides/ja-aliases.json",
    "src/data/overrides/showdown-display-overrides.json", "src/data/overrides/showdown-pokemon-names.json",
    "src/showdown.ts", "src/localization/showdownDisplay.ts", "src/localization/showdownTypes.ts",
    "src/localization/displayNameRules.ts",
    ...["pokemon", "move", "ability", "item", "nature", "type"].map((kind) => `src/data/generated/${kind}-options.gen.json`),
  ];
  const hashes = Object.fromEntries(files.map((filename) => {
    const text = fs.readFileSync(path.join(localeRoot, filename), "utf8");
    return [filename, sha(filename.endsWith(".json") ? JSON.stringify(JSON.parse(text)) : text.replace(/\r\n/gu, "\n"))];
  }));
  return {
    schemaVersion: 1,
    provenance: {
      generatedBy: "tools/generate-display-catalog.mjs",
      usage: "display-only",
      localization: {
        revision: execFileSync("git", ["-C", localeRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        ...locale.showdownDisplayMetadata,
        files: hashes,
      },
      showdown: source.source,
      license: "./showdown-LICENSE.txt",
    },
    pokemon,
    translations,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = await buildDisplayCatalog();
  const filename = path.join(ROOT, "data/pokemon-display-catalog.json");
  const output = `${JSON.stringify(catalog, null, 2)}\n`;
  const license = fs.readFileSync(path.join(ROOT, "others/pokemon-showdown/LICENSE"), "utf8").replace(/\r\n/gu, "\n");
  const licensePath = path.join(ROOT, "data/showdown-LICENSE.txt");
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(filename, "utf8").replace(/\r\n/gu, "\n") !== output
      || fs.readFileSync(licensePath, "utf8").replace(/\r\n/gu, "\n") !== license) {
      throw new Error("Display catalog or Showdown license is stale; run the generator");
    }
  } else {
    fs.writeFileSync(filename, output);
    fs.writeFileSync(licensePath, license);
  }
  console.log(JSON.stringify({ pokemon: catalog.pokemon.length, translations: Object.fromEntries(Object.entries(catalog.translations).map(([kind, values]) => [kind, Object.keys(values).length])) }));
}
