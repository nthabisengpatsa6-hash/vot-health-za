import assert from "node:assert/strict";
import {test} from "node:test";
import town from "../../functions/data/places.json" with {type: "json"};
import {buildRankInput, assertRankInput} from "../../functions/shared/rank/input.mjs";
import {validateRanking} from "../../functions/shared/rank/validate.mjs";
import {matchSignal, rankingChange} from "../../functions/shared/rank/match.mjs";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {dayEnd, dayOfDate} from "../../functions/shared/sastDay.mjs";
import {planRankings, replayRankingDays, swapClues} from "../../scripts/lib/rankPlans.mjs";
import {rankingScorecard} from "../../src/sim/scorecard.js";

const run = createRun({seed: 1});
const cards = run.cardsUpTo(17);
const signal = computeSignals({cards, asOf: dayEnd(dayOfDate(run.startDate) + 17), town}).signals[0];
const built = buildRankInput(signal, cards, town);
const row = (changes = {}) => ({sourceId: "water:A", rank: 1, confidence: "medium", supporting: ["c1"], contradicting: [], reason: "Several clues agree across the affected areas.", ...changes});
const validate = (rows) => validateRanking(built.input, {sources: rows}, built.references);

test("ranking input is byte-identical across rebuilds and card input order", () => {
  assert.equal(JSON.stringify(buildRankInput(signal, cards, town)), JSON.stringify(buildRankInput(signal, [...cards].reverse(), town)));
  const second = createRun({seed: 1});
  const input = buildRankInput(signal, second.cardsUpTo(17), town);
  assert.equal(JSON.stringify(input), JSON.stringify(built));
});

test("only the signal's window and existing aggregates reach the model, without any probabilities", () => {
  assert.deepEqual(built.input.signal.timeWindow, signal.timeWindow);
  for (const key of ["observed", "expected", "byDay", "casesByAge", "cardsByOnset", "cardsByExposure", "flags"]) assert.deepEqual(built.input.signal[key], signal[key]);
  assert.equal(built.input.signal.placesOfCare, signal.independentReporters);
  assert.doesNotMatch(JSON.stringify(built.input), /chance|reporter|suppliesNote|sim-2027|"seed"|"scenario"|groundTruth/);
  for (const card of built.input.cards) assert.match(card.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("deep input scan refuses reporter fields, probabilities, seeds, scenarios and hidden truth keys at any depth", () => {
  for (const key of ["reporterUid", "reporterRole", "reporterArea", "reporterFacilityType", "chance", "seed", "scenario", "groundTruth", "cause", "clusterStartDay", "affectedAreas", "comparisonAreas", "redHerring", "failureDay", "symptomGroups"]) {
    assert.throws(() => assertRankInput({cards: [{nested: {[key]: "sentinel"}}]}), /forbidden/, key);
  }
  const poisoned = cards.map((record) => ({...record, card: {...record.card, reporterUid: "PRIVATE_SENTINEL", reporterRole: "PRIVATE_SENTINEL", reporterArea: "PRIVATE_SENTINEL", reporterFacilityType: "PRIVATE_SENTINEL"}}));
  assert.ok(!JSON.stringify(buildRankInput(signal, poisoned, town).input).includes("PRIVATE_SENTINEL"));
});

test("card dates use SAST rather than the UTC date", () => {
  const selected = cards.filter(({id}) => signal.cardIds.includes(id));
  const changed = [{...selected[0], card: {...selected[0].card, createdAt: Date.parse("2027-02-17T22:05:00Z")}}, ...selected.slice(1)];
  assert.equal(buildRankInput(signal, changed, town).input.cards[0].date, "2027-02-18");
});

test("forty newest cards are retained, with exact omission count and real IDs outside input", () => {
  const many = Array.from({length: 45}, (_, index) => ({id: `made-up-${index}`, card: {...cards.at(-1).card, createdAt: index}}));
  const result = buildRankInput({...signal, cardIds: many.map(({id}) => id)}, many, town);
  assert.equal(result.input.cards.length, 40);
  assert.equal(result.input.cardsOmitted, 5);
  assert.equal(result.references.cards.c1, "made-up-44");
  assert.equal(result.references.cards.c40, "made-up-5");
  assert.ok(!JSON.stringify(result.input).includes("made-up-"));
});

test("sources are capped at eight deterministically", () => {
  const expanded = {...town, shops: [...town.shops, ...Array.from({length: 5}, (_, index) => ({name: `Extra shop ${index}`, serves: [town.areas[0].name]}))]};
  const result = buildRankInput(signal, cards, expanded);
  assert.equal(result.input.sources.length, 8);
  assert.equal(result.input.sourcesOmitted, 3);
  assert.ok(result.input.sources.some((source) => source.id === "water:A"));
});

test("Watch cannot be sent for ranking", () => {
  assert.throws(() => buildRankInput({...signal, level: "watch"}, cards, town));
});

test("cleaned citations are real card IDs and fact objects; raw data stays unchanged", () => {
  const source = built.input.sourceEvidence.find((entry) => entry.sourceId === "water:A");
  const factId = source.supporting[0].id;
  const raw = {sources: [row({supporting: ["c1", factId]})]};
  const before = JSON.stringify(raw);
  const cleaned = validateRanking(built.input, raw, built.references).ranking.sources[0];
  assert.equal(cleaned.supporting[0], built.references.cards.c1);
  assert.deepEqual(cleaned.supporting[1], built.references.facts[factId]);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(cleaned.fromClinicianCluesOnly, false);
  assert.equal(validate([row({sourceId: "water:B"})]).ranking.sources[0].fromClinicianCluesOnly, true);
});

test("unknown sources and confidence words are dropped and counted", () => {
  const result = validate([row({sourceId: "invented"}), row({confidence: "certain"})]);
  assert.equal(result.ranking.sources.length, 0);
  assert.equal(result.dropCounts.unknownSource, 1);
  assert.equal(result.dropCounts.invalidConfidence, 1);
});

test("unknown citations are dropped; a source without supporting evidence is dropped", () => {
  const result = validate([row({supporting: ["c999"], contradicting: ["f999"]})]);
  assert.equal(result.dropCounts.unknownCitation, 2);
  assert.equal(result.dropCounts.noSupporting, 1);
  assert.equal(result.ranking.sources.length, 0);
  const kept = validate([row({supporting: ["c999", "c1"]})]);
  assert.equal(kept.ranking.sources.length, 1);
  assert.equal(kept.dropCounts.unknownCitation, 1);
});

test("extras and duplicate sources are dropped; gapped and duplicate ranks are repaired", () => {
  const rows = built.input.sources.map((source) => row({sourceId: source.id, rank: 8}));
  const result = validate([...rows, rows[0]]);
  assert.deepEqual(result.ranking.sources.map((entry) => entry.rank), [1, 2, 3, 4]);
  assert.equal(result.dropCounts.extraSources, 2);
  assert.equal(result.dropCounts.duplicateSource, 1);
  assert.equal(result.dropCounts.ranksRepaired, 4);
});

test("every banned word and prefix removes the reason, while water treatment remains legitimate", () => {
  const words = ["outbreak", "epidemic", "diagnosis", "prescribing", "antibiotic", "medication", "dose", "dosage", "blame", "fault", "negligence", "culpable", "guilty", "mayor", "minister", "councillor", "MEC"];
  for (const word of words) {
    const result = validate([row({reason: `Possible ${word}.`})]);
    assert.equal(result.ranking.sources[0].reason, "", word);
    assert.equal(result.dropCounts.bannedReason, 1, word);
  }
  const reason = "Clues fit the water treatment works catchment.";
  assert.equal(validate([row({reason})]).ranking.sources[0].reason, reason);
});

test("ID-like tokens remove reasons and are counted separately", () => {
  for (const id of ["c1", "f12", "F42"]) {
    const result = validate([row({reason: `See ${id} for the clue.`})]);
    assert.equal(result.ranking.sources[0].reason, "");
    assert.equal(result.dropCounts.idInReason, 1);
  }
});

test("invalid and overlong reasons are removed, not silently truncated", () => {
  for (const reason of [null, "a".repeat(161)]) {
    const result = validate([row({reason})]);
    assert.equal(result.ranking.sources[0].reason, "");
    assert.equal(result.dropCounts.invalidReason, 1);
  }
});

test("invalid JSON and malformed shapes produce unavailable results", () => {
  assert.equal(validateRanking(built.input, "not json", built.references).dropCounts.invalidJson, 1);
  for (const value of [null, [], {}, {sources: null}]) assert.equal(validateRanking(built.input, value, built.references).ranking.unavailable, true);
  assert.equal(validate([null]).dropCounts.invalidShape, 1);
});

test("matching follows groups and overlap with stable tie breaks", () => {
  const prev = [{id: "b", symptomGroup: "g", areas: ["a"]}, {id: "a", symptomGroup: "g", areas: ["a"]}];
  assert.equal(matchSignal(prev, {symptomGroup: "g", areas: ["a", "b"]}).id, "a");
  assert.equal(matchSignal(prev, {symptomGroup: "other", areas: ["a"]}), null);
  assert.equal(matchSignal(prev, {symptomGroup: "g", areas: ["c"]}), null);
  assert.deepEqual(rankingChange(signal, {...signal, observed: {cards: 1000, cases: 2000}}), []);
  assert.deepEqual(rankingChange(signal, {...signal, level: "watch"}), []);
});

test("all tuning quiet runs plan zero calls; all sets total 79 with the revised seeds", () => {
  for (let seed = 1; seed <= 10; seed++) assert.equal(replayRankingDays(seed, "none").events.length, 0, `seed ${seed}`);
  const plans = planRankings({sets: ["all"]});
  assert.equal(plans.length, 79);
  const count = (set) => plans.filter((plan) => plan.runSet === set).length;
  assert.deepEqual([count("main"), count("effort"), count("repeat"), count("swap")], [67, 5, 2, 5]);
  assert.deepEqual(plans.filter((plan) => plan.runSet === "effort").map((plan) => plan.seed), [2, 4, 5, 8, 9]);
  assert.deepEqual(plans.filter((plan) => plan.runSet === "swap").map((plan) => plan.seed), [1, 3, 5, 7, 10]);
  for (const plan of plans) assertRankInput(plan.input);
});

test("swap fixtures change clue summaries consistently and preserve all numerical statistics", () => {
  const event = replayRankingDays(5).firstAlert;
  const changed = swapClues(event.signal, event.cards);
  const projection = (entry) => ({level: entry.level, checks: entry.checks, timeWindow: entry.timeWindow,
    observed: entry.observed, expected: entry.expected, chance: entry.chance,
    byDay: entry.byDay, flags: entry.flags, casesByAge: entry.casesByAge, cardsByOnset: entry.cardsByOnset,
    sources: entry.sources.map(({supporting: _supporting, ...source}) => source)});
  assert.deepEqual(projection(changed.signal), projection(event.signal));
  assert.equal(changed.signal.cardsByExposure.food, event.signal.cardsByExposure.water);
  assert.equal(changed.signal.cardsByExposure.water || 0, event.signal.cardsByExposure.food || 0);
  const works = changed.signal.sources.find((source) => source.layer === "water:A");
  const own = changed.cards.filter(({card}) => card.symptomGroup === changed.signal.symptomGroup && works.inside.areas.includes(card.area) &&
    card.exposure.types.includes("water") && new Date(card.createdAt + 7200000).toISOString().slice(0, 10) >= changed.signal.timeWindow.from);
  assert.equal(works.supporting.find((fact) => fact.kind === "exposureMentioned")?.cards || 0, own.length);
});

test("scorecard reports missing results honestly and includes clue counts and revised subsets", () => {
  const markdown = rankingScorecard([]);
  assert.match(markdown, /^# Tuning seeds 1 to 10/);
  assert.match(markdown, /5 \/ 2 \/ 1 \/ 1/);
  assert.match(markdown, /Seeds 2, 4, 5, 8 and 9/);
  assert.match(markdown, /missing/);
  assert.match(markdown, /Low versus medium/);
});
