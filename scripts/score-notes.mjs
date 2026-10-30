import {createRequire} from "node:module";
import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";
import {confirmRun, readHiddenKey} from "./lib/hiddenInput.mjs";
import {baseline, configurations, estimate, textPlans, basetenPlans, BASETEN_MODEL, PRICE_SOURCES, requireListened, readCorrections, callIdentity} from "./lib/notePlans.mjs";
import {appendRecord, assertNoSecrets, assertPublic, gitState, hashOf, paths, readLines, safeFailure} from "./lib/noteArtifacts.mjs";
import {NoteBudget, meteredFetch} from "./lib/noteBudget.mjs";
import {convertAudio} from "./lib/audioConversion.mjs";
import {validateSchema} from "./lib/schemaValidation.mjs";
import {basetenTransport, callBaseten, productionRankingBody, BASE_URL} from "./lib/basetenScoring.mjs";
import {assertTuningSeeds, replayRankingDays} from "./lib/rankPlans.mjs";
import {buildRankInput} from "../functions/shared/rank/input.mjs";
import {validateRanking} from "../functions/shared/rank/validate.mjs";
import town from "../functions/data/places.json" with {type:"json"};
import {RANK_SCHEMA} from "../functions/shared/rank/schema.mjs";

const require = createRequire(import.meta.url);
const {listenNote, buildNoteCards} = require("../functions/lib/notePipeline.js");
const {extractCard} = require("../functions/lib/extractCard.js");
const {transcribeWav} = require("../functions/lib/transcribe.js");
const {transcribeWithSpark} = require("../functions/lib/sparkAudio.js");
const {REPLY_SCHEMA} = require("../functions/lib/cardSchema.js");
const {makeWav} = require("../functions/test/make-wav.js");
const {PROMPT_HASH} = require("../functions/lib/callRanker.js");
export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const CLEANUP = "Now delete both temporary keys (Meta: ai.developer.meta.com, API keys. Baseten: your dashboard, API keys) and clear clipboard history with Win+V.";

export function recordingInputs(root) {
  const dir = join(root, "test-audio", "raw");
  const list = existsSync(dir) ? readdirSync(dir) : [];
  return Array.from({length:10}, (_, i) => {
    const id = `n${String(i + 1).padStart(2, "0")}`;
    const files = list.filter((name) => new RegExp(`^${id}(?:[._-].*)?\\.(?:ogg|opus|m4a|mp3|wav)$`, "i").test(name));
    if (files.length !== 1) throw new Error("Each numbered recording must have exactly one local input.");
    const path = join(dir, files[0]);
    const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", path], {encoding:"utf8", windowsHide:true});
    let seconds = null;
    try {seconds = Number(JSON.parse(result.stdout).format.duration);} catch {}
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 120) throw new Error("Recording duration could not be verified within the live audio cap.");
    return {id, path, seconds, hash:hashOf(readFileSync(path))};
  });
}

export function buildPlan(root = ROOT, {baseten = true} = {}) {
  const inputs = recordingInputs(root);
  const options = {seconds:inputs.reduce((n, input) => n + input.seconds, 0), billedSeconds:inputs.reduce((n, input) => n + Math.floor(input.seconds), 0), baseten};
  let forecast = estimate(options);
  if (forecast.usd > 10) forecast = estimate({...options, repeat:2});
  return {...forecast, inputs};
}
export function printPlan(plan, print = console.log) {
  print("Scoring plan. Recordings: 10. Expected cards: 10. No held-out seeds.");
  for (const row of plan.rows) print(`${row.part} | ${row.provider} | ${row.model} | ${row.calls} calls | USD ${row.usd.toFixed(4)}`);
  print(`Planned ${plan.calls} logical calls; ${plan.repeat} recording repeats. USD ${plan.usd.toFixed(2)} with full output caps; about USD ${plan.allRetryUsd.toFixed(2)} if every call retries.`);
  print(`Conditional Spark 1.3 low check: at most ${plan.conditional.calls} additional call, USD ${plan.conditional.usd.toFixed(4)}. Rejected 1.2 minimal removes A-min; identical calls are shared.`);
  print(`Prices checked ${PRICE_SOURCES.checked}: ${PRICE_SOURCES.meta}; ${PRICE_SOURCES.baseten}. Baseten dated-slug price uses the published family rate.`);
  print("Inputs: text UTF-8 bytes/4 plus framing; authored text proxies recording length. Audio input forecast uses older measured tokens, not a documented tokenization guarantee. No cache discount.");
  print(`Estimated ${plan.minutes.join("–")} minutes without widespread retries. Actual spending pauses above USD 12; missing successful-response usage also pauses.`);
}

export class NoteRunner {
  constructor({root = ROOT, metaKey, basetenKey = "", fetch = globalThis.fetch, budget, state, print = console.log} = {}) {
    this.root = root; this.metaKey = metaKey; this.basetenKey = basetenKey; this.fetch = fetch; this.print = print;
    this.paths = paths(root); this.state = state || gitState(root); this.budget = budget || new NoteBudget(this.paths.ledger);
    this.saved = new Map(); this.inflight = new Map();
    for (const path of [this.paths.private, this.paths.fixtures, this.paths.baseten, this.paths.rankings]) {
      for (const row of readLines(path)) if (row.callId) this.saved.set(row.callId, row);
    }
  }
  save(path, record, privateRecord) {
    appendRecord(path, record, {privateRecord, keys:[this.metaKey, this.basetenKey]});
    this.saved.set(record.callId, record);
  }
  async call(spec, work, signal) {
    if (spec.identity.seed !== undefined) assertTuningSeeds([spec.identity.seed]);
    const callId = callIdentity(spec.identity);
    const unpack = (record, cached) => {
      if (record.failure) throw Object.assign(new Error("Saved call failed; it will not be repeated."), record.failure, {callId, cached});
      return {...record.payload, cacheHit:cached, callId};
    };
    if (this.saved.has(callId)) return unpack(this.saved.get(callId), true);
    let entry = this.inflight.get(callId);
    if (!entry) {
      const controller = new AbortController();
      entry = {controller, users:new Set(), done:false};
      entry.promise = Promise.resolve().then(async () => {
        this.budget.check();
        const started = performance.now(), at = this.budget.rows.length;
        let payload, failure;
        try {
          payload = await work({signal:controller.signal,
            fetch:meteredFetch(this.fetch, this.budget, {callId, provider:spec.provider, model:spec.model,
              audio:spec.stage === "voice" || spec.stage === "keyword-check", durationSeconds:spec.durationSeconds})});
          assertNoSecrets(payload, [this.metaKey, this.basetenKey]);
          if (["fixture", "ranking"].includes(spec.kind)) assertPublic(payload, [this.metaKey, this.basetenKey]);
        } catch (error) {
          if (error.kind === "spending-pause" && this.budget.rows.length === at) throw error;
          failure = safeFailure(error);
          payload = undefined;
          if (error.rawOutput !== undefined) {
            try {
              const raw = {rawOutput:error.rawOutput};
              if (["fixture", "ranking"].includes(spec.kind)) assertPublic(raw, [this.metaKey, this.basetenKey]);
              else assertNoSecrets(raw, [this.metaKey, this.basetenKey]);
              payload = raw;
            } catch { /* Keep safe failure metadata; never persist rejected content. */ }
          }
        }
        const actual = this.budget.rows.slice(at).filter((row) => row.callId === callId);
        const record = {callId, ...this.state, kind:spec.kind, stage:spec.stage, id:spec.id, run:spec.run || 0,
          configuration:spec.configuration || "shared", extractionHash:spec.extractionHash || configurations()[1].extractionHash,
          configurationHash:spec.identity.configurationHash || hashOf(spec.identity),
          model:spec.model, effort:spec.effort || null, provider:spec.provider,
          baseUrl:spec.provider === "baseten" ? BASE_URL : "https://api.meta.ai/v1",
          date:new Date().toISOString(), timings:{callMs:Math.round(performance.now() - started), conversionMs:null,
            voiceMs:["voice", "keyword-check"].includes(spec.stage) ? Math.round(performance.now() - started) : null,
            audioMs:["audio", "effort-check"].includes(spec.stage) ? Math.round(performance.now() - started) : null,
            bothEarsMs:null, cardMs:spec.stage === "card" ? Math.round(performance.now() - started) : null,
            totalMs:Math.round(performance.now() - started)},
          tokens:{input:actual.reduce((n, row) => n + (row.inputTokens || 0), 0), output:actual.reduce((n, row) => n + (row.outputTokens || 0), 0)},
          billedSeconds:actual.reduce((n, row) => n + (row.billedSeconds || 0), 0),
          attempts:payload?.attempts || failure?.attempts || 1, outcome:failure ? failure.kind : "ok",
          ...(failure ? {failure, ...(payload ? {payload} : {})} : {payload})};
        const privateRecord = spec.kind === "recording" || spec.kind === "preflight";
        this.save(spec.path || (privateRecord ? this.paths.private : this.paths.fixtures), record, privateRecord);
        if (spec.provider === "baseten") {
          const {payload:_payload, failure:_failure, ...log} = record;
          appendRecord(this.paths.log, log, {keys:[this.metaKey, this.basetenKey]});
        }
        return record;
      }).finally(() => {entry.done = true;});
      this.inflight.set(callId, entry);
    }
    const user = Symbol(); entry.users.add(user);
    const cancel = () => {entry.users.delete(user); if (!entry.users.size && !entry.done) entry.controller.abort();};
    if (signal) {signal.addEventListener("abort", cancel, {once:true}); if (signal.aborted) cancel();}
    try {return unpack(await entry.promise, false);}
    finally {entry.users.delete(user); signal?.removeEventListener("abort", cancel);}
  }

  async preflight() {
    const wav = makeWav(), configs = configurations();
    const common = {kind:"preflight", provider:"meta", id:"synthetic", run:0};
    await this.call({...common, stage:"keyword-check", model:"muse-voice-transcribe-1.0", durationSeconds:1,
      identity:{...common, stage:"keyword-check", keywords:configs[1].keywords}}, async ({fetch, signal}) => {
      const result = await transcribeWav(wav, {apiKey:this.metaKey, keywords:configs[1].keywords, fetch, signal});
      return {accepted:true, attempts:result.attempts};
    });
    const accepted = {};
    for (const model of ["muse-spark-1.2", "muse-spark-1.3"]) {
      const check = async (effort) => this.call({...common, stage:"effort-check", model, effort,
        identity:{...common, stage:"effort-check", model, effort, audioPrompt:baseline.audioPrompt}}, async ({fetch, signal}) => {
        const result = await transcribeWithSpark(wav, {apiKey:this.metaKey, model, effort, fetch, signal});
        return {accepted:true, attempts:result.attempts};
      });
      try {await check("minimal"); accepted[model] = true;}
      catch (error) {
        if (error.status !== 400 || error.parameter !== "reasoning_effort") throw error;
        accepted[model] = false;
        this.print(`${model}: minimal rejected. ${model.endsWith("1.2") ? "A-min is omitted." : "B will use low."}`);
        if (model.endsWith("1.3")) await check("low");
      }
    }
    this.basetenAvailable = Boolean(this.basetenKey);
    if (this.basetenAvailable) {
      try {
        await this.call({kind:"preflight", stage:"slug-check", id:"authored-probe", provider:"baseten", model:BASETEN_MODEL, effort:"low",
          identity:{stage:"slug-check", model:BASETEN_MODEL, version:1}}, async ({fetch}) => {
          const result = await callBaseten({messages:[{role:"user", content:"Return the integer 1."}], max_tokens:32},
              {apiKey:this.basetenKey, source:"probe", fetch});
          return {accepted:true, attempts:result.attempts};
        });
      } catch (error) {
        if (error.status !== 404) throw error;
        this.basetenAvailable = false; this.print("Requested Baseten slug not found. Every Baseten comparison is skipped; no substitute model.");
      }
    }
    return configurations({minimal12:accepted["muse-spark-1.2"], minimal13:accepted["muse-spark-1.3"]});
  }

  async text(plan, provider = "meta") {
    const config = plan.config || configurations()[1], model = provider === "meta" ? "muse-spark-1.3" : BASETEN_MODEL;
    return this.call({kind:"fixture", stage:"card", id:plan.id, run:plan.run || 1,
      provider, model, effort:"low", configuration:config.name, extractionHash:config.extractionHash,
      path:provider === "baseten" ? this.paths.baseten : this.paths.fixtures,
      identity:{kind:"fixture", provider, model, prompt:hashOf(config.prompt), schema:hashOf(REPLY_SCHEMA), id:plan.id, text:hashOf(plan.text), run:plan.run || 1}},
    async ({fetch}) => extractCard({transcriptA:plan.text, transcriptB:plan.text}, {
      apiKey:provider === "meta" ? this.metaKey : this.basetenKey, model, prompt:config.prompt, includeRaw:true,
      validateRaw:(value, schema) => {try {validateSchema(value, schema);} catch {throw Object.assign(new Error("Schema mismatch."), {kind:"schema"});}},
      ...(provider === "meta" ? {fetch} : {request:basetenTransport({apiKey:this.basetenKey, source:"fixture", fetch})}),
    }));
  }

  async recording(input, run, config, audio) {
    const identity = {kind:"recording", stage:"pipeline", id:input.id, run, wav:hashOf(audio.wav), configurationHash:config.configurationHash};
    const pipelineId = callIdentity(identity);
    if (this.saved.has(pipelineId)) return;
    const started = performance.now(), used = [];
    const common = {kind:"recording", provider:"meta", id:input.id, run, durationSeconds:audio.durationMs / 1000};
    const voice = (signal) => this.call({...common, configuration:config.name, extractionHash:config.extractionHash, stage:"voice", model:"muse-voice-transcribe-1.0",
      identity:{...common, stage:"voice", wav:identity.wav, keywords:config.keywords}}, async ({fetch, signal}) =>
      transcribeWav(audio.wav, {apiKey:this.metaKey, keywords:config.keywords, fetch, signal}), signal);
    const spark = (signal) => this.call({...common, configuration:config.name, extractionHash:config.extractionHash, stage:"audio", model:config.audioModel, effort:config.audioEffort,
      identity:{...common, stage:"audio", wav:identity.wav, model:config.audioModel, effort:config.audioEffort, prompt:baseline.audioPrompt}}, async ({fetch, signal}) =>
      transcribeWithSpark(audio.wav, {apiKey:this.metaKey, model:config.audioModel, effort:config.audioEffort, prompt:baseline.audioPrompt, fetch, signal}), signal);
    let heard, extraction, failure;
    try {
      heard = await listenNote(audio.wav, {voice, spark});
      for (const ear of Object.values(heard.ears)) if (ear.ok) used.push(ear.value);
      const transcriptA = heard.ears.voice.ok ? heard.ears.voice.value.transcript : null;
      const transcriptB = heard.ears.spark.ok ? heard.ears.spark.value.transcript : null;
      extraction = await this.call({...common, stage:"card", model:"muse-spark-1.3", effort:"low", configuration:config.name,
        extractionHash:config.extractionHash, identity:{...common, stage:"card", prompt:hashOf(config.prompt), schema:hashOf(REPLY_SCHEMA),
          a:hashOf(transcriptA || ""), b:hashOf(transcriptB || "")}}, async ({fetch}) => buildNoteCards(heard,
        {apiKey:this.metaKey, prompt:config.prompt, schema:REPLY_SCHEMA, includeRaw:true, fetch, uncertainWords:false}));
      used.push(extraction);
    } catch (error) {
      if (error.kind === "spending-pause") throw error;
      failure = safeFailure(error);
      if (error.ears) heard = {ears:error.ears, singleSource:false};
    }
    const earData = {};
    for (const [name, ear] of Object.entries(heard?.ears || {})) earData[name] = {
      ok:ear.ok, ms:ear.ms, ...(ear.ok ? {transcript:ear.value.transcript, callId:ear.value.callId} : {failure:safeFailure(ear.error)}),
    };
    const record = {callId:pipelineId, ...this.state, kind:"recording", stage:"pipeline", id:input.id, run,
      configuration:config.name, extractionHash:config.extractionHash, configurationHash:config.configurationHash,
      model:"muse-spark-1.3", models:{voice:"muse-voice-transcribe-1.0", audio:config.audioModel, card:"muse-spark-1.3"},
      effort:config.audioEffort, extractEffort:"low", date:new Date().toISOString(),
      timings:{conversionMs:audio.conversionMs, voiceMs:heard?.ears.voice?.ms ?? null, audioMs:heard?.ears.spark?.ms ?? null,
        bothEarsMs:heard?.totalMs ?? null, cardMs:extraction?.latencyMs ?? null, totalMs:Math.round(performance.now() - started) + audio.conversionMs},
      comparable:used.length === 3 && used.every((value) => !value.cacheHit), conversionCached:audio.conversionCached,
      attempts:used.reduce((n, result) => n + (result.attempts || 0), 0),
      tokens:{input:used.reduce((n, r) => n + (r.usage?.prompt_tokens || 0), 0), output:used.reduce((n, r) => n + (r.usage?.completion_tokens || 0), 0)},
      outcome:failure ? failure.kind : "ok", ...(failure ? {failure} : {payload:{reply:extraction.reply, raw:extraction.raw, singleSource:heard.singleSource}}), ears:earData};
    this.save(this.paths.private, record, true);
    this.print(`${input.id} run ${run} ${config.name}: ${record.outcome}`);
  }

  async rankings(seeds = [1, 2, 4, 5, 8, 9]) {
    assertTuningSeeds(seeds);
    for (const seed of seeds) {
      const event = replayRankingDays(seed).firstAlert;
      const {input, references} = buildRankInput(event.signal, event.cards, town);
      const saved = JSON.parse(readFileSync(join(this.root, "docs", "provenance", "rankings", `seed-${String(seed).padStart(2, "0")}.json`), "utf8"));
      const original = saved.records.find((record) => record.day === event.day && record.signalKey === event.signalKey && record.effort === "low");
      if (!original || original.inputHash !== hashOf(input) || hashOf(original.input) !== hashOf(input)) throw new Error("Saved ranking input mismatch; no call made.");
      const body = await productionRankingBody(input);
      await this.call({kind:"ranking", stage:"ranking", id:`seed-${seed}`, provider:"baseten", model:BASETEN_MODEL, effort:"low", path:this.paths.rankings,
        identity:{kind:"ranking", seed, inputHash:hashOf(input), promptHash:PROMPT_HASH, schema:hashOf(RANK_SCHEMA), model:BASETEN_MODEL}}, async ({fetch}) => {
        const result = await callBaseten(body, {apiKey:this.basetenKey, source:"ranking", seed, fetch});
        let raw; try {raw = JSON.parse(result.text);} catch {throw Object.assign(new Error("Invalid ranking JSON."), {kind:"bad-reply", rawOutput:result.text});}
        const validated = validateRanking(input, raw, references);
        return {...result, input, inputHash:hashOf(input), seed, day:event.day, promptHash:PROMPT_HASH,
          ...validated, original:{ranking:original.cleanedRanking, dropCounts:original.dropCounts, ms:original.ms, tokens:original.tokens}};
      }).catch((error) => {if (error.kind === "spending-pause") throw error;});
    }
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.some((arg) => !["--dry-run", "--skip-baseten"].includes(arg))) throw new Error("Use --dry-run or --skip-baseten.");
  let plan = buildPlan(ROOT, {baseten:!args.includes("--skip-baseten")});
  if (args.includes("--dry-run")) {
    printPlan(plan);
    try {requireListened(readCorrections(ROOT)); console.log("Listening gate: ready.");} catch {console.log("Listening gate: locked. Dry run only; no network calls or files written.");}
    return;
  }
  requireListened(readCorrections(ROOT));
  let metaKey = "", basetenKey = "", runner;
  try {
    metaKey = await readHiddenKey();
    if (!args.includes("--skip-baseten")) basetenKey = await readHiddenKey(process.stdin, process.stdout, {label:"Baseten", optional:true});
    plan = buildPlan(ROOT, {baseten:Boolean(basetenKey)});
    runner = new NoteRunner({metaKey, basetenKey});
    if (runner.budget.total > runner.budget.limit) {
      console.log(`Recorded spending USD ${runner.budget.total.toFixed(4)} exceeds USD ${runner.budget.limit.toFixed(2)}. Review before continuing.`);
      if (!await confirmRun(0, process.stdin, process.stdout, {prompt:`Continue after reviewing USD ${runner.budget.total.toFixed(4)} already recorded? (y/n) `})) return;
      runner.budget.continueAfterReview();
    }
    printPlan(plan);
    console.log(`Already saved call records: ${runner.saved.size}. Completed calls, including failures, are never repeated. The manifest is an upper bound before cached/preflight sharing.`);
    if (!await confirmRun(plan.calls + 1)) return;
    const configs = await runner.preflight();
    const manifest = {callId:callIdentity({manifest:true, configs:configs.map((config) => config.configurationHash), repeat:plan.repeat,
      baseten:runner.basetenAvailable}), ...runner.state, kind:"manifest", stage:"manifest", repeat:plan.repeat,
      configurations:configs.map((config) => config.name), hashes:configs.map((config) => config.configurationHash),
      baseten:runner.basetenAvailable, date:new Date().toISOString()};
    if (!runner.saved.has(manifest.callId)) runner.save(runner.paths.private, manifest, true);
    const runPool = async (jobs) => {
      let cursor = 0;
      await Promise.all(Array.from({length:2}, async () => {
        while (cursor < jobs.length) {
          runner.budget.check(); const job = jobs[cursor++];
          await job().catch((error) => {if (error.kind === "spending-pause") throw error;});
        }
      }));
    };
    await runPool(textPlans().map((plan) => () => runner.text(plan)));
    for (const input of plan.inputs) {
      const audio = convertAudio(input.path, join(ROOT, "test-audio", "wav", `${input.id}-24k.wav`));
      for (let run = 1; run <= plan.repeat; run++) {
        runner.budget.check();
        const outcomes = await Promise.allSettled(configs.map((config) => runner.recording(input, run, config, audio)));
        const rejected = outcomes.find((result) => result.status === "rejected");
        if (rejected) throw rejected.reason;
      }
    }
    if (runner.basetenAvailable) {
      await runPool(basetenPlans().map((plan) => () => runner.text(plan, "baseten")));
      await runner.rankings();
    }
    await Promise.allSettled([...runner.inflight.values()].map((entry) => entry.promise));
    runner.budget.check();
    console.log(`Run done. Configurations ${configs.map((config) => `${config.name}:${config.audioModel}/${config.audioEffort}`).join(", ")}.`);
    console.log(`Recording repeats ${plan.repeat}. Saved records ${runner.saved.size}. Actual recorded cost USD ${runner.budget.total.toFixed(4)}. Baseten ${runner.basetenAvailable ? "included" : "skipped"}.`);
    console.log("Run npm.cmd run score:report for the offline results and completion audit.");
  } catch (error) {
    if (error.kind === "spending-pause") console.log(`PAUSED: recorded cost USD ${runner?.budget.total.toFixed(4) ?? "unknown"}; allowance USD ${runner?.budget.limit.toFixed(2) ?? "12"}. Spending passed the allowance or usage is missing. Completed records remain saved. Review and rerun to continue.`);
    else {const safe = safeFailure(error); console.error(`Scoring stopped safely: ${safe.kind}, HTTP ${safe.status ?? "none"}, parameter ${safe.parameter ?? "none"}. No provider message was printed.`); process.exitCode = 1;}
  } finally {
    if (runner) {
      await Promise.allSettled([...runner.inflight.values()].map((entry) => entry.promise));
      runner.metaKey = ""; runner.basetenKey = "";
    }
    metaKey = ""; basetenKey = ""; console.log(CLEANUP);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {console.error("Scoring could not start. Check the listening gate, numbered input files and ffprobe."); process.exitCode = 1;});
