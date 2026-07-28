import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { sha256Buffer } from "./pokemon-icon-manifest.mjs";

const SHOWDOWN_SOURCE_FILES = Object.freeze({
  pokedex: "data/pokedex.ts",
  tags: "data/tags.ts",
  license: "LICENSE",
});

const LEGEND_CLASS_BY_TAG = Object.freeze({
  Mythical: "mythical",
  "Sub-Legendary": "sublegendary",
  "Restricted Legendary": "restricted",
});

const EXPLICIT_ID_ALIASES = Object.freeze({
  gourgeistjumbo: "gourgeistsuper",
});

export function toShowdownId(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "");
}

export function parseShowdownPokedex(source) {
  const objectSource = String(source || "")
    .trim()
    .replace(
      /^export const Pokedex:\s*import\([^\n]+\)\.SpeciesDataTable\s*=\s*/u,
      "",
    )
    .replace(/;\s*$/u, "");

  if (!objectSource.startsWith("{") || !objectSource.endsWith("}")) {
    throw new Error("Unsupported Pokemon Showdown pokedex.ts format");
  }

  const pokedex = vm.runInNewContext(
    `(${objectSource})`,
    Object.create(null),
    { timeout: 5000 },
  );
  if (!pokedex || typeof pokedex !== "object" || Array.isArray(pokedex)) {
    throw new Error("Pokemon Showdown pokedex.ts did not produce an object");
  }
  return pokedex;
}

function readGitRevision(showdownRoot) {
  const gitPath = path.join(showdownRoot, ".git");
  const headPath = path.join(gitPath, "HEAD");
  if (!fs.existsSync(headPath)) {
    return "";
  }

  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) {
    return /^[0-9a-f]{40}$/u.test(head) ? head : "";
  }

  const referenceName = head.slice("ref: ".length);
  const referencePath = path.join(gitPath, ...referenceName.split("/"));
  if (fs.existsSync(referencePath)) {
    const revision = fs.readFileSync(referencePath, "utf8").trim();
    return /^[0-9a-f]{40}$/u.test(revision) ? revision : "";
  }

  const packedRefsPath = path.join(gitPath, "packed-refs");
  if (!fs.existsSync(packedRefsPath)) {
    return "";
  }
  const packedRef = fs.readFileSync(packedRefsPath, "utf8")
    .split(/\r?\n/u)
    .find((line) => line.endsWith(` ${referenceName}`));
  return packedRef?.split(" ")[0] || "";
}

function findShowdownRoot(rootCandidates) {
  const root = rootCandidates.find((candidate) =>
    candidate
    && Object.values(SHOWDOWN_SOURCE_FILES).every((relativePath) =>
      fs.existsSync(path.join(candidate, relativePath))));
  if (root) {
    return root;
  }

  const expected = rootCandidates
    .filter(Boolean)
    .map((candidate) => path.join(candidate, SHOWDOWN_SOURCE_FILES.pokedex))
    .join(", ");
  throw new Error(
    `Pokemon Showdown source not found. Clone https://github.com/smogon/pokemon-showdown.git to an others/pokemon-showdown folder. Expected: ${expected}`,
  );
}

export function loadShowdownClassificationData(rootCandidates) {
  const showdownRoot = findShowdownRoot(rootCandidates);
  const fileBuffers = Object.fromEntries(
    Object.entries(SHOWDOWN_SOURCE_FILES).map(([key, relativePath]) => [
      key,
      fs.readFileSync(path.join(showdownRoot, relativePath)),
    ]),
  );
  const revision = readGitRevision(showdownRoot);

  return {
    pokedex: parseShowdownPokedex(fileBuffers.pokedex.toString("utf8")),
    source: {
      name: "pokemon-showdown",
      repository: "https://github.com/smogon/pokemon-showdown",
      revision: revision || null,
      license: "MIT",
      files: Object.fromEntries(
        Object.entries(SHOWDOWN_SOURCE_FILES).map(([key, relativePath]) => [
          key,
          {
            path: relativePath.replace(/\\/gu, "/"),
            sha256: sha256Buffer(fileBuffers[key]),
          },
        ]),
      ),
    },
  };
}

function createEntryIndexes(pokedex) {
  const entries = new Map();
  const baseFormAliases = new Map();
  const cosmeticAliases = new Map();

  Object.entries(pokedex).forEach(([key, entry]) => {
    const id = toShowdownId(key);
    const normalizedEntry = {
      ...entry,
      id,
    };
    entries.set(id, normalizedEntry);
    entries.set(toShowdownId(entry.name), normalizedEntry);

    if (entry.baseForme) {
      baseFormAliases.set(
        toShowdownId(`${entry.name}-${entry.baseForme}`),
        normalizedEntry,
      );
    }
    (entry.cosmeticFormes || []).forEach((cosmeticName) => {
      cosmeticAliases.set(toShowdownId(cosmeticName), normalizedEntry);
    });
  });

  return {
    entries,
    baseFormAliases,
    cosmeticAliases,
  };
}

function getEntry(entries, value) {
  return entries.get(toShowdownId(value)) || null;
}

function getInheritedTags(entry, entries) {
  let current = entry;
  const visited = new Set();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (Array.isArray(current.tags) && current.tags.length) {
      return [...current.tags];
    }
    current = current.baseSpecies
      ? getEntry(entries, current.baseSpecies)
      : null;
  }
  return [];
}

function getLegendClass(tags) {
  for (const [tag, legendClass] of Object.entries(LEGEND_CLASS_BY_TAG)) {
    if (tags.includes(tag)) {
      return legendClass;
    }
  }
  return "normal";
}

function getBattleOnlySource(entry, entries) {
  const battleOnlyIds = (Array.isArray(entry.battleOnly)
    ? entry.battleOnly
    : [entry.battleOnly])
    .filter(Boolean)
    .map(toShowdownId);
  const battleOnlyEntry = battleOnlyIds
    .map((id) => getEntry(entries, id))
    .find(Boolean);
  return {
    battleOnlyIds,
    battleOnlyEntry,
  };
}

function isMegaEntry(entry) {
  return toShowdownId(entry.forme).includes("mega")
    || /-mega(?:-|$)/iu.test(entry.name || "");
}

function getEvolutionSource(entry, entries) {
  const {
    battleOnlyIds,
    battleOnlyEntry,
  } = getBattleOnlySource(entry, entries);
  if (battleOnlyEntry) {
    return {
      battleOnlyIds,
      source: battleOnlyEntry,
    };
  }

  if (isMegaEntry(entry) && entry.baseSpecies) {
    const baseEntry = getEntry(entries, entry.baseSpecies);
    if (baseEntry) {
      return {
        battleOnlyIds,
        source: baseEntry,
      };
    }
  }

  return {
    battleOnlyIds,
    source: entry,
  };
}

function getEvolutionDepth(entry, entries) {
  let depth = 0;
  let current = entry;
  const visited = new Set();
  while (current?.prevo) {
    const nextId = toShowdownId(current.prevo);
    if (!nextId || visited.has(nextId)) {
      throw new Error(`Invalid Pokemon Showdown evolution chain at ${entry.id}`);
    }
    visited.add(nextId);
    current = getEntry(entries, nextId);
    if (!current) {
      throw new Error(
        `Pokemon Showdown prevo not found: ${nextId} (from ${entry.id})`,
      );
    }
    depth += 1;
  }
  return depth;
}

export function createShowdownClassificationResolver(pokedex) {
  const {
    entries,
    baseFormAliases,
    cosmeticAliases,
  } = createEntryIndexes(pokedex);

  function resolveCandidate(candidateIds) {
    for (const candidateId of candidateIds) {
      const exact = getEntry(entries, candidateId);
      if (exact) {
        return {
          entry: exact,
          method: "exact-form",
          fallback: false,
        };
      }

      const explicitAlias = EXPLICIT_ID_ALIASES[toShowdownId(candidateId)];
      if (explicitAlias) {
        const aliasEntry = getEntry(entries, explicitAlias);
        if (aliasEntry) {
          return {
            entry: aliasEntry,
            method: "id-alias",
            fallback: false,
          };
        }
      }

      const baseFormAlias = baseFormAliases.get(toShowdownId(candidateId));
      if (baseFormAlias) {
        return {
          entry: baseFormAlias,
          method: "base-form-alias",
          fallback: false,
        };
      }

      const cosmeticAlias = cosmeticAliases.get(toShowdownId(candidateId));
      if (cosmeticAlias) {
        return {
          entry: cosmeticAlias,
          method: "cosmetic-fallback",
          fallback: true,
        };
      }
    }
    return null;
  }

  return {
    resolve(iconId, context = {}) {
      const candidateIds = [
        iconId,
        context.variantKey?.replace(/^variant:/u, ""),
      ].filter(Boolean);
      const resolved = resolveCandidate(candidateIds);
      if (!resolved) {
        return null;
      }

      const {
        entry,
        method,
        fallback,
      } = resolved;
      const {
        battleOnlyIds,
        source: evolutionSource,
      } = getEvolutionSource(entry, entries);
      const tags = getInheritedTags(entry, entries);
      const evoIds = (evolutionSource.evos || []).map(toShowdownId);
      const prevoId = toShowdownId(evolutionSource.prevo);
      const isMega = isMegaEntry(entry);

      return {
        showdownId: entry.id,
        isMega,
        legendClass: getLegendClass(tags),
        showdownTags: tags,
        evolutionDepth: getEvolutionDepth(evolutionSource, entries),
        hasPreEvolution: Boolean(prevoId),
        canEvolve: evoIds.length > 0,
        isFinalEvolution: evoIds.length === 0,
        baseSpeciesId: toShowdownId(entry.baseSpecies || entry.name),
        battleOnlySourceId: battleOnlyIds[0] || null,
        evolutionSourceId: evolutionSource.id,
        prevoId: prevoId || null,
        evoIds,
        classificationSource: "pokemon-showdown",
        classificationMethod: method,
        classificationFallback: fallback,
      };
    },
  };
}
