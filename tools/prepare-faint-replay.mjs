import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

// A compact decision replay, not video: no image, name, match ID or API data is retained.
export function prepareFaintReplay(text, expectedSlots) {
  const sections = new Map();
  let section = "";
  for (const line of text.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    if (line.startsWith("---")) { section = line; sections.set(section, []); }
    else sections.get(section)?.push(line);
  }
  const read = (heading) => (sections.get(heading) || []).filter(line => /^\d{4}-.*\{/u.test(line))
    .map(line => JSON.parse(line.slice(line.indexOf("{"))));
  const observations = read("--- 瀕死の詳細判定 ---");
  const picks = read("--- 採番の詳細比較 ---");
  if (!observations.length || observations.some(row => row.hud.some(hud => !hud.samples?.icon?.shape))) {
    throw new Error("Shape diagnostics are required; a legacy colour-only TXT cannot replay icon matching.");
  }
  let pickIndex = 0, orders = [0, 0, 0, 0, 0, 0];
  const frames = observations.map(row => {
    while (pickIndex < picks.length && picks[pickIndex].at <= row.at) orders = picks[pickIndex++].ordersAfter;
    return [row.matchElapsedMs, orders, !row.hud.some(hud => hud.outcome === "screen_blocked"),
      row.hud.map(hud => [hud.candidate.refIndex, hud.candidate.tier, hud.candidate.score, hud.candidate.margin,
        hud.gate?.ready ?? null, hud.samples.icon.shape.matched, hud.samples.icon.shape.templateReady])];
  });
  return {
    schemaVersion: 1, sourceAppVersion: text.match(/アプリ: ([^\r\n]+)/u)?.[1],
    sourceSha256: createHash("sha256").update(text).digest("hex"),
    description: "Recorded candidate/gate/shape decisions; image matching and capture speed are not replayed.",
    frameFields: ["elapsedMs", "orders", "sceneAllowsIdentity", "hud"],
    hudFields: ["refIndex", "tier", "score", "margin", "gateReady", "shapeMatched", "templateReady"],
    expectedSlots, frames,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, expected] = process.argv.slice(2);
  if (!input || !output || !/^[1-6](,[1-6])*$/u.test(expected || "")) {
    throw new Error("Usage: node tools/prepare-faint-replay.mjs <match.txt> <output.json> <expected slots, e.g. 3,1,5,6>");
  }
  const fixture = prepareFaintReplay(fs.readFileSync(input, "utf8"), expected.split(",").map(Number));
  fs.writeFileSync(output, JSON.stringify(fixture, null, 0) + "\n");
  console.log(JSON.stringify({ frames: fixture.frames.length, bytes: fs.statSync(output).size, expected: fixture.expectedSlots }));
}
