import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { makeBaseline } from "../../functions/shared/baseline.mjs";
import { exposureLayers } from "../../functions/shared/layers.mjs";
import { dateOf, dayEnd, dayOf, dayOfDate, isDayEnd, isWeekend } from "../../functions/shared/sastDay.mjs";
import { SIGNAL_SETTINGS } from "../../functions/shared/settings.mjs";
import { computeSignals } from "../../functions/shared/signals.mjs";
import { chanceOfAtLeast } from "../../functions/shared/tail.mjs";
import { makeCalendar } from "../../src/sim/calendar.js";

// Small hand-made card sets (not simulated), one per rule, in the real town.
const town = JSON.parse(readFileSync(new URL("../../functions/data/places.json", import.meta.url), "utf8"));
const AREAS = town.areas.map((area) => area.name);
const WORKS_A = town.areas.filter((area) => area.works === "A").map((area) => area.name);
const HOUR = 60 * 60 * 1000;
// A Wednesday, so the 3-day window is Monday to Wednesday.
const TODAY = dayOfDate("2027-03-03");
const asOf = dayEnd(TODAY);

// Made-up reporters. Two colleagues at one clinic, a hospital doctor and a
// pharmacist.
const NURSE = { uid: "test-nurse-1", role: "nurse", facilityType: "clinic", area: "Mmutla Ridge" };
const COLLEAGUE = { uid: "test-nurse-2", role: "nurse", facilityType: "clinic", area: "Mmutla Ridge" };
const HOSPITAL = { uid: "test-doctor-1", role: "doctor", facilityType: "hospital", area: "Kgwedi Heights" };
const PHARMACIST = { uid: "test-pharmacist-1", role: "pharmacist", facilityType: "pharmacy", area: "Leeba View" };

// A card with a saved card's 17 fields, `ago` SAST days before today.
function makeCard(id, { ago, area, group = "diarrhoea_vomiting", cases = 1, age = "under_5", reporter = NURSE, hour = 10, types = [], words = null, flags = {} }) {
  return {
    id,
    card: {
      reporterUid: reporter.uid, reporterRole: reporter.role, reporterFacilityType: reporter.facilityType, reporterArea: reporter.area,
      symptomGroup: group, unusualDescription: null, symptomsInWords: "made-up words", caseCount: cases, comparedWithUsual: "more",
      ageGroup: age, area, onset: "today", exposure: { types, words },
      observations: { moreSevere: false, notResponding: false, unusualSymptoms: false, shortOfSupplies: false, suppliesNote: null, ...flags },
      notifiableConditionMentioned: null, source: "voice", createdAt: dayEnd(TODAY - ago - 1) + hour * HOUR,
    },
  };
}

// A quiet town for 80 days: a cough card in every area each weekday and on
// Saturdays, and a diarrhoea card in every area each Monday until two weeks
// ago (so the last two weeks are a little quieter than usual).
// `busy` areas see a 2-case diarrhoea card every weekday instead.
function quietHistory({ days = 80, busy = [] } = {}) {
  const cards = [];
  for (let ago = 1; ago <= days; ago += 1) {
    const day = TODAY - ago;
    const weekday = (((day + 4) % 7) + 7) % 7;
    AREAS.forEach((area, index) => {
      if (weekday !== 0) cards.push(makeCard(`history-${ago}-${index}-cough`, { ago, area, group: "cough_flu", cases: 1 + ((ago + index) % 3), age: "adult" }));
      if (busy.includes(area) && !isWeekend(day)) cards.push(makeCard(`history-${ago}-${index}-gut`, { ago, area, cases: 2, age: "adult" }));
      else if (weekday === 1 && ago >= 15) cards.push(makeCard(`history-${ago}-${index}-gut`, { ago, area, cases: 1 + ((ago + index) % 2), age: "adult" }));
    });
  }
  return cards;
}

// `count` extra cards in an area over the last `days` days.
function burst(prefix, { area, count, cases = 5, reporters = [NURSE], fromAgo = 0, days = 3, ...rest }) {
  return Array.from({ length: count }, (_, index) => makeCard(`${prefix}-${index}`, { ago: fromAgo + (index % days), area, cases, reporter: reporters[index % reporters.length], ...rest }));
}

const signalsOf = (cards) => computeSignals({ cards, asOf, town }).signals;
const only = (cards) => {
  const signals = signalsOf(cards);
  assert.equal(signals.length, 1, JSON.stringify(signals.map((signal) => signal.id)));
  return signals[0];
};

test("a quiet town raises nothing", () => {
  const result = computeSignals({ cards: quietHistory(), asOf, town });
  assert.equal(result.status, "ok");
  assert.deepEqual(result.signals, []);
  assert.deepEqual(Object.values(result.areaLevels), AREAS.map(() => null));
});

test("one card never fires, however many cases it carries; nor do two; three can", () => {
  const history = quietHistory();
  assert.deepEqual(signalsOf([...history, ...burst("one", { area: "Mmutla Ridge", count: 1, cases: 60 })]), []);
  assert.deepEqual(signalsOf([...history, ...burst("two", { area: "Mmutla Ridge", count: 2, cases: 30 })]), []);
  const signal = only([...history, ...burst("three", { area: "Mmutla Ridge", count: 3 })]);
  assert.equal(signal.level, "watch");
  assert.deepEqual(signal.areas, ["Mmutla Ridge"]);
  assert.deepEqual(signal.observed, { cards: 3, cases: 15 });
});

test("clumpy counts: the exact chance matches a brute-force sum over every number of cards", () => {
  // Negative binomial cards (r = baselineCards + 1), each with a size from `sizes`.
  function bruteForce(cases, { baselineCards, windowShare, sizes, multiplier = 1 }) {
    const q = (windowShare * multiplier) / (1 + windowShare * multiplier);
    const r = baselineCards + 1;
    let cardsChance = (1 - q) ** r;
    let totals = [1];
    let below = 0;
    for (let cards = 0; cards <= 200; cards += 1) {
      below += cardsChance * totals.slice(0, cases).reduce((sum, value) => sum + value, 0);
      const next = new Array(totals.length + sizes.length - 1).fill(0);
      totals.forEach((chance, total) => sizes.forEach((share, size) => { next[total + size] += chance * share; }));
      totals = next;
      cardsChance *= (q * (cards + r)) / (cards + 1);
    }
    return 1 - below;
  }
  const sizes = [0, 0.5, 0.3, 0.14, 0.04, 0.02];
  for (const [cases, baselineCards, windowShare, multiplier] of [[1, 0, 0.06, 1], [4, 3, 0.1, 1], [10, 8, 0.063, 1], [12, 20, 0.2, 2], [25, 40, 0.13, 1]]) {
    const usualRate = { baselineCards, windowShare, sizes, multiplier };
    assert.ok(Math.abs(chanceOfAtLeast(cases, usualRate) - bruteForce(cases, usualRate)) < 1e-12, JSON.stringify(usualRate));
  }
  assert.equal(chanceOfAtLeast(0, { baselineCards: 5, windowShare: 0.1, sizes }), 1);
});

test("clumpy counts: two 5-case cards where one card a week is usual aren't a Watch, though a plain Poisson test on cases says they are", () => {
  const sizes = [0, 0.5, 0.3, 0.14, 0.04, 0.02];
  const usualRate = { baselineCards: 8, windowShare: 3 / (40 + 16 * 0.48), sizes };
  const meanCases = usualRate.baselineCards * usualRate.windowShare * 1.78;
  let poissonBelow = 0;
  for (let cases = 0, term = Math.exp(-meanCases); cases < 10; cases += 1, term *= meanCases / cases) poissonBelow += term;
  assert.ok(1 - poissonBelow < 1e-7, String(1 - poissonBelow));
  const chance = chanceOfAtLeast(10, usualRate);
  assert.ok(chance > SIGNAL_SETTINGS.watchChance && chance < 0.01, String(chance));
});

test("weekdays and weekends: a weekend day counts as the town's own share of a weekday", () => {
  const records = [];
  for (let ago = 1; ago <= 80; ago += 1) {
    const day = TODAY - ago;
    for (let index = 0; index < (isWeekend(day) ? 1 : 2); index += 1) records.push({ ...makeCard(`w-${ago}-${index}`, { ago, area: "Thaga Park" }), day });
  }
  const baseline = makeBaseline(records, TODAY, SIGNAL_SETTINGS);
  assert.equal(baseline.weekendWeight, 0.5);
  // Monday to Wednesday is 3 weekdays; Friday to Sunday is 1 weekday and 2 half days.
  assert.equal(baseline.lengthOf(TODAY - 2, TODAY), 3);
  assert.equal(baseline.lengthOf(TODAY - 5, TODAY - 3), 2);
  assert.equal(baseline.length, 40 + 16 * 0.5);
  // Expected cards in a window are the baseline's cards times the window's share of its length.
  assert.deepEqual(baseline.countFor("diarrhoea_vomiting", ["Thaga Park"]), { cards: 96, cases: 96 });
  const weekdaysOnly = records.filter((record) => !isWeekend(record.day));
  assert.ok(makeBaseline(weekdaysOnly, TODAY, SIGNAL_SETTINGS).weekendWeight > 0);
});

test("the 14-day gap: the baseline ends 14 days before asOf and moves with it", () => {
  const records = [-13, -14, -69, -70].map((offset) => ({ ...makeCard(`gap${offset}`, { ago: -offset, area: "Thaga Park" }), day: TODAY + offset }));
  const baseline = makeBaseline([...records, { ...makeCard("first", { ago: 80, area: "Lebone Gardens" }), day: TODAY - 80 }], TODAY, SIGNAL_SETTINGS);
  assert.equal(baseline.to, TODAY - 14);
  assert.equal(baseline.from, TODAY - 69);
  assert.deepEqual(baseline.countFor("diarrhoea_vomiting", ["Thaga Park"]), { cards: 2, cases: 2 });
  const tomorrow = makeBaseline(records, TODAY + 1, SIGNAL_SETTINGS);
  assert.equal(tomorrow.to, baseline.to + 1);
  assert.equal(tomorrow.summary.days, 56);
  // A burst 10 days ago sits in the gap, so it can't raise today's expected count.
  const history = quietHistory();
  const today = burst("today", { area: "Mmutla Ridge", count: 4, reporters: [NURSE, HOSPITAL] });
  const earlier = burst("earlier", { area: "Mmutla Ridge", count: 6, fromAgo: 10 });
  assert.deepEqual(only([...history, ...earlier, ...today]).expected, only([...history, ...today]).expected);
});

test("cards created at or after asOf are ignored, and asOf must be the end of a SAST day", () => {
  const cards = [...quietHistory(), ...burst("now", { area: "Mmutla Ridge", count: 4 })];
  const later = [makeCard("at-asof", { ago: -1, area: "Mmutla Ridge", hour: 0, cases: 50 }), makeCard("next-day", { ago: -1, area: "Mmutla Ridge", hour: 12, cases: 50 })];
  const plain = computeSignals({ cards, asOf, town });
  const withLater = computeSignals({ cards: [...cards, ...later], asOf, town });
  assert.equal(withLater.skipped.afterAsOf, 2);
  assert.deepEqual({ ...withLater, skipped: { ...withLater.skipped, afterAsOf: 0 } }, plain);
  for (const wrong of [asOf - 1, asOf + HOUR, asOf + 0.5, String(asOf)]) assert.throws(() => computeSignals({ cards, asOf: wrong, town }), /asOf/);
});

test("neighbouring raised areas join into one signal; areas that aren't neighbours stay apart", () => {
  const history = quietHistory();
  const reporters = [NURSE, HOSPITAL];
  const joined = only([...history, ...burst("thaga", { area: "Thaga Park", count: 4, reporters }), ...burst("leeba", { area: "Leeba View", count: 4, reporters })]);
  assert.deepEqual(joined.areas, ["Thaga Park", "Leeba View"]);
  assert.deepEqual(joined.byArea.map((entry) => entry.area), ["Thaga Park", "Leeba View"]);
  const apart = signalsOf([...history, ...burst("thaga", { area: "Thaga Park", count: 4, reporters }), ...burst("kgwedi", { area: "Kgwedi Heights", count: 4, reporters })]);
  assert.deepEqual(apart.map((signal) => signal.areas).sort(), [["Kgwedi Heights"], ["Thaga Park"]]);
});

test("the 72-hour window: cards 4 to 6 days ago show only in the 7-day window", () => {
  const history = quietHistory();
  const reporters = [NURSE, HOSPITAL];
  const older = only([...history, ...burst("older", { area: "Mmutla Ridge", count: 4, fromAgo: 4, reporters })]);
  assert.equal(older.timeWindow.days, 7);
  assert.deepEqual(older.timeWindow, { days: 7, from: dateOf(TODAY - 6), to: dateOf(TODAY) });
  const recent = only([...history, ...burst("recent", { area: "Mmutla Ridge", count: 4, reporters })]);
  assert.equal(recent.timeWindow.days, 3);
  assert.deepEqual(recent.otherWindows.map((other) => other.days), [7]);
  assert.equal(recent.byDay.length, 3);
});

test("independent reporters are places of care: two colleagues at one clinic count once", () => {
  const history = quietHistory();
  const clinic = burst("clinic", { area: "Mmutla Ridge", count: 6, reporters: [NURSE, COLLEAGUE] });
  const watch = only([...history, ...clinic]);
  assert.equal(watch.independentReporters, 1);
  assert.equal(watch.reporters, 2);
  assert.equal(watch.checks.twiceUsual, true);
  assert.equal(watch.level, "watch");
  const signal = only([...history, ...clinic, makeCard("hospital", { ago: 1, area: "Mmutla Ridge", cases: 3, reporter: HOSPITAL })]);
  assert.equal(signal.independentReporters, 2);
  assert.equal(signal.level, "signal");
});

test("the hospital trap: cases from a works A area reported at the works B hospital count in works A", () => {
  const signal = only([...quietHistory(), ...burst("trap", { area: "Leeba View", count: 4, reporters: [HOSPITAL, PHARMACIST] })]);
  assert.deepEqual(signal.areas, ["Leeba View"]);
  const result = computeSignals({ cards: [...quietHistory(), ...burst("trap", { area: "Leeba View", count: 4, reporters: [HOSPITAL, PHARMACIST] })], asOf, town });
  assert.equal(result.areaLevels["Kgwedi Heights"], null);
  assert.notEqual(result.areaLevels["Leeba View"], null);
  const works = (id) => signal.sources.find((source) => source.layer === id);
  assert.equal(works("water:A").inside.observed.cards, 4);
  assert.equal(works("water:B").inside.observed.cards, 0);
});

// Works A's five areas raised, works B normal, and Kgwedi Heights (in the
// Leeba View school's catchment) as busy as it usually is.
function worksACluster() {
  const cards = quietHistory({ busy: ["Kgwedi Heights"] });
  for (const area of WORKS_A) cards.push(...burst(`cluster-${area}`, { area, count: 4, reporters: [NURSE, HOSPITAL], types: ["water"], words: "the tap water looks dirty" }));
  cards.push(makeCard("sports-day", { ago: 1, area: "Leeba View", age: "5_12", cases: 2, reporter: PHARMACIST, types: ["school", "event"], words: "after the sports day at Leeba View Primary School" }));
  return cards;
}

test("layers: works A is the candidate source; the school catchment is not, with the facts that say why", () => {
  const signal = only(worksACluster());
  assert.deepEqual(signal.areas, WORKS_A);
  const layer = (id) => signal.sources.find((source) => source.layer === id);
  const works = layer("water:A");
  assert.equal(works.candidate, true);
  assert.equal(works.order, 1);
  assert.equal(signal.sources[0], works);
  assert.ok(works.inside.casesPer1000 > 5 * works.outside.casesPer1000);
  assert.ok(works.supporting.some((fact) => fact.kind === "outsideNearUsual"));
  const water = works.supporting.find((fact) => fact.kind === "exposureMentioned");
  assert.deepEqual([water.type, water.cards, water.cardIds.length], ["water", 20, 20]);

  const school = layer("school:Leeba View Primary School");
  assert.equal(school.candidate, false);
  assert.deepEqual(school.contradicting.filter((fact) => fact.kind === "insideAreaNormal"), [{ kind: "insideAreaNormal", area: "Kgwedi Heights" }]);
  assert.deepEqual(school.contradicting.filter((fact) => fact.kind === "outsideAreaRaised").map((fact) => fact.area), ["Sefate Extension", "Nonyana Flats", "Mmutla Ridge"]);
  assert.deepEqual(school.supporting.find((fact) => fact.kind === "nameMentioned"), { kind: "nameMentioned", cards: 1, cardIds: ["sports-day"] });
  assert.equal(layer("shop:Leeba View spaza shop").candidate, false);
  assert.equal(layer("water:B").candidate, false);
  assert.deepEqual(signal.sources.filter((source) => source.candidate).map((source) => source.layer), ["water:A"]);
  assert.equal(signal.level, "alert");
  assert.equal(signal.checks.candidateSource, true);
});

test("levels: an Alert comes from a candidate source or from 2 cards with a severity flag; supplies never change a level", () => {
  const history = quietHistory();
  const base = burst("base", { area: "Mmutla Ridge", count: 6, reporters: [NURSE, HOSPITAL] });
  const flagged = (flags) => [...history, ...base, ...flags.map((flag, index) => makeCard(`flag-${index}`, { ago: 1, area: "Mmutla Ridge", cases: 2, reporter: HOSPITAL, flags: flag }))];
  const plain = only(flagged([]));
  assert.equal(plain.level, "signal");
  assert.equal(plain.checks.candidateSource, false);
  const severe = only(flagged([{ moreSevere: true }, { moreSevere: true }]));
  assert.equal(severe.level, "alert");
  assert.deepEqual([severe.flags.moreSevere, severe.flags.severityCards], [2, 2]);
  const mixed = only(flagged([{ moreSevere: true }, { notResponding: true }]));
  assert.equal(mixed.level, "alert");
  assert.equal(mixed.checks.severityFlags, true);
  const one = only(flagged([{ moreSevere: true, notResponding: true }]));
  assert.equal(one.level, "signal");
  assert.equal(one.flags.severityCards, 1);
  const supplies = only(flagged([{ shortOfSupplies: true, suppliesNote: "gloves" }, { shortOfSupplies: true, suppliesNote: "gloves" }]));
  assert.equal(supplies.level, "signal");
  assert.equal(supplies.flags.shortOfSupplies, 2);
});

test("privacy: no reporter field, ID, role or facility type anywhere in the output", () => {
  const text = JSON.stringify(computeSignals({ cards: worksACluster(), asOf, town }));
  assert.match(text, /"level":"alert"/);
  assert.doesNotMatch(text, /reporterUid|reporterRole|reporterFacilityType|reporterArea/);
  for (const reporter of [NURSE, COLLEAGUE, HOSPITAL, PHARMACIST]) assert.ok(!text.includes(reporter.uid), reporter.uid);
  for (const word of ["nurse", "doctor", "pharmacist", "clinic", "hospital", "pharmacy"]) assert.ok(!text.includes(`"${word}"`), word);
});

test("real cards that can't be counted are skipped and tallied, never guessed", () => {
  const broken = [
    makeCard("no-area", { ago: 1, area: null }),
    makeCard("other-area", { ago: 1, area: "Somewhere Else" }),
    makeCard("no-count", { ago: 1, area: "Mmutla Ridge", cases: null }),
    makeCard("no-group", { ago: 1, area: "Mmutla Ridge", group: null }),
    { id: "timestamp", card: { ...makeCard("x", { ago: 1, area: "Mmutla Ridge" }).card, createdAt: { seconds: 1, nanoseconds: 0 } } },
    { id: "empty", card: null },
  ];
  const unknownAge = makeCard("no-age", { ago: 1, area: "Mmutla Ridge", cases: 3, age: null, reporter: HOSPITAL });
  const cards = [...quietHistory(), ...burst("now", { area: "Mmutla Ridge", count: 4 }), unknownAge, ...broken];
  const result = computeSignals({ cards, asOf, town });
  assert.deepEqual(result.skipped, { afterAsOf: 0, noTime: 2, unknownArea: 2, noCaseCount: 1, noSymptomGroup: 1 });
  assert.equal(result.cardsCounted, cards.length - broken.length);
  assert.equal(result.signals[0].casesByAge.unknown, 3);
});

test("with under 28 days of history, nothing is tested", () => {
  const result = computeSignals({ cards: [...quietHistory({ days: 40 }), ...burst("now", { area: "Mmutla Ridge", count: 8 })], asOf, town });
  assert.equal(result.status, "notEnoughHistory");
  assert.equal(result.baseline.days, 40 - 14 + 1);
  assert.deepEqual(result.signals, []);
  assert.deepEqual(Object.values(result.areaLevels), AREAS.map(() => null));
  assert.equal(computeSignals({ cards: [], asOf, town }).status, "notEnoughHistory");
});

test("determinism: the same cards in any order give the same output, and the input isn't changed", () => {
  const cards = worksACluster().map((record) => Object.freeze({ ...record, card: Object.freeze(record.card) }));
  const first = computeSignals({ cards, asOf, town });
  assert.deepEqual(computeSignals({ cards, asOf, town }), first);
  assert.deepEqual(computeSignals({ cards: [...cards].reverse(), asOf, town }), first);
  assert.equal(JSON.stringify(computeSignals({ cards: [...cards].reverse(), asOf, town })), JSON.stringify(first));
});

test("SAST days agree with the simulation's calendar and processNote's sastDay", () => {
  const calendar = makeCalendar("2027-02-01");
  const dayZero = dayOfDate("2027-02-01");
  const sastDay = (ms) => new Date(ms + 2 * HOUR).toISOString().slice(0, 10);
  for (let ms = calendar.dayStart(-3); ms < calendar.dayStart(10); ms += 37 * 60 * 1000) {
    assert.equal(dayOf(ms) - dayZero, calendar.dayOf(ms));
    assert.equal(dateOf(dayOf(ms)), sastDay(ms));
    assert.equal(isWeekend(dayOf(ms)), calendar.isWeekend(calendar.dayOf(ms)));
  }
  for (let day = -84; day <= 28; day += 1) {
    assert.equal(dayEnd(dayZero + day), calendar.dayStart(day + 1));
    assert.ok(isDayEnd(dayEnd(dayZero + day)));
  }
  assert.throws(() => dayOfDate("2027-02-30"));
  assert.throws(() => dayOfDate("1 Feb 2027"));
});

test("the exposure layers come from the town file: two water zones, two school catchments, two shop catchments", () => {
  const layers = exposureLayers(town);
  assert.deepEqual(layers.map((layer) => layer.id), ["water:A", "water:B", ...town.schools.map((school) => `school:${school.name}`), ...town.shops.map((shop) => `shop:${shop.name}`)]);
  assert.deepEqual(layers[0].areas, WORKS_A);
  assert.deepEqual(layers.find((layer) => layer.kind === "school").areas, town.schools[0].catchment);
  assert.deepEqual(layers.find((layer) => layer.kind === "shop").areas, town.shops[0].serves);
});
