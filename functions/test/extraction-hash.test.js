const assert = require("node:assert/strict");
const {createHash} = require("node:crypto");
const {test} = require("node:test");
const {SYSTEM_PROMPT} = require("../lib/extractCard");
const {REPLY_SCHEMA, PLACE_KEYWORDS} = require("../lib/cardSchema");

test("Task 15a preserves the extraction inputs", () => {
  const hash = createHash("sha256").update(SYSTEM_PROMPT).update(JSON.stringify(REPLY_SCHEMA))
      .update(JSON.stringify(PLACE_KEYWORDS)).digest("hex").slice(0, 16);
  assert.equal(hash, "cddb48328a27f866", "Extraction inputs changed; Task 15a must leave them unchanged.");
});
