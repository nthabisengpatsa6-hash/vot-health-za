import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AGE_GROUPS, CASE_COUNT_MAX, COMPARED_WITH_USUAL, EXPOSURE_TYPES, OBSERVATIONS, ONSETS, SYMPTOM_GROUPS, TEXT_LIMITS } from "../../src/config/cardOptions.js";
import { makeCalendar } from "../../src/sim/calendar.js";
import { createRun } from "../../src/sim/engine.js";
import { groundTruth } from "../../src/sim/groundTruth.js";
import { createRandom, expNeg } from "../../src/sim/random.js";
import { REPORTERS } from "../../src/sim/reporters.js";

const places = JSON.parse(readFileSync(new URL("../../functions/data/places.json", import.meta.url), "utf8"));
const areasOn = (works) => places.areas.filter((area) => area.works === works).map((area) => area.name);
const values = (options) => options.map((option) => option.value);
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Seed 1's runs, pinned: the replay judges see must be the same every time.
// If the generator is changed on purpose, update these with the new hashes.
const PINNED = {
  water: { cards: 1115, sha256: "de4ee09971e414c091a8cabdd607bd3b127100417ad7f8684e78f1553b940e11" },
  none: { cards: 1035, sha256: "e94c2f366b120924f8c4297e90cf8e1f66d7700f2c61ee55410c181c944a06bf" },
};

// The fields toCardDoc saves, in its order (test/unit/cards.test.js).
const SAVED_FIELDS = [
  "reporterUid", "reporterRole", "reporterFacilityType", "reporterArea", "symptomGroup", "unusualDescription",
  "symptomsInWords", "caseCount", "comparedWithUsual", "ageGroup", "area", "onset", "exposure", "observations",
  "notifiableConditionMentioned", "source", "createdAt",
];

const runs = new Map();
function runFor(seed, scenario) {
  const key = `${seed}-${scenario}`;
  if (!runs.has(key)) runs.set(key, createRun({ seed, scenario }));
  return runs.get(key);
}
const allCards = (run) => run.cardsUpTo(run.lastDay);
const hashOf = (records) => createHash("sha256").update(JSON.stringify(records)).digest("hex");
const cardText = (record) => JSON.stringify(record.card);

// The cards a water run has beyond the no-cluster run with the same seed.
function extraCards(seed) {
  const left = new Map();
  for (const record of allCards(runFor(seed, "none"))) left.set(cardText(record), (left.get(cardText(record)) || 0) + 1);
  return allCards(runFor(seed, "water")).filter((record) => {
    const count = left.get(cardText(record)) || 0;
    if (count > 0) left.set(cardText(record), count - 1);
    return count === 0;
  });
}

const isUnder5Gut = (card) => card.symptomGroup === "diarrhoea_vomiting" && card.ageGroup === "under_5";
function under5CasesByDay(run, areas) {
  const byDay = new Map();
  for (const { card } of allCards(run)) {
    if (!areas.includes(card.area) || !isUnder5Gut(card)) continue;
    const day = run.dayOf(card.createdAt);
    byDay.set(day, (byDay.get(day) || 0) + card.caseCount);
  }
  return byDay;
}
const total = (byDay, from, to) => Array.from({ length: to - from + 1 }, (_, index) => byDay.get(from + index) || 0).reduce((a, b) => a + b, 0);

// "Clearly above its own history": days 13 to 20 hold more than one and a
// half times the busiest 8 days anywhere in the 84 days before day 0.
function clearlyAboveHistory(run, areas) {
  const byDay = under5CasesByDay(run, areas);
  let busiest = 0;
  for (let start = run.firstDay; start + 7 <= -1; start += 1) busiest = Math.max(busiest, total(byDay, start, start + 7));
  const now = total(byDay, 13, 20);
  return { above: now > 1.5 * busiest, now, busiest };
}

test("the random numbers are seeded: same seed and labels, same numbers; different labels, different numbers", () => {
  const draws = (random) => Array.from({ length: 5 }, () => random.next());
  assert.deepEqual(draws(createRandom(1, "background", 0)), draws(createRandom(1, "background", 0)));
  assert.notDeepEqual(draws(createRandom(1, "background", 0)), draws(createRandom(1, "background", 1)));
  assert.notDeepEqual(draws(createRandom(1, "background", 0)), draws(createRandom(2, "background", 0)));
  for (const value of draws(createRandom(7, "x"))) assert.ok(value >= 0 && value < 1);
});

test("expNeg, written with + - * / only, matches Math.exp, and Poisson draws have the right mean", () => {
  for (let x = 0; x <= 30; x += 0.37) assert.ok(Math.abs(expNeg(x) / Math.exp(-x) - 1) < 1e-12, String(x));
  const random = createRandom(1, "poisson-check");
  let sum = 0;
  for (let index = 0; index < 20000; index += 1) sum += random.poisson(2.5);
  assert.ok(Math.abs(sum / 20000 - 2.5) < 0.075, String(sum / 20000));
  assert.equal(random.poisson(0), 0);
});

test("replay days are SAST days, starting at 22:00 UTC the day before, as processNote counts them", () => {
  const calendar = makeCalendar("2027-02-01");
  assert.equal(calendar.dayStart(0), Date.parse("2027-01-31T22:00:00Z"));
  assert.equal(calendar.dayOf(calendar.dayStart(0)), 0);
  assert.equal(calendar.dayOf(calendar.dayStart(0) - 1), -1);
  assert.equal(calendar.dateOf(-84), "2026-11-09");
  assert.equal(calendar.dateOf(28), "2027-03-01");
  assert.equal(calendar.weekdayOf(0), "Mon");
  assert.equal(calendar.isWeekend(5), true);
  assert.equal(calendar.isWeekend(4), false);
  // processNote's sastDay: new Date(ms + 2 hours).toISOString().slice(0, 10).
  const sastDay = (ms) => new Date(ms + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (let ms = calendar.dayStart(-3); ms < calendar.dayStart(3); ms += 37 * 60 * 1000) assert.equal(calendar.dateOf(calendar.dayOf(ms)), sastDay(ms));
  assert.throws(() => makeCalendar("2027-02-30"));
  assert.throws(() => makeCalendar("1 Feb 2027"));
});

test("the same seed gives the same run, byte for byte (seed 1 is pinned)", () => {
  for (const scenario of ["water", "none"]) {
    const records = allCards(createRun({ seed: 1, scenario }));
    assert.equal(records.length, PINNED[scenario].cards, scenario);
    assert.equal(hashOf(records), PINNED[scenario].sha256, scenario);
    assert.equal(hashOf(allCards(createRun({ seed: 1, scenario }))), hashOf(records), scenario);
  }
});

test("asking for days in a different order gives the same cards", () => {
  const first = createRun({ seed: 3 });
  const late = first.cardsUpTo(28);
  const early = first.cardsUpTo(3);
  const second = createRun({ seed: 3 });
  assert.equal(hashOf(second.cardsUpTo(3)), hashOf(early));
  assert.equal(hashOf(second.cardsUpTo(28)), hashOf(late));
});

test("different seeds give different noise with the same structure", () => {
  const hashes = new Set();
  for (const seed of SEEDS) {
    const run = runFor(seed, "water");
    hashes.add(hashOf(allCards(run)));
    assert.deepEqual(run.days, runFor(1, "water").days);
    assert.equal(run.firstDay, -84);
    assert.equal(run.lastDay, 28);
    const history = allCards(run).filter(({ card }) => run.dayOf(card.createdAt) < 0);
    const perDay = (weekend) => {
      const days = run.days.filter(({ day, weekday }) => day < 0 && ["Sat", "Sun"].includes(weekday) === weekend);
      return history.filter(({ card }) => days.some(({ day }) => day === run.dayOf(card.createdAt))).length / days.length;
    };
    assert.ok(perDay(false) >= 8.5 && perDay(false) <= 11.5, `seed ${seed}: ${perDay(false)} cards a weekday`);
    assert.ok(perDay(true) >= 3 && perDay(true) <= 6, `seed ${seed}: ${perDay(true)} cards a weekend day`);
    for (const group of values(SYMPTOM_GROUPS)) assert.ok(history.some(({ card }) => card.symptomGroup === group), `seed ${seed}: no ${group}`);
  }
  assert.equal(hashes.size, SEEDS.length);
});

test("every simulated card has a real card's 17 fields, in toCardDoc's order, with allowed values", () => {
  const reporters = new Map(REPORTERS.map((reporter) => [reporter.uid, reporter]));
  const areaNames = places.areas.map((area) => area.name);
  for (const seed of [1, 2, 3]) {
    for (const scenario of ["water", "none"]) {
      const ids = new Set();
      for (const { id, card } of allCards(runFor(seed, scenario))) {
        ids.add(id);
        assert.deepEqual(Object.keys(card), SAVED_FIELDS, id);
        const reporter = reporters.get(card.reporterUid);
        assert.ok(reporter, id);
        assert.deepEqual([card.reporterRole, card.reporterFacilityType, card.reporterArea], [reporter.role, reporter.facilityType, reporter.area], id);
        assert.ok(values(SYMPTOM_GROUPS).includes(card.symptomGroup), id);
        assert.equal(card.unusualDescription !== null, card.symptomGroup === "something_unusual", id);
        assert.ok(card.symptomsInWords.length >= 1 && card.symptomsInWords.length <= TEXT_LIMITS.symptomsInWords, id);
        assert.ok(Number.isInteger(card.caseCount) && card.caseCount >= 1 && card.caseCount <= CASE_COUNT_MAX, id);
        assert.ok(values(COMPARED_WITH_USUAL).includes(card.comparedWithUsual), id);
        assert.ok(values(AGE_GROUPS).includes(card.ageGroup), id);
        assert.ok(areaNames.includes(card.area), id);
        assert.ok(values(ONSETS).includes(card.onset), id);
        assert.deepEqual(Object.keys(card.exposure), ["types", "words"], id);
        assert.deepEqual(card.exposure.types, values(EXPOSURE_TYPES).filter((type) => card.exposure.types.includes(type)), id);
        assert.equal(card.exposure.words === null, card.exposure.types.length === 0, id);
        assert.ok(card.exposure.words === null || card.exposure.words.length <= TEXT_LIMITS.exposureWords, id);
        assert.deepEqual(Object.keys(card.observations), [...values(OBSERVATIONS), "suppliesNote"], id);
        assert.equal(card.observations.unusualSymptoms, false, id);
        assert.equal(card.observations.suppliesNote !== null, card.observations.shortOfSupplies, id);
        assert.equal(card.notifiableConditionMentioned, null, id);
        assert.equal(card.source, "simulation", id);
        assert.ok(Number.isInteger(card.createdAt), id);
      }
      assert.equal(ids.size, allCards(runFor(seed, scenario)).length, `seed ${seed} ${scenario}: IDs repeat`);
    }
  }
});

test("cardsUpTo(day) never returns a card from a later day, and misses none up to it", () => {
  const run = runFor(1, "water");
  const everything = allCards(run);
  for (const { day } of run.days) {
    const cards = run.cardsUpTo(day);
    assert.ok(cards.every(({ card }) => run.dayOf(card.createdAt) <= day), `day ${day}`);
    assert.equal(cards.length, everything.filter(({ card }) => run.dayOf(card.createdAt) <= day).length, `day ${day}`);
  }
});

test("a run refuses days outside it and bad settings, and its cards can't be changed", () => {
  const run = runFor(1, "water");
  for (const day of [-85, 29, 1.5]) assert.throws(() => run.cardsUpTo(day), String(day));
  assert.throws(() => createRun({ scenario: "food" }));
  assert.throws(() => createRun({ seed: -1 }));
  assert.throws(() => createRun({ seed: 1.5 }));
  assert.throws(() => createRun({ startDate: "2027-13-01" }));
  const [record] = run.cardsUpTo(0);
  assert.throws(() => { record.card.caseCount = 99; });
  assert.throws(() => { record.card.exposure.types.push("water"); });
  assert.throws(() => { run.days.pop(); });
});

test("until day 12 the water run is exactly the no-cluster run: day 0 leaves no trace in the cards", () => {
  for (const seed of SEEDS) assert.equal(hashOf(runFor(seed, "water").cardsUpTo(12)), hashOf(runFor(seed, "none").cardsUpTo(12)), `seed ${seed}`);
});

test("works B's cards are the same in both runs, every day", () => {
  const worksB = areasOn("B");
  const inB = (run) => allCards(run).filter(({ card }) => worksB.includes(card.area)).map(cardText);
  for (const seed of SEEDS) assert.deepEqual(inB(runFor(seed, "water")), inB(runFor(seed, "none")), `seed ${seed}`);
});

test("the extra cards are in the affected areas from day 13, some mention the water, later ones carry severity, and three mention the school event", () => {
  const truth = groundTruth("water");
  let cluster = [];
  for (const seed of SEEDS) {
    const run = runFor(seed, "water");
    const extra = extraCards(seed).map(({ card }) => ({ card, day: run.dayOf(card.createdAt) }));
    for (const { card, day } of extra) {
      assert.ok(truth.affectedAreas.includes(card.area), `seed ${seed}: ${card.area}`);
      assert.ok(day >= truth.clusterStartDay, `seed ${seed}: day ${day}`);
    }
    const herring = extra.filter(({ card }) => card.exposure.types.includes("event"));
    assert.equal(herring.length, 3, `seed ${seed}`);
    for (const { card, day } of herring) {
      assert.deepEqual(card.exposure.types, ["school", "event"]);
      assert.ok(["Leeba View", "Thaga Park"].includes(card.area));
      assert.ok(day >= 13 && day <= 15);
    }
    cluster = cluster.concat(extra.filter(({ card }) => !card.exposure.types.includes("event")));
  }
  const share = cluster.filter(({ card }) => card.exposure.types.includes("water")).length / cluster.length;
  assert.ok(share > 0.3 && share < 0.55, `water mentioned on ${share} of seeded-cluster cards`);
  const severe = cluster.filter(({ card }) => card.observations.moreSevere);
  assert.ok(severe.length > 0 && severe.every(({ day }) => day >= 16));
  assert.ok(new Set(cluster.map(({ card }) => card.reporterUid)).size >= 5, "the seeded cluster comes from several reporters");
});

test("under water, works A's under-5 diarrhoea in days 13 to 20 is clearly above its own history and works B's isn't; under none, neither is", () => {
  for (const seed of SEEDS) {
    const water = runFor(seed, "water");
    const none = runFor(seed, "none");
    const a = clearlyAboveHistory(water, areasOn("A"));
    assert.ok(a.above, `seed ${seed}: works A ${a.now} cases, busiest 8 days before ${a.busiest}`);
    for (const [run, works] of [[water, "B"], [none, "A"], [none, "B"]]) {
      const result = clearlyAboveHistory(run, areasOn(works));
      assert.ok(!result.above, `seed ${seed} ${run.scenario}: works ${works} ${result.now} cases, busiest 8 days before ${result.busiest}`);
    }
  }
});

test("the ground truth names works A's five areas, and nothing for the no-cluster run", () => {
  const truth = groundTruth("water");
  assert.deepEqual(truth.cause, { kind: "water works", works: "A", failureDay: 0 });
  assert.deepEqual(truth.symptomGroups, ["diarrhoea_vomiting", "bloody_diarrhoea"]);
  assert.deepEqual([...truth.affectedAreas].sort(), [...areasOn("A")].sort());
  assert.deepEqual([...truth.comparisonAreas].sort(), [...areasOn("B")].sort());
  const school = places.schools.find((candidate) => candidate.name === truth.redHerring.school);
  assert.ok(school && new Set(school.catchment.map((name) => places.areas.find((area) => area.name === name).works)).size === 2);
  assert.deepEqual(groundTruth("none"), { scenario: "none", cause: null, clusterStartDay: null, symptomGroups: [], affectedAreas: [], comparisonAreas: [], redHerring: null });
  assert.throws(() => groundTruth("food"));
});
