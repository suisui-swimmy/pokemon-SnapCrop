import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildIconManifestStats,
  getPokemonIconRecognitionCandidateReasons,
  groupExactIconCandidates,
  isPokemonIconRecognitionCandidate,
  validateRawAccounting,
} from "../tools/pokemon-icon-manifest.mjs";
import { validatePokemonIconManifest } from "../tools/validate-pokemon-icon-reference.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function candidate(overrides = {}) {
  return {
    id: "Base",
    pokemonName: "テストモン",
    speciesKey: "species:testmon",
    variantKey: "variant:base",
    speciesResolution: {
      method: "fixture",
      fallback: false,
    },
    source: "champions",
    path: "./base.webp",
    fileHash: "hash-a",
    ...overrides,
  };
}

test("same hash and pokemonName are merged into one canonical candidate", () => {
  const entries = [
    candidate(),
    candidate({
      id: "Base-SV",
      source: "sv",
      path: "./base-sv.webp",
    }),
  ];
  const result = groupExactIconCandidates(entries);
  assert.equal(result.icons.length, 1);
  assert.deepEqual(result.icons[0].mergedIds, ["Base", "Base-SV"]);
  assert.deepEqual(result.icons[0].sources, ["champions", "sv"]);
  assert.equal(result.statusCounts.canonical, 1);
  assert.equal(result.statusCounts.merged_duplicate, 1);
});

test("recognition candidates use classification, keep Champions exceptions, and hard-exclude Mega forms", () => {
  assert.equal(isPokemonIconRecognitionCandidate({}), false);
  assert.deepEqual(
    getPokemonIconRecognitionCandidateReasons({
      hasChampionsSource: true,
      isFinalEvolution: true,
      isMega: true,
      legendClass: "restricted",
    }),
    [],
  );
  assert.equal(
    isPokemonIconRecognitionCandidate({ isFinalEvolution: true }),
    true,
  );
  assert.equal(
    isPokemonIconRecognitionCandidate({ isMega: true }),
    false,
  );
  assert.equal(
    isPokemonIconRecognitionCandidate({
      hasChampionsSource: true,
      isFinalEvolution: true,
      isMega: true,
      legendClass: "restricted",
    }),
    false,
  );
  assert.equal(
    isPokemonIconRecognitionCandidate({ legendClass: "sublegendary" }),
    true,
  );
  assert.equal(
    isPokemonIconRecognitionCandidate({ legendClass: "normal" }),
    false,
  );
});

test("same pokemonName with different image hashes remains as separate templates", () => {
  const result = groupExactIconCandidates([
    candidate(),
    candidate({
      id: "Alternate",
      source: "sv",
      path: "./alternate.webp",
      fileHash: "hash-b",
    }),
  ]);
  assert.equal(result.icons.length, 2);
  assert.equal(result.statusCounts.merged_duplicate, 0);
  assert.equal(result.visualCollisions.length, 0);
});

test("same image hash with different pokemonName becomes a visual collision", () => {
  const result = groupExactIconCandidates([
    candidate(),
    candidate({
      id: "Other",
      pokemonName: "べつモン",
      speciesKey: "species:other",
      source: "sv",
      path: "./other.webp",
    }),
  ]);
  assert.equal(result.icons.length, 2);
  assert.equal(result.visualCollisions.length, 1);
  assert.deepEqual(result.visualCollisions[0].pokemonNames, ["テストモン", "べつモン"]);
  assert.equal(result.statusCounts.visual_collision, 2);
  assert.ok(result.icons.every((entry) => entry.visualCollisionId));
});

test("raw accounting includes canonical, merged, collision, and invalid entries", () => {
  const rawEntries = [
    candidate(),
    candidate({ id: "Duplicate", source: "sv", path: "./duplicate.webp" }),
    candidate({
      id: "Collision",
      pokemonName: "べつモン",
      speciesKey: "species:other",
      source: "sv",
      path: "./collision.webp",
      fileHash: "hash-b",
    }),
    candidate({
      id: "Collision-2",
      source: "champions",
      path: "./collision-2.webp",
      fileHash: "hash-b",
    }),
    candidate({
      id: "Invalid",
      pokemonName: "",
      speciesKey: "icon:invalid",
      path: "./invalid.webp",
      fileHash: "hash-invalid",
      invalidReason: "name_unresolved",
    }),
  ];
  const grouped = groupExactIconCandidates(rawEntries);
  const stats = buildIconManifestStats({
    rawEntries,
    icons: grouped.icons,
    rawAudit: grouped.rawAudit,
    visualCollisions: grouped.visualCollisions,
    unresolved: rawEntries.filter((entry) => !entry.pokemonName),
  });
  assert.deepEqual(stats.rawAccounting, {
    canonical: 1,
    merged_duplicate: 1,
    visual_collision: 2,
    invalid: 1,
  });
  assert.deepEqual(validateRawAccounting(stats), {
    valid: true,
    accounted: 5,
    rawCandidateCount: 5,
  });
});

test("generated manifest preserves Champions, SV-only names, and baseline coverage", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "pokemon-icon-reference.json"), "utf8"));
  const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "fixtures", "pokemon-icon-baseline.json"), "utf8"));
  const result = validatePokemonIconManifest(manifest, baseline);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.summary.pokemonNameSetPreserved, true);
  assert.equal(result.summary.svOnlyPokemonNameSetPreserved, true);
  assert.ok(manifest.rawCandidates.some((entry) => entry.source === "champions"));
  assert.ok(manifest.rawCandidates.some((entry) => entry.source === "sv"));
});

test("generated manifest carries Showdown classification and general recognition candidates", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "pokemon-icon-reference.json"), "utf8"));
  const icon = (id) => manifest.icons.find((entry) => entry.mergedIds?.includes(id));
  const svIcon = (id) => manifest.icons.find((entry) =>
    entry.mergedIds?.includes(id)
    && entry.sources?.length === 1
    && entry.sources[0] === "sv");

  assert.equal(manifest.classification.name, "pokemon-showdown");
  assert.match(manifest.classification.revision, /^[0-9a-f]{40}$/u);
  assert.equal(manifest.stats.championsSourceIconCount, 358);
  assert.equal(manifest.stats.recognitionCandidateCount, 788);
  assert.equal(manifest.stats.recognitionCandidatePokemonNameCount, 468);
  assert.equal(manifest.stats.classificationUnresolvedCount, 0);

  assert.equal(icon("Pikachu").hasChampionsSource, true);
  assert.equal(icon("Pikachu").isRecognitionCandidate, true);
  assert.deepEqual(
    icon("Pikachu").recognitionCandidateReasons,
    ["champions-source"],
  );
  assert.equal(icon("Pikachu").canEvolve, true);
  assert.equal(icon("Pikachu").evolutionDepth, 1);

  assert.equal(svIcon("Abomasnow").hasChampionsSource, false);
  assert.equal(svIcon("Abomasnow").isFinalEvolution, true);
  assert.equal(svIcon("Abomasnow").isRecognitionCandidate, true);
  assert.equal(icon("Bulbasaur").isRecognitionCandidate, false);

  assert.equal(icon("Qwilfish").canEvolve, false);
  assert.deepEqual(icon("Qwilfish").evoIds, []);
  assert.equal(icon("Qwilfish-Hisui").canEvolve, true);
  assert.deepEqual(icon("Qwilfish-Hisui").evoIds, ["overqwil"]);

  assert.equal(icon("Floette-Eternal").canEvolve, false);
  assert.equal(icon("Floette-Mega").battleOnlySourceId, "floetteeternal");
  assert.equal(icon("Floette-Mega").evolutionSourceId, "floetteeternal");

  const meowsticMega = icon("Meowstic-F-Mega");
  assert.ok(meowsticMega.mergedIds.includes("Meowstic-M-Mega"));
  assert.equal(meowsticMega.evolutionDepth, 1);
  assert.equal(meowsticMega.isMega, true);
  assert.equal(meowsticMega.isRecognitionCandidate, false);
  assert.deepEqual(meowsticMega.recognitionCandidateReasons, []);
  assert.deepEqual(
    meowsticMega.showdownIds,
    ["meowsticfmega", "meowsticmmega"],
  );

  assert.equal(icon("Articuno").legendClass, "sublegendary");
  assert.equal(icon("Mewtwo").legendClass, "restricted");
  assert.equal(icon("Mew").legendClass, "mythical");
  assert.ok(icon("Mewtwo").recognitionCandidateReasons.includes("legend:restricted"));
});
