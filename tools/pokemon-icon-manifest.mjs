import crypto from "node:crypto";

export const ICON_MANIFEST_SCHEMA_VERSION = 2;
export const ICON_SAMPLE_SIZE = Object.freeze({
  width: 64,
  height: 64,
});
export const RAW_CANDIDATE_STATUSES = Object.freeze([
  "canonical",
  "merged_duplicate",
  "visual_collision",
  "invalid",
]);
export const SOURCE_PRIORITY = Object.freeze({
  champions: 0,
  sv: 1,
});

function compareSource(left, right) {
  const priorityDifference = (SOURCE_PRIORITY[left.source] ?? 99) - (SOURCE_PRIORITY[right.source] ?? 99);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }
  const idDifference = String(left.id || "").localeCompare(String(right.id || ""), "en");
  if (idDifference !== 0) {
    return idDifference;
  }
  return String(left.path || "").localeCompare(String(right.path || ""), "en");
}

function uniqueSorted(values, locale = "en") {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, locale));
}

export function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashStringSet(values, locale = "ja") {
  return sha256Buffer(uniqueSorted(values, locale).join("\n"));
}

export function createRawAuditEntry(entry, status, details = {}) {
  return {
    id: entry.id,
    pokemonName: entry.pokemonName || "",
    speciesKey: entry.speciesKey || "",
    variantKey: entry.variantKey || "",
    source: entry.source,
    path: entry.path,
    fileHash: entry.fileHash || "",
    status,
    ...details,
  };
}

export function groupExactIconCandidates(rawEntries) {
  const resolvedEntries = rawEntries.filter((entry) => entry.pokemonName && entry.fileHash);
  const invalidEntries = rawEntries.filter((entry) => !entry.pokemonName || !entry.fileHash);
  const entriesByHash = new Map();
  resolvedEntries.forEach((entry) => {
    const group = entriesByHash.get(entry.fileHash) || [];
    group.push(entry);
    entriesByHash.set(entry.fileHash, group);
  });

  const icons = [];
  const rawAudit = [];
  const visualCollisions = [];

  [...entriesByHash.entries()]
    .sort(([leftHash], [rightHash]) => leftHash.localeCompare(rightHash, "en"))
    .forEach(([fileHash, hashEntries]) => {
      const entriesByName = new Map();
      hashEntries.forEach((entry) => {
        const nameEntries = entriesByName.get(entry.pokemonName) || [];
        nameEntries.push(entry);
        entriesByName.set(entry.pokemonName, nameEntries);
      });

      const pokemonNames = uniqueSorted([...entriesByName.keys()], "ja");
      const collisionId = pokemonNames.length > 1 ? `sha256:${fileHash}` : "";
      if (collisionId) {
        visualCollisions.push({
          id: collisionId,
          kind: "exact_file_hash",
          fingerprint: fileHash,
          pokemonNames,
          entries: hashEntries
            .slice()
            .sort(compareSource)
            .map((entry) => ({
              id: entry.id,
              pokemonName: entry.pokemonName,
              speciesKey: entry.speciesKey,
              source: entry.source,
              path: entry.path,
            })),
        });
      }

      [...entriesByName.entries()]
        .sort(([leftName], [rightName]) => leftName.localeCompare(rightName, "ja"))
        .forEach(([, sameNameEntries]) => {
          const ordered = sameNameEntries.slice().sort(compareSource);
          const canonical = ordered[0];
          const mergedIds = ordered.map((entry) => entry.id);
          const sources = uniqueSorted(ordered.map((entry) => entry.source));
          const paths = ordered.map((entry) => entry.path);
          const speciesKeys = uniqueSorted(ordered.map((entry) => entry.speciesKey));
          const variantKeys = uniqueSorted(ordered.map((entry) => entry.variantKey));

          icons.push({
            id: canonical.id,
            pokemonName: canonical.pokemonName,
            speciesKey: canonical.speciesKey,
            variantKey: canonical.variantKey,
            speciesResolution: canonical.speciesResolution,
            source: canonical.source,
            path: canonical.path,
            aliases: mergedIds.filter((id) => id !== canonical.id),
            mergedIds,
            sources,
            paths,
            speciesKeys,
            variantKeys,
            fileHash,
            canonical: {
              id: canonical.id,
              source: canonical.source,
              path: canonical.path,
            },
            visualCollisionId: collisionId || null,
          });

          ordered.forEach((entry, index) => {
            if (index > 0) {
              rawAudit.push(createRawAuditEntry(entry, "merged_duplicate", {
                canonicalId: canonical.id,
                canonicalPath: canonical.path,
              }));
              return;
            }
            rawAudit.push(createRawAuditEntry(entry, collisionId ? "visual_collision" : "canonical", {
              canonicalId: canonical.id,
              canonicalPath: canonical.path,
              visualCollisionId: collisionId || null,
            }));
          });
        });
    });

  invalidEntries.forEach((entry) => {
    rawAudit.push(createRawAuditEntry(entry, "invalid", {
      reason: entry.invalidReason || (!entry.pokemonName ? "name_unresolved" : "file_hash_missing"),
    }));
  });

  icons.sort((left, right) => {
    const sourceDifference = compareSource(left, right);
    if (sourceDifference !== 0) {
      return sourceDifference;
    }
    return left.pokemonName.localeCompare(right.pokemonName, "ja");
  });
  rawAudit.sort((left, right) => {
    const sourceDifference = compareSource(left, right);
    if (sourceDifference !== 0) {
      return sourceDifference;
    }
    return left.status.localeCompare(right.status, "en");
  });
  visualCollisions.sort((left, right) => left.id.localeCompare(right.id, "en"));

  const statusCounts = Object.fromEntries(
    RAW_CANDIDATE_STATUSES.map((status) => [
      status,
      rawAudit.filter((entry) => entry.status === status).length,
    ]),
  );

  return {
    icons,
    rawAudit,
    visualCollisions,
    statusCounts,
  };
}

export function buildIconManifestStats({
  rawEntries,
  icons,
  rawAudit,
  visualCollisions,
  unresolved,
}) {
  const rawBySource = {};
  const canonicalPrimaryBySource = {};
  const sourceNameSets = new Map();
  rawEntries.forEach((entry) => {
    rawBySource[entry.source] = (rawBySource[entry.source] || 0) + 1;
    if (entry.pokemonName) {
      const names = sourceNameSets.get(entry.source) || new Set();
      names.add(entry.pokemonName);
      sourceNameSets.set(entry.source, names);
    }
  });
  icons.forEach((entry) => {
    canonicalPrimaryBySource[entry.source] = (canonicalPrimaryBySource[entry.source] || 0) + 1;
  });

  const allNames = uniqueSorted(rawEntries.map((entry) => entry.pokemonName), "ja");
  const allSpeciesKeys = uniqueSorted(rawEntries.map((entry) => entry.speciesKey));
  const championsNames = sourceNameSets.get("champions") || new Set();
  const svNames = sourceNameSets.get("sv") || new Set();
  const svOnlyNames = uniqueSorted([...svNames].filter((name) => !championsNames.has(name)), "ja");
  const statusCounts = Object.fromEntries(
    RAW_CANDIDATE_STATUSES.map((status) => [
      status,
      rawAudit.filter((entry) => entry.status === status).length,
    ]),
  );
  const speciesFallbackCount = rawEntries.filter((entry) => entry.speciesResolution?.fallback).length;

  return {
    rawCandidateCount: rawEntries.length,
    canonicalCandidateCount: icons.length,
    mergedDuplicateCount: statusCounts.merged_duplicate,
    visualCollisionGroupCount: visualCollisions.length,
    visualCollisionEntryCount: statusCounts.visual_collision,
    invalidCount: statusCounts.invalid,
    unresolvedCount: unresolved.length,
    uniquePokemonNameCount: allNames.length,
    uniqueSpeciesKeyCount: allSpeciesKeys.length,
    speciesFallbackCount,
    sourceCounts: {
      raw: rawBySource,
      canonicalPrimary: canonicalPrimaryBySource,
    },
    sourceNameCounts: Object.fromEntries(
      [...sourceNameSets.entries()]
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([source, names]) => [source, names.size]),
    ),
    svOnlyPokemonNameCount: svOnlyNames.length,
    pokemonNameSetSha256: hashStringSet(allNames),
    svOnlyPokemonNameSetSha256: hashStringSet(svOnlyNames),
    rawAccounting: statusCounts,
  };
}

export function validateRawAccounting(stats) {
  const accounted = RAW_CANDIDATE_STATUSES.reduce(
    (total, status) => total + Number(stats.rawAccounting?.[status] || 0),
    0,
  );
  return {
    valid: accounted === stats.rawCandidateCount,
    accounted,
    rawCandidateCount: stats.rawCandidateCount,
  };
}
