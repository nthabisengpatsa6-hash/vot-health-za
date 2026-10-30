import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {aggregate, evaluateRecord, generateReport, median, table} from "./score-report.mjs";
import {A2, revisionPaths, revisionTextPlans, revisionBasetenPlans} from "./lib/noteRevision.mjs";
import {ideal, special, readCorrections, requireListened} from "./lib/notePlans.mjs";
import {assertPublic, paths, readLines} from "./lib/noteArtifacts.mjs";
import {falseInsertions, specialOutcome, scoreNote, legacyExpected} from "./lib/noteScoring.mjs";
import expected from "../test-fixtures/expected-cards.json" with {type:"json"};
import {authoredComparison, outcomeVariation, cardTimings} from "./lib/revisionComparison.mjs";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const unique = (rows) => [...new Map(rows.map((row) => [row.callId, row])).values()];

export function revisionDecision(original, evaluated, fixtureRows) {
  const stats = aggregate(evaluated, "A2"), base = aggregate(original.evaluated, "Baseline"), amin = aggregate(original.evaluated, "A-min");
  const current = fixtureRows.filter((row) => row.extractionHash === A2.extractionHash);
  const specialRows = current.filter((row) => special.some((item) => item.id === row.id));
  const existing = current.filter((row) => Object.hasOwn(ideal, row.id));
  const fixturesComplete = current.length === 19 && current.every((row) => row.outcome === "ok" && row.payload?.reply);
  const specialPass = specialRows.length === 9 && specialRows.every((row) => row.payload?.reply && specialOutcome(special.find((item) => item.id === row.id), row.payload.reply));
  const insertionClear = existing.length === 10 && existing.every((row) => row.payload?.reply && !falseInsertions(row.payload.reply, ideal[row.id]).extra.length);
  const consistentRuns = Object.keys(stats.perRun).filter((run) => base.perRun[run] && stats.perRun[run].confidentlyWrong <= base.perRun[run].confidentlyWrong).length;
  const gate = stats.valid === 30 && base.valid === 30 && fixturesComplete && specialPass && insertionClear && stats.totals.confidentlyWrong <= base.totals.confidentlyWrong && consistentRuns >= 2;
  // Fallback A means the A prompt at the chosen minimal effort: A-min.
  const aRows = readLines(paths(original.root || ROOT).fixtures).filter((row) => row.configuration === "A" && Object.hasOwn(ideal, row.id));
  const aClear = aRows.length === 10 && aRows.every((row) => row.payload?.reply && !falseInsertions(row.payload.reply, ideal[row.id]).extra.length);
  const eligible = [
    {configuration:"A-min", prompt:"A", cw:amin.totals.confidentlyWrong, eligible:amin.valid === 30 && aClear && amin.totals.confidentlyWrong < base.totals.confidentlyWrong},
    {configuration:"A2", prompt:"A2", cw:stats.totals.confidentlyWrong, eligible:stats.valid === 30 && fixturesComplete && insertionClear && stats.totals.confidentlyWrong < base.totals.confidentlyWrong},
  ].filter((item) => item.eligible).sort((a, b) => a.cw - b.cw); // A-min wins a tie.
  const complete = stats.rows === 30 && base.valid === 30 && current.length === 19;
  const chosen = !complete ? {configuration:null, prompt:null} : gate ? {configuration:"A2", prompt:"A2"} : eligible[0] || {configuration:null, prompt:null};
  return {gate, complete, recommendation:!complete ? "pending; complete all A2 results before choosing a prompt" : gate ? "recommend A2; gate met" : chosen.prompt ? `recommend fallback prompt ${chosen.prompt} at 1.2 minimal` : "hold; no complete eligible candidate",
    ...chosen, audioModel:"muse-spark-1.2", audioEffort:"minimal", uncertainWords:false,
    knownLimitation:complete && !gate ? "fat cook isn't reliably fixed." : null,
    checks:{resultsCollected:complete, recordingsComplete:stats.valid === 30, fixturesComplete, specialPass, insertionClear, baselineCW:base.totals.confidentlyWrong,
      aMinCW:amin.totals.confidentlyWrong, a2CW:stats.totals.confidentlyWrong, consistentRuns}};
}
export function generateRevisionReport({root = ROOT, local, print = console.log, write = true, showLocal = false} = {}) {
  local ||= readCorrections(root);
  const original = {...generateReport({root, local, print:()=>{}, write:false}), root};
  const p = revisionPaths(root), bp = revisionPaths(root, "baseten");
  const rows = unique(readLines(p.private)), fixtures = unique(readLines(p.fixtures)).filter((row) => row.extractionHash === A2.extractionHash);
  const evaluated = rows.filter((row) => row.stage === "pipeline" && row.configurationHash === A2.configurationHash).map((row) => evaluateRecord(row, local));
  const baseFixtures = unique(readLines(p.baseten)).filter((row) => row.extractionHash === A2.extractionHash), rankings = unique(readLines(p.rankings));
  const probe = readLines(bp.private).filter((row) => row.stage === "slug-check").at(-1);
  const missing = [];
  for (let n = 1; n <= 10; n++) for (let run = 1; run <= 3; run++) {
    const id = `n${String(n).padStart(2, "0")}`;
    if (!evaluated.some((item) => item.row.id === id && item.row.run === run)) missing.push(`A2/${id}/${run}`);
  }
  for (const plan of revisionTextPlans()) if (!fixtures.some((row) => row.id === plan.id && row.run === plan.run)) missing.push(`A2/fixture/${plan.id}/${plan.run}`);
  if (probe?.outcome === "ok") {
    for (const plan of revisionBasetenPlans()) if (!baseFixtures.some((row) => row.id === plan.id)) missing.push(`baseten/fixture/${plan.id}`);
    for (const seed of [1, 2, 4, 5, 8, 9]) if (!rankings.some((row) => row.id === `seed-${seed}`)) missing.push(`baseten/ranking/${seed}`);
  }
  const decision = revisionDecision(original, evaluated, fixtures);
  const unavailable = [...rows, ...fixtures, ...baseFixtures, ...rankings, ...(probe ? [probe] : [])].filter((row) => row.outcome && row.outcome !== "ok");
  const metaCalls = [...rows.filter((row) => row.stage === "card"), ...fixtures];
  const ledger = readLines(p.ledger), metaIds = new Set(metaCalls.map((row) => row.callId));
  const baseIds = new Set([...baseFixtures, ...rankings, ...(probe ? [probe] : [])].map((row) => row.callId));
  const configs = ["Baseline", "A", "A-min", "A2"], all = [...original.evaluated, ...evaluated];
  const sections = ["# A2 card-only scoring", "", "10 recordings; 10 expected cards; three runs. Recording-derived values and excerpts never appear here.",
    `Candidate extraction hash: ${A2.extractionHash}. Source ears: saved A-min, muse-spark-1.2 minimal and Voice with 53 keywords. New ear calls: zero. Rule off.`,
    `Local corrected expected fields: ${Object.values(local.corrections || {}).reduce((n, row) => n + Object.keys(row).length, 0)}. Missing logical results: ${missing.length}.`, "",
    "## Call provenance", "", table(["Provider", "Model", "Effort", "Extraction hash", "Git commit", "Dirty"],
      [...new Map([...metaCalls, ...baseFixtures, ...rankings, ...(probe ? [probe] : [])].map((row) => [JSON.stringify([row.provider, row.model, row.effort, row.extractionHash, row.gitCommit, row.dirty]), row])).values()]
        .map((row) => [row.provider, row.model, row.effort, row.extractionHash, row.gitCommit, row.dirty])),
    "The dirty flag describes the whole working tree; a dirty-file list was not captured by the runner.", "",
    "## Revision records and recorded cost", "", table(["Provider", "Planned logical calls", "Saved call records", "Successful", "Unavailable", "Recorded USD"],
      [["meta", 49, metaCalls.length, metaCalls.filter((row) => row.outcome === "ok").length, metaCalls.filter((row) => row.outcome !== "ok").length, ledger.filter((row) => metaIds.has(row.callId)).reduce((sum, row) => sum + (row.usd || 0), 0)],
        ["baseten", 15, baseIds.size, [...baseFixtures, ...rankings, ...(probe ? [probe] : [])].filter((row) => row.outcome === "ok").length, [...baseFixtures, ...rankings, ...(probe ? [probe] : [])].filter((row) => row.outcome !== "ok").length, ledger.filter((row) => baseIds.has(row.callId)).reduce((sum, row) => sum + (row.usd || 0), 0)]]),
    `Derived pipeline summaries: ${evaluated.length}; these are not extra calls. Shared-ledger recorded total USD ${ledger.reduce((sum, row) => sum + (row.usd || 0), 0).toFixed(6)}. Successful responses with missing usage pause the runner.`, "",
    `Meta runner saved counter: ${metaCalls.length + evaluated.length} = ${metaCalls.length} call records + ${evaluated.length} derived pipeline summaries.`,
    ...(probe ? [`Baseten runner saved counter: ${fixtures.length + baseIds.size} = ${fixtures.length} previously saved Meta authored reference records + ${baseIds.size} Baseten call records. The separate Baseten log duplicates metadata for its ${baseIds.size} calls; it adds no calls.`] : []), "",
    "## Recording outcome totals", "", table(["Configuration", "Valid pipelines", "CW", "Caught", "Unnecessary", "Missed", "Extra", "Extra cards", "Missing cards", "Name leaks", "JSON failures"], configs.map((name) => {
      const stats = aggregate(all, name); return [name, stats.valid, ...Object.values(stats.totals)];
    })), "", "## Field outcome variation across runs", "", table(["Configuration", "Fields with differing outcomes"], configs.map((name) => [name, outcomeVariation(all, name)])),
    "Counts compare outcome labels for each recording/card/field across repeats; they do not reveal field values.", "",
    "## n05 key-term outcomes", "", table(["Run", "Key term 1", "Key term 2"], evaluated.filter((item) => item.row.id === "n05").map((item) => [item.row.run,
      ...[1, 2].map((index) => item.score?.fields.find((field) => field.field === `exposureKeyTerms:${index}`)?.outcome || "unavailable")])),
    "", "## Per-recording outcomes", "", table(["Recording", "Card", "Field", "Run", "Outcome"], evaluated.flatMap((item) => item.score ?
      item.score.fields.map((field) => [item.row.id, field.card, field.field, item.row.run, field.outcome]) : [[item.row.id, "none", "pipeline", item.row.run, item.row.outcome]])), "",
    "## Card-step timing only", "", "The A2 ears are reused: no new conversion, Voice, audio-ear, both-ears or end-to-end timing is claimed.", "",
    table(["Configuration", "Run", "Samples", "Median milliseconds", "Maximum milliseconds"], ["A-min", "A2"].flatMap((name) => [undefined, 1, 2, 3].map((run) => {
      const values = cardTimings(all, name, run);
      return [name, run ?? "all", values.length, median(values), values.length ? Math.max(...values) : null];
    }))), "", "## Authored special fixtures", "", table(["Fixture", "Run", "Outcome"], fixtures.filter((row) => special.some((item) => item.id === row.id)).map((row) => [row.id, row.run,
      row.payload?.reply ? specialOutcome(special.find((item) => item.id === row.id), row.payload.reply) ? "pass" : "fail" : row.outcome])), "",
    "## Existing authored fixtures", "", table(["Fixture", "Outcome", "Listed-word insertion failure"], fixtures.filter((row) => Object.hasOwn(ideal, row.id)).map((row) => [row.id, row.outcome,
      row.payload?.reply ? Boolean(falseInsertions(row.payload.reply, ideal[row.id]).extra.length) : "unavailable"])), "",
    "## A2 checks and marker counts", "", table(["Recording", "Run", "Cards", "Count check", "Names check", "Transcript name count", "Condition check", "Advice flag check", "Advice check", "Markers found", "Mapped", "Unmapped", "Recording suspects", "Capital suspects"], evaluated.map((item) => [item.row.id, item.row.run, item.row.payload?.reply?.cards?.length ?? 0,
      ...["cardCount", "names", "transcriptNames", "notifiable", "adviceRequested", "advice"].map((key) => item.score?.checks[key] ?? "unavailable"), item.markers.found, item.markers.mapped, item.markers.unmapped, item.suspects.length, item.capitals.length])), "",
    "## Baseten", "", !probe ? "Not run." : `Exact example probe: ${probe.outcome}; HTTP ${probe.failure?.status ?? "200"}; attempts ${probe.attempts}. No reasoning text is retained.`, "",
    table(["Fixture", "Provider", "Outcome", "CW", "Caught", "Unnecessary", "Extra cards", "Missing cards", "JSON failure", "Schema failure", "Milliseconds", "Input tokens", "Output tokens including reasoning", "Reasoning tokens"], revisionBasetenPlans().flatMap((plan) => [["meta", fixtures.find((row) => row.id === plan.id && row.run === 1)], ["baseten", baseFixtures.find((row) => row.id === plan.id)]].map(([provider, row]) => {
      const score = row?.payload?.reply && expected[plan.id] ? scoreNote(legacyExpected(plan.id, expected[plan.id]), row.payload.reply) : null;
      const word = special.find((item) => item.id === plan.id);
      return [plan.id, provider, !row ? probe?.failure ? "skipped" : "missing" : word && row.payload?.reply ? specialOutcome(word, row.payload.reply) ? "pass" : "fail" : row.outcome,
        score?.totals.confidentlyWrong, score?.totals.caughtByAsk, score?.totals.unnecessaryAsk, score?.totals.extraCards, score?.totals.missingCards, row ? row.outcome === "bad-reply" : null, row ? row.outcome === "schema" : null,
        row?.timings?.callMs, row?.tokens?.input, row?.tokens?.output, row?.tokens?.reasoning];
    }))), "", "## Authored field outcome comparison", "", "Meta uses muse-spark-1.3 low with A2, run 1. Special fixtures use only their explicit authored assertions; other fields have no expectations and are not scored.", "",
    table(["Fixture", "Card", "Field", "Meta outcome", "Baseten outcome"], revisionBasetenPlans().flatMap((plan) => authoredComparison(plan.id,
      fixtures.find((row) => row.id === plan.id && row.run === 1)?.payload?.reply, baseFixtures.find((row) => row.id === plan.id)?.payload?.reply)
      .map((field) => [field.id, field.card, field.field, field.meta, field.baseten]))),
    "", "## Baseten frozen-ranking comparison", "", table(["Input", "Provider", "Top source", "Source order", "Guard changes", "Guard counts", "Milliseconds", "Input tokens", "Output tokens including reasoning", "Reasoning tokens"], rankings.flatMap((row) => {
      const payload = row.payload, order = (ranking) => ranking?.sources?.map((source) => source.sourceId).join(", ") || "unavailable";
      const drops = (value) => value ? Object.values(value).reduce((n, count) => n + count, 0) : null;
      return [[row.id, "meta", payload?.original?.ranking?.sources?.[0]?.sourceId, order(payload?.original?.ranking), drops(payload?.original?.dropCounts), JSON.stringify(payload?.original?.dropCounts), payload?.original?.ms, payload?.original?.tokens?.input, payload?.original?.tokens?.output, payload?.original?.tokens?.reasoning],
        [row.id, "baseten", payload?.ranking?.sources?.[0]?.sourceId, order(payload?.ranking), drops(payload?.dropCounts), JSON.stringify(payload?.dropCounts), row.timings.callMs, row.tokens.input, row.tokens.output, row.tokens.reasoning]];
    })), "", "## Recommendation for review", "", decision.recommendation, decision.knownLimitation || (decision.gate ? "All requested gate checks met." : "The gate remains pending."),
    "Fallback compares A-min (A prompt at the chosen minimal effort) with A2. A-min wins an exact CW tie. Production settings remain unchanged until separately approved.",
    "```json", JSON.stringify(decision.checks, null, 2), "```", "", "## Unavailable records", "", table(["ID", "Run", "Provider", "Stage", "Outcome", "HTTP status"], unavailable.map((row) => [row.id, row.run, row.provider, row.stage, row.outcome, row.failure?.status])), "",
    "## Missing results", "", missing.length ? missing.map((item) => `- ${item}`).join("\n") : "No missing logical results.", ""];
  const markdown = sections.join("\n"); assertPublic({markdown});
  if (write) {const dir = join(root, "docs", "provenance", "scoring"); mkdirSync(dir, {recursive:true}); writeFileSync(join(dir, "scorecard-a2.md"), markdown);}
  if (showLocal) for (const item of evaluated) print(JSON.stringify({id:item.row.id, run:item.row.run, reply:item.row.payload?.reply, ears:item.row.ears, suspects:item.suspects, capitals:item.capitals}));
  print(markdown); print(JSON.stringify({decision, missing}));
  return {markdown, decision, missing, evaluated};
}
export function main(args = process.argv.slice(2)) {
  if (args.some((arg) => arg !== "--local")) throw new Error("Only --local is supported for private details in the user's terminal.");
  const local = readCorrections(ROOT); requireListened(local); generateRevisionReport({local, showLocal:args.includes("--local")});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {main();} catch {console.error("A2 report could not finish; check local saved records. No network calls were made."); process.exitCode = 1;}
}
