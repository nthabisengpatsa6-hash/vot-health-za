import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {A2, PROBE_BODY, revisionPaths, revisionTextPlans, revisionBasetenPlans, revisionEstimate, readAminSources} from "../../scripts/lib/noteRevision.mjs";
import {RevisionRunner, revisionFetch, printRevisionPlan, main} from "../../scripts/score-revision.mjs";
import {revisionDecision, generateRevisionReport} from "../../scripts/score-revision-report.mjs";
import {probeBasetenExample, safeProbeDiagnostics} from "../../scripts/lib/basetenProbe.mjs";
import {finalAnswer, usageOnly, callBaseten} from "../../scripts/lib/basetenScoring.mjs";
import {NoteBudget} from "../../scripts/lib/noteBudget.mjs";
import {configurations, ideal, special} from "../../scripts/lib/notePlans.mjs";
import {paths} from "../../scripts/lib/noteArtifacts.mjs";
const require = createRequire(import.meta.url);
const {SYSTEM_PROMPT} = require("../../functions/lib/extractCard.js");
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const temp = () => {mkdirSync(join(ROOT, ".scratch"), {recursive:true}); return mkdtempSync(join(ROOT, ".scratch", "a2-test-"));};
const put = (path, rows) => {mkdirSync(join(path, ".."), {recursive:true}); writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");};
const reply = (words = "synthetic") => ({isReport:true, adviceRequested:false, notifiableConditionMentioned:null, disagreements:[], transcriptClean:words,
  cards:[{symptomGroup:"diarrhoea_vomiting", unusualDescription:null, symptomsInWords:"synthetic symptoms", caseCount:4, comparedWithUsual:"more", ageGroup:"under_5", area:"Thaga Park", areaHeard:null, onset:null,
    exposure:{types:["water"], words}, observations:{moreSevere:false, notResponding:false, unusualSymptoms:false, shortOfSupplies:false, suppliesNote:null}, unsureFields:["onset"], questions:[]}]});
const usage = {prompt_tokens:100, completion_tokens:80, completion_tokens_details:{reasoning_tokens:60}};
const envelope = (text = JSON.stringify(reply())) => ({choices:[{message:{content:text, reasoning_content:"SyntheticReasoningCanary"}, finish_reason:"stop"}], usage});
const makeRunner = (provider, fetch) => {
  const root = temp(), budget = new NoteBudget("unused", {read:()=>[], append:()=>{}}), lines = [];
  const runner = new RevisionRunner({root, provider, fetch, metaKey:provider === "meta" ? "offline-placeholder" : undefined,
    basetenKey:provider === "baseten" ? "offline-placeholder" : undefined, budget, state:{gitCommit:"synthetic", dirty:false}, print:(line) => lines.push(line)});
  return {runner, root, lines};
};
test("A2 changes exactly the approved local-word bullet and pins a separate candidate hash", () => {
  const old = readFileSync(join(ROOT, "functions", "prompts", "extract-card.md"), "utf8");
  const candidate = readFileSync(join(ROOT, "scripts", "prompts", "extract-card-a2.md"), "utf8");
  const before = old.split("\n").find((line) => line.startsWith("- If a transcript contains a sound-spelling"));
  const inserted = candidate.split("\n").filter((line) => line.startsWith("- Speech-to-text") || line.startsWith("- When the English words"));
  assert.equal(inserted.length, 2); assert.equal(candidate.replace(inserted.join("\n"), before), old);
  assert.equal(A2.extractionHash, "d6bf8dd00961399c"); assert.notEqual(A2.prompt, SYSTEM_PROMPT);
  assert.equal(A2.audioModel, "muse-spark-1.2"); assert.equal(A2.audioEffort, "minimal"); assert.equal(A2.keywords.length, 53);
});
test("revision plans contain 49 Meta cards and a separate 15-call Baseten path", () => {
  assert.equal(revisionTextPlans().length, 19); assert.equal(revisionBasetenPlans().length, 8);
  const plan = revisionEstimate(); assert.equal(plan.metaCalls, 49); assert.equal(plan.basetenCalls, 15); assert.equal(plan.audioCalls, 0);
  const lines = []; printRevisionPlan("baseten", (line) => lines.push(line));
  assert.ok(!lines.some((line) => line.startsWith("meta |"))); assert.ok(lines.join("\n").includes("not an upper bound"));
  assert.equal(revisionPaths(ROOT, "baseten").ledger, paths(ROOT).ledger);
});
test("provider guards refuse cross-provider and audio routes before any request", async () => {
  let calls = 0; const fake = async () => {calls++; return Response.json(envelope());};
  for (const provider of ["meta", "baseten"]) {
    const fetch = revisionFetch(provider, fake), url = provider === "meta" ? "https://api.meta.ai/v1/chat/completions" : "https://inference.baseten.co/v1/chat/completions";
    assert.throws(() => fetch(url + "/transcribe", {method:"POST", body:"{}"}));
    assert.throws(() => fetch(url, {method:"POST", body:JSON.stringify({messages:[{content:[{type:"input_audio"}]}]})}));
    assert.throws(() => fetch(provider === "meta" ? "https://inference.baseten.co/v1/chat/completions" : "https://api.meta.ai/v1/chat/completions", {method:"POST", body:"{}"}));
  }
  assert.equal(calls, 0); await assert.rejects(main(["--meta-only", "--baseten-only"])); await assert.rejects(main(["--unknown"]));
});
test("probe copies the exact example, strips reasoning and never retries a failure", async () => {
  let calls = 0;
  const result = await probeBasetenExample({apiKey:"offline-placeholder", fetch:async (url, init) => {
    calls++; assert.equal(url, "https://inference.baseten.co/v1/chat/completions"); assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body), {model:"meta-models/muse-spark-open-1026", messages:[{role:"user", content:"Hello!"}]});
    assert.deepEqual(JSON.parse(init.body), PROBE_BODY); assert.equal(init.headers.Authorization, "Bearer offline-placeholder");
    return Response.json(envelope("Hello!"));
  }});
  assert.equal(calls, 1); assert.equal(result.finalAnswer, "Hello!"); assert.ok(!JSON.stringify(result).includes("Canary"));
  calls = 0;
  await assert.rejects(probeBasetenExample({apiKey:"offline-placeholder", fetch:async () => {calls++; return new Response("model unavailable", {status:503});}}), (error) => error.status === 503 && error.attempts === 1 && error.diagnostics.body === "model unavailable");
  assert.equal(calls, 1);
});
test("probe failure diagnostics retain safe headers and redact credentials and reasoning", () => {
  const response = new Response("", {status:404, headers:{"x-request-id":"synthetic-request", "set-cookie":"must-stay-out", Authorization:"must-stay-out"}});
  const value = safeProbeDiagnostics(response, JSON.stringify({error:{message:"echo offline-placeholder", api_key:"must-stay-out"}, reasoning_content:"SyntheticReasoningCanary"}), "offline-placeholder");
  assert.equal(value.status, 404); assert.equal(value.headers["x-request-id"], "synthetic-request");
  assert.ok(!JSON.stringify(value).includes("must-stay-out")); assert.ok(!JSON.stringify(value).includes("offline-placeholder")); assert.ok(!JSON.stringify(value).includes("Canary"));
});
test("failed probe is preserved and cached; Baseten cannot receive reader inputs", async () => {
  let calls = 0; const {runner, root, lines} = makeRunner("baseten", async () => {calls++; return new Response("not found", {status:404, headers:{"request-id":"synthetic"}});});
  assert.equal(await runner.exampleProbe(), false); assert.equal(await runner.exampleProbe(), false); assert.equal(calls, 1);
  assert.equal(runner.metaKey, undefined); await assert.rejects(runner.recordingCard({id:"n01"}));
  assert.ok(lines.join("\n").includes('"status":404')); assert.ok(lines.join("\n").includes("skipped"));
  assert.ok(!readFileSync(revisionPaths(root, "baseten").private, "utf8").includes("Authorization"));
});
test("card-only runner uses saved ears once and labels only new card timing", async () => {
  let calls = 0; const {runner, root, lines} = makeRunner("meta", async (url, init) => {
    calls++; assert.equal(url, "https://api.meta.ai/v1/chat/completions"); assert.equal(JSON.parse(init.body).model, "muse-spark-1.3"); return Response.json(envelope());
  });
  const source = {id:"n01", run:1, sourceCalls:{voice:"voice-source", spark:"spark-source"}, sourcePipeline:"pipeline-source", sourceConfigurationHash:"synthetic",
    heard:{singleSource:false, ears:{voice:{ok:true, value:{transcript:"SyntheticPrivateEarCanary"}}, spark:{ok:true, value:{transcript:"SyntheticPrivateEarCanary"}}}}};
  await runner.recordingCard(source); await runner.recordingCard(source); assert.equal(calls, 1);
  assert.equal(runner.basetenKey, ""); await assert.rejects(runner.exampleProbe());
  const saved = [...runner.saved.values()].find((row) => row.stage === "pipeline");
  assert.equal(saved.comparisonMode, "card-only"); assert.equal(saved.comparable, false); assert.equal(saved.cardTimingComparable, true);
  for (const name of ["voiceMs", "audioMs", "bothEarsMs", "totalMs", "conversionMs"]) assert.equal(saved.timings[name], null);
  assert.ok(!lines.join("\n").includes("Canary"));
  const printed = [], report = generateRevisionReport({root, local:{listenedAt:"2026-10-30", corrections:{}}, write:false, print:(line) => printed.push(line)});
  assert.ok(!printed.join("\n").includes("Canary")); assert.equal(report.missing.length, 48); assert.equal(report.decision.complete, false);
  assert.match(report.decision.recommendation, /pending/); assert.equal(report.decision.knownLimitation, null);
  const local = []; generateRevisionReport({root, local:{listenedAt:"2026-10-30", corrections:{}}, write:false, showLocal:true, print:(line) => local.push(line)});
  assert.ok(local.join("\n").includes("SyntheticPrivateEarCanary"));
});
test("saved A-min source validation refuses missing or mismatched ears with IDs only", () => {
  const root = temp(), rows = [], config = configurations().find((item) => item.name === "A-min");
  for (let n = 1; n <= 10; n++) for (let run = 1; run <= 3; run++) {
    const id = `n${String(n).padStart(2, "0")}`, voice = `${id}-${run}-voice`, spark = `${id}-${run}-spark`;
    rows.push({callId:voice, provider:"meta", outcome:"ok", model:"muse-voice-transcribe-1.0", payload:{transcript:"SyntheticPrivateCanary"}},
      {callId:spark, provider:"meta", outcome:"ok", model:"muse-spark-1.2", effort:"minimal", payload:{transcript:"SyntheticPrivateCanary"}},
      {callId:`${id}-${run}-pipeline`, id, run, stage:"pipeline", configuration:"A-min", configurationHash:config.configurationHash,
        ears:{voice:{callId:voice, transcript:"SyntheticPrivateCanary"}, spark:{callId:spark, transcript:"SyntheticPrivateCanary"}}});
  }
  put(paths(root).private, rows); assert.equal(readAminSources(root).length, 30);
  rows[1].model = "muse-spark-1.3"; put(paths(root).private, rows);
  assert.throws(() => readAminSources(root), (error) => error.message.includes("n01/1") && !error.message.includes("Canary"));
});
test("reasoning is discarded while completion cost includes it exactly once", async () => {
  assert.equal(finalAnswer({content:"<think>SyntheticReasoningCanary</think><final>safe final</final>"}), "safe final");
  assert.equal(finalAnswer({content:"<analysis>unfinished"}), null);
  assert.equal(finalAnswer({content:[{type:"reasoning", text:"SyntheticReasoningCanary"}, {type:"text", text:"safe final"}]}), "safe final");
  const result = await callBaseten({messages:[{role:"user", content:"synthetic"}], max_completion_tokens:8000}, {apiKey:"offline-placeholder", source:"fixture", fetch:async () => Response.json(envelope("safe final"))});
  assert.ok(!JSON.stringify(result).includes("Canary")); assert.deepEqual(result.usage, usageOnly(usage));
  const budget = new NoteBudget("unused", {read:()=>[], append:()=>{}});
  budget.meter({usage}, {provider:"baseten", model:"synthetic", callId:"synthetic"});
  assert.equal(budget.rows[0].reasoningTokens, 60); assert.equal(budget.rows[0].outputTokens, 80); assert.equal(budget.total, (100 * 1.25 + 80 * 4.25) / 1e6);
});
const scored = (configuration, cw) => Array.from({length:30}, (_, i) => ({row:{configuration, run:Math.floor(i / 10) + 1}, score:{totals:{confidentlyWrong:i === 0 ? cw : 0}}}));
const authoredRows = () => revisionTextPlans().map((plan) => ({id:plan.id, run:plan.run, outcome:"ok", extractionHash:A2.extractionHash,
  payload:{reply:Object.hasOwn(ideal, plan.id) ? {...reply(ideal[plan.id]), transcriptClean:ideal[plan.id]} : (() => {
    const fixture = special.find((item) => item.id === plan.id), value = reply((fixture.required || []).join(" ") || "plain English");
    value.cards[0].area = fixture.area || "Thaga Park"; value.cards[0].exposure.types = fixture.type ? [fixture.type] : []; return value;
  })()}}));
test("A2 gate requires every special repeat, no insertions, completeness and no CW increase", () => {
  const root = temp(), originals = {root, evaluated:[...scored("Baseline", 4), ...scored("A", 2), ...scored("A-min", 1)]};
  put(paths(root).fixtures, Object.keys(ideal).map((id) => ({id, configuration:"A", payload:{reply:{cards:[], transcriptClean:ideal[id]}}})));
  const rows = authoredRows(); assert.equal(revisionDecision(originals, scored("A2", 1), rows).gate, true);
  rows.find((row) => row.id === "D4-1" && row.run === 2).payload.reply = reply("plain English");
  const fallback = revisionDecision(originals, scored("A2", 1), rows); assert.equal(fallback.gate, false); assert.equal(fallback.configuration, "A-min");
  assert.equal(fallback.knownLimitation, "fat cook isn't reliably fixed.");
  assert.equal(revisionDecision(originals, scored("A2", 0), rows).configuration, "A2");
  assert.equal(revisionDecision(originals, scored("A2", 5), authoredRows()).configuration, "A-min");
  const insertion = authoredRows(); insertion.find((row) => row.id === "n10").payload.reply.transcriptClean += " vetkoek";
  assert.equal(revisionDecision(originals, scored("A2", 0), insertion).configuration, "A-min");
  assert.equal(revisionDecision(originals, scored("A2", 0), rows.slice(1)).complete, false);
  const failed = authoredRows(); delete failed[0].payload; failed[0].outcome = "bad-reply";
  assert.equal(revisionDecision(originals, scored("A2", 0), failed).configuration, "A-min");
});
