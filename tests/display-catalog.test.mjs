import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync(new URL("../data/pokemon-display-catalog.json", import.meta.url), "utf8"));
const pokemon = new Map(catalog.pokemon.map((entry) => [entry.id, entry]));

test("generated names preserve external forms and the reviewed localization corrections", () => {
  for (const [id, expected] of [
    ["aegislash", "ギルガルド シールドフォルム"], ["aegislashblade", "ギルガルド ブレードフォルム"],
    ["vivillonicysnow", "ビビヨン ひょうせつのもよう"],
    ["taurospaldeaaqua", "ケンタロス パルデアのすがた・ウォーターしゅ"],
    ["taurospaldeablaze", "ケンタロス パルデアのすがた・ブレイズしゅ"],
    ["taurospaldeacombat", "ケンタロス パルデアのすがた・コンバットしゅ"],
  ]) {
    assert.equal(pokemon.get(id).name, expected);
    assert.equal(pokemon.get(id).translationStatus, "localized");
  }
  assert.equal(pokemon.has("aegislashshield"), false, "dictionary ID must not replace the external ID");
  assert.equal(new Set(catalog.pokemon.filter((entry) => entry.id.startsWith("vivillon")).map((entry) => entry.name)).size, 20);
  assert.equal(pokemon.get("golisopod").name, "グソクムシャ");
  assert.equal(pokemon.get("golisopodmega").isMega, true);
});

test("statistics translation dictionaries include new abilities and 性格 without inferred translations", () => {
  for (const [id, name] of [["eelevate", "うなぎのぼり"], ["auraguard", "はどうのぼうご"], ["firemane", "ほのおのたてがみ"]]) {
    assert.equal(catalog.translations.ability[id].name, name);
    assert.equal(catalog.translations.ability[id].status, "localized");
  }
  assert.equal(catalog.translations.nature.adamant.name, "いじっぱり");
  assert.equal(catalog.translations.move.kowtowcleave.name, "ドゲザン");
  assert.equal(catalog.translations.item.chopleberry.name, "ヨプのみ");
  for (const [id, name] of [
    ["golisopite", "グソクムシャナイト"], ["dragoninite", "カイリュナイト"],
    ["absolitez", "アブソルナイトＺ"], ["garchompitez", "ガブリアスナイトＺ"],
  ]) {
    assert.equal(catalog.translations.item[id].name, name);
    assert.equal(catalog.translations.item[id].status, "localized");
  }
  assert.equal(catalog.translations.type.stellar.name, "ステラ");
  assert.equal(pokemon.get("basculegion").name, "イダイトウ オスのすがた");
  assert.equal(pokemon.get("basculegionf").name, "イダイトウ メスのすがた");
  assert.equal(pokemon.get("basculegion").translationStatus, "localized");
  assert.equal(pokemon.get("absolmega").name, "メガアブソル");
  assert.ok(pokemon.get("absolmega").aliases.includes("アブソル メガアブソル"));
});

test("mega Pokemon and Mega Stone display suffixes consistently use fullwidth X/Y/Z", () => {
  for (const [pokemonId, pokemonName, itemId, itemName] of [
    ["charizardmegax", "メガリザードンＸ", "charizarditex", "リザードナイトＸ"],
    ["charizardmegay", "メガリザードンＹ", "charizarditey", "リザードナイトＹ"],
    ["mewtwomegax", "メガミュウツーＸ", "mewtwonitex", "ミュウツナイトＸ"],
    ["mewtwomegay", "メガミュウツーＹ", "mewtwonitey", "ミュウツナイトＹ"],
    ["raichumegax", "メガライチュウＸ", "raichunitex", "ライチュウナイトＸ"],
    ["raichumegay", "メガライチュウＹ", "raichunitey", "ライチュウナイトＹ"],
    ["absolmegaz", "メガアブソルＺ", "absolitez", "アブソルナイトＺ"],
    ["garchompmegaz", "メガガブリアスＺ", "garchompitez", "ガブリアスナイトＺ"],
    ["lucariomegaz", "メガルカリオＺ", "lucarionitez", "ルカリオナイトＺ"],
  ]) {
    assert.equal(pokemon.get(pokemonId).name, pokemonName);
    assert.equal(pokemon.get(pokemonId).displayNameJa, pokemonName);
    assert.equal(catalog.translations.item[itemId].name, itemName);
    assert.equal(catalog.translations.item[itemId].displayNameJa, itemName);
  }
  assert.deepEqual(catalog.pokemon.filter((entry) => entry.isMega && /[XYZ]$/u.test(entry.name)), []);
  assert.deepEqual(Object.values(catalog.translations.item).filter((entry) => /ナイト[XYZ]$/u.test(entry.name)), []);
});

test("shared Japanese labels retain separate IDs and explicit variant labels for display and search", () => {
  for (const [id, name, variant] of [
    ["greninjabond", "ゲッコウガ", "きずなへんげ"],
    ["rockruffdusk", "イワンコ", "マイペース"],
    ["meowsticmmega", "メガニャオニクス", "オス"],
    ["meowsticfmega", "メガニャオニクス", "メス"],
  ]) {
    const entry = pokemon.get(id);
    assert.equal(entry.name, `${name}（${variant}）`);
    assert.equal(entry.displayNameJa, name);
    assert.equal(entry.variantLabelJa, variant);
    assert.ok(entry.aliases.includes(name));
    assert.ok(entry.aliases.includes(entry.name));
  }
  assert.equal(pokemon.get("greninja").name, "ゲッコウガ");
  assert.equal(pokemon.get("rockruff").variantLabelJa, undefined);
  assert.equal(catalog.translations.move.hiddenpower.name, "めざめるパワー");
  assert.equal(catalog.translations.move.hiddenpowerfire.name, "めざめるパワー（ほのお）");
  assert.equal(catalog.translations.move.hiddenpowerice.name, "めざめるパワー（こおり）");
  assert.equal(Object.keys(catalog.translations.move).filter((id) => id.startsWith("hiddenpower")).length, 17);
  assert.equal(catalog.translations.ability.asoneglastrier.name, "じんばいったい（ブリザポス）");
  assert.equal(catalog.translations.ability.asonespectrier.name, "じんばいったい（レイスポス）");
});

test("public API scope classifications remain distinct from missing translations", () => {
  for (const [entry, category] of [
    [pokemon.get("ababo"), "cap"], [pokemon.get("pokestarblackdoor"), "pokestar"],
    [pokemon.get("missingno"), "glitch"], [catalog.translations.move.paleowave, "cap"],
    [catalog.translations.item.crucibellite, "cap"],
  ]) {
    assert.equal(entry.status || entry.translationStatus, "out-of-scope");
    assert.equal(entry.name, entry.canonicalName);
    assert.equal(entry.category, category);
    assert.equal(entry.reason, "outside-localization-scope");
    assert.ok(entry.noteJa);
    assert.equal(entry.displayNameJa, undefined);
  }
  assert.equal(catalog.translations.move.baddybad.status, "unsupported");
  assert.equal(catalog.translations.move.baddybad.name, "Baddy Bad");
  assert.equal(catalog.translations.move.baddybad.reason, "missing-japanese-mapping");
  assert.equal(catalog.translations.ability.noability.name, "特性なし");
  assert.equal(catalog.translations.ability.noability.labelKind, "ui-label");
  assert.equal(catalog.translations.move.nomove, undefined, "calc-only placeholders are not Showdown moves");
});

test("all six kinds match the public API snapshot coverage", () => {
  assert.equal(catalog.provenance.localization.schemaVersion, 2);
  const sets = { pokemon: catalog.pokemon, ...Object.fromEntries(Object.entries(catalog.translations).map(([kind, entries]) => [kind, Object.values(entries)])) };
  const total = { localized: 0, "needs-confirmation": 0, unsupported: 0, "out-of-scope": 0 };
  assert.deepEqual(Object.keys(sets).sort(), ["ability", "item", "move", "nature", "pokemon", "type"]);
  for (const [kind, entries] of Object.entries(sets)) {
    const counts = { localized: 0, "needs-confirmation": 0, unsupported: 0, "out-of-scope": 0 };
    for (const entry of entries) {
      const status = entry.status || entry.translationStatus;
      assert.ok(Object.hasOwn(counts, status));
      counts[status] += 1;
      total[status] += 1;
    }
    assert.deepEqual(counts, catalog.provenance.localization.summary[kind], kind);
  }
  assert.deepEqual(total, { localized: 3350, "needs-confirmation": 0, unsupported: 13, "out-of-scope": 125 });
});

test("catalog is names/classification only and contains reproducible provenance and license", () => {
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(pokemon.size, catalog.pokemon.length);
  const forbiddenKeys = new Set(["artwork", "baseStats", "types", "moves", "image_path", "percentage", "percentage_value"]);
  function inspect(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) { assert.equal(forbiddenKeys.has(key), false, key); inspect(child); }
  }
  inspect(catalog.pokemon);
  inspect(catalog.translations);
  assert.equal(catalog.provenance.usage, "display-only");
  assert.equal(catalog.provenance.showdown.revision, catalog.provenance.localization.showdownCommit);
  assert.match(fs.readFileSync(new URL("../data/showdown-LICENSE.txt", import.meta.url), "utf8"), /MIT License/);
});
