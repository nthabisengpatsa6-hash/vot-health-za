import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync, readdirSync} from "node:fs";
import {test} from "node:test";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {draftFromCard, toCardDoc} from "../../src/lib/cardDraft.js";
import {toCardDoc as sharedCardDoc} from "../../functions/shared/cardDoc.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../test-fixtures/sim-move-fingerprints.json", import.meta.url), "utf8"));
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("the move preserves all 40 run fingerprints; held-out cards are never stored or scored", () => {
  assert.equal(Object.keys(fixture.runs).length, 40);
  for (let seed = 1; seed <= 20; seed++) for (const scenario of ["water", "none"]) {
    const run = createRun({seed, scenario});
    assert.equal(hash(run.cardsUpTo(run.lastDay)), fixture.runs[`${seed}:${scenario}`]);
  }
});

test("the shared card builder is identical on every existing practice fixture before and after the move", () => {
  assert.equal(toCardDoc, sharedCardDoc);
  const root = new URL("../../test-fixtures/practice-results/", import.meta.url);
  for (const name of readdirSync(root).sort()) {
    const note = JSON.parse(readFileSync(new URL(name, root), "utf8")).result;
    const actual = note.cards.map((card) => hash(toCardDoc({draft: draftFromCard(card), note,
      profile: {role: "nurse", facilityType: "clinic", area: "Thaga Park"}, uid: "fixture-reporter", createdAt: 1234567890})));
    assert.deepEqual(actual, fixture.cardDocs[name], name);
  }
});
