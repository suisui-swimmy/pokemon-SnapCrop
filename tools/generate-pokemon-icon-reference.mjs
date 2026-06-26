import fs from "node:fs";
import path from "node:path";

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

function main() {
  const resolver = createReferenceNameResolver();
  const maps = [
    createManualNameMap(resolver),
    createPokemonDataNameMap(resolver),
    createPokeApiNameMap(resolver),
  ];
  const icons = [];
  const unresolved = [];
  const copied = {};

  ICON_SOURCES.forEach((sourceConfig) => {
    const fileNames = copyIcons(sourceConfig);
    copied[sourceConfig.source] = fileNames.length;

    fileNames.forEach((fileName) => {
      const stem = path.basename(fileName, ".webp");
      const pokemonName = resolveIconName(stem, maps);
      const entry = {
        id: decodeStem(stem),
        source: sourceConfig.source,
        path: iconPathForFile(sourceConfig, fileName),
      };

      if (pokemonName) {
        icons.push({
          ...entry,
          pokemonName,
        });
      } else {
        unresolved.push(entry);
      }
    });
  });

  const required = ["Garchomp-Mega", "Dragonite-Mega", "Raichu-Mega-X", "Sneasler"];
  const missingRequired = required.filter((id) => !icons.some((icon) => icon.id === id));
  if (missingRequired.length) {
    throw new Error(`Required icon mappings missing: ${missingRequired.join(", ")}`);
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sample: {
      width: 60,
      height: 75,
    },
    sources: {
      copied,
      unresolved: unresolved.length,
    },
    icons,
    unresolved,
  };

  fs.writeFileSync(`${OUTPUT_PATH}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.renameSync(`${OUTPUT_PATH}.tmp`, OUTPUT_PATH);

  console.log(`Copied champions=${copied.champions || 0} sv=${copied.sv || 0}`);
  console.log(`Resolved icons=${icons.length} unresolved=${unresolved.length}`);
}

main();
