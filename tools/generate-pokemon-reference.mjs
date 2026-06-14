import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const POKEAPI_CSV_DIR = path.join(ROOT, "others", "pokeapi", "data", "v2", "csv");
const POKEMON_DATA_TSV_PATH = path.join(ROOT, "others", "pokemon-data", "POKEMON_ALL.tsv");
const OUTPUT_PATH = path.join(ROOT, "data", "pokemon-reference.csv");
const JA_LANGUAGE_ID = "1";

const HEADERS = [
  "ポケモン名",
  "タイプ1",
  "タイプ2",
  "H",
  "A",
  "B",
  "C",
  "D",
  "S",
  "とくせい1",
  "とくせい2",
  "とくせい3",
  "ポケ徹ID",
  "ポケ徹リンク種別",
];

const STAT_KEYS = new Map([
  ["1", "H"],
  ["2", "A"],
  ["3", "B"],
  ["4", "C"],
  ["5", "D"],
  ["6", "S"],
]);

const IDENTIFIER_PART_LABELS = new Map([
  ["alola", "アローラ"],
  ["galar", "ガラル"],
  ["hisui", "ヒスイ"],
  ["paldea", "パルデア"],
  ["totem", "ぬし"],
  ["starter", "相棒"],
  ["standard", "ノーマル"],
  ["zen", "ダルマ"],
  ["meteor", "りゅうせい"],
  ["disguised", "ばけた"],
  ["busted", "ばれた"],
  ["red", "あかいろ"],
  ["orange", "だいだいいろ"],
  ["yellow", "きいろ"],
  ["green", "みどりいろ"],
  ["blue", "みずいろ"],
  ["indigo", "あおいろ"],
  ["violet", "むらさきいろ"],
  ["10", "10%"],
  ["50", "50%"],
]);

const IDENTIFIER_COMPOUND_LABELS = new Map([
  ["battle-bond", "きずなへんげ"],
  ["own-tempo", "マイペース"],
  ["power-construct", "スワームチェンジ"],
  ["combat-breed", "コンバット種"],
  ["blaze-breed", "ブレイズ種"],
  ["aqua-breed", "ウォーター種"],
]);

function readCsv(fileName) {
  return parseCsv(fs.readFileSync(path.join(POKEAPI_CSV_DIR, fileName), "utf8"));
}

function readPokemonDataTsv() {
  if (!fs.existsSync(POKEMON_DATA_TSV_PATH)) {
    return [];
  }

  return parseCsv(fs.readFileSync(POKEMON_DATA_TSV_PATH, "utf8"), "\t");
}

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
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...records] = rows.filter((currentRow) => currentRow.length > 1);
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
  );
}

function indexBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    map.set(row[key], row);
  });
  return map;
}

function groupBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const value = row[key];
    if (!map.has(value)) {
      map.set(value, []);
    }
    map.get(value).push(row);
  });
  return map;
}

function groupFormsBySpeciesId(forms, pokemonById) {
  const map = new Map();
  forms.forEach((form) => {
    const pokemon = pokemonById.get(form.pokemon_id);
    if (!pokemon) {
      return;
    }
    const speciesId = pokemon.species_id;
    if (!map.has(speciesId)) {
      map.set(speciesId, []);
    }
    map.get(speciesId).push(form);
  });
  return map;
}

function namesById(rows, idKey, nameKey) {
  const map = new Map();
  rows
    .filter((row) => row.local_language_id === JA_LANGUAGE_ID)
    .forEach((row) => {
      map.set(row[idKey], normalizeDisplay(row[nameKey]));
    });
  return map;
}

function normalizeDisplay(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFormLabel(value) {
  return normalizeDisplay(value)
    .replace(/の?すがた$/u, "")
    .replace(/フォルム$/u, "")
    .replace(/モード$/u, "")
    .replace(/のかた$/u, "")
    .replace(/のもよう$/u, "")
    .replace(/のコア$/u, "")
    .replace(/タイプ[:：]?$/u, "")
    .replace(/タイプ[:：]/u, "")
    .trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/u.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowToCsv(row) {
  return HEADERS.map((header) => csvEscape(row[header])).join(",");
}

function fallbackName(identifier) {
  return normalizeDisplay(identifier)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSiblingFormLabels(formsBySpeciesId, speciesId, formNamesById) {
  const labels = new Map();
  const forms = formsBySpeciesId.get(speciesId) || [];
  forms.forEach((form) => {
    const formName = formNamesById.get(form.id);
    if (form.form_identifier && formName) {
      labels.set(form.form_identifier, cleanFormLabel(formName));
    }
  });
  return labels;
}

function getIdentifierSuffix(pokemon, speciesIdentifier, siblingFormLabels) {
  const parts = pokemon.identifier
    .replace(new RegExp(`^${speciesIdentifier}-?`, "u"), "")
    .split("-")
    .filter((part) => part && part !== "mega" && part !== "gmax");

  const translated = [];
  for (let index = 0; index < parts.length; index += 1) {
    const compound = parts.slice(index, index + 2).join("-");
    if (IDENTIFIER_COMPOUND_LABELS.has(compound)) {
      translated.push(IDENTIFIER_COMPOUND_LABELS.get(compound));
      index += 1;
      continue;
    }

    const part = parts[index];
    translated.push(cleanFormLabel(siblingFormLabels.get(part)) || IDENTIFIER_PART_LABELS.get(part) || part);
  }

  return cleanFormLabel(translated.join("・"));
}

function buildYakkunMaps(rows) {
  const byPokemonId = new Map();
  const bySpeciesId = new Map();

  rows
    .filter((row) => row.yakkuncom_id)
    .forEach((row) => {
      if (!byPokemonId.has(row.pokeapi_pokemon_id)) {
        byPokemonId.set(row.pokeapi_pokemon_id, row.yakkuncom_id);
      }
      if (!bySpeciesId.has(row.pokeapi_species_id)) {
        bySpeciesId.set(row.pokeapi_species_id, row.yakkuncom_id);
      }
    });

  return { byPokemonId, bySpeciesId };
}

function buildPokemonName(pokemon, species, form, formNamesById, formsBySpeciesId) {
  const speciesName = species ? species.name : fallbackName(pokemon.identifier);
  const formName = form ? formNamesById.get(form.id) : "";

  if (pokemon.id === pokemon.species_id && pokemon.is_default === "1") {
    return speciesName;
  }

  if (!formName) {
    const suffix = getIdentifierSuffix(
      pokemon,
      species?.identifier || pokemon.identifier,
      getSiblingFormLabels(formsBySpeciesId, pokemon.species_id, formNamesById),
    );
    return suffix ? `${speciesName}(${suffix})` : speciesName;
  }

  if (form?.form_identifier === "primal") {
    return `ゲンシ${speciesName}`;
  }

  if (formName.startsWith("メガ") || formName.startsWith("ゲンシ") || formName.includes(speciesName)) {
    return formName;
  }

  const label = cleanFormLabel(formName);
  if (label === "オス") {
    return `${speciesName}♂`;
  }
  if (label === "メス") {
    return `${speciesName}♀`;
  }

  return label ? `${speciesName}(${label})` : speciesName;
}

function deduplicateNames(rows, pokemonByGeneratedName, speciesById, formsByPokemonId, formNamesById, formsBySpeciesId) {
  const grouped = groupBy(rows, "ポケモン名");

  grouped.forEach((duplicates, name) => {
    if (duplicates.length <= 1) {
      return;
    }

    duplicates.forEach((row) => {
      const pokemon = pokemonByGeneratedName.get(row);
      const species = speciesById.get(pokemon.species_id);
      const siblingLabels = getSiblingFormLabels(formsBySpeciesId, pokemon.species_id, formNamesById);
      const suffix = getIdentifierSuffix(pokemon, species?.identifier || pokemon.identifier, siblingLabels) || "通常";
      const baseName = name.replace(/\([^()]*\)$/u, "");
      row["ポケモン名"] = `${baseName}(${suffix})`;
    });
  });
}

function buildRows() {
  const pokemonRows = readCsv("pokemon.csv");
  const speciesRows = readCsv("pokemon_species.csv");
  const speciesNameRows = readCsv("pokemon_species_names.csv");
  const pokemonTypeRows = readCsv("pokemon_types.csv");
  const typeNameRows = readCsv("type_names.csv");
  const pokemonStatRows = readCsv("pokemon_stats.csv");
  const pokemonAbilityRows = readCsv("pokemon_abilities.csv");
  const abilityNameRows = readCsv("ability_names.csv");
  const formRows = readCsv("pokemon_forms.csv");
  const formNameRows = readCsv("pokemon_form_names.csv");
  const yakkunMaps = buildYakkunMaps(readPokemonDataTsv());

  const speciesById = indexBy(speciesRows, "id");
  const speciesNamesById = namesById(speciesNameRows, "pokemon_species_id", "name");
  const typeNamesById = namesById(typeNameRows, "type_id", "name");
  const abilityNamesById = namesById(abilityNameRows, "ability_id", "name");
  const formNamesById = namesById(formNameRows, "pokemon_form_id", "form_name");
  const pokemonById = indexBy(pokemonRows, "id");
  const typesByPokemonId = groupBy(pokemonTypeRows, "pokemon_id");
  const statsByPokemonId = groupBy(pokemonStatRows, "pokemon_id");
  const abilitiesByPokemonId = groupBy(pokemonAbilityRows, "pokemon_id");
  const formsByPokemonId = indexBy(formRows, "pokemon_id");
  const formsBySpeciesId = groupFormsBySpeciesId(formRows, pokemonById);
  const pokemonByGeneratedName = new Map();

  const speciesWithNamesById = new Map(
    speciesRows.map((species) => [
      species.id,
      {
        ...species,
        name: speciesNamesById.get(species.id) || fallbackName(species.identifier),
      },
    ]),
  );

  const rows = pokemonRows
    .map((pokemon) => {
      const form = formsByPokemonId.get(pokemon.id);
      const species = speciesWithNamesById.get(pokemon.species_id);
      const typeNames = (typesByPokemonId.get(pokemon.id) || [])
        .sort((left, right) => Number(left.slot) - Number(right.slot))
        .map((type) => typeNamesById.get(type.type_id) || "");
      const stats = Object.fromEntries(STAT_KEYS.values().map((key) => [key, ""]));
      (statsByPokemonId.get(pokemon.id) || []).forEach((stat) => {
        const statKey = STAT_KEYS.get(stat.stat_id);
        if (statKey) {
          stats[statKey] = stat.base_stat;
        }
      });
      const abilityNames = (abilitiesByPokemonId.get(pokemon.id) || [])
        .sort((left, right) => Number(left.slot) - Number(right.slot))
        .map((ability) => abilityNamesById.get(ability.ability_id) || "");
      const exactYakkunId = yakkunMaps.byPokemonId.get(pokemon.id);
      const fallbackYakkunId = yakkunMaps.bySpeciesId.get(pokemon.species_id);

      const row = {
        "ポケモン名": buildPokemonName(pokemon, species, form, formNamesById, formsBySpeciesId),
        "タイプ1": typeNames[0] || "",
        "タイプ2": typeNames[1] || "",
        H: stats.H,
        A: stats.A,
        B: stats.B,
        C: stats.C,
        D: stats.D,
        S: stats.S,
        "とくせい1": abilityNames[0] || "",
        "とくせい2": abilityNames[1] || "",
        "とくせい3": abilityNames[2] || "",
        "ポケ徹ID": exactYakkunId || fallbackYakkunId || "",
        "ポケ徹リンク種別": exactYakkunId ? "exact" : fallbackYakkunId ? "species" : "",
      };

      pokemonByGeneratedName.set(row, pokemon);
      return row;
    })
    .filter((row) => row["ポケモン名"] && row["タイプ1"] && row.H && row.A && row.B && row.C && row.D && row.S)
    .sort((left, right) => {
      const leftPokemon = pokemonByGeneratedName.get(left);
      const rightPokemon = pokemonByGeneratedName.get(right);
      return Number(leftPokemon.order || leftPokemon.id) - Number(rightPokemon.order || rightPokemon.id);
    });

  deduplicateNames(rows, pokemonByGeneratedName, speciesWithNamesById, formsByPokemonId, formNamesById, formsBySpeciesId);

  return rows;
}

const rows = buildRows();
const csv = `${HEADERS.join(",")}\n${rows.map(rowToCsv).join("\n")}\n`;

fs.writeFileSync(OUTPUT_PATH, csv, "utf8");
console.log(`Generated ${rows.length} rows at ${path.relative(ROOT, OUTPUT_PATH)}`);
