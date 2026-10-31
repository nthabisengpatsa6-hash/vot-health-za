import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdirSync, mkdtempSync, writeFileSync, cpSync} from "node:fs";
import {join, dirname} from "node:path";
import {spawnSync} from "node:child_process";
import {ROOT, SIGNAL_HASH, RANK_HASH, SEEDS, SCOPE, assertHeldOutSeeds, parseHeldOut, frozenHashes, dependencyManifest, assertPreflight, digest} from "../../scripts/lib/heldoutGuards.mjs";
import {planSeed, selectEvents, eventKey} from "../../scripts/lib/heldoutPlans.mjs";
import {replayRankingDays, assertTuningSeeds} from "../../scripts/lib/rankPlans.mjs";
import {writeHeldOut, readJournal, appendJournal, identity, journalState} from "../../scripts/lib/heldoutArtifacts.mjs";
import {heldOutProvider, requestBody, PRICES, cappedCost, chargedCost, SPENDING_LIMIT} from "../../scripts/lib/heldoutProvider.mjs";
import {executeHeldOut, validatePlan, printPlan, main as rankMain, KEY_REMINDER} from "../../scripts/heldout-rank.mjs";
import {aggregateStatistics, reconcileTuning, rankingMetrics, buildScorecard, scorecardMarkdown, median} from "../../scripts/lib/heldoutScorecard.mjs";
import {callRanker} from "../../functions/lib/callRanker.js";

const fresh = () => {mkdirSync(".scratch",{recursive:true}); return mkdtempSync(".scratch/heldout-test-");};
// All real generated/scored inputs in this suite are tuning inputs. 11 below is
// only an artifact-boundary label on a synthetic record, never a generated seed.
const tuningPlan = planSeed(1).plans[0];
const syntheticPlan = (index = 0) => ({...structuredClone(tuningPlan), seed:11, day:index+1, eventKey:`synthetic-${index}`, roles:["firstAlert"]});
const raw = (input) => ({sources:[{sourceId:input.sources[0].id, rank:1, confidence:"low", supporting:["c1"], contradicting:[], reason:"The clues fit this source."}]});
const envelope = (input, usage = {prompt_tokens:10,completion_tokens:20}) => ({choices:[{finish_reason:"stop",message:{content:JSON.stringify(raw(input))}}],usage});
const fake = async (input) => ({raw:raw(input),rawOutput:JSON.stringify(raw(input)),unavailable:false,outcome:"ok",attempts:1,
  usage:[{input:10,output:20}],tokens:{input:10,output:20},accountedCost:0,costIncludesEstimate:false,ms:1,model:"muse-spark-1.3",effort:"low",promptHash:RANK_HASH});
const proof = () => ({commit:"a".repeat(40),clean:true,signalHash:SIGNAL_HASH,rankingPromptHash:RANK_HASH,
  dependencies:[{file:"synthetic.mjs",status:"same",baselineBlob:"a",headBlob:"a"}],
  fingerprints:SEEDS.map((seed) => ({seed,water:"match",none:"match"})),preUnlockStatement:SCOPE,heldOutOutcomesComputed:false});

test("explicit flag, held-out seed boundaries and tuning refusals remain separate", () => {
  assert.throws(() => parseHeldOut([]));
  assert.throws(() => parseHeldOut(["--held-out","--effort","medium"]));
  assert.deepEqual(parseHeldOut(["--held-out","--dry-run"],{dryRun:true}),{dryRun:true});
  for (const seed of [0,1,10,21,11.5,NaN]) assert.throws(() => assertHeldOutSeeds([seed]));
  assert.doesNotThrow(() => assertHeldOutSeeds(SEEDS));
  for (const seed of SEEDS) assert.throws(() => assertTuningSeeds([seed]));
  const result = spawnSync(process.execPath,["scripts/heldout-stats.mjs"],{encoding:"utf8"});
  assert.equal(result.status,1);
  assert.doesNotMatch(result.stdout,/Seed 11|First Watch|Run \d+ calls/);
});
test("preflight refuses dirty state, changed pins, any changed dependency or fingerprint", () => {
  assert.doesNotThrow(() => assertPreflight(proof()));
  for (const mutation of [(p) => {p.clean=false;},(p) => {p.signalHash="changed";},(p) => {p.rankingPromptHash="changed";},
    (p) => {p.dependencies[0].status="different";},(p) => {p.dependencies[0].headBlob="b";},(p) => {p.fingerprints[0].water="no match";},(p) => {p.fingerprints.pop();}]) {
    const value = proof(); mutation(value); assert.throws(() => assertPreflight(value));
  }
  assert.deepEqual(frozenHashes(),{signalHash:SIGNAL_HASH,rankingPromptHash:RANK_HASH});
  const manifest = dependencyManifest();
  assert.ok(manifest.length > 30); assert.ok(manifest.every((row) => row.status === "same"));
  for (const path of ["functions/shared/signals.mjs","functions/shared/rank/validate.mjs","functions/shared/sim/engine.mjs","src/sim/scorecard.js","scripts/lib/rankPlans.mjs"]) assert.ok(manifest.some((row) => row.file === path));
});
test("first Alert and all event triggers match the frozen tuning planner for seeds 1 to 10", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const expected = replayRankingDays(seed), actual = selectEvents(seed);
    assert.equal(actual.firstAlert && eventKey(actual.firstAlert),expected.firstAlert && eventKey(expected.firstAlert));
    assert.deepEqual(actual.events.map(eventKey),expected.events.map(eventKey));
    assert.deepEqual(actual.events.map((event) => event.changes),expected.events.map((event) => event.changes));
  }
});
test("tuning event selections are identical with ground truth removed or scrambled in an isolated source mirror", () => {
  const root = fresh();
  for (const file of ["functions/shared","functions/data/places.json","functions/package.json","functions/lib/callRanker.js","functions/lib/rankTiming.js","functions/prompts/rank-sources.md","scripts/lib/heldoutGuards.mjs","scripts/lib/heldoutPlans.mjs"]) {
    mkdirSync(dirname(join(root,file)),{recursive:true}); cpSync(join(ROOT,file),join(root,file),{recursive:true});
  }
  const driver = 'import {planSeed} from "./scripts/lib/heldoutPlans.mjs"; import {digest} from "./scripts/lib/heldoutGuards.mjs"; console.log(digest(Array.from({length:10},(_,i)=>planSeed(i+1))));';
  writeFileSync(join(root,"select.mjs"),driver);
  const run = () => {const result = spawnSync(process.execPath,[join(root,"select.mjs")],{encoding:"utf8"}); assert.equal(result.status,0,result.stderr); return result.stdout.trim();};
  const absent = run();
  assert.equal(absent,digest(Array.from({length:10},(_,index) => planSeed(index+1))));
  mkdirSync(join(root,"src/sim"),{recursive:true});
  writeFileSync(join(root,"src/sim/groundTruth.js"),'throw new Error("Scrambled truth must never be imported by event selection");');
  assert.equal(run(),absent);
});
test("day 19 carries the original event, deduplicates it, and never chooses by answer key", () => {
  const base = selectEvents(1).firstAlert;
  const run = {startDate:"2027-02-01",lastDay:20,cardsUpTo:() => base.cards};
  let day = -1;
  const compute = () => {day++; return {signals:day >= 15 ? [structuredClone(base.signal)] : []};};
  const selected = planSeed(1,{run,compute});
  assert.equal(selected.plans.length,1); assert.equal(selected.plans[0].day,15);
  assert.deepEqual(selected.plans[0].roles,["firstAlert","day19"]);
  const quiet = planSeed(1,{run,compute:() => ({signals:[]})});
  assert.deepEqual(quiet,{seed:1,firstAlert:false,day19:false,plans:[]});
});
test("held-out request matches the production ranker exactly before retry differences", async () => {
  let captured;
  await callRanker(tuningPlan.input,{apiKey:"offline-placeholder",log:() => {},fetch:async (_url,options) => {captured=JSON.parse(options.body); return Response.json(envelope(tuningPlan.input));}});
  assert.deepEqual(requestBody(tuningPlan.input),captured);
});
test("transport adapter retries once on 429, every 5xx, dropped connections and timeouts", async () => {
  for (const mode of [429,500,501,502,503,504,599,"network","timeout"]) {
    let calls = 0;
    const reply = await heldOutProvider(tuningPlan.input,{apiKey:"offline-placeholder",wait:async () => {},timeoutMs:10,fetch:async () => {
      calls++;
      if (calls > 1) return Response.json(envelope(tuningPlan.input));
      if (mode === "network") throw new Error("Synthetic transport failure");
      if (mode === "timeout") return new Promise(() => {});
      return new Response(null,{status:mode});
    }});
    assert.equal(calls,2); assert.equal(reply.outcome,"ok"); assert.equal(reply.attempts,2);
    assert.equal(reply.usage[0].input,null); assert.equal(reply.costIncludesEstimate,true);
    assert.equal(reply.accountedCost,cappedCost(tuningPlan.input)+chargedCost(tuningPlan.input,[{input:10,output:20}]));
  }
});
test("invalid JSON and other 4xx are terminal; error details and supplied key are suppressed", async () => {
  for (const mode of [400,401,403,404,"json","envelope","echo"]) {
    let calls = 0;
    const reply = await heldOutProvider(tuningPlan.input,{apiKey:"offline-placeholder",wait:async () => {},fetch:async () => {
      calls++;
      if (typeof mode === "number") return new Response("Synthetic sensitive body",{status:mode});
      if (mode === "envelope") return new Response("invalid");
      return Response.json({choices:[{finish_reason:"stop",message:{content:mode === "echo" ? "offline-placeholder" : "invalid"}}]});
    }});
    assert.equal(calls,1); assert.equal(reply.unavailable,true);
    assert.doesNotMatch(JSON.stringify(reply),/offline-placeholder|sensitive body/);
  }
  const reply = await heldOutProvider(tuningPlan.input,{apiKey:"offline-placeholder",wait:async () => {},fetch:async () => {throw new Error("offline-placeholder Authorization: synthetic");}});
  assert.equal(reply.attempts,2); assert.doesNotMatch(JSON.stringify(reply),/offline-placeholder|Authorization/);
});
test("unknown usage is counted at the cap for each attempt and USD 2 pauses further calls", async () => {
  assert.equal(SPENDING_LIMIT,2);
  assert.equal(chargedCost(tuningPlan.input,[{input:null,output:null},{input:null,output:20}]),2*cappedCost(tuningPlan.input));
  const root = fresh(), plans = [syntheticPlan(0),syntheticPlan(1),syntheticPlan(2)]; let calls = 0;
  const result = await executeHeldOut(plans,{root,apiKey:"offline-placeholder",print:() => {},provider:async (input) => {
    calls++; return {...await fake(input),usage:[{input:1600000,output:0}],tokens:{input:1600000,output:0}};
  }});
  assert.equal(calls,1); assert.equal(result.spent,2); assert.equal(result.pending.length,2);
});
test("finished success and unavailable records never repeat; started records require review", async () => {
  for (const unavailable of [false,true]) {
    const root = fresh(), plans = [syntheticPlan()]; let calls = 0;
    const options = {root,apiKey:"offline-placeholder",print:() => {},provider:async (input) => {calls++; return {...await fake(input),unavailable,outcome:unavailable ? "invalid_json" : "ok"};}};
    await executeHeldOut(plans,options); await executeHeldOut(plans,options);
    assert.equal(calls,1); assert.equal(readJournal(root,11).length,2);
  }
  const root = fresh(), plan = syntheticPlan();
  appendJournal(root,{state:"started",seed:11,recordId:identity(plan)});
  assert.throws(() => journalState(root,[plan]),/Interrupted/);
  assert.throws(() => appendJournal(root,{state:"finished",seed:11,recordId:identity(plan),rawOutput:"offline-placeholder"},"offline-placeholder"));
});
test("observations cannot be overwritten and malformed/truncated journals cannot trigger a repeat", () => {
  const root = fresh();
  writeHeldOut(root,"docs/provenance/held-out/statistics.json",{synthetic:true});
  assert.throws(() => writeHeldOut(root,"docs/provenance/held-out/statistics.json",{synthetic:false}));
  assert.throws(() => writeHeldOut(root,"docs/provenance/held-out-x/statistics.json",{}));
  const file = join(root,"docs/provenance/rankings/held-out/seed-11.jsonl"); mkdirSync(dirname(file),{recursive:true}); writeFileSync(file,'{"state":');
  assert.throws(() => journalState(root,[syntheticPlan()]));
});
test("statistics aggregate exact-level signal-days, ordinary medians and explicit missing levels", () => {
  const rows = [{seed:1,first:{watch:14,signal:16,alert:16},seededFalseSignals:{watch:2,signal:0,alert:0},quietFalseSignals:{watch:2,signal:0,alert:0}},
    {seed:2,first:{watch:16,signal:null,alert:null},seededFalseSignals:{watch:1,signal:1,alert:0},quietFalseSignals:{watch:0,signal:0,alert:1}}];
  const result = aggregateStatistics(rows);
  assert.equal(median([null,14,16]),15); assert.equal(median([null]),null);
  assert.equal(result.first.watch.median,15); assert.equal(result.first.signal.reached,1);
  assert.deepEqual(result.first.alert.notReachedSeeds,[2]);
  assert.deepEqual(result.falseSignals.combined,{watch:5,signal:1,alert:1});
  assert.ok(reconcileTuning(result).some((row) => !row.match));
});
test("ranked-event denominators list absent, unavailable and missing seeds on the same summary line", () => {
  const plan = syntheticPlan();
  const bundle = {seeds:[{seed:11,firstAlert:true,day19:true,plans:[{...plan,roles:["firstAlert","day19"]}]},
    {seed:12,firstAlert:false,day19:false,plans:[]}, {seed:13,firstAlert:true,day19:false,plans:[{...plan,seed:13,eventKey:"synthetic-13"}]}]};
  const records = [{recordId:identity(bundle.seeds[0].plans[0]),cleanedRanking:{unavailable:true},outcome:"timeout"}];
  const result = rankingMetrics(bundle,records);
  assert.deepEqual(result.summary.firstAlert,{worksFirst:0,ranked:0,withEvent:2,noEventSeeds:[12],unavailableSeeds:[11],missingSeeds:[13]});
  const data = aggregateStatistics([{seed:1,first:{watch:14,signal:16,alert:16},seededFalseSignals:{watch:0,signal:0,alert:0},quietFalseSignals:{watch:0,signal:0,alert:0}}]);
  const statistics = {proof:proof(),tuning:data,heldOut:data,tuningReconciliation:reconcileTuning(data)};
  const report = buildScorecard(statistics,bundle,records), markdown = scorecardMarkdown(report);
  assert.match(markdown,/first Alert: 0\/0.*no Alert: 12; unavailable: 11; missing: 13/);
  assert.doesNotMatch(markdown,/false days/i);
  assert.equal(report.ranking.summary.firstAlert.ranked,0);
  assert.equal(JSON.parse(JSON.stringify(report)).comparison[0].heldOut,14);
});
test("dry plan output has arithmetic, price source, pending count and time, without key entry or calls", () => {
  const plan = syntheticPlan(), lines = [];
  printPlan({seeds:[{seed:11,firstAlert:true,day19:false,plans:[plan]}]}, {pending:[plan],finished:[]},(line) => lines.push(line));
  assert.match(lines.join("\n"),/8000 output/); assert.match(lines.join("\n"),/2026-10-31/);
  assert.match(lines.join("\n"),/none on day 19/); assert.match(lines.join("\n"),/Pause at USD 2/);
  assert.ok(KEY_REMINDER.includes("Win+V")); assert.equal(PRICES.outputPerMillion,4.25);
  assert.throws(() => validatePlan({version:1,seeds:[]}));
  const malformed = {version:1,seeds:SEEDS.map((seed) => ({seed,firstAlert:false,day19:false,plans:[]}))};
  assert.deepEqual(validatePlan(malformed),[]);
});

test("the complete dry-run entry point returns before confirmation, key entry, persistence or network", async () => {
  const root = fresh(), lines = [];
  const bundle = {version:1,proofCommit:proof().commit,seeds:SEEDS.map((seed) => ({seed,firstAlert:seed === 11,day19:false,plans:seed === 11 ? [syntheticPlan()] : []}))};
  writeHeldOut(root,"docs/provenance/held-out/ranking-plan.json",bundle);
  writeHeldOut(root,"docs/provenance/held-out/pre-unlock-proof.json",proof());
  const forbidden = () => {throw new Error("Dry run crossed the call boundary");};
  await rankMain(["--held-out","--dry-run"],{root,check:() => {},verify:() => {},runGit:() => {},print:(line) => lines.push(line),confirm:forbidden,readKey:forbidden,execute:forbidden});
  assert.match(lines.join("\n"),/pending 1/);
  assert.deepEqual(readJournal(root,11),[]);
});
