import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {baseline, configurations, ideal, special, basetenPlans} from "./notePlans.mjs";
import {paths, readLines} from "./noteArtifacts.mjs";
import example from "../../test-fixtures/baseten-example.json" with {type:"json"};
const require = createRequire(import.meta.url);
const {buildSystemPrompt, userMessage} = require("../../functions/lib/extractCard.js");
const {REPLY_SCHEMA} = require("../../functions/lib/cardSchema.js");
const {extractionHash} = require("../../functions/lib/extractionHash.js");
const template = readFileSync(fileURLToPath(new URL("../prompts/extract-card-a2.md", import.meta.url)), "utf8");
const prompt = buildSystemPrompt(template);
export const A2 = Object.freeze({...configurations().find((config) => config.name === "A-min"), name:"A2", prompt,
  extractionHash:extractionHash({prompt, audioModel:"muse-spark-1.2", audioEffort:"minimal", uncertainWords:false}),
  configurationHash:extractionHash({prompt, audioModel:"muse-spark-1.2", audioEffort:"minimal", uncertainWords:false})});
export const PROBE_BODY = Object.freeze({...example, messages:Object.freeze(example.messages.map(Object.freeze))});
export function revisionPaths(root, provider = "meta") {
  const original = paths(root), base = join(root, "docs", "provenance", "open-weights");
  return {...original, private:provider === "baseten" ? join(root, "test-audio", "results", "a2-baseten-probe.jsonl") : join(root, "test-audio", "results", "a2-calls.jsonl"),
    fixtures:join(root, "docs", "provenance", "scoring", "a2-fixture-results.jsonl"),
    baseten:join(base, "a2-fixture-results.jsonl"), rankings:join(base, "a2-ranking-results.jsonl"), log:join(base, "a2-run-log.jsonl")};
}
export function revisionTextPlans() {
  return [...Object.entries(ideal).map(([id, text]) => ({id, text, run:1, config:A2})),
    ...special.flatMap((fixture) => [1, 2, 3].map((run) => ({id:fixture.id, text:fixture.text, run, config:A2})))];
}
export const revisionBasetenPlans = () => basetenPlans().map((plan) => ({...plan, run:1, config:A2}));
export function readAminSources(root) {
  const rows = readLines(paths(root).private), saved = new Map(rows.map((row) => [row.callId, row]));
  const hash = configurations().find((config) => config.name === "A-min").configurationHash;
  const sources = [], missing = [];
  for (let n = 1; n <= 10; n++) for (let run = 1; run <= 3; run++) {
    const id = `n${String(n).padStart(2, "0")}`;
    const row = rows.findLast((row) => row.stage === "pipeline" && row.configuration === "A-min" && row.configurationHash === hash && row.id === id && row.run === run);
    const voice = saved.get(row?.ears?.voice?.callId), spark = saved.get(row?.ears?.spark?.callId);
    if (!row || !voice || !spark || voice.provider !== "meta" || spark.provider !== "meta" || voice.outcome !== "ok" || spark.outcome !== "ok" ||
      voice.model !== "muse-voice-transcribe-1.0" || spark.model !== "muse-spark-1.2" || spark.effort !== "minimal" ||
      voice.payload?.transcript !== row.ears.voice.transcript || spark.payload?.transcript !== row.ears.spark.transcript) {missing.push(`${id}/${run}`); continue;}
    sources.push({id, run, sourcePipeline:row.callId, sourceConfigurationHash:hash,
      sourceCalls:{voice:voice.callId, spark:spark.callId},
      heard:{singleSource:false, ears:{voice:{ok:true, value:voice.payload}, spark:{ok:true, value:spark.payload}}}});
  }
  if (missing.length) throw new Error(`Saved A-min ears unavailable: ${missing.join(", ")}. No new ear calls are allowed.`);
  return sources;
}
export function revisionEstimate() {
  const tokens = (text) => Math.ceil(Buffer.byteLength(prompt + JSON.stringify(REPLY_SCHEMA) + userMessage(text, text)) / 4) + 64;
  const avg = Object.values(ideal).reduce((n, text) => n + tokens(text), 0) / 10;
  const cost = (input, output) => (input * 1.25 + output * 4.25) / 1e6;
  const authored = revisionTextPlans(), base = revisionBasetenPlans();
  const meta = [{part:"recording cards from saved A-min ears", calls:30, input:Math.ceil(30 * avg), output:30 * 8000},
    {part:"authored cards (9 special + 10 existing)", calls:19, input:authored.reduce((n, plan) => n + tokens(plan.text), 0), output:19 * 8000}].map((row) => ({...row, usd:cost(row.input, row.output)}));
  const baseten = [{part:"exact example probe (uncapped; forecast only)", calls:1, input:32, output:1000},
    {part:"authored A2 cards", calls:8, input:base.reduce((n, plan) => n + tokens(plan.text), 0), output:8 * 8000},
    {part:"frozen simulated rankings", calls:6, input:26953, output:6 * 8000}].map((row) => ({...row, usd:cost(row.input, row.output)}));
  return {meta, baseten, metaUsd:meta.reduce((n, row) => n + row.usd, 0), basetenUsd:baseten.reduce((n, row) => n + row.usd, 0),
    audioCalls:0, metaCalls:49, basetenCalls:15, baseline:baseline.legacyHash};
}
