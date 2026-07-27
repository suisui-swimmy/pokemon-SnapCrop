import assert from "node:assert/strict";
import test from "node:test";
import {
  createPokemonIconRequestGate,
} from "../pokemon-icon-matcher.js";

test("a newer request makes the older result stale", () => {
  const gate = createPokemonIconRequestGate();
  gate.begin(10);
  assert.equal(gate.isCurrent(10), true);
  gate.observe(11);
  assert.equal(gate.isCurrent(10), false);
  assert.equal(gate.isCurrent(11), true);
});

test("reset invalidates an in-flight result", () => {
  const gate = createPokemonIconRequestGate();
  gate.begin(4);
  const resetRequestId = gate.reset();
  assert.equal(resetRequestId, 5);
  assert.equal(gate.isCurrent(4), false);
  assert.deepEqual(gate.snapshot(), {
    latestRequestId: 5,
    cancelledRequestIds: [],
  });
});

test("cancel invalidates the target and preserves monotonic request ids", () => {
  const gate = createPokemonIconRequestGate();
  gate.begin(7);
  const nextRequestId = gate.cancel(7);
  assert.equal(nextRequestId, 8);
  assert.equal(gate.isCurrent(7), false);
  gate.begin(8);
  assert.equal(gate.isCurrent(8), true);
});
