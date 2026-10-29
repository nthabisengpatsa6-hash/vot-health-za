const test = require("node:test");
const assert = require("node:assert/strict");
const {cleanReply} = require("../lib/cardSchema");

// A complete, confident card as the model would send it; each test changes
// only what it is about.
function rawCard(changes = {}) {
  return {
    symptomGroup: "diarrhoea_vomiting",
    unusualDescription: null,
    symptomsInWords: "watery diarrhoea",
    caseCount: 4,
    comparedWithUsual: "more",
    ageGroup: "under_5",
    area: "Thaga Park",
    areaHeard: null,
    onset: "today",
    exposure: {types: ["water"], words: "tap water"},
    observations: {
      moreSevere: false,
      notResponding: false,
      unusualSymptoms: false,
      shortOfSupplies: false,
      suppliesNote: null,
    },
    unsureFields: [],
    questions: [],
    ...changes,
  };
}

function rawReply(cardChanges = {}, replyChanges = {}) {
  return {
    isReport: true,
    cards: [rawCard(cardChanges)],
    notifiableConditionMentioned: null,
    adviceRequested: false,
    transcriptClean: "Four children with watery diarrhoea.",
    disagreements: [],
    ...replyChanges,
  };
}

const firstCard = (raw, options) => cleanReply(raw, options).cards[0];

test("keeps a clean, confident card as it is", () => {
  const card = firstCard(rawReply());
  assert.equal(card.area, "Thaga Park");
  assert.deepEqual(card.unsureFields, []);
  assert.deepEqual(card.questions, []);
});

test("marks every missing required field unsure and asks about it", () => {
  const card = firstCard(rawReply({caseCount: null, onset: null}));
  assert.deepEqual(card.unsureFields, ["caseCount", "onset"]);
  assert.deepEqual(card.questions.map((item) => item.field), [
    "caseCount", "onset",
  ]);
  assert.ok(card.questions.every((item) => item.question.length > 0));
});

test("moves an area that isn't on the place list into areaHeard", () => {
  const card = firstCard(rawReply({area: "Amanzimtoti"}));
  assert.equal(card.area, null);
  assert.equal(card.areaHeard, "Amanzimtoti");
  assert.ok(card.unsureFields.includes("area"));
});

test("matches a place-list area whatever its capitals", () => {
  const card = firstCard(rawReply({area: "thaga PARK"}));
  assert.equal(card.area, "Thaga Park");
  assert.ok(!card.unsureFields.includes("area"));
});

test("replaces values outside the allowed lists with null and asks", () => {
  const card = firstCard(rawReply({
    symptomGroup: "cholera",
    comparedWithUsual: "lots",
    ageGroup: "toddler",
    onset: "weeks",
    exposure: {types: ["water", "river", "water"], words: null},
  }));
  assert.equal(card.symptomGroup, null);
  assert.equal(card.comparedWithUsual, null);
  assert.equal(card.ageGroup, null);
  assert.equal(card.onset, null);
  assert.deepEqual(card.exposure.types, ["water"]);
  for (const field of ["symptomGroup", "comparedWithUsual", "ageGroup",
    "onset"]) {
    assert.ok(card.unsureFields.includes(field), field);
  }
});

test("rejects a case count that isn't a whole number of 1 or more", () => {
  for (const count of [2.5, "four", 0, -3]) {
    const card = firstCard(rawReply({caseCount: count}));
    assert.equal(card.caseCount, null, String(count));
    assert.ok(card.unsureFields.includes("caseCount"), String(count));
  }
});

test("drops fields the schema doesn't have, such as advice", () => {
  const reply = cleanReply(rawReply(
      {treatment: "Give oral rehydration salts."},
      {advice: "Start antibiotics.", note: "extra"},
  ));
  const text = JSON.stringify(reply);
  assert.ok(!text.includes("rehydration"));
  assert.ok(!text.includes("antibiotics"));
  assert.equal(reply.advice, undefined);
  assert.equal(reply.cards[0].treatment, undefined);
});

test("makes no cards when the note isn't a report", () => {
  const reply = cleanReply(rawReply({}, {isReport: false}));
  assert.deepEqual(reply.cards, []);
});

test("keeps a notifiable condition only if a transcript says it", () => {
  const said = cleanReply(
      rawReply({}, {notifiableConditionMentioned: "measles"}),
      {transcripts: ["One of them has Measles, confirmed by the lab."]},
  );
  assert.equal(said.notifiableConditionMentioned, "measles");

  const notSaid = cleanReply(
      rawReply({}, {notifiableConditionMentioned: "cholera"}),
      {transcripts: ["Four children with watery diarrhoea."]},
  );
  assert.equal(notSaid.notifiableConditionMentioned, null);
});

test("asks what is unusual when something_unusual has no description", () => {
  const card = firstCard(rawReply({
    symptomGroup: "something_unusual",
    unusualDescription: null,
  }));
  assert.ok(card.unsureFields.includes("unusualDescription"));
});

test("keeps the model's question for an unsure field, drops the rest", () => {
  const card = firstCard(rawReply({
    area: null,
    unsureFields: ["area"],
    questions: [
      {field: "area", question: "Which part of town are they from?"},
      {field: "caseCount", question: "How many?"},
    ],
  }));
  assert.deepEqual(card.questions, [
    {field: "area", question: "Which part of town are they from?"},
  ]);
});

test("never asks about observations, and leaves their boxes unticked " +
    "when the model wasn't sure", () => {
  const card = firstCard(rawReply({
    observations: {
      moreSevere: true,
      notResponding: true,
      unusualSymptoms: true,
      shortOfSupplies: true,
      suppliesNote: "gloves",
    },
    unsureFields: ["observations", "onset"],
    questions: [
      {field: "observations", question: "Were any patients very ill?"},
      {field: "onset", question: "When did it start?"},
    ],
  }));
  assert.deepEqual(card.unsureFields, ["onset"]);
  assert.deepEqual(card.questions.map((item) => item.field), ["onset"]);
  assert.deepEqual(card.observations, {
    moreSevere: false,
    notResponding: false,
    unusualSymptoms: false,
    shortOfSupplies: false,
    suppliesNote: "gloves",
  });
});

test("keeps observation ticks the model is sure of; missing ones are false",
    () => {
      const card = firstCard(rawReply({
        observations: {moreSevere: true, notResponding: null},
      }));
      assert.deepEqual(card.unsureFields, []);
      assert.deepEqual(card.observations, {
        moreSevere: true,
        notResponding: false,
        unusualSymptoms: false,
        shortOfSupplies: false,
        suppliesNote: null,
      });
    });

test("rejects a reply with the wrong shape", () => {
  for (const changes of [{cards: "none"}, {isReport: "yes"},
    {adviceRequested: null}]) {
    assert.throws(
        () => cleanReply(rawReply({}, changes)),
        (err) => err.kind === "bad-reply",
        JSON.stringify(changes),
    );
  }
});
