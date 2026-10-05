import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { MessageChannel } from "node:worker_threads";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
function harness(controller) {
  const listeners = new Map();
  const serviceWorker = {
    controller,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };
  let timeout;
  const context = vm.createContext({
    document: { addEventListener() {} }, navigator: { serviceWorker }, MessageChannel,
    setTimeout: (callback) => { timeout = callback; return 1; }, clearTimeout() {},
  });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, "globalThis.api = {state, ensureRemoteCachePolicy};})();"), context);
  return { ...context.api, serviceWorker, listeners, expire: () => timeout() };
}

test("remote fetching is held until an old controller is replaced by the no-external-cache worker", async () => {
  let legacyMessages = 0;
  const h = harness({ postMessage(_, ports) { legacyMessages += 1; ports[0].close(); } });
  let finished = false;
  const waiting = h.ensureRemoteCachePolicy().then(() => { finished = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(legacyMessages, 1);
  assert.equal(finished, false);
  h.serviceWorker.controller = { postMessage(message, ports) {
    assert.equal(message.type, "remote-cache-policy");
    ports[0].postMessage({ cacheName: "pokemon-snapcrop-v1.7.5", externalCaching: false });
    ports[0].close();
  } };
  h.listeners.get("controllerchange")();
  await waiting;
  assert.equal(finished, true);
  assert.equal(h.listeners.size, 0);
});

test("uncontrolled pages can fetch and failed policy verification is retryable", async () => {
  const h = harness(null);
  await h.ensureRemoteCachePolicy();
  h.serviceWorker.controller = { postMessage(_, ports) { ports[0].close(); } };
  const waiting = h.ensureRemoteCachePolicy();
  await new Promise((resolve) => setImmediate(resolve));
  h.expire();
  await assert.rejects(waiting, /保存方式の更新を確認できませんでした/u);
  assert.equal(h.state.remoteCachePolicyReady, null);
  assert.equal(h.listeners.size, 0);
});
