import test from "node:test";
import assert from "node:assert/strict";
import {assertNoSecrets, assertPublic} from "../../scripts/lib/noteArtifacts.mjs";
import {inspectProvenance, scanProvenance} from "../../scripts/scan-provenance.mjs";
import {heldOutPath, REPORT_JSON} from "../../scripts/lib/heldoutArtifacts.mjs";
import {mkdirSync, mkdtempSync, writeFileSync} from "node:fs";
import {join, dirname} from "node:path";

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

test("held-out exceptions match exact path segments and retain secret/private-field checks", () => {
  const allowed = ["docs/provenance/held-out/test.json", "docs/provenance/rankings/held-out/seed-11.jsonl", REPORT_JSON];
  for (const path of allowed) {
    assert.equal(heldOutPath(path),true);
    assert.doesNotThrow(() => inspectProvenance('{"seed":11}',"json",path));
    for (const bad of [{reporterUid:"synthetic"},{nested:{reporterRole:"synthetic"}},{Authorization:"synthetic"}, {raw:'{"reporterArea":"synthetic"}'}, {raw:'{"Authorization":"synthetic"}'}]) {
      assert.throws(() => inspectProvenance(JSON.stringify(bad),"json",path));
    }
  }
  for (const path of ["docs/provenance/held-out-x/test.json", "docs/provenance/rankings/held-out-x/seed-11.json", "src/sim/held-out/other.json", `${REPORT_JSON}.backup`, "docs/provenance/held-out/../scoring/test.json", "/docs/provenance/held-out/test.json"]) {
    assert.equal(heldOutPath(path),false);
    assert.throws(() => inspectProvenance('{"seed":11}',"json",path));
  }
});

test("repository walk refuses sibling folders and extra generated JSON paths", () => {
  mkdirSync(".scratch",{recursive:true});
  for (const [file,allowed] of [["docs/provenance/held-out/test.json",true],["docs/provenance/held-out-x/test.json",false],
    [REPORT_JSON,true],["src/sim/held-out/other.json",false],["src/sim/held-out-x/scorecard.json",false]]) {
    const root = mkdtempSync(".scratch/provenance-path-");
    mkdirSync(dirname(join(root,file)),{recursive:true}); writeFileSync(join(root,file),'{"seed":11}');
    if (allowed) assert.equal(scanProvenance(root),1);
    else assert.throws(() => scanProvenance(root));
  }
});
