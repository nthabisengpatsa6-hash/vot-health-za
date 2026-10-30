import test from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {NoteRunner, printRunSummary} from "../../scripts/score-notes.mjs";
import {configurations, estimate, requireListened, textPlans} from "../../scripts/lib/notePlans.mjs";
import {NoteBudget, SpendingPause} from "../../scripts/lib/noteBudget.mjs";
import {assertNoSecrets} from "../../scripts/lib/noteArtifacts.mjs";
import {callBaseten, assertBasetenInput, productionRankingBody} from "../../scripts/lib/basetenScoring.mjs";
import {replayRankingDays} from "../../scripts/lib/rankPlans.mjs";
import {buildRankInput} from "../../functions/shared/rank/input.mjs";
import town from "../../functions/data/places.json" with {type:"json"};
const {redact, requestWithRetry} = createRequire(import.meta.url)("../../functions/lib/metaRequest.js");
const root = fileURLToPath(new URL("../../.scratch/nonexistent-test-root/", import.meta.url));
const runner = () => {
  const budget = {rows:[], check:()=>{}, meter(body, context) {
    this.rows.push({...context, inputTokens:body?.usage?.prompt_tokens || 0, outputTokens:body?.usage?.completion_tokens || 0});
  }};
  const value = new NoteRunner({root, metaKey:"offline-unique-placeholder", state:{gitCommit:"synthetic", dirty:false},
    budget, print:()=>{}});
  value.save = (_path, record) => {assertNoSecrets(record, [value.metaKey]); value.saved.set(record.callId, record);};
  return value;
};
const spec = {kind:"fixture", stage:"card", id:"synthetic", provider:"meta", model:"muse-spark-1.3", identity:{test:"resume"}};

test("pasteable run summary prints counts and settings without saved content", () => {
  const lines = [];
  printRunSummary({saved:new Map([["one", {transcript:"SyntheticSummaryCanary", cards:[{words:"SyntheticSummaryCanary"}]}]]),
    budget:{total:0.25}, basetenAvailable:false}, configurations(), 3, (line) => lines.push(line));
  assert.ok(lines.join("\n").includes("Run done"));
  assert.ok(lines.join("\n").includes("Saved records 1"));
  assert.ok(!lines.join("\n").includes("SyntheticSummaryCanary"));
});

test("four configurations isolate prompts, efforts and models", () => {
  const configs = configurations();
  assert.deepEqual(configs.map((c) => c.name), ["Baseline", "A", "A-min", "B"]);
  assert.notEqual(configs[0].prompt, configs[1].prompt);
  assert.equal(configs[1].prompt, configs[2].prompt);
  assert.deepEqual(configs[0].audioEffort, configs[1].audioEffort);
  assert.equal(configurations({minimal12:false, minimal13:false}).at(-1).audioEffort, "low");
  assert.equal(configurations({minimal12:false}).length, 3);
  assert.equal(textPlans().length, 32);
  assert.equal(estimate().calls, 320);
});
test("listening date and correction shape are required before recording calls", () => {
  assert.throws(() => requireListened({listenedAt:null, corrections:{}}));
  assert.throws(() => requireListened({listenedAt:"bad", corrections:{}}));
  assert.doesNotThrow(() => requireListened({listenedAt:"2026-10-30T12:00:00+02:00", corrections:{n02:{caseCount:4}}}));
  assert.throws(() => requireListened({listenedAt:"2026-10-30", corrections:{reader:{name:"synthetic"}}}));
});
test("finished success and failed calls both resume without another request", async () => {
  const r = runner(); let calls = 0;
  const work = async () => {calls++; return {reply:{cards:[]}, attempts:1};};
  assert.equal((await r.call(spec, work)).cacheHit, false);
  assert.equal((await r.call(spec, work)).cacheHit, true);
  assert.equal(calls, 1);
  const failureSpec = {...spec, identity:{test:"failed"}};
  const fail = async () => {calls++; throw Object.assign(new Error("not persisted"), {kind:"http", status:400, attempts:1});};
  await assert.rejects(r.call(failureSpec, fail)); await assert.rejects(r.call(failureSpec, fail));
  assert.equal(calls, 2);
});
test("identical in-flight ears share one request and one cancelled user cannot cancel another", async () => {
  const r = runner(), a = new AbortController(), b = new AbortController();
  let calls = 0, finish;
  const gate = new Promise((resolve) => {finish = resolve;});
  const work = async ({signal}) => {calls++; await gate; assert.equal(signal.aborted, false); return {transcript:"synthetic", attempts:1};};
  const first = r.call(spec, work, a.signal), second = r.call(spec, work, b.signal);
  a.abort(); finish(); await Promise.all([first, second]); assert.equal(calls, 1);
});
test("a key echo never enters a saved record", async () => {
  const r = runner();
  await assert.rejects(r.call(spec, async () => ({text:r.metaKey})));
  for (const value of r.saved.values()) assert.ok(!JSON.stringify(value).includes(r.metaKey));
});
test("spending ledger pauses above twelve and preserves actual totals on continuation", () => {
  const rows = [], append = (_path, row) => rows.push(row);
  const budget = new NoteBudget("unused", {read:()=>[], append});
  budget.meter({usage:{prompt_tokens:1000000, completion_tokens:3000000}}, {provider:"meta", model:"synthetic", callId:"one"});
  assert.equal(budget.total, 14); assert.throws(() => budget.check(), SpendingPause);
  budget.continueAfterReview(); assert.equal(budget.total, 14); assert.equal(budget.limit, 26);
  assert.doesNotThrow(() => budget.check()); assert.equal(rows.length, 2);
});
test("successful responses without usage fail closed for cost accounting", () => {
  const budget = new NoteBudget("unused", {read:()=>[], append:()=>{}});
  budget.meter({}, {provider:"meta", model:"synthetic", callId:"one"});
  assert.throws(() => budget.check(), SpendingPause);
});

test("invalid provider usage cannot reduce the recorded spending total", () => {
  for (const usage of [{prompt_tokens:-1, completion_tokens:1}, {prompt_tokens:1, completion_tokens:0.5}]) {
    const budget = new NoteBudget("unused", {read:()=>[], append:()=>{}});
    budget.meter({usage}, {provider:"meta", model:"synthetic", callId:"invalid"});
    assert.equal(budget.total, 0); assert.throws(() => budget.check(), SpendingPause);
  }
  const budget = new NoteBudget("unused", {read:()=>[], append:()=>{}});
  budget.meter({}, {provider:"meta", model:"synthetic", callId:"malformed-voice", audio:true, durationSeconds:10});
  assert.equal(budget.total, 10 * 0.18 / 3600);
});
test("Meta error redaction keeps statuses and removes keys and auth headers", async () => {
  const key = ["offline", "credential", "marker"].join("-");
  assert.ok(!redact(`Authorization: Bearer ${key}`, key).includes(key));
  await assert.rejects(requestWithRetry({label:"test", path:"/unused", buildInit:()=>({headers:{Authorization:`Bearer ${key}`}}),
    fetch:async () => Response.json({error:{message:`echo ${key} Authorization: Bearer ${key}`, param:"keywords"}}, {status:400})}), (error) => {
    assert.equal(error.status, 400); assert.equal(error.parameter, "keywords"); assert.ok(!error.message.includes(key)); return true;
  });
});
test("Baseten refuses recording/audio input and locked seeds before fetch", async () => {
  assert.throws(() => assertBasetenInput({messages:[{content:"synthetic"}]}, "recording"));
  assert.throws(() => assertBasetenInput({messages:[{content:[]}]}, "fixture"));
  for (let seed = 11; seed <= 20; seed++) {
    assert.throws(() => assertBasetenInput({messages:[]}, "ranking", seed));
    await assert.rejects(runner().rankings([seed]));
  }
});
test("Baseten uses the exact dated slug and does not substitute on 404", async () => {
  let calls = 0;
  await assert.rejects(callBaseten({messages:[{role:"user", content:"synthetic"}]}, {source:"fixture", apiKey:"offline-placeholder", retryDelayMs:0,
    fetch:async (_url, init) => {calls++; assert.equal(JSON.parse(init.body).model, "meta-models/muse-spark-open-1026"); return Response.json({}, {status:404});}}), {status:404});
  assert.equal(calls, 1);
});
test("ranking comparison obtains unchanged production prompt, schema and limits", async () => {
  const event = replayRankingDays(1).firstAlert;
  const {input} = buildRankInput(event.signal, event.cards, town);
  const body = await productionRankingBody(input);
  const {SYSTEM_PROMPT} = createRequire(import.meta.url)("../../functions/lib/callRanker.js");
  assert.equal(body.messages[0].content, SYSTEM_PROMPT);
  assert.equal(body.messages[1].content, JSON.stringify(input));
  assert.equal(body.max_completion_tokens, 8000); assert.equal(body.response_format.json_schema.strict, true);
});

test("four mocked recording pipelines share identical calls, keep timings and isolate repeats", async () => {
  const require = createRequire(import.meta.url);
  const {makeWav} = require("../../functions/test/make-wav.js");
  const golden = require("../../functions/test/fixtures/process-note-head.json");
  const r = runner(); let voices = 0, ears = 0, cards = 0;
  r.fetch = async (url, init) => {
    if (url.endsWith("/asr/transcribe")) {
      voices++; return Response.json({transcript:golden.transcript, audioDurationMs:1000});
    }
    const body = JSON.parse(init.body), audio = Array.isArray(body.messages[0].content);
    if (audio) ears++; else cards++;
    return Response.json({choices:[{message:{content:audio ? golden.transcript : JSON.stringify(golden.reply)}, finish_reason:"stop"}], usage:{prompt_tokens:10, completion_tokens:20}});
  };
  const audio = {wav:makeWav(), durationMs:1000, conversionMs:1, conversionCached:false};
  await Promise.all(configurations().map((config) => r.recording({id:"n01"}, 1, config, audio)));
  assert.deepEqual([voices, ears, cards], [2, 3, 2]);
  const first = [...r.saved.values()].filter((row) => row.stage === "pipeline");
  assert.equal(first.length, 4); assert.ok(first.every((row) => row.outcome === "ok" && row.comparable));
  assert.ok(first.every((row) => Number.isFinite(row.timings.totalMs)));
  await Promise.all(configurations().map((config) => r.recording({id:"n01"}, 1, config, audio)));
  assert.deepEqual([voices, ears, cards], [2, 3, 2]);
  await Promise.all(configurations().map((config) => r.recording({id:"n01"}, 2, config, audio)));
  assert.deepEqual([voices, ears, cards], [4, 6, 4]);
});

test("keyword rejection stops preflight before any model or recording call", async () => {
  const r = runner(); let calls = 0;
  r.fetch = async (url, init) => {
    calls++; assert.ok(url.endsWith("/asr/transcribe"));
    const body = JSON.parse(await init.body.get("request").text()); assert.equal(body.keywords.length, 53);
    return Response.json({error:{message:"keyword limit", param:"keywords"}}, {status:400});
  };
  await assert.rejects(r.preflight(), {status:400, parameter:"keywords"}); assert.equal(calls, 1);
});
test("rejected 1.2 minimal drops A-min; rejected 1.3 minimal verifies low", async () => {
  const r = runner(), efforts = [];
  r.fetch = async (url, init) => {
    if (url.endsWith("/asr/transcribe")) return Response.json({transcript:"", audioDurationMs:1000});
    const body = JSON.parse(init.body); efforts.push(`${body.model}/${body.reasoning_effort}`);
    if (body.reasoning_effort === "minimal") return Response.json({error:{message:"unsupported effort", param:"reasoning_effort"}}, {status:400});
    return Response.json({choices:[{message:{content:""}, finish_reason:"stop"}], usage:{prompt_tokens:10, completion_tokens:10}});
  };
  const configs = await r.preflight();
  assert.deepEqual(configs.map((config) => config.name), ["Baseline", "A", "B"]);
  assert.equal(configs.at(-1).audioEffort, "low");
  assert.deepEqual(efforts, ["muse-spark-1.2/minimal", "muse-spark-1.3/minimal", "muse-spark-1.3/low"]);
});
test("a missing Baseten slug skips comparisons without trying another slug", async () => {
  const r = runner(); r.basetenKey = "offline-baseten-placeholder";
  r.fetch = async (url) => url.endsWith("/asr/transcribe") ? Response.json({transcript:"", audioDurationMs:1000}) :
    Response.json({choices:[{message:{content:""}, finish_reason:"stop"}], usage:{prompt_tokens:10, completion_tokens:10}});
  const call = r.call.bind(r); let slugChecks = 0;
  r.call = (spec, ...rest) => {
    if (spec.provider === "baseten") {slugChecks++; return Promise.reject(Object.assign(new Error("missing"), {status:404}));}
    return call(spec, ...rest);
  };
  await r.preflight(); assert.equal(r.basetenAvailable, false); assert.equal(slugChecks, 1);
});
