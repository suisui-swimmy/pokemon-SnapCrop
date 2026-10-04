import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");

// Explicit files only: never copy source checkouts, captured diagnostics, old
// bundled sprite sets, or unrelated future files into the public Pages artifact.
export const PUBLIC_FILES = Object.freeze([
  "index.html", "style.css", "app.js", "pokemon-icon-matcher.js", "pokemon-icon-worker.js",
  "battle-api.js", "battle-statistics.js", "manifest.webmanifest", "sw.js",
  "data/pokemon-display-catalog.json", "data/showdown-LICENSE.txt", "LICENSE", "THIRD_PARTY_NOTICES.md",
  "icons/icon-192.png", "icons/icon-512.png",
  "assets/auto/loading-indicator.png", "assets/auto/selection-timer-icon.png",
  "assets/auto/waiting-timer-icon.png", "assets/auto/win-icon.png",
  "assets/ui/info.svg", "assets/ui/reload.svg", "assets/ui/play.svg",
  "assets/ui/fullscreen-shrink.svg", "assets/ui/fullscreen-expand.svg", "assets/ui/night-mode.svg",
  "assets/ui/light-mode.svg", "assets/ui/volume-2.svg", "assets/ui/volume-x.svg",
  "assets/pick-overlay-badge-1.svg", "assets/pick-overlay-badge-2.svg", "assets/pick-overlay-badge-3.svg",
  "assets/pick-overlay-badge-4.svg", "assets/pick-overlay-flash-frame.svg",
  "assets/pick-overlay-correction-frame.svg", "assets/pick-overlay-faint-frame.svg",
]);

export function buildPages({ root = ROOT } = {}) {
  const sourceRoot = path.resolve(root);
  const output = path.resolve(sourceRoot, "dist");
  if (path.dirname(output) !== sourceRoot || path.basename(output) !== "dist") throw new Error("Unexpected Pages output directory");
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error("Pages output must not be a symbolic link");
  for (const relative of PUBLIC_FILES) {
    const source = path.resolve(sourceRoot, relative);
    const real = fs.realpathSync(source);
    if (!real.startsWith(`${fs.realpathSync(sourceRoot)}${path.sep}`) || !fs.statSync(source).isFile()) {
      throw new Error(`Public source must be a file inside the repository: ${relative}`);
    }
  }
  fs.rmSync(output, { recursive: true, force: true });
  for (const relative of PUBLIC_FILES) {
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, relative), destination);
  }
  fs.writeFileSync(path.join(output, ".nojekyll"), "");
  return { output, files: PUBLIC_FILES.length + 1 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(buildPages()));
}
