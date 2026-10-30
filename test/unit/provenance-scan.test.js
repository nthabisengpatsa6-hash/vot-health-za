import test from "node:test";
import assert from "node:assert/strict";
import {assertNoSecrets, assertPublic} from "../../scripts/lib/noteArtifacts.mjs";
import {inspectProvenance} from "../../scripts/scan-provenance.mjs";

test("records refuse a supplied key, headers, private fields and locked seeds", () => {
  const key = ["offline", "unique", "credential"].join("_");
  assert.throws(() => assertNoSecrets({echo:key}, [key]));
  assert.throws(() => assertNoSecrets({Authorization:"hidden"}));
  assert.throws(() => assertPublic({reporterUid:"synthetic"}));
  for (let seed = 11; seed <= 20; seed++) assert.throws(() => assertPublic({seed}));
  assert.throws(() => assertPublic({raw:JSON.stringify({reporterArea:"synthetic"})}));
  assert.doesNotThrow(() => assertPublic({seed:1, tokens:{input:20, output:10}}));
});
test("provenance checks cover new JSONL files and documented header leaks", () => {
  assert.throws(() => inspectProvenance('{"reporterRole":"synthetic"}\n', "jsonl"));
  assert.throws(() => inspectProvenance("Authorization: hidden", "md"));
  assert.throws(() => inspectProvenance('{"seed":20}', "json"));
});
