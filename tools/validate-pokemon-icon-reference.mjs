import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashStringSet,
  ICON_MANIFEST_SCHEMA_VERSION,
  ICON_SAMPLE_SIZE,
  RAW_CANDIDATE_STATUSES,
  sha256Buffer,
  validateRawAccounting,
} from "./pokemon-icon-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "data", "pokemon-icon-reference.json");
const BASELINE_PATH = path.join(ROOT, "tests", "fixtures", "pokemon-icon-baseline.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveAssetPath(relativeUrl) {
  return path.join(ROOT, decodeURIComponent(relativeUrl.replace(/^\.\//u, "")));
}

export function validatePokemonIconManifest(manifest, baseline, options = {}) {
  const { verifyFiles = true } = options;
  const errors = [];
  const check = (condition, message) => {
    if (!condition) {
      errors.push(message);
    }
  };

  check(manifest.schemaVersion === ICON_MANIFEST_SCHEMA_VERSION, `schemaVersion must be ${ICON_MANIFEST_SCHEMA_VERSION}`);
  check(manifest.sample?.width === ICON_SAMPLE_SIZE.width, `sample.width must be ${ICON_SAMPLE_SIZE.width}`);
  check(manifest.sample?.height === ICON_SAMPLE_SIZE.height, `sample.height must be ${ICON_SAMPLE_SIZE.height}`);
  check(Array.isArray(manifest.icons), "icons must be an array");
  check(Array.isArray(manifest.rawCandidates), "rawCandidates must be an array");
  check(Array.isArray(manifest.visualCollisions), "visualCollisions must be an array");
  check(Array.isArray(manifest.unresolved), "unresolved must be an array");

  const accounting = validateRawAccounting(manifest.stats || {});
  check(accounting.valid, `raw accounting mismatch raw=${accounting.rawCandidateCount} accounted=${accounting.accounted}`);
  check(manifest.rawCandidates.length === manifest.stats?.rawCandidateCount, "rawCandidates length must equal rawCandidateCount");
  check(manifest.icons.length === manifest.stats?.canonicalCandidateCount, "icons length must equal canonicalCandidateCount");
  check(manifest.unresolved.length === manifest.stats?.unresolvedCount, "unresolved length must equal unresolvedCount");

  const rawStatusCounts = Object.fromEntries(
    RAW_CANDIDATE_STATUSES.map((status) => [
      status,
      manifest.rawCandidates.filter((entry) => entry.status === status).length,
    ]),
  );
  RAW_CANDIDATE_STATUSES.forEach((status) => {
    check(
      rawStatusCounts[status] === Number(manifest.stats?.rawAccounting?.[status] || 0),
      `raw status count mismatch for ${status}`,
    );
  });

  const names = manifest.rawCandidates.map((entry) => entry.pokemonName).filter(Boolean);
  const championsNames = new Set(
    manifest.rawCandidates
      .filter((entry) => entry.source === "champions" && entry.pokemonName)
      .map((entry) => entry.pokemonName),
  );
  const svOnlyNames = manifest.rawCandidates
    .filter((entry) => entry.source === "sv" && entry.pokemonName && !championsNames.has(entry.pokemonName))
    .map((entry) => entry.pokemonName);
  check(hashStringSet(names) === baseline.pokemonNameSetSha256, "pokemonName set differs from baseline");
  check(hashStringSet(svOnlyNames) === baseline.svOnlyPokemonNameSetSha256, "SV-only pokemonName set differs from baseline");
  check(new Set(names).size === baseline.pokemonNameCount, "pokemonName count differs from baseline");
  check(new Set(svOnlyNames).size === baseline.svOnlyPokemonNameCount, "SV-only pokemonName count differs from baseline");
  check(manifest.stats?.unresolvedCount <= baseline.unresolvedCount, "unresolved mappings increased");

  baseline.requiredMappings.forEach((requiredId) => {
    check(
      manifest.icons.some((icon) => icon.mergedIds?.includes(requiredId)),
      `required mapping missing: ${requiredId}`,
    );
  });

  manifest.icons.forEach((icon, index) => {
    const label = `icons[${index}] ${icon.id || "(missing id)"}`;
    check(Boolean(icon.id), `${label}: id missing`);
    check(Boolean(icon.pokemonName), `${label}: pokemonName missing`);
    check(Boolean(icon.speciesKey), `${label}: speciesKey missing`);
    check(Boolean(icon.variantKey), `${label}: variantKey missing`);
    check(Boolean(icon.source), `${label}: source missing`);
    check(Boolean(icon.path), `${label}: path missing`);
    check(Boolean(icon.fileHash), `${label}: fileHash missing`);
    check(Array.isArray(icon.aliases), `${label}: aliases missing`);
    check(Array.isArray(icon.mergedIds) && icon.mergedIds.includes(icon.id), `${label}: mergedIds invalid`);
    check(Array.isArray(icon.sources) && icon.sources.includes(icon.source), `${label}: sources invalid`);
    check(icon.canonical?.path === icon.path, `${label}: canonical path mismatch`);
    if (verifyFiles && icon.path) {
      const assetPath = resolveAssetPath(icon.path);
      check(fs.existsSync(assetPath), `${label}: asset missing ${icon.path}`);
      if (fs.existsSync(assetPath)) {
        const actualHash = sha256Buffer(fs.readFileSync(assetPath));
        check(actualHash === icon.fileHash, `${label}: file hash mismatch`);
      }
    }
  });

  manifest.visualCollisions.forEach((collision, index) => {
    check(collision.pokemonNames?.length > 1, `visualCollisions[${index}] must contain different names`);
    check(collision.entries?.length > 1, `visualCollisions[${index}] must contain multiple entries`);
  });

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      schemaVersion: manifest.schemaVersion,
      rawCandidateCount: manifest.stats?.rawCandidateCount || 0,
      canonicalCandidateCount: manifest.stats?.canonicalCandidateCount || 0,
      mergedDuplicateCount: manifest.stats?.mergedDuplicateCount || 0,
      visualCollisionGroupCount: manifest.stats?.visualCollisionGroupCount || 0,
      invalidCount: manifest.stats?.invalidCount || 0,
      unresolvedCount: manifest.stats?.unresolvedCount || 0,
      uniquePokemonNameCount: manifest.stats?.uniquePokemonNameCount || 0,
      uniqueSpeciesKeyCount: manifest.stats?.uniqueSpeciesKeyCount || 0,
      svOnlyPokemonNameCount: manifest.stats?.svOnlyPokemonNameCount || 0,
      pokemonNameSetPreserved: hashStringSet(names) === baseline.pokemonNameSetSha256,
      svOnlyPokemonNameSetPreserved: hashStringSet(svOnlyNames) === baseline.svOnlyPokemonNameSetSha256,
    },
  };
}

function main() {
  const result = validatePokemonIconManifest(readJson(MANIFEST_PATH), readJson(BASELINE_PATH));
  if (!result.valid) {
    result.errors.forEach((error) => console.error(`- ${error}`));
  }
  console.log(JSON.stringify(result.summary, null, 2));
  assert.equal(result.valid, true, `Manifest validation failed with ${result.errors.length} error(s)`);
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main();
}
