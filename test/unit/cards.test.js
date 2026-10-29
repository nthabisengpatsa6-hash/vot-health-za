import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { answersNeeded, draftFromCard, fieldsToFix, firstToFix, handleSaveTap, isFilled, saveButtonAction, showsSuppliesNote, toCardDoc } from "../../src/lib/cardDraft.js";

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

test("an unsure exposure is answered by any choice, None included", () => {
  const draft = draftFromCard({ ...resultFor("2-n09").cards[0], comparedWithUsual: "more", unsureFields: ["exposure"] });
  assert.deepEqual(fieldsToFix(draft), ["exposure"]);
  assert.deepEqual(fieldsToFix({ ...draft, exposure: { ...draft.exposure, none: true } }), []);
  assert.deepEqual(fieldsToFix({ ...draft, exposure: { ...draft.exposure, types: ["water"] } }), []);
});

const ALL_TICKED = { moreSevere: true, notResponding: true, unusualSymptoms: true, shortOfSupplies: true, suppliesNote: "gloves" };
const NONE_TICKED = { moreSevere: false, notResponding: false, unusualSymptoms: false, shortOfSupplies: false, suppliesNote: null };

test("observations the AI was unsure of aren't asked, start unticked and don't stop the save", () => {
  const note = resultFor("2-n09");
  const draft = draftFromCard({ ...note.cards[0], comparedWithUsual: "more", unsureFields: ["observations"], observations: ALL_TICKED });
  assert.deepEqual(draft.unsureFields, []);
  assert.deepEqual(fieldsToFix(draft), []);
  assert.equal(saveButtonAction([draft]), "save");
  // Saved with nothing ticked: every flag false and no supplies note.
  assert.deepEqual(toCardDoc({ draft, note, profile: PROFILE, uid: "u1", createdAt: null }).observations, NONE_TICKED);
});

test("a box the note states clearly starts ticked and is saved", () => {
  const note = resultFor("2-n09");
  const draft = draftFromCard({ ...note.cards[0], comparedWithUsual: "more", unsureFields: [], observations: { ...NONE_TICKED, moreSevere: true } });
  assert.equal(draft.observations.moreSevere, true);
  assert.equal(toCardDoc({ draft, note, profile: PROFILE, uid: "u1", createdAt: null }).observations.moreSevere, true);
});

test("unusualSymptoms is never ticked and always saved as false", () => {
  const note = resultFor("2-n09");
  const draft = draftFromCard({ ...note.cards[0], comparedWithUsual: "more", unsureFields: [], observations: ALL_TICKED });
  assert.equal(draft.observations.unusualSymptoms, false);
  const forced = { ...draft, observations: { ...draft.observations, unusualSymptoms: true } };
  assert.equal(toCardDoc({ draft: forced, note, profile: PROFILE, uid: "u1", createdAt: null }).observations.unusualSymptoms, false);
});

test("the number of answers needed leaves observations out and skips removed cards", () => {
  const note = resultFor("2-n09");
  const plain = note.cards.map(draftFromCard);
  const withObservations = note.cards.map((card) => draftFromCard({ ...card, unsureFields: [...card.unsureFields, "observations"] }));
  // Card 1 asks comparedWithUsual; card 2 asks comparedWithUsual and ageGroup.
  assert.equal(answersNeeded(plain), 3);
  assert.equal(answersNeeded(withObservations), 3);
  assert.ok(withObservations.every((draft) => !fieldsToFix(draft).includes("observations")));
  assert.equal(answersNeeded([{ ...plain[0], removed: true }, plain[1]]), 2);
});

test("the first question to answer is the first on screen, on the first kept card", () => {
  const n08 = draftFromCard({ ...resultFor("3-n08").cards[0], unsureFields: ["onset", "caseCount"] });
  assert.deepEqual(fieldsToFix(n08), ["caseCount", "onset"]);
  const [first, second] = resultFor("2-n09").cards.map(draftFromCard);
  assert.deepEqual(firstToFix([first, second]), { index: 0, field: "comparedWithUsual" });
  assert.deepEqual(firstToFix([{ ...first, removed: true }, second]), { index: 1, field: "comparedWithUsual" });
  assert.deepEqual(firstToFix([{ ...first, comparedWithUsual: "more" }, { ...second, comparedWithUsual: "same" }]), { index: 1, field: "ageGroup" });
  assert.equal(firstToFix([{ ...first, comparedWithUsual: "more" }]), null);
});

test("with answers missing, the save button's handler only jumps, however often it runs", () => {
  // A tap, the Enter key and each tap of a double tap all reach the button
  // as a click, so each is one call here. The browser check drives the real
  // inputs.
  const missing = [draftFromCard(resultFor("3-n08").cards[0])];
  const calls = { save: 0, jump: 0 };
  const handlers = { save: () => { calls.save += 1; }, jump: () => { calls.jump += 1; } };
  assert.equal(handleSaveTap(missing, handlers), "jump");
  handleSaveTap(missing, handlers);
  handleSaveTap(missing, handlers);
  assert.deepEqual(calls, { save: 0, jump: 3 });
  // One complete card next to one still missing answers: still no save.
  const complete = { ...missing[0], caseCount: 10, onset: "longer" };
  assert.equal(handleSaveTap([complete, missing[0]], handlers), "jump");
  assert.equal(calls.save, 0);
  // Complete: each tap saves once (the button is disabled while saving).
  assert.equal(handleSaveTap([complete], handlers), "save");
  assert.equal(calls.save, 1);
  // Every card removed: nothing happens.
  assert.equal(handleSaveTap([{ ...complete, removed: true }], handlers), "none");
  assert.deepEqual(calls, { save: 1, jump: 4 });
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

test("empty words are saved as null, and the supplies note shows and saves only with its tick", () => {
  const note = resultFor("2-n09");
  const draft = draftFromCard(note.cards[0]);
  const withNote = { ...draft, comparedWithUsual: "more", exposure: { ...draft.exposure, words: "   " }, observations: { ...draft.observations, suppliesNote: "gloves" } };
  assert.equal(showsSuppliesNote(withNote), false);
  const saved = toCardDoc({ draft: withNote, note, profile: PROFILE, uid: "u1", createdAt: null });
  assert.equal(saved.exposure.words, null);
  assert.equal(saved.observations.shortOfSupplies, false);
  assert.equal(saved.observations.suppliesNote, null);
  const ticked = { ...withNote, observations: { ...withNote.observations, shortOfSupplies: true } };
  assert.equal(showsSuppliesNote(ticked), true);
  assert.equal(toCardDoc({ draft: ticked, note, profile: PROFILE, uid: "u1", createdAt: null }).observations.suppliesNote, "gloves");
  // Ticked with nothing written: null, never an empty string.
  const blank = { ...ticked, observations: { ...ticked.observations, suppliesNote: "  " } };
  assert.equal(toCardDoc({ draft: blank, note, profile: PROFILE, uid: "u1", createdAt: null }).observations.suppliesNote, null);
});

test("exposure types are saved once each, in list order", () => {
  const note = resultFor("2-n09");
  const draft = { ...draftFromCard(note.cards[0]), comparedWithUsual: "more" };
  draft.exposure = { ...draft.exposure, types: ["school", "water"] };
  assert.deepEqual(toCardDoc({ draft, note, profile: PROFILE, uid: "u1", createdAt: null }).exposure.types, ["water", "school"]);
});
