import test from "node:test";
import assert from "node:assert/strict";
import {median, recommendations, generateReport} from "../../scripts/score-report.mjs";
import {fileURLToPath} from "node:url";
import {validateSchema} from "../../scripts/lib/schemaValidation.mjs";

const evaluated = (name, {cw = 0, asks = 0, ears = 1000, total = 2000, effort = "low"} = {}) => Array.from({length:30}, (_, i) => ({
  row:{id:`n${String(i % 10 + 1).padStart(2, "0")}`, configuration:name, run:Math.floor(i / 10) + 1, effort,
    comparable:true, timings:{bothEarsMs:ears, totalMs:total}, payload:{reply:{cards:[{}]}}},
  score:{totals:{confidentlyWrong:cw, caughtByAsk:0, unnecessaryAsk:asks, missed:0, extra:0, extraCards:0, missingCards:0, nameLeaks:0, jsonFailures:0}, fields:[]},
  on:{totals:{confidentlyWrong:cw, caughtByAsk:0, unnecessaryAsk:asks}, fields:[]},
}));
test("report medians use measured samples and mark empty samples unavailable", () => {
  assert.equal(median([]), null); assert.equal(median([5, 1, 3]), 3); assert.equal(median([1, 5]), 3);
});
test("effort chooses minimal only with no CW increase and faster ears", () => {
  const rows = [...evaluated("Baseline"), ...evaluated("A"), ...evaluated("A-min", {ears:900, effort:"minimal"}), ...evaluated("B", {effort:"minimal", ears:950})];
  assert.equal(recommendations(rows, [], 3).effort, "minimal");
  for (const item of rows.filter((item) => item.row.configuration === "A-min")) item.score.totals.confidentlyWrong = 1;
  const decision = recommendations(rows, [], 3);
  assert.equal(decision.effort, "low"); assert.equal(decision.audioEar, "1.2"); assert.match(decision.comparison, /No matched/);
});
test("better 1.3 must fit the two-second total-time limit", () => {
  const rows = [...evaluated("Baseline"), ...evaluated("A", {cw:1}), ...evaluated("A-min", {cw:2, effort:"minimal"}),
    ...evaluated("B", {effort:"low", total:4001})];
  assert.equal(recommendations(rows, [], 3).audioEar, "1.2");
  for (const item of rows.filter((item) => item.row.configuration === "B")) item.row.timings.totalMs = 4000;
  assert.equal(recommendations(rows, [], 3).audioEar, "1.3");
});

test("a quality tie needs faster 1.3 measurements in two runs", () => {
  const rows = [...evaluated("A"), ...evaluated("B", {total:1900})];
  assert.equal(recommendations(rows, [], 3).audioEar, "1.3");
  for (const item of rows.filter((item) => item.row.configuration === "B" && item.row.run !== 1)) item.row.timings.totalMs = 2100;
  assert.equal(recommendations(rows, [], 3).audioEar, "1.2");
});
test("empty report lists missing results and never claims adoption", () => {
  const result = generateReport({root:fileURLToPath(new URL("../../.scratch/nonexistent-report/", import.meta.url)),
    local:{listenedAt:"2026-10-30", corrections:{}}, write:false, print:()=>{}});
  assert.equal(result.missing.length, 152); assert.match(result.decision.prompt, /revise/);
  assert.ok(result.markdown.includes("10 recordings; 10 expected cards"));
});
test("local schema validator enforces required fields, enums, nullable values and extra keys", () => {
  const schema = {type:"object", additionalProperties:false, required:["x"], properties:{x:{anyOf:[{type:"string", enum:["a"]}, {type:"null"}]}}};
  assert.doesNotThrow(() => validateSchema({x:null}, schema));
  assert.throws(() => validateSchema({}, schema)); assert.throws(() => validateSchema({x:"b"}, schema));
  assert.throws(() => validateSchema({x:"a", extra:1}, schema));
});
