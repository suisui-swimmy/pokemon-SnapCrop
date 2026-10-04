import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createShowdownClassificationResolver, loadShowdownClassificationData } from "./pokemon-showdown-classification.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, "utf8"));
const idOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/gu, "");
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
    const display = await import(pathToFileURL(path.join(sourceRoot, "src/showdown.ts")).href);
    const resolver = await import(pathToFileURL(path.join(sourceRoot, "src/localization/resolver.ts")).href);
    return { ...display, ...resolver };
  } finally {
    hooks.deregister();
  }
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
    const display = locale.resolveShowdownDisplayNameJa("pokemon", entry.showdownId);
    const classification = classify.resolve(entry.showdownId);
    const name = display.status === "localized" ? display.displayNameJa : entry.showdownName;
    const explicitAliases = mapping.aliases.filter((alias) => alias.kind === "pokemon" && alias.targetId === entry.showdownId).map((alias) => alias.inputId);
    const names = [...new Set([
      name, entry.showdownName, entry.showdownId, ...explicitAliases,
      ...(display.status === "localized" && display.dictionaryRef
        ? aliasByKey.get(`pokemon:${display.dictionaryRef.id}`) || [] : []),
    ])];
    return {
      id: entry.showdownId,
      canonicalName: entry.showdownName,
      name,
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
    const options = readJson(path.join(localeRoot, `src/data/generated/${kind}-options.gen.json`));
    const names = ["ability", "type"].includes(kind)
      ? sourceCatalog.entries.filter((entry) => entry.kind === kind).map((entry) => entry.showdownName)
      : options.entries.map((entry) => entry.showdownName);
    translations[kind] = Object.fromEntries(names.sort().map((canonicalName) => {
      const external = ["ability", "type"].includes(kind);
      const result = external
        ? locale.resolveShowdownDisplayNameJa(kind, canonicalName)
        : locale.resolveEntity(kind, canonicalName);
      const localized = external ? result.status === "localized"
        : ["exact", "alias"].includes(result.status) && result.sourceStatus === "supported";
      return [idOf(canonicalName), {
        canonicalName,
        name: localized ? result.displayNameJa : canonicalName,
        status: localized ? "localized" : result.sourceStatus || result.status,
      }];
    }));
  }
  const files = [
    "src/data/generated/showdown-display.gen.json", "src/data/generated/showdown-catalog.gen.json",
    "src/data/overrides/ja-label-overrides.json", "src/data/overrides/ja-aliases.json",
    "src/data/overrides/showdown-display-overrides.json", "src/localization/showdownDisplay.ts",
    "src/localization/displayNameRules.ts", "src/localization/resolver.ts", "src/localization/normalizeJa.ts",
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
