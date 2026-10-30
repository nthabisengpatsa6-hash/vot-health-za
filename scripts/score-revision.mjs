import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {NoteRunner, CLEANUP} from "./score-notes.mjs";
import {A2, PROBE_BODY, readAminSources, revisionPaths, revisionTextPlans, revisionBasetenPlans, revisionEstimate} from "./lib/noteRevision.mjs";
import {BASE_URL} from "./lib/basetenScoring.mjs";
import {probeBasetenExample} from "./lib/basetenProbe.mjs";
import {hashOf, safeFailure} from "./lib/noteArtifacts.mjs";
import {callIdentity, PRICE_SOURCES, readCorrections, requireListened} from "./lib/notePlans.mjs";
import {confirmRun, readHiddenKey} from "./lib/hiddenInput.mjs";
const {buildNoteCards} = createRequire(import.meta.url)("../functions/lib/notePipeline.js");
const {REPLY_SCHEMA} = createRequire(import.meta.url)("../functions/lib/cardSchema.js");
const ROOT = fileURLToPath(new URL("../", import.meta.url));

export function revisionFetch(provider, fetchImpl) {
  return (url, init) => {
    const expected = provider === "meta" ? "https://api.meta.ai/v1/chat/completions" : `${BASE_URL}/chat/completions`;
    if (url !== expected || init.method !== "POST") throw new Error("Revision provider/endpoint mismatch; request refused.");
    const body = JSON.parse(init.body);
    if (body.messages?.some((message) => typeof message.content !== "string") || /"(?:input_audio|audio_url|file_id)"/.test(init.body)) throw new Error("Revision runs forbid audio requests.");
    return fetchImpl(url, init);
  };
}
export function printRevisionPlan(provider = null, print = console.log) {
  const plan = revisionEstimate();
  print(`A2 card-only revision. Hash ${A2.extractionHash}; audio 1.2 minimal from saved A-min ears; 53 keywords retained; [?] off. No ear calls.`);
  for (const own of provider ? [provider] : ["meta", "baseten"]) {
    for (const row of plan[own]) print(`${own} | ${row.part} | ${row.calls} calls | ${row.input} forecast input tokens | ${row.output} forecast output tokens | USD ${row.usd.toFixed(4)}`);
    print(`${own}: ${own === "meta" ? 49 : 15} logical calls before saved-call reuse; forecast USD ${plan[`${own}Usd`].toFixed(4)}.`);
    const retryUsd = own === "meta" ? 2 * plan.metaUsd : plan.baseten[0].usd + 2 * (plan.basetenUsd - plan.baseten[0].usd);
    print(`${own}: if every comparison needs its one allowed retry, at most ${own === "meta" ? 98 : 29} HTTP attempts; forecast USD ${retryUsd.toFixed(4)}. The probe has one attempt only.`);
  }
  print(`Rates checked ${PRICE_SOURCES.checked}: USD 1.25/million input, USD 4.25/million output, including reasoning. ${PRICE_SOURCES.meta}; ${PRICE_SOURCES.baseten}`);
  print("Card/ranking forecasts use 8,000 output caps and authored input proxies. The exact Hello probe has no output cap: its 1,000-output-token forecast is an assumption, not an upper bound. No cache discounts.");
  print("The shared actual-cost ledger pauses above its current USD 12 allowance. Unknown successful-response usage pauses too. Original Meta calls and the old Baseten 404 remain untouched.");
  return plan;
}

export class RevisionRunner extends NoteRunner {
  constructor({provider, fetch = globalThis.fetch, ...options}) {
    if (!["meta", "baseten"].includes(provider)) throw new Error("Choose one revision provider.");
    super({...options, recordPaths:revisionPaths(options.root || ROOT, provider), fetch:revisionFetch(provider, fetch)});
    this.provider = provider;
  }
  async recordingCard(source) {
    if (this.provider !== "meta") throw new Error("Recording-derived text is forbidden on the Baseten path.");
    const inputHash = hashOf({a:source.heard.ears.voice.value.transcript, b:source.heard.ears.spark.value.transcript});
    const identity = {kind:"recording", revision:"A2", stage:"card", id:source.id, run:source.run, provider:"meta",
      model:"muse-spark-1.3", effort:"low", prompt:hashOf(A2.prompt), schema:hashOf(REPLY_SCHEMA), inputHash, sourceCalls:source.sourceCalls};
    const pipelineId = callIdentity({kind:"pipeline", revision:"A2", cardCallId:callIdentity(identity)});
    if (this.saved.has(pipelineId)) return;
    let value, failure;
    try {
      value = await this.call({kind:"recording", stage:"card", id:source.id, run:source.run, provider:"meta", model:"muse-spark-1.3", effort:"low",
        configuration:"A2", extractionHash:A2.extractionHash, inputHash, identity}, async ({fetch}) =>
        buildNoteCards(source.heard, {apiKey:this.metaKey, fetch, prompt:A2.prompt, includeRaw:true, uncertainWords:false}));
    } catch (error) {if (error.kind === "spending-pause") throw error; failure = safeFailure(error);}
    const ears = Object.fromEntries(Object.entries(source.heard.ears).map(([name, ear]) => [name, {ok:true, callId:source.sourceCalls[name], transcript:ear.value.transcript}]));
    this.save(this.paths.private, {callId:pipelineId, ...this.state, kind:"recording", stage:"pipeline", id:source.id, run:source.run,
      configuration:"A2", configurationHash:A2.configurationHash, extractionHash:A2.extractionHash, inputHash,
      sourcePipeline:source.sourcePipeline, sourceConfigurationHash:source.sourceConfigurationHash, sourceCalls:source.sourceCalls,
      models:{voice:"muse-voice-transcribe-1.0", audio:"muse-spark-1.2", card:"muse-spark-1.3"}, effort:"minimal", extractEffort:"low",
      date:new Date().toISOString(), comparisonMode:"card-only", comparable:false, cardTimingComparable:Boolean(value && !value.cacheHit),
      timings:{conversionMs:null, voiceMs:null, audioMs:null, bothEarsMs:null, cardMs:value?.latencyMs ?? null, totalMs:null},
      outcome:failure ? failure.kind : "ok", ...(failure ? {failure} : {payload:{reply:value.reply, raw:value.raw, singleSource:false}}), ears}, true);
    this.print(`${source.id} A2 run ${source.run}: ${failure ? failure.kind : "ok"}`);
  }
  async exampleProbe() {
    if (this.provider !== "baseten") throw new Error("The Meta-only path cannot make a Baseten probe.");
    const identity = {stage:"slug-check", revision:"A2-exact-example-v1", method:"POST", url:`${BASE_URL}/chat/completions`, body:PROBE_BODY};
    try {
      await this.call({kind:"preflight", stage:"slug-check", id:"A2-exact-example", provider:"baseten", model:PROBE_BODY.model,
        inputHash:hashOf(PROBE_BODY.messages[0].content), identity}, ({fetch}) => probeBasetenExample({apiKey:this.basetenKey, fetch}));
      this.budget.check(); return true;
    } catch (error) {
      if (error.kind === "spending-pause") throw error;
      const record = this.saved.get(callIdentity(identity));
      const diagnostics = record?.payload?.diagnostics;
      if (diagnostics) this.print(JSON.stringify(diagnostics));
      else this.print(JSON.stringify({method:"POST", url:`${BASE_URL}/chat/completions`, ...safeFailure(error)}));
      this.print("Baseten probe failed; all eight authored-card and six ranking comparisons are skipped. No substitute model.");
      return false;
    }
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.some((arg) => !["--dry-run", "--meta-only", "--baseten-only"].includes(arg)) || args.includes("--meta-only") && args.includes("--baseten-only")) throw new Error("Choose --meta-only or --baseten-only; --dry-run may show both.");
  const provider = args.includes("--meta-only") ? "meta" : args.includes("--baseten-only") ? "baseten" : null;
  if (args.includes("--dry-run")) {
    printRevisionPlan(provider);
    if (provider !== "baseten") {const sources = readAminSources(ROOT); console.log(`Verified saved A-min ear pairs: ${sources.length}. Dry run only; no calls or writes.`);}
    return;
  }
  if (!provider) throw new Error("Choose --meta-only or --baseten-only for a paid revision run.");
  const sources = provider === "meta" ? readAminSources(ROOT) : [];
  if (provider === "meta") requireListened(readCorrections(ROOT));
  let key = "", runner;
  try {
    key = await readHiddenKey(process.stdin, process.stdout, {label:provider === "meta" ? "Meta" : "Baseten"});
    runner = new RevisionRunner({provider, ...(provider === "meta" ? {metaKey:key} : {basetenKey:key})});
    if (runner.budget.total > runner.budget.limit) {
      if (!await confirmRun(0, process.stdin, process.stdout, {prompt:`Recorded USD ${runner.budget.total.toFixed(4)} exceeds allowance. Continue after review? (y/n) `})) return;
      runner.budget.continueAfterReview();
    }
    runner.budget.check(); printRevisionPlan(provider);
    console.log(`Already saved revision records: ${runner.saved.size}. Finished successes and failures are never repeated.`);
    if (!await confirmRun(provider === "meta" ? 49 : 15)) return;
    if (provider === "baseten" && !await runner.exampleProbe()) return;
    if (provider === "meta") for (const source of sources) {runner.budget.check(); await runner.recordingCard(source);}
    const jobs = provider === "meta" ? revisionTextPlans() : revisionBasetenPlans();
    let cursor = 0;
    await Promise.all(Array.from({length:2}, async () => {
      while (cursor < jobs.length) {
        runner.budget.check(); const plan = jobs[cursor++];
        await runner.text(plan, provider).catch((error) => {if (error.kind === "spending-pause") throw error;});
      }
    }));
    if (provider === "baseten") await runner.rankings();
    runner.budget.check();
    console.log(`A2 run done. Provider ${provider}. Revision records ${runner.saved.size}. Recorded cumulative cost USD ${runner.budget.total.toFixed(4)}. Ear calls 0.`);
    console.log("Run npm.cmd run score:a2:report for the aggregate-only offline comparison.");
  } catch (error) {
    console.log(JSON.stringify({message:error.kind === "spending-pause" ? "Paused for spending review; saved records remain." : "Revision stopped safely.", ...safeFailure(error)}));
    if (error.kind !== "spending-pause") process.exitCode = 1;
  } finally {
    if (runner) {await Promise.allSettled([...runner.inflight.values()].map((entry) => entry.promise)); runner.metaKey = ""; runner.basetenKey = "";}
    key = ""; console.log(CLEANUP);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {console.error("A2 could not start; check flags and saved A-min source records. No ear calls were made."); process.exitCode = 1;});
