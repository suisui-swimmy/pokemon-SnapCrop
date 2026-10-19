import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

export const appSource = fs.readFileSync(new URL("../../app.js", import.meta.url), "utf8");
export const best = (refIndex, tier = "strong") => ({ refIndex, tier, bestScore: tier === "strong" ? 0.95 : 0.72, margin: 0.2 });
export function samples(kind = "strong") {
  return {
    icon: { red: 0.2, pink: kind === "normal" ? 0.4 : 0.02, white: kind === "weak" ? 0.12 : 0.25, dark: 0.1, meanPeak: 0.5,
      shape: { templateReady: true, matched: kind !== "normal", whiteCoverage: 0.95, redCoverage: 0.9, spill: 0.03 } },
    color: { red: 0.02, pink: 0, white: 0.02, dark: 0.2, meanPeak: 0.2 },
    percent: { red: 0, pink: 0, white: 0.3, dark: 0.1, meanPeak: 0.5 },
  };
}

export function harness({ logging = true, stable = true, selected = [1, 2, 3, 4, 0, 0] } = {}) {
  const clock = { now: 1000 };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  }
  const output = [];
  const context = vm.createContext({ crypto: webcrypto, Date: ClockDate, output,
    document: { addEventListener() {} }, window: { cancelAnimationFrame() {} } });
  vm.runInContext(appSource.replace(/\}\)\(\);\s*$/u, `
    // Mock reads/rendering only; production signals, mapping, timing and logs run unchanged.
    sampleFaintHudRoi = (_, crop) => {
      globalThis.sampleCalls++;
      return globalThis.inputs[crop.x > 1500 ? 1 : 0][crop.width > 56 ? "percent" : crop.width > 49 ? "icon" : "color"];
    };
    drawCropPanel = () => {}; refreshCropPanels = () => {}; triggerPickOverlayCorrectionFrame = () => {};
    appendTerminalEntry = (lines) => output.push(...lines);
    elements.video = { videoWidth: 1920, videoHeight: 1080 };
    globalThis.api = { state, elements, updateFaintDetection, startMatchLog, finishMatchLog,
      formatMatchLog, resetFaintOverlayState, resetPickOverlayState, clearReferenceImages,
      setPickOverlayOrderSlot, clearPickOverlaySlot, recordFaintDiagnosticEvent,
      beginFaintDiagnosticComparison, finishFaintDiagnosticComparison,
      createFaintIconMask, matchFaintIconShape };
  })();`), context);
  const api = context.api;
  api.state.mode = "ready";
  const reference = { width: 299, height: 807 };
  api.state.references.enemy = reference;
  api.state.autoSnap.pickOverlay.ordersByRefIndex = [...selected];
  context.inputs = [samples("normal"), samples("normal")];
  if (stable) for (const time of [500, 750]) api.updateFaintDetection([best(0), best(1)], [{ ready: true }, { ready: true }], time);
  api.startMatchLog(clock.now, {});
  const match = api.state.matchLog.current;
  if (!logging) match.faintDiagnostic = null;
  api.state.matchLog.references.enemy = { reference, matchId: match.id, diagnostic: match.diagnostic,
    captureId: webcrypto.randomUUID(), capturedAt: clock.now };
  context.inputs = [samples(), samples("normal")];
  context.sampleCalls = 0;
  const step = (candidates = [best(0), best(1)], advance = 250, gates = [{ ready: true }, { ready: true }], screenAllowed = true) => {
    clock.now += advance;
    api.updateFaintDetection(candidates, gates, clock.now, screenAllowed);
  };
  const repeat = (count = 3, ...args) => { for (let i = 0; i < count; i++) step(...args); };
  return { ...api, context, clock, output, match, step, repeat, diagnostic: match.faintDiagnostic, pick: api.state.autoSnap.pickOverlay };
}
