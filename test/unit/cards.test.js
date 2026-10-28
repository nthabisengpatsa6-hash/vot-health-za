import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { draftFromCard, fieldsToFix, isFilled, toCardDoc } from "../../src/lib/cardDraft.js";

const PRACTICE = new URL("../../test-fixtures/practice-results/", import.meta.url);
const practice = Object.fromEntries(
  readdirSync(PRACTICE).map((name) => [name, JSON.parse(readFileSync(new URL(name, PRACTICE), "utf8")).result]),
);
const resultFor = (prefix) => practice[Object.keys(practice).find((name) => name.startsWith(prefix))];

const PROFILE = { role: "nurse", facilityType: "clinic", area: "Thaga Park" };
const SAVED_FIELDS = [
  "reporterUid", "reporterRole", "reporterFacilityType", "reporterArea", "symptomGroup", "unusualDescription",
  "symptomsInWords", "caseCount", "comparedWithUsual", "ageGroup", "area", "onset", "exposure", "observations",
  "notifiableConditionMentioned", "source", "createdAt",
];

test("unsure fields start empty; the AI's guess isn't filled in", () => {
  // n08: "maybe ten adults" is caseCount 10, marked unsure.
  const card = resultFor("3-n08").cards[0];
  assert.equal(card.caseCount, 10);
  const draft = draftFromCard(card);
  assert.equal(draft.caseCount, null);
  assert.equal(draft.onset, null);
  assert.deepEqual(fieldsToFix(draft).sort(), ["caseCount", "onset"]);
  // Confident fields keep their values.
  assert.equal(draft.ageGroup, "adult");
  assert.equal(draft.area, "Lebone Gardens");
});

test("a misheard area starts empty and keeps what was heard", () => {
  const draft = draftFromCard(resultFor("1-n02").cards[0]);
  assert.equal(draft.area, null);
  assert.equal(draft.areaHeard, "Nonyana Flat");
  assert.ok(fieldsToFix(draft).includes("area"));
});

test("answering every question clears the card for saving", () => {
  const draft = { ...draftFromCard(resultFor("3-n08").cards[0]), caseCount: 10, onset: "longer" };
  assert.deepEqual(fieldsToFix(draft), []);
});

test("counts must be whole numbers from 1 to 500", () => {
  const base = draftFromCard(resultFor("2-n09").cards[0]);
  for (const bad of [0, 501, 2.5, null, Number.NaN]) assert.equal(isFilled({ ...base, caseCount: bad }, "caseCount"), false, String(bad));
  for (const good of [1, 3, 500]) assert.equal(isFilled({ ...base, caseCount: good }, "caseCount"), true, String(good));
});

test("an unsure exposure or observation is answered by any choice, None included", () => {
  const draft = draftFromCard({ ...resultFor("2-n09").cards[0], comparedWithUsual: "more", unsureFields: ["exposure", "observations"] });
  assert.deepEqual(fieldsToFix(draft).sort(), ["exposure", "observations"]);
  const none = { ...draft, exposure: { ...draft.exposure, none: true }, observations: { ...draft.observations, none: true } };
  assert.deepEqual(fieldsToFix(none), []);
  const ticked = { ...draft, exposure: { ...draft.exposure, types: ["water"] }, observations: { ...draft.observations, moreSevere: true } };
  assert.deepEqual(fieldsToFix(ticked), []);
});

test("'Something unusual' needs a description; other groups don't", () => {
  const draft = { ...draftFromCard(resultFor("2-n09").cards[0]), comparedWithUsual: "more" };
  assert.deepEqual(fieldsToFix(draft), []);
  assert.deepEqual(fieldsToFix({ ...draft, symptomGroup: "something_unusual" }), ["unusualDescription"]);
  assert.deepEqual(fieldsToFix({ ...draft, symptomGroup: "something_unusual", unusualDescription: "a strange smell" }), []);
});

test("a needed field the clinician empties stops the save", () => {
  const draft = { ...draftFromCard(resultFor("4-n04").cards[0]), caseCount: 3, ageGroup: "5_12", area: "Leeba View" };
  assert.deepEqual(fieldsToFix(draft), []);
  assert.deepEqual(fieldsToFix({ ...draft, symptomsInWords: "  " }), ["symptomsInWords"]);
});

test("the saved card has exactly the allowed fields and nothing from the AI's working", () => {
  const note = resultFor("4-n04");
  const draft = { ...draftFromCard(note.cards[0]), caseCount: 3, ageGroup: "5_12", area: "Leeba View" };
  const saved = toCardDoc({ draft, note, profile: PROFILE, uid: "u1", createdAt: "SERVER_TIME" });
  assert.equal(SAVED_FIELDS.length, 17);
  assert.deepEqual(Object.keys(saved).sort(), [...SAVED_FIELDS].sort());
  assert.deepEqual(Object.keys(saved.exposure), ["types", "words"]);
  assert.deepEqual(Object.keys(saved.observations), ["moreSevere", "notResponding", "unusualSymptoms", "shortOfSupplies", "suppliesNote"]);
  assert.equal(saved.reporterUid, "u1");
  assert.equal(saved.reporterRole, "nurse");
  assert.equal(saved.reporterFacilityType, "clinic");
  assert.equal(saved.reporterArea, "Thaga Park");
  assert.equal(saved.notifiableConditionMentioned, "measles");
  // Shown during review, never stored.
  assert.ok(note.transcriptClean.length > 0);
  assert.equal("transcriptClean" in saved, false);
  assert.equal(saved.source, "voice");
  assert.equal(saved.createdAt, "SERVER_TIME");
  assert.equal(saved.unusualDescription, null);
});

test("empty words are saved as null, and a supplies note only with its tick", () => {
  const note = resultFor("2-n09");
  const draft = draftFromCard(note.cards[0]);
  const withNote = { ...draft, comparedWithUsual: "more", exposure: { ...draft.exposure, words: "   " }, observations: { ...draft.observations, suppliesNote: "gloves" } };
  const saved = toCardDoc({ draft: withNote, note, profile: PROFILE, uid: "u1", createdAt: null });
  assert.equal(saved.exposure.words, null);
  assert.equal(saved.observations.suppliesNote, null);
  const ticked = { ...withNote, observations: { ...withNote.observations, shortOfSupplies: true } };
  assert.equal(toCardDoc({ draft: ticked, note, profile: PROFILE, uid: "u1", createdAt: null }).observations.suppliesNote, "gloves");
});

test("exposure types are saved once each, in list order", () => {
  const note = resultFor("2-n09");
  const draft = { ...draftFromCard(note.cards[0]), comparedWithUsual: "more" };
  draft.exposure = { ...draft.exposure, types: ["school", "water"] };
  assert.deepEqual(toCardDoc({ draft, note, profile: PROFILE, uid: "u1", createdAt: null }).exposure.types, ["water", "school"]);
});
