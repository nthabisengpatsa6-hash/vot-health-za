import test from "node:test";
import assert from "node:assert/strict";
import {authoredOutcomes, authoredComparison, outcomeVariation, cardTimings} from "../../scripts/lib/revisionComparison.mjs";

const reply = (words) => ({cards:[{area:"Leeba View", exposure:{words, types:["food"]}, symptomsInWords:"SyntheticPrivateCanary"}], transcriptClean:words});
test("authored comparison exposes assertion outcomes without card or transcript values", () => {
  const rows = authoredComparison("D4-1", reply("vetkoek mala"), reply("fat cook mala"));
  assert.ok(rows.some((row) => row.field === "exposureKeyTerms:1" && row.meta === "correct" && row.baseten === "fail"));
  assert.ok(rows.some((row) => row.field === "forbiddenTerms:1" && row.baseten === "fail"));
  assert.ok(!JSON.stringify(rows).includes("Canary")); assert.ok(!JSON.stringify(rows).includes("fat cook"));
  assert.equal(authoredOutcomes("unknown", reply("synthetic")).length, 0);
  assert.ok(authoredComparison("D4-1", reply("vetkoek mala"), null).every((row) => row.baseten === "unavailable"));
});
test("special fixtures use only existing assertions and preserve whole-word checks", () => {
  const fields = authoredOutcomes("D4-1", reply("vetkoeks mala"));
  assert.equal(fields.find((row) => row.field === "exposureKeyTerms:1").outcome, "fail");
  assert.ok(!fields.some((row) => ["onset", "ageGroup", "caseCount"].includes(row.field)));
  assert.equal(authoredOutcomes("NEAR-MISS", reply("lamb chops" )).find((row) => row.field === "noListedTerms").outcome, "correct");
});
test("extra authored cards remain explicit even when matched fields are correct", () => {
  const value = {isReport:false, cards:[{symptomGroup:"diarrhoea_vomiting", symptomsInWords:"SyntheticPrivateCanary"}], adviceRequested:false, notifiableConditionMentioned:null};
  const rows = authoredOutcomes("n10", value);
  assert.ok(rows.some((row) => row.field === "card" && row.outcome === "extra card"));
  assert.ok(rows.some((row) => row.field === "check:cardCount" && row.outcome === "fail"));
  assert.ok(!JSON.stringify(rows).includes("Canary"));
});
test("variation counts each recording/card/field once and ignores actual values", () => {
  const row = (run, outcome, id = "n01") => ({row:{id, run, configuration:"A2", payload:{reply:"SyntheticPrivateCanary"}}, score:{fields:[{card:id, field:"onset", outcome}]}});
  const rows = [row(1, "correct"), row(2, "correct"), row(3, "caught by ask"), row(1, "correct", "n02")];
  assert.equal(outcomeVariation(rows, "A2"), 1); assert.equal(outcomeVariation(rows, "A-min"), 0);
});
test("card timings exclude cached comparisons and separate repeats", () => {
  const rows = [{row:{configuration:"A2", run:1, cardTimingComparable:true, timings:{cardMs:100}}},
    {row:{configuration:"A2", run:2, cardTimingComparable:true, timings:{cardMs:200}}},
    {row:{configuration:"A2", run:1, cardTimingComparable:false, timings:{cardMs:1}}},
    {row:{configuration:"A-min", run:1, comparable:true, timings:{cardMs:50}}},
    {row:{configuration:"A-min", run:1, comparable:false, timings:{cardMs:2}}}];
  assert.deepEqual(cardTimings(rows, "A2"), [100, 200]); assert.deepEqual(cardTimings(rows, "A2", 2), [200]);
  assert.deepEqual(cardTimings(rows, "A-min"), [50]);
});
