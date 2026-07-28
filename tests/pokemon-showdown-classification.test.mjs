import assert from "node:assert/strict";
import test from "node:test";
import {
  createShowdownClassificationResolver,
  parseShowdownPokedex,
  toShowdownId,
} from "../tools/pokemon-showdown-classification.mjs";

const POKEDEX = {
  pichu: {
    name: "Pichu",
    evos: ["Pikachu"],
  },
  pikachu: {
    name: "Pikachu",
    prevo: "Pichu",
    evos: ["Raichu"],
  },
  qwilfish: {
    name: "Qwilfish",
  },
  qwilfishhisui: {
    name: "Qwilfish-Hisui",
    baseSpecies: "Qwilfish",
    evos: ["Overqwil"],
  },
  overqwil: {
    name: "Overqwil",
    prevo: "Qwilfish-Hisui",
  },
  flabebe: {
    name: "Flabébé",
    evos: ["Floette"],
  },
  floette: {
    name: "Floette",
    prevo: "Flabébé",
    evos: ["Florges"],
  },
  floetteeternal: {
    name: "Floette-Eternal",
    baseSpecies: "Floette",
  },
  floettemega: {
    name: "Floette-Mega",
    baseSpecies: "Floette",
    forme: "Mega",
    battleOnly: "Floette-Eternal",
  },
  florges: {
    name: "Florges",
    prevo: "Floette",
  },
  espurr: {
    name: "Espurr",
    evos: ["Meowstic", "Meowstic-F"],
  },
  meowstic: {
    name: "Meowstic",
    prevo: "Espurr",
  },
  meowsticf: {
    name: "Meowstic-F",
    baseSpecies: "Meowstic",
    prevo: "Espurr",
  },
  meowsticmmega: {
    name: "Meowstic-M-Mega",
    baseSpecies: "Meowstic",
    forme: "M-Mega",
    battleOnly: "Meowstic",
  },
  meowsticfmega: {
    name: "Meowstic-F-Mega",
    baseSpecies: "Meowstic",
    forme: "F-Mega",
    battleOnly: "Meowstic-F",
  },
  articuno: {
    name: "Articuno",
    tags: ["Sub-Legendary"],
  },
  mewtwo: {
    name: "Mewtwo",
    tags: ["Restricted Legendary"],
  },
  mewtwomegax: {
    name: "Mewtwo-Mega-X",
    baseSpecies: "Mewtwo",
    forme: "Mega-X",
  },
  mew: {
    name: "Mew",
    tags: ["Mythical"],
  },
};

test("Pokemon Showdown IDs normalize punctuation and accents", () => {
  assert.equal(toShowdownId("Flabébé"), "flabebe");
  assert.equal(toShowdownId("Meowstic-F-Mega"), "meowsticfmega");
});

test("pokedex.ts object source is parsed without a TypeScript runtime", () => {
  const parsed = parseShowdownPokedex(`
export const Pokedex: import('../sim/dex-species').SpeciesDataTable = {
  qwilfish: { name: "Qwilfish" },
};
`);
  assert.equal(parsed.qwilfish.name, "Qwilfish");
});

test("form-specific evolution does not inherit base species evos", () => {
  const resolver = createShowdownClassificationResolver(POKEDEX);
  const qwilfish = resolver.resolve("Qwilfish");
  const qwilfishHisui = resolver.resolve("Qwilfish-Hisui");
  const floette = resolver.resolve("Floette");
  const floetteEternal = resolver.resolve("Floette-Eternal");

  assert.equal(qwilfish.canEvolve, false);
  assert.deepEqual(qwilfish.evoIds, []);
  assert.equal(qwilfishHisui.canEvolve, true);
  assert.deepEqual(qwilfishHisui.evoIds, ["overqwil"]);
  assert.equal(floette.canEvolve, true);
  assert.deepEqual(floette.evoIds, ["florges"]);
  assert.equal(floetteEternal.canEvolve, false);
  assert.equal(floetteEternal.evolutionDepth, 0);
});

test("battle forms inherit evolution state from battleOnly source", () => {
  const resolver = createShowdownClassificationResolver(POKEDEX);
  const floetteMega = resolver.resolve("Floette-Mega");
  const meowsticMaleMega = resolver.resolve("Meowstic-M-Mega");
  const meowsticFemaleMega = resolver.resolve("Meowstic-F-Mega");

  assert.equal(floetteMega.isMega, true);
  assert.equal(floetteMega.battleOnlySourceId, "floetteeternal");
  assert.equal(floetteMega.evolutionDepth, 0);
  assert.equal(floetteMega.canEvolve, false);
  assert.equal(meowsticMaleMega.evolutionDepth, 1);
  assert.equal(meowsticMaleMega.prevoId, "espurr");
  assert.equal(meowsticFemaleMega.evolutionDepth, 1);
  assert.equal(meowsticFemaleMega.prevoId, "espurr");
});

test("legend tags map to stable legend classes and inherit through baseSpecies", () => {
  const resolver = createShowdownClassificationResolver(POKEDEX);

  assert.equal(resolver.resolve("Articuno").legendClass, "sublegendary");
  assert.equal(resolver.resolve("Mewtwo").legendClass, "restricted");
  assert.equal(resolver.resolve("Mewtwo-Mega-X").legendClass, "restricted");
  assert.equal(resolver.resolve("Mew").legendClass, "mythical");
  assert.equal(resolver.resolve("Pikachu").legendClass, "normal");
});

