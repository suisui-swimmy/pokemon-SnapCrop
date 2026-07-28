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
