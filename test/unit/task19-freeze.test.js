import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

test("all 48 original frozen dependency blobs remain unchanged",()=>{
  const scopes=["functions/shared","src/sim","functions/data/places.json","functions/prompts/rank-sources.md","functions/lib/callRanker.js","functions/lib/rankTiming.js","scripts/lib/rankPlans.mjs","scripts/lib/rankArtifacts.mjs","scripts/scorecard.mjs","scripts/rank-saved.mjs","test-fixtures/sim-move-fingerprints.json"];
  const files=execFileSync("git",["ls-tree","-r","--name-only","ab40db5","--",...scopes],{encoding:"utf8"}).trim().split(/\r?\n/);
  assert.equal(files.length,48);
  const changed=execFileSync("git",["diff","--name-only","ab40db5","--",...files],{encoding:"utf8"}).trim();
  assert.equal(changed,"");
});
test("Meta error handling and ranking implementation remain byte-identical to the approved starting commit",()=>{
  for(const file of ["functions/lib/metaRequest.js","functions/lib/rankSources.js","functions/lib/rankTiming.js","functions/lib/callRanker.js"]) assert.deepEqual(readFileSync(new URL(`../../${file}`,import.meta.url)),execFileSync("git",["show",`dc38d22:${file}`]));
});
