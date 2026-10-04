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
  assert.equal(catalog.translations.item.golisopite.name, "Golisopite");
  assert.equal(catalog.translations.item.golisopite.status, "adapter-temporary");
  assert.equal(pokemon.get("basculegion").name, "Basculegion");
  assert.equal(pokemon.get("basculegion").translationStatus, "needs-confirmation");
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
