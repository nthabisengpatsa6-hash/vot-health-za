import { test } from "node:test";
import assert from "node:assert/strict";
import { appNoteLimitMessage } from "../../src/lib/noteErrors.js";
import { PRODUCT_NAME } from "../../src/config/product.js";

test("only the app-wide note cap gets the new message", () => {
  assert.equal(appNoteLimitMessage({code:"functions/resource-exhausted", details:{reason:"app-note-limit"}}), `${PRODUCT_NAME} has reached today's limit for live notes. Try again after midnight, or explore the replay.`);
  for (const error of [null, {code:"functions/unavailable"}, {code:"functions/resource-exhausted"}, {code:"functions/internal", details:{reason:"app-note-limit"}}]) assert.equal(appNoteLimitMessage(error), null);
});
