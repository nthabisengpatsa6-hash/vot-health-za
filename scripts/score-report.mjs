import {createRequire} from "node:module";
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import recordings from "../test-fixtures/recordings-expected.json" with {type:"json"};
import old from "../test-fixtures/expected-cards.json" with {type:"json"};
import {baseline, configurations, ideal, special, readCorrections, requireListened, textPlans, basetenPlans} from "./lib/notePlans.mjs";
import {assertPublic, paths, readLines} from "./lib/noteArtifacts.mjs";
import {capitalisedWords, correctionsFor, earExcerpts, falseInsertions, legacyExpected, scoreNote, specialOutcome, TERMS, wholeWord} from "./lib/noteScoring.mjs";
const {applyUncertainWords} = createRequire(import.meta.url)("../functions/lib/uncertainWords.js");
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const sum = (rows, of) => rows.reduce((n, row) => n + of(row), 0);
export function median(values) {
  const a = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!a.length) return null;
  const i = Math.floor(a.length / 2); return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2;
}
export function table(headers, rows) {
  const cell = (v) => String(v ?? "unavailable").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
}
const isJsonFailure = (row) => ["bad-reply", "schema"].includes(row.outcome);

export function evaluateRecord(row, local) {
  const recording = correctionsFor(recordings.recordings.find((r) => r.id === row.id), local);
  if (!row.payload?.reply) return {row, score:null, on:null, markers:{found:0, mapped:0, unmapped:0}, suspects:[], capitals:[]};
  const reply = row.payload.reply;
  const transcripts = [row.ears.voice?.transcript || "", row.ears.spark?.transcript || ""];
  const marked = applyUncertainWords(reply, transcripts);
  return {row, score:scoreNote(recording, reply), on:scoreNote(recording, marked.reply), markers:marked.markers,
    suspects:falseInsertions(reply, ideal[row.id] || "").extra, capitals:capitalisedWords(reply)};
}
export function aggregate(evaluated, name, on = false) {
  const rows = evaluated.filter((item) => item.row.configuration === name);
  const valid = rows.filter((item) => item.score);
  const totals = {confidentlyWrong:0, caughtByAsk:0, unnecessaryAsk:0, missed:0, extra:0, extraCards:0, missingCards:0, nameLeaks:0, jsonFailures:0};
  for (const item of valid) for (const key of Object.keys(totals)) totals[key] += (on ? item.on : item.score).totals[key];
  totals.jsonFailures += rows.filter((item) => isJsonFailure(item.row)).length;
  const perRun = {};
  for (const item of valid) {
    const own = perRun[item.row.run] ||= {confidentlyWrong:0, asks:0};
    const value = (on ? item.on : item.score).totals;
    own.confidentlyWrong += value.confidentlyWrong;
    own.asks += value.caughtByAsk + value.unnecessaryAsk;
  }
  const timings = rows.filter((item) => item.row.comparable).map((item) => item.row.timings);
  for (const [run, value] of Object.entries(perRun)) {
    const own = rows.filter((item) => String(item.row.run) === run && item.row.comparable);
    value.bothEarsMs = median(own.map((item) => item.row.timings.bothEarsMs));
    value.totalMs = median(own.map((item) => item.row.timings.totalMs));
  }
  return {name, rows:rows.length, valid:valid.length, failures:rows.length - valid.length, totals, perRun,
    bothEarsMs:median(timings.map((row) => row.bothEarsMs)), totalMs:median(timings.map((row) => row.totalMs))};
}
const consistent = (a, b, predicate) => Object.keys(a.perRun).filter((run) => b.perRun[run] && predicate(a.perRun[run], b.perRun[run])).length;

export function recommendations(evaluated, fixtureRows, repeats) {
  const base = aggregate(evaluated, "Baseline"), a = aggregate(evaluated, "A"), min = aggregate(evaluated, "A-min"), b = aggregate(evaluated, "B");
  const d4 = fixtureRows.filter((row) => row.configuration === "A" && ["D4-1", "D4-2"].includes(row.id));
  const insertionRows = fixtureRows.filter((row) => Object.hasOwn(ideal, row.id));
  const specialReady = d4.length === 6 && d4.every((row) => row.payload?.reply && specialOutcome(special.find((f) => f.id === row.id), row.payload.reply));
  const insertionsReady = insertionRows.length === 20 && insertionRows.every((row) => row.payload?.reply && !falseInsertions(row.payload.reply, ideal[row.id]).extra.length);
  const complete = (stats) => stats.valid === 10 * repeats;
  const promptRuns = consistent(a, base, (x, y) => x.confidentlyWrong <= y.confidentlyWrong);
  const adopt = complete(base) && complete(a) && specialReady && insertionsReady &&
    a.totals.confidentlyWrong <= base.totals.confidentlyWrong && promptRuns >= 2;
  const fasterRuns = consistent(min, a, (x, y) => x.confidentlyWrong <= y.confidentlyWrong && x.bothEarsMs !== null && y.bothEarsMs !== null && x.bothEarsMs < y.bothEarsMs);
  const minimal = complete(min) && complete(a) && min.totals.confidentlyWrong <= a.totals.confidentlyWrong &&
    min.bothEarsMs !== null && a.bothEarsMs !== null && min.bothEarsMs < a.bothEarsMs && fasterRuns >= 2;
  const effort = minimal ? "minimal" : "low", reference = minimal ? min : a;
  const sameEffort = evaluated.filter((item) => item.row.configuration === "B").every((item) => item.row.effort === effort);
  const betterRuns = consistent(b, reference, (x, y) => x.confidentlyWrong < y.confidentlyWrong || x.confidentlyWrong === y.confidentlyWrong && x.asks < y.asks);
  const better = b.totals.confidentlyWrong < reference.totals.confidentlyWrong ||
    b.totals.confidentlyWrong === reference.totals.confidentlyWrong && b.totals.unnecessaryAsk + b.totals.caughtByAsk < reference.totals.unnecessaryAsk + reference.totals.caughtByAsk;
  const choose13 = sameEffort && complete(b) && complete(reference) && better && betterRuns >= 2 && b.totalMs !== null && reference.totalMs !== null && b.totalMs <= reference.totalMs + 2000;
  // On an exact quality tie, use the faster ear at the same effort.
  const qualityTie = b.totals.confidentlyWrong === reference.totals.confidentlyWrong &&
    b.totals.unnecessaryAsk + b.totals.caughtByAsk === reference.totals.unnecessaryAsk + reference.totals.caughtByAsk;
  const tieFasterRuns = consistent(b, reference, (x, y) => x.confidentlyWrong === y.confidentlyWrong && x.asks === y.asks &&
    x.totalMs !== null && y.totalMs !== null && x.totalMs < y.totalMs);
  const tie13 = sameEffort && complete(b) && complete(reference) && qualityTie && tieFasterRuns >= 2 && b.totalMs !== null && reference.totalMs !== null && b.totalMs < reference.totalMs;
  const chosen = choose13 || tie13 ? "B" : minimal ? "A-min" : "A";
  const selected = evaluated.filter((item) => item.row.configuration === chosen && item.score);
  let turned = 0, asksAdded = 0;
  const ruleRuns = new Map();
  for (const item of selected) {
    const run = ruleRuns.get(item.row.run) || {turned:0, added:0, cards:0};
    run.cards += item.row.payload.reply.cards.length;
    for (const field of item.score.fields) {
      const next = item.on.fields.find((other) => other.card === field.card && other.field === field.field);
      if (field.outcome === "confidently wrong" && next?.outcome === "caught by ask") {turned++; run.turned++;}
      if (field.outcome !== "unnecessary ask" && next?.outcome === "unnecessary ask") {asksAdded++; run.added++;}
    }
    ruleRuns.set(item.row.run, run);
  }
  const turnedRuns = [...ruleRuns.values()].filter((run) => run.turned >= 1 && run.cards > 0 && run.added / run.cards <= 1 / 3).length;
  const cards = sum(selected, (item) => item.row.payload.reply.cards.length);
  return {prompt:adopt ? "adopt" : "revise; do not ship", effort,
    audioEar:choose13 || tie13 ? "1.3" : "1.2", configuration:chosen,
    comparison:sameEffort ? "matched effort" : "No matched 1.3 comparison at the chosen effort; retain 1.2 pending separate approval.",
    rule:complete(aggregate(evaluated, chosen)) && turned >= 1 && turnedRuns >= 2 && cards > 0 && asksAdded / cards <= 1 / 3 ? "ON" : "OFF", turned, asksAdded, cards, turnedRuns,
    promptChecks:{d4All:specialReady, falseInsertionsClear:insertionsReady, baselineCW:base.totals.confidentlyWrong, candidateCW:a.totals.confidentlyWrong, consistentRuns:promptRuns},
    effortChecks:{minimalCW:min.totals.confidentlyWrong, lowCW:a.totals.confidentlyWrong, minimalEarsMs:min.bothEarsMs, lowEarsMs:a.bothEarsMs, consistentRuns:fasterRuns},
    audioChecks:{referenceCW:reference.totals.confidentlyWrong, candidateCW:b.totals.confidentlyWrong, referenceAsks:reference.totals.unnecessaryAsk + reference.totals.caughtByAsk,
      candidateAsks:b.totals.unnecessaryAsk + b.totals.caughtByAsk, consistentRuns:betterRuns, referenceTotalMs:reference.totalMs, candidateTotalMs:b.totalMs}};
}

export function generateReport({root = ROOT, local, print = console.log, write = true} = {}) {
  local ||= readCorrections(root);
  const files = paths(root), privateRows = readLines(files.private), fixtureRows = readLines(files.fixtures);
  const manifest = privateRows.filter((row) => row.kind === "manifest").at(-1);
  const repeats = manifest?.repeat || 3;
  const configNames = manifest?.configurations || configurations().map((config) => config.name);
  const pipelines = privateRows.filter((row) => row.stage === "pipeline" && configNames.includes(row.configuration) &&
    (!manifest?.hashes || manifest.hashes.includes(row.configurationHash)));
  const unique = [...new Map(pipelines.map((row) => [`${row.configuration}|${row.id}|${row.run}|${row.configurationHash}`, row])).values()];
  const evaluated = unique.map((row) => evaluateRecord(row, local));
  const missing = [];
  for (const name of configNames) for (const recording of recordings.recordings) for (let run = 1; run <= repeats; run++) {
    if (!evaluated.some((item) => item.row.configuration === name && item.row.id === recording.id && item.row.run === run)) missing.push(`${recording.id}/${name}/${run}`);
  }
  for (const plan of textPlans()) if (!fixtureRows.some((row) => row.id === plan.id && row.configuration === plan.config.name && row.run === plan.run)) missing.push(`fixture/${plan.id}/${plan.config.name}/${plan.run}`);
  const baseRows = readLines(files.baseten), rankRows = readLines(files.rankings);
  if (manifest?.baseten) {
    for (const plan of basetenPlans()) if (!baseRows.some((row) => row.id === plan.id)) missing.push(`baseten/${plan.id}`);
    for (const seed of [1, 2, 4, 5, 8, 9]) if (!rankRows.some((row) => row.id === `seed-${seed}`)) missing.push(`baseten/ranking/${seed}`);
  }
  const correctionCount = sum(Object.values(local.corrections || {}), (card) => Object.keys(card).length);
  const sections = ["# Recording scoring", "", "10 recordings; 10 expected cards. Made-up scenarios read by volunteers.",
    "No recording-derived value or word appears in this file. Local grouped timings measure this connection, not the deployed region or a production target.",
    `Recording repeats: ${repeats}. Corrected expected fields: ${correctionCount}. Missing results: ${missing.length}.`, "",
    "## Configuration provenance", "",
    table(["Configuration", "Voice model", "Audio model", "Audio effort", "Card model", "Card effort", "Extraction hash", "Configuration hash", "Git commit", "Dirty"],
      [...new Map(unique.map((row) => [JSON.stringify([row.configuration, row.configurationHash, row.gitCommit, row.dirty]), row])).values()].map((row) => [
        row.configuration, row.models.voice, row.models.audio, row.effort, row.models.card, row.extractEffort,
        row.extractionHash, row.configurationHash, row.gitCommit, row.dirty])), "",
    "## Per-recording field outcomes", "",
    table(["Recording", "Configuration", "Run", "Card", "Field", "Outcome"], evaluated.flatMap((item) => item.score ?
      item.score.fields.map((field) => [item.row.id, item.row.configuration, item.row.run, field.card, field.field, field.outcome]) :
      [[item.row.id, item.row.configuration, item.row.run, "none", "pipeline", item.row.outcome]])), "",
    "## Card counts and checks", "",
    table(["Recording", "Configuration", "Run", "Cards", "Report", "Count", "Names", "Transcript name count", "Condition", "Advice flag", "Advice check"], evaluated.map((item) => [
      item.row.id, item.row.configuration, item.row.run, item.row.payload?.reply.cards.length ?? 0,
      ...["isReport", "cardCount", "names", "transcriptNames", "notifiable", "adviceRequested", "advice"].map((key) => item.score?.checks[key] ?? "unavailable") ])), "",
    "## Configuration totals", "",
    table(["Configuration", "CW", "Caught", "Unnecessary", "Missed", "Extra", "Extra cards", "Missing cards", "Name leaks", "JSON failures", "Failed pipelines"], configNames.map((name) => {
      const a = aggregate(evaluated, name); return [name, ...Object.values(a.totals), a.failures];
    })), "", "## Timings in milliseconds", "",
    table(["Configuration", "Step", "Comparable samples", "Median", "Maximum"], configNames.flatMap((name) =>
      ["conversionMs", "voiceMs", "audioMs", "bothEarsMs", "cardMs", "totalMs"].map((step) => {
        const values = unique.filter((row) => row.configuration === name && row.comparable).map((row) => row.timings[step]).filter(Number.isFinite);
        return [name, step, values.length, median(values), values.length ? Math.max(...values) : null];
      }))), "", "Resumed pipelines that reuse completed calls have no new comparable end-to-end measurement.", "",
    "## Agreement and uncertainty markers", "",
    table(["Configuration", "Fields with differing outcomes", "Markers found", "Mapped", "Unmapped", "CW caught by rule", "Unnecessary asks added"], configNames.map((name) => {
      const own = evaluated.filter((item) => item.row.configuration === name && item.score), fields = new Map();
      let caught = 0, added = 0;
      for (const item of own) for (const field of item.score.fields) {
        const key = `${item.row.id}|${field.card}|${field.field}`;
        const set = fields.get(key) || new Set(); set.add(field.outcome); fields.set(key, set);
        const after = item.on.fields.find((f) => f.card === field.card && f.field === field.field);
        if (field.outcome === "confidently wrong" && after?.outcome === "caught by ask") caught++;
        if (field.outcome !== "unnecessary ask" && after?.outcome === "unnecessary ask") added++;
      }
      return [name, [...fields.values()].filter((set) => set.size > 1).length,
        ...["found", "mapped", "unmapped"].map((key) => sum(own, (item) => item.markers[key])), caught, added];
    })), "", "## Rule OFF and ON totals", "",
    table(["Configuration", "Rule", "CW", "Caught", "Unnecessary"], configNames.flatMap((name) => [false, true].map((on) => {
      const a = aggregate(evaluated, name, on); return [name, on ? "ON" : "OFF", a.totals.confidentlyWrong, a.totals.caughtByAsk, a.totals.unnecessaryAsk];
    }))), "", "## Authored word fixtures", "",
    table(["Fixture", "Configuration", "Run", "Outcome"], fixtureRows.filter((row) => special.some((f) => f.id === row.id)).map((row) => [row.id, row.configuration, row.run,
      row.payload?.reply ? specialOutcome(special.find((f) => f.id === row.id), row.payload.reply) ? "pass" : "fail" : row.outcome])), "",
    "## False insertions", "",
    table(["Configuration", "Fixture failures", "Recording suspects"], configNames.map((name) => [name,
      fixtureRows.filter((row) => row.configuration === name && Object.hasOwn(ideal, row.id) && (!row.payload?.reply ||
        falseInsertions(row.payload.reply, ideal[row.id]).extra.length)).length,
      sum(evaluated.filter((item) => item.row.configuration === name), (item) => item.suspects.length)])), "",
  ];
  sections.push("## Baseten authored comparison", "", `Baseten: ${manifest?.baseten ? "included" : "skipped or not run"}. Requested model meta-models/muse-spark-open-1026, effort low, at https://inference.baseten.co/v1.`, "",
    table(["Fixture", "Provider", "Outcome", "CW", "Caught", "Unnecessary", "JSON failure", "Milliseconds", "Input tokens", "Output tokens"],
    basetenPlans().flatMap((plan) => [["meta", fixtureRows.find((row) => row.id === plan.id && row.configuration === "A" && row.run === 1)],
      ["baseten", baseRows.find((row) => row.id === plan.id)]].map(([provider, row]) => {
      const score = row?.payload?.reply && old[plan.id] ? scoreNote(legacyExpected(plan.id, old[plan.id]), row.payload.reply) : null;
      const wordCheck = row?.payload?.reply && special.find((f) => f.id === plan.id);
      return [plan.id, provider, !row ? "missing" : wordCheck ? specialOutcome(wordCheck, row.payload.reply) ? "pass" : "fail" : row.outcome,
        score?.totals.confidentlyWrong ?? null, score?.totals.caughtByAsk ?? null, score?.totals.unnecessaryAsk ?? null,
        row ? Number(isJsonFailure(row)) : null, row?.timings.callMs, row?.tokens.input, row?.tokens.output];
    }))), "", "## Baseten simulated ranking comparison", "",
    table(["Input", "Provider", "Ranking", "Guard changes", "JSON failure", "Milliseconds", "Input tokens", "Output tokens"], rankRows.flatMap((row) => {
      const payload = row.payload;
      const ranking = (value) => value?.sources?.map((source) => source.sourceId).join(", ") || "unavailable";
      return [[row.id, "meta", ranking(payload?.original?.ranking), payload?.original?.dropCounts ? Object.values(payload.original.dropCounts).reduce((a, b) => a + b, 0) : null,
        payload?.original?.dropCounts?.invalidJson, payload?.original?.ms, payload?.original?.tokens?.input, payload?.original?.tokens?.output],
      [row.id, "baseten", ranking(payload?.ranking), payload?.dropCounts ? Object.values(payload.dropCounts).reduce((a, b) => a + b, 0) : null,
        Number(isJsonFailure(row)), row.timings.callMs, row.tokens.input, row.tokens.output]];
    })), "", "Baseten's published Muse Spark Open schema format is not enforced by its server. The dated slug is requested exactly. No recording or recording-derived transcript is sent there.");
  const decision = recommendations(evaluated, fixtureRows, repeats);
  sections.push("", "## Recommendations for review", "", `Prompt and keywords: ${decision.prompt}. Effort: ${decision.effort}. Audio ear: ${decision.audioEar}. Rule: ${decision.rule}.`,
    decision.comparison, "Meta documents incomplete Spark 1.3 audio support.",
    `Rule: ${decision.turned} confidently wrong fields caught; ${decision.asksAdded} unnecessary asks added across ${decision.cards} cards.`,
    "```json", JSON.stringify({prompt:decision.promptChecks, effort:decision.effortChecks, audio:decision.audioChecks}, null, 2), "```", "",
    "## Completion", "", missing.length ? missing.map((item) => `- ${item}`).join("\n") : "Every expected logical result is present.", "");
  const markdown = sections.join("\n");
  assertPublic({markdown});
  if (write) {
    const path = join(root, "docs", "provenance", "scoring", "scorecard-recordings.md");
    mkdirSync(dirname(path), {recursive:true}); writeFileSync(path, markdown);
  }
  for (const item of evaluated) {
    print(`${item.row.id} ${item.row.configuration} run ${item.row.run}: ${item.row.outcome}`);
    if (!item.score) continue;
    const expected = correctionsFor(recordings.recordings.find((r) => r.id === item.row.id), local);
    print(JSON.stringify({expected:expected.expectedCards, produced:item.row.payload.reply.cards, outcomes:item.score,
      suspects:item.suspects, capitalisedWords:item.capitals, markers:item.markers}));
    const oldVoice = evaluated.find((other) => other.row.id === item.row.id && other.row.run === item.row.run && other.row.configuration === "Baseline")?.row.ears.voice?.transcript || "";
    const newVoice = item.row.ears.voice?.transcript || "";
    print(JSON.stringify({newVoiceSuspects:TERMS.filter((term) => wholeWord(newVoice, term) && !wholeWord(oldVoice, term) && !wholeWord(ideal[item.row.id], term))}));
    if (TERMS.some((term) => wholeWord(ideal[item.row.id], term) || Object.values(item.row.ears).some((ear) => wholeWord(ear.transcript, term)))) {
      for (const [ear, value] of Object.entries(item.row.ears)) print(JSON.stringify({ear, phrases:earExcerpts(value.transcript),
        ...(!earExcerpts(value.transcript).length ? {transcript:value.transcript || ""} : {})}));
    }
  }
  print(markdown); print(JSON.stringify({missing, recommendations:decision, historicalBaseline:baseline.legacyHash}));
  return {markdown, missing, decision, evaluated};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {const local = readCorrections(ROOT); requireListened(local); generateReport({local});}
  catch {console.error("Offline report could not finish; check the listening gate and local saved-record format. No network calls were made."); process.exitCode = 1;}
}
