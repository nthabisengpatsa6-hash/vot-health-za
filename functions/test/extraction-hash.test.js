const assert = require("node:assert/strict");
const {createHash} = require("node:crypto");
const {test} = require("node:test");
const {REPLY_SCHEMA} = require("../lib/cardSchema");
const {extractionHash} = require("../lib/extractionHash");
const baseline = require("../../scripts/fixtures/extraction-baseline-f05ffb0.json");

test("scoring Baseline preserves the live extraction inputs", () => {
  const hash = createHash("sha256").update(baseline.prompt).update(JSON.stringify(baseline.schema))
      .update(JSON.stringify(baseline.keywords)).digest("hex").slice(0, 16);
  assert.equal(hash, "cddb48328a27f866");
  assert.deepEqual(REPLY_SCHEMA, baseline.schema);
});

test("Task 16 STOP 3 approved A2 settings match the scored extraction hash", () => {
  assert.equal(extractionHash(), "d6bf8dd00961399c",
      "Extraction settings changed: record a tuning decision and update the pin.");
});

test("fingerprint covers the audio prompt, ordered keywords and settings", () => {
  const hash = extractionHash();
  for (const change of [{audioPrompt:"synthetic replacement"}, {keywords:["synthetic"]},
    {audioModel:"muse-spark-1.3"}, {audioEffort:"low"}, {uncertainWords:true}]) {
    assert.notEqual(extractionHash(change), hash);
  }
});

test("candidate prompt changes only the approved name and local-word sections", () => {
  const {SYSTEM_PROMPT} = require("../lib/extractCard");
  const {PRODUCT_NAME} = require("../shared/product.mjs");
  const oldName = baseline.prompt.match(/cards for (\w+),/)[1];
  const local = SYSTEM_PROMPT.match(/## Local words\n[\s\S]*?(?=## Card fields)/)[0];
  const note = "Apply the local-word rules here too. Preserve listed words exactly as spoken, and correct only sound-spellings that clearly identify a listed word. If a local word is still unclear, keep [?]; never replace it with a guess.\n\n";
  const restored = SYSTEM_PROMPT.replace(local, "").replace(note, "").split(PRODUCT_NAME).join(oldName);
  assert.equal(restored, baseline.prompt);
  assert.ok(!local.includes("fat cook"));
  assert.deepEqual(REPLY_SCHEMA, baseline.schema);
});
