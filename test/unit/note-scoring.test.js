import test from "node:test";
import assert from "node:assert/strict";
import {scoreSingle, scoreNote, wholeWord, termMatch, pairCards, normalizeCard, falseInsertions, expectedDifferences} from "../../scripts/lib/noteScoring.mjs";
import old from "../../test-fixtures/expected-cards.json" with {type:"json"};
import recordings from "../../test-fixtures/recordings-expected.json" with {type:"json"};

test("all four scalar outcomes distinguish correct guesses and uncertainty", () => {
  assert.equal(scoreSingle(3, 3, false), "correct");
  assert.equal(scoreSingle("ask", null, true), "correct");
  assert.equal(scoreSingle(3, 3, true), "unnecessary ask");
  assert.equal(scoreSingle(3, 2, true), "caught by ask");
  assert.equal(scoreSingle(3, null, true), "caught by ask");
  assert.equal(scoreSingle(3, 2, false), "confidently wrong");
  assert.equal(scoreSingle("ask", 3, false), "confidently wrong");
  assert.equal(scoreSingle("ask", null, false), "missing ask");
});
test("whole-word matching handles Unicode, phrases and apostrophes", () => {
  for (const text of ["vomiting", "eating"]) assert.equal(wholeWord(text, "ting"), false);
  assert.equal(wholeWord("malaria", "mala"), false);
  assert.equal(wholeWord("TAXI RANK, bunny chow and Go Slo’s", "Go Slo's"), true);
  assert.equal(wholeWord("at the taxi rank", "taxi rank"), true);
  assert.equal(wholeWord("droëwors", "droewors"), false);
  assert.equal(wholeWord("DROËWORS droewors", "droëwors"), true);
  assert.equal(wholeWord("droewors", "droewors"), true);
});
test("pairing uses group then area and retains missing and extra cards", () => {
  const wanted = [{symptomGroup:"a", area:"one"}, {symptomGroup:"a", area:"two"}, {symptomGroup:"b", area:"one"}];
  const got = [{symptomGroup:"a", area:"two"}, {symptomGroup:"a", area:"one"}, {symptomGroup:"c", area:"one"}];
  const value = pairCards(wanted, got);
  assert.equal(value.pairs[0].produced, got[1]); assert.equal(value.pairs[1].produced, got[0]);
  assert.equal(value.pairs[2].produced, null); assert.deepEqual(value.extra, [got[2]]);
});
test("set misses, extras and acceptUnsure contribute correctly", () => {
  const expected = {id:"x", expectedCards:[{card:"x", symptomGroup:"Diarrhoea or vomiting", exposureTypes:["Water"],
    observations:["More severe than usual"], acceptUnsure:["observations:More severe than usual"]}]};
  const reply = {isReport:true, cards:[{symptomGroup:"diarrhoea_vomiting", exposure:{types:["food"]},
    observations:{moreSevere:true}, unsureFields:["observations"]}], adviceRequested:false, notifiableConditionMentioned:null};
  const result = scoreNote(expected, reply);
  assert.equal(result.totals.missed, 1); assert.equal(result.totals.extra, 1);
  assert.equal(result.totals.confidentlyWrong, 1); assert.equal(result.totals.unnecessaryAsk, 0);
  reply.cards[0].unsureFields.push("exposure");
  assert.equal(scoreNote(expected, reply).totals.unnecessaryAsk, 1);
});
test("missing and extra cards are counted and n10 requires not-a-report", () => {
  const empty = {isReport:true, cards:[], adviceRequested:false, notifiableConditionMentioned:null};
  assert.equal(scoreNote(recordings.recordings[0], empty).totals.missingCards, 1);
  assert.equal(scoreNote(recordings.recordings[9], {...empty, isReport:false}).checks.isReport, true);
  assert.equal(scoreNote(recordings.recordings[9], {...empty, cards:[{symptomGroup:"x"}]}).totals.extraCards, 1);
});
test("expected fixture mapping preserves labels and reports differences without editing", () => {
  assert.equal(recordings.recordings.flatMap((r) => r.expectedCards).length, 10);
  assert.equal(normalizeCard(recordings.recordings[4].expectedCards[0]).symptomGroup, "sudden_after_eating_drinking");
  const differences = expectedDifferences(old, recordings);
  for (const [card, field] of [["n01", "onset"], ["n06", "onset"], ["n09b", "ageGroup"]]) {
    assert.equal(recordings.recordings.flatMap((r) => r.expectedCards).find((r) => r.card === card)[field], "ask");
    assert.ok(!differences.some((r) => r.card === card && r.field === field));
  }
  assert.equal(differences.filter((r) => r.field === "exposureKeyTerms").length, 4);
  assert.ok(differences.some((r) => r.card === "n05" && r.field === "acceptUnsure"));
});
test("listed-word additions and swaps are detected term by term", () => {
  const result = falseInsertions({cards:[{words:"vetkoek"}]}, "magwinya");
  assert.deepEqual(result.extra, ["vetkoek"]); assert.deepEqual(result.missing, ["magwinya"]);
});

test("listed trailing-s variants match bidirectionally without general stemming", () => {
  for (const [text, term] of [["VETKOEKS,", "vetkoek"], ["vetkoek", "vetkoeks"], ["at taxi ranks", "taxi rank"], ["at a taxi rank", "taxi ranks"]]) assert.equal(termMatch(text, term), true);
  for (const [text, term] of [["vetkoekss", "vetkoek"], ["supervetkoeks", "vetkoek"], ["counts", "count"], ["count", "counts"], ["boerewor", "boerewors"], ["bunny chowshed", "bunny chow"], ["droewors", "droëwors"], ["vomiting", "ting"]]) assert.equal(termMatch(text, term), false);
  assert.equal(wholeWord("vetkoeks", "vetkoek"), false);
});
test("listed plurals neither add nor remove a term, while real swaps still fail", () => {
  for (const [input, output] of [["vetkoeks and spazas", "vetkoek and spaza"], ["vetkoek and spaza", "vetkoeks and spazas"]]) assert.deepEqual(falseInsertions({cards:[{words:output}]}, input), {extra:[], missing:[]});
  assert.deepEqual(falseInsertions({cards:[{words:"vetkoeks"}]}, "magwinya"), {extra:["vetkoek"], missing:["magwinya"]});
  assert.deepEqual(falseInsertions({cards:[{words:"nothing listed"}]}, "vetkoeks"), {extra:[], missing:["vetkoek"]});
});
test("key-term scoring applies listed plurals while preserving uncertainty outcomes", () => {
  const expected = {id:"synthetic", expectedCards:[{card:"synthetic", symptomGroup:"diarrhoea_vomiting", exposureKeyTerms:[["vetkoek"], ["count"]]}]};
  const reply = {cards:[{symptomGroup:"diarrhoea_vomiting", exposure:{words:"vetkoeks and counts"}, unsureFields:[]}]};
  assert.deepEqual(scoreNote(expected, reply).fields.map((field) => field.outcome), ["correct", "correct", "confidently wrong"]);
  reply.cards[0].unsureFields = ["exposure"];
  assert.deepEqual(scoreNote(expected, reply).fields.map((field) => field.outcome), ["correct", "unnecessary ask", "caught by ask"]);
  expected.expectedCards[0].exposureKeyTerms = [["vetkoeks"]]; reply.cards[0].exposure.words = "vetkoek";
  assert.equal(scoreNote(expected, reply).fields.at(-1).outcome, "unnecessary ask");
});
