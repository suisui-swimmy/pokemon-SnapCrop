import fs from "node:fs";
import path from "node:path";
import {
  buildIconManifestStats,
  groupExactIconCandidates,
  hashStringSet,
  ICON_MANIFEST_SCHEMA_VERSION,
  ICON_SAMPLE_SIZE,
  sha256Buffer,
  validateRawAccounting,
} from "./pokemon-icon-manifest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ICON_SOURCES = [
  {
    source: "champions",
    inputDir: path.resolve(ROOT, "..", "others", "vgc-multicalc", "src", "assets", "sprites", "pokemon-champions"),
    outputDir: path.join(ROOT, "assets", "pokemon-icons", "champions"),
    outputPathPrefix: "./assets/pokemon-icons/champions/",
  },
  {
    source: "sv",
    inputDir: path.resolve(ROOT, "..", "others", "vgc-multicalc", "src", "assets", "sprites", "pokemon-sv"),
    outputDir: path.join(ROOT, "assets", "pokemon-icons", "sv"),
    outputPathPrefix: "./assets/pokemon-icons/sv/",
  },
];
const POKEMON_DATA_TSV_PATH = path.join(ROOT, "others", "pokemon-data", "POKEMON_ALL.tsv");
const POKEAPI_CSV_DIR = path.join(ROOT, "others", "pokeapi", "data", "v2", "csv");
const POKEMON_REFERENCE_PATH = path.join(ROOT, "data", "pokemon-reference.csv");
const OUTPUT_PATH = path.join(ROOT, "data", "pokemon-icon-reference.json");
const BASELINE_PATH = path.join(ROOT, "tests", "fixtures", "pokemon-icon-baseline.json");
const JA_LANGUAGE_ID = "1";

function parseCsv(text, delimiter = ",") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }

  return rows;
}

function readTable(filePath, delimiter = ",") {
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"), delimiter);
  const headers = rows.shift() || [];
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function readPokeApiCsv(fileName) {
  return readTable(path.join(POKEAPI_CSV_DIR, fileName));
}

function normalizeLookupKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gu, "");
}

function normalizeReferenceName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/gu, "");
}

function decodeStem(stem) {
  try {
    return decodeURIComponent(stem);
  } catch {
    return stem;
  }
}

function createReferenceNameResolver() {
  const rows = readTable(POKEMON_REFERENCE_PATH);
  const names = rows.map((row) => row["ポケモン名"]).filter(Boolean);
  const exact = new Set(names);
  const loose = new Map();
  names.forEach((name) => {
    const key = normalizeReferenceName(name);
    if (!loose.has(key)) {
      loose.set(key, name);
    }
  });

  return {
    rows,
    resolve(name) {
      if (!name) {
        return "";
      }
      if (exact.has(name)) {
        return name;
      }
      return loose.get(normalizeReferenceName(name)) || "";
    },
  };
}

function pushResolvedName(map, key, name, resolver) {
  const lookupKey = normalizeLookupKey(key);
  if (!lookupKey || map.has(lookupKey)) {
    return false;
  }

  const resolved = resolver.resolve(name);
  if (!resolved) {
    return false;
  }

  map.set(lookupKey, resolved);
  return true;
}

function pushCandidateNames(map, key, names, resolver) {
  return names.some((name) => pushResolvedName(map, key, name, resolver));
}

function pokemonDataNameCandidates(row) {
  const speciesName = row.pokeapi_species_name_ja || row.yakkuncom_name || "";
  const formName = row.pokeapi_form_name_ja || "";
  const yakkunName = row.yakkuncom_name || "";
  const candidates = [];

  if (yakkunName) {
    candidates.push(yakkunName);
  }
  if (formName && (/^(メガ|ゲンシ)/u.test(formName) || formName.includes(speciesName))) {
    candidates.push(formName);
  }
  if (speciesName && formName) {
    candidates.push(`${speciesName}(${formName})`);
  }
  if (speciesName) {
    candidates.push(speciesName);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function createPokemonDataNameMap(resolver) {
  const map = new Map();
  if (!fs.existsSync(POKEMON_DATA_TSV_PATH)) {
    return map;
  }

  readTable(POKEMON_DATA_TSV_PATH, "\t").forEach((row) => {
    const candidates = pokemonDataNameCandidates(row);
    [
      row.pkmn_name,
      row.pokeapi_form_id_name,
      row.pokeapi_pokemon_id_name,
      row.pokeapi_species_name_en,
      row.pkmn_base_species && row.pkmn_forme ? `${row.pkmn_base_species}-${row.pkmn_forme}` : "",
    ].forEach((key) => pushCandidateNames(map, key, candidates, resolver));
  });

  return map;
}

function createPokeApiNameMap(resolver) {
  const map = new Map();
  const pokemonRows = readPokeApiCsv("pokemon.csv");
  const speciesRows = readPokeApiCsv("pokemon_species.csv");
  const speciesNameRows = readPokeApiCsv("pokemon_species_names.csv");
  const formRows = readPokeApiCsv("pokemon_forms.csv");
  const formNameRows = readPokeApiCsv("pokemon_form_names.csv");
  const pokemonById = new Map(pokemonRows.map((row) => [row.id, row]));
  const speciesById = new Map(speciesRows.map((row) => [row.id, row]));
  const speciesJaById = new Map(
    speciesNameRows
      .filter((row) => row.local_language_id === JA_LANGUAGE_ID)
      .map((row) => [row.pokemon_species_id, row.name]),
  );
  const formJaById = new Map(
    formNameRows
      .filter((row) => row.local_language_id === JA_LANGUAGE_ID)
      .map((row) => [row.pokemon_form_id, row.form_name || row.pokemon_name]),
  );

  formRows.forEach((form) => {
    const pokemon = pokemonById.get(form.pokemon_id);
    if (!pokemon) {
      return;
    }

    const species = speciesById.get(pokemon.species_id);
    const speciesName = speciesJaById.get(pokemon.species_id) || "";
    const formName = formJaById.get(form.id) || "";
    const candidates = [];
    if (formName && (/^(メガ|ゲンシ)/u.test(formName) || formName.includes(speciesName))) {
      candidates.push(formName);
    }
    if (speciesName && formName) {
      candidates.push(`${speciesName}(${formName})`);
    }
    if (speciesName) {
      candidates.push(speciesName);
    }

    [
      pokemon.identifier,
      form.identifier,
      species?.identifier,
    ].forEach((key) => pushCandidateNames(map, key, candidates, resolver));
  });

  return map;
}

function toStableIdentifier(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function createSpeciesMetadataResolver() {
  const exact = new Map();
  const byPokemonName = new Map();

  function addExact(key, metadata) {
    const lookupKey = normalizeLookupKey(key);
    if (!lookupKey || exact.has(lookupKey) || !metadata?.speciesKey) {
      return;
    }
    exact.set(lookupKey, metadata);
  }

  function addPokemonName(name, metadata) {
    const lookupKey = normalizeReferenceName(name);
    if (!lookupKey || byPokemonName.has(lookupKey) || !metadata?.speciesKey) {
      return;
    }
    byPokemonName.set(lookupKey, metadata);
  }

  const pokemonRows = readPokeApiCsv("pokemon.csv");
  const speciesRows = readPokeApiCsv("pokemon_species.csv");
  const formRows = readPokeApiCsv("pokemon_forms.csv");
  const speciesNameRows = readPokeApiCsv("pokemon_species_names.csv");
  const formNameRows = readPokeApiCsv("pokemon_form_names.csv");
  const pokemonById = new Map(pokemonRows.map((row) => [row.id, row]));
  const speciesById = new Map(speciesRows.map((row) => [row.id, row]));
  const speciesNameJaById = new Map(
    speciesNameRows
      .filter((row) => row.local_language_id === JA_LANGUAGE_ID)
      .map((row) => [row.pokemon_species_id, row.name]),
  );
  const formNameJaById = new Map(
    formNameRows
      .filter((row) => row.local_language_id === JA_LANGUAGE_ID)
      .map((row) => [row.pokemon_form_id, row.pokemon_name || row.form_name]),
  );

  formRows.forEach((form) => {
    const pokemon = pokemonById.get(form.pokemon_id);
    const species = pokemon ? speciesById.get(pokemon.species_id) : null;
    if (!pokemon || !species?.identifier) {
      return;
    }
    const metadata = {
      speciesKey: `species:${species.identifier}`,
      variantKey: `variant:${form.identifier || pokemon.identifier}`,
      method: "pokeapi_form",
      fallback: false,
    };
    [form.identifier, pokemon.identifier, species.identifier].forEach((key) => addExact(key, metadata));
    addPokemonName(speciesNameJaById.get(species.id), metadata);
    addPokemonName(formNameJaById.get(form.id), metadata);
  });

  if (fs.existsSync(POKEMON_DATA_TSV_PATH)) {
    readTable(POKEMON_DATA_TSV_PATH, "\t").forEach((row) => {
      const speciesIdentifier = row.pokeapi_species_id_name || toStableIdentifier(row.pkmn_base_species);
      if (!speciesIdentifier) {
        return;
      }
      const variantIdentifier = row.pokeapi_form_id_name
        || row.pokeapi_pokemon_id_name
        || row.pkmn_id_name
        || speciesIdentifier;
      const metadata = {
        speciesKey: `species:${speciesIdentifier}`,
        variantKey: `variant:${variantIdentifier}`,
        method: "pokemon_data",
        fallback: false,
      };
      [
        row.pkmn_name,
        row.pkmn_id_name,
        row.pokeapi_form_id_name,
        row.pokeapi_pokemon_id_name,
        row.pokeapi_species_id_name,
      ].forEach((key) => addExact(key, metadata));
      [
        row.yakkuncom_name,
        row.pokeapi_species_name_ja,
        row.pokeapi_form_name_ja,
      ].forEach((name) => addPokemonName(name, metadata));
    });
  }

  return {
    resolve(stem, pokemonName) {
      const decoded = decodeStem(stem);
      const exactMatch = exact.get(normalizeLookupKey(decoded));
      if (exactMatch) {
        return {
          ...exactMatch,
          variantKey: `variant:${toStableIdentifier(decoded) || exactMatch.variantKey.replace(/^variant:/u, "")}`,
        };
      }

      const parts = decoded.split("-").filter(Boolean);
      for (let length = parts.length - 1; length >= 1; length -= 1) {
        const baseMatch = exact.get(normalizeLookupKey(parts.slice(0, length).join("-")));
        if (baseMatch) {
          return {
            ...baseMatch,
            variantKey: `variant:${toStableIdentifier(decoded)}`,
            method: "base_id_fallback",
            fallback: true,
          };
        }
      }

      const nameMatch = byPokemonName.get(normalizeReferenceName(pokemonName));
      if (nameMatch) {
        return {
          ...nameMatch,
          variantKey: `variant:${toStableIdentifier(decoded)}`,
          method: "pokemon_name_fallback",
          fallback: true,
        };
      }

      return {
        speciesKey: `icon:${toStableIdentifier(decoded) || "unknown"}`,
        variantKey: `variant:${toStableIdentifier(decoded) || "unknown"}`,
        method: "icon_id_fallback",
        fallback: true,
      };
    },
  };
}

function createManualNameMap(resolver) {
  const entries = [
    ["Gourgeist-Jumbo", "パンプジン(とくだいサイズ)"],
    ["Meowstic-F-Mega", "メガニャオニクス"],
    ["Meowstic-M-Mega", "メガニャオニクス"],
  ];
  return new Map(
    entries
      .map(([key, name]) => [normalizeLookupKey(key), resolver.resolve(name)])
      .filter(([, name]) => Boolean(name)),
  );
}

function copyIcons(sourceConfig) {
  if (!fs.existsSync(sourceConfig.inputDir)) {
    throw new Error(`Icon source not found: ${sourceConfig.inputDir}`);
  }

  fs.mkdirSync(sourceConfig.outputDir, { recursive: true });
  const sourceFiles = fs.readdirSync(sourceConfig.inputDir)
    .filter((fileName) => fileName.endsWith(".webp"))
    .sort((left, right) => left.localeCompare(right, "en"));
  const sourceFileSet = new Set(sourceFiles);

  fs.readdirSync(sourceConfig.outputDir)
    .filter((fileName) => fileName.endsWith(".webp") && !sourceFileSet.has(fileName))
    .forEach((fileName) => {
      fs.unlinkSync(path.join(sourceConfig.outputDir, fileName));
    });

  sourceFiles.forEach((fileName) => {
    fs.copyFileSync(
      path.join(sourceConfig.inputDir, fileName),
      path.join(sourceConfig.outputDir, fileName),
    );
  });

  return sourceFiles;
}

function iconPathForFile(sourceConfig, fileName) {
  return `${sourceConfig.outputPathPrefix}${encodeURIComponent(fileName)}`;
}

function resolveIconName(stem, maps) {
  const decoded = decodeStem(stem);
  const key = normalizeLookupKey(decoded);
  for (const map of maps) {
    const name = map.get(key);
    if (name) {
      return name;
    }
  }
  return "";
}

function loadBaseline() {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

function validateBaselineCoverage(manifest, baseline) {
  const requiredMissing = baseline.requiredMappings.filter(
    (requiredId) => !manifest.icons.some((icon) => icon.mergedIds.includes(requiredId)),
  );
  if (requiredMissing.length) {
    throw new Error(`Required icon mappings missing: ${requiredMissing.join(", ")}`);
  }
  if (manifest.stats.pokemonNameSetSha256 !== baseline.pokemonNameSetSha256) {
    throw new Error(
      `pokemonName coverage changed: expected ${baseline.pokemonNameSetSha256}, got ${manifest.stats.pokemonNameSetSha256}`,
    );
  }
  if (manifest.stats.svOnlyPokemonNameSetSha256 !== baseline.svOnlyPokemonNameSetSha256) {
    throw new Error(
      `SV-only pokemonName coverage changed: expected ${baseline.svOnlyPokemonNameSetSha256}, got ${manifest.stats.svOnlyPokemonNameSetSha256}`,
    );
  }
  if (manifest.stats.unresolvedCount > baseline.unresolvedCount) {
    throw new Error(
      `Unresolved mappings increased: expected <=${baseline.unresolvedCount}, got ${manifest.stats.unresolvedCount}`,
    );
  }
  const accounting = validateRawAccounting(manifest.stats);
  if (!accounting.valid) {
    throw new Error(
      `Raw candidate accounting mismatch: raw=${accounting.rawCandidateCount} accounted=${accounting.accounted}`,
    );
  }
}

function main() {
  const resolver = createReferenceNameResolver();
  const speciesResolver = createSpeciesMetadataResolver();
  const maps = [
    createManualNameMap(resolver),
    createPokemonDataNameMap(resolver),
    createPokeApiNameMap(resolver),
  ];
  const rawEntries = [];
  const unresolved = [];
  const copied = {};

  ICON_SOURCES.forEach((sourceConfig) => {
    const fileNames = copyIcons(sourceConfig);
    copied[sourceConfig.source] = fileNames.length;

    fileNames.forEach((fileName) => {
      const stem = path.basename(fileName, ".webp");
      const pokemonName = resolveIconName(stem, maps);
      const speciesResolution = speciesResolver.resolve(stem, pokemonName);
      const copiedPath = path.join(sourceConfig.outputDir, fileName);
      const entry = {
        id: decodeStem(stem),
        source: sourceConfig.source,
        path: iconPathForFile(sourceConfig, fileName),
        pokemonName,
        speciesKey: speciesResolution.speciesKey,
        variantKey: speciesResolution.variantKey,
        speciesResolution: {
          method: speciesResolution.method,
          fallback: speciesResolution.fallback,
        },
        fileHash: sha256Buffer(fs.readFileSync(copiedPath)),
      };
      rawEntries.push(entry);

      if (pokemonName) {
        return;
      } else {
        unresolved.push({
          ...entry,
          invalidReason: "name_unresolved",
        });
      }
    });
  });

  const {
    icons,
    rawAudit,
    visualCollisions,
  } = groupExactIconCandidates(rawEntries);
  const stats = buildIconManifestStats({
    rawEntries,
    icons,
    rawAudit,
    visualCollisions,
    unresolved,
  });

  const manifest = {
    schemaVersion: ICON_MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sample: ICON_SAMPLE_SIZE,
    normalization: {
      candidate: "alpha_bbox",
      input: "shared_median_or_border_background",
      alphaThreshold: 24,
      paddingRatio: 0.18,
    },
    sources: {
      raw: copied,
      canonicalPrimary: stats.sourceCounts.canonicalPrimary,
      unresolved: unresolved.length,
    },
    stats,
    icons,
    rawCandidates: rawAudit,
    visualCollisions,
    unresolved,
  };
  validateBaselineCoverage(manifest, loadBaseline());

  fs.writeFileSync(`${OUTPUT_PATH}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.renameSync(`${OUTPUT_PATH}.tmp`, OUTPUT_PATH);

  console.log(`Copied champions=${copied.champions || 0} sv=${copied.sv || 0}`);
  console.log(
    `Candidates raw=${stats.rawCandidateCount} canonical=${stats.canonicalCandidateCount} merged=${stats.mergedDuplicateCount} collisions=${stats.visualCollisionGroupCount} unresolved=${stats.unresolvedCount}`,
  );
  console.log(
    `Coverage names=${stats.uniquePokemonNameCount} species=${stats.uniqueSpeciesKeyCount} svOnlyNames=${stats.svOnlyPokemonNameCount} fallbackSpecies=${stats.speciesFallbackCount}`,
  );
}

if (path.resolve(process.argv[1] || "") === path.resolve(import.meta.filename)) {
  main();
}

export {
  createSpeciesMetadataResolver,
  main,
  validateBaselineCoverage,
};
