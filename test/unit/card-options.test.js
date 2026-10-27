import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { AGE_GROUPS, COMPARED_WITH_USUAL, EXPOSURE_TYPES, OBSERVATIONS, ONSETS, SYMPTOM_GROUPS } from "../../src/config/cardOptions.js";

// The card screen's lists must hold exactly the values processNote can
// return, in the same order (test/rules checks firestore.rules against them).
const require = createRequire(import.meta.url);
const schema = require("../../functions/lib/cardSchema.js");

const values = (options) => options.map((option) => option.value);

test("the card screen's lists match functions/lib/cardSchema.js", () => {
  assert.deepEqual(values(SYMPTOM_GROUPS), Object.keys(schema.SYMPTOM_GROUPS));
  assert.deepEqual(values(AGE_GROUPS), Object.keys(schema.AGE_GROUPS));
  assert.deepEqual(values(COMPARED_WITH_USUAL), schema.COMPARED_WITH_USUAL);
  assert.deepEqual(values(ONSETS), schema.ONSETS);
  assert.deepEqual(values(EXPOSURE_TYPES), schema.EXPOSURE_TYPES);
  assert.deepEqual(values(OBSERVATIONS), schema.OBSERVATION_FLAGS);
});
