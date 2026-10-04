export function createBenchmarkEnvironment({
  appVersion,
  manifest,
  candidateStats,
}) {
  return {
    appVersion: String(appVersion || ""),
    manifestSchemaVersion: Number(manifest?.schemaVersion) || null,
    recognitionCandidateCount: Number(manifest?.icons?.length) || 0,
    loadedCandidateCount: Number(candidateStats?.loadedCount) || 0,
    workerProtocolVersion: Number(candidateStats?.protocolVersion) || null,
    providerDataVersion: manifest?.dataVersion || null,
    providerGeneratedAt: manifest?.generatedAt || null,
    assetFingerprints: candidateStats?.assetFingerprints || [],
  };
}

export function createBenchmarkLabelResolver(catalog) {
  const normalize = (value) => String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en");
  const names = new Map();
  for (const entry of catalog?.pokemon || []) {
    for (const label of [entry.id, entry.canonicalName, entry.name, ...(entry.aliases || [])]) {
      const key = normalize(label);
      if (!key) continue;
      const ids = names.get(key) || new Set();
      ids.add(entry.id);
      names.set(key, ids);
    }
  }
  return (label) => {
    const candidates = [...(names.get(normalize(label)) || [])].sort();
    return candidates.length === 1
      ? { status: "resolved", showdownId: candidates[0] }
      : { status: candidates.length ? "ambiguous" : "unknown", showdownId: "", candidates };
  };
}

export function createBenchmarkRunRecord(run) {
  return {
    completedAt: run.completedAt,
    matcherVersion: run.message.result?.version || null,
    result: run.message.result,
    workerTiming: run.message.workerTiming,
  };
}
