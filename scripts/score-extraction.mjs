// Scores case card extraction against the made-up expected cards in
// test-fixtures/.
//   --stage text   each ideal transcript is given as BOTH transcripts, which
//                  tests the extraction step alone, with no audio.
//   --stage audio  each 24 kHz WAV in test-audio/wav/ that has an expected
//                  card goes through both ears for real, then extraction.
// Prints a pass/fail table per note and field, the overall pass rate, and
// the questions asked per card, with "extra questions" (fields marked unsure
// that the expected card is confident about), because too many questions
// will annoy nurses, and "confident wrong" fields (wrong values the card
// doesn't flag as unsure), the most dangerous kind of error. Full results,
// transcripts included, go to test-audio/results/ (gitignored).
//
// Usage: node scripts/score-extraction.mjs --stage text --repeat 3 --effort low [--concurrency 5] [--notes n01,n04]
//        node scripts/score-extraction.mjs --stage audio --audio-model both --effort low [--repeat 1]
//        node scripts/score-extraction.mjs --rescore test-audio/results/score-001-results.json
// Needs META_API_KEY set for this terminal session, except with --rescore,
// which makes no API calls. The key is never printed.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PLACE_KEYWORDS } from "../functions/lib/cardSchema.js";
import { extractCard } from "../functions/lib/extractCard.js";
import { transcribeWithSpark } from "../functions/lib/sparkAudio.js";
import { transcribeWav } from "../functions/lib/transcribe.js";
import { listenWithTwoEars } from "../functions/lib/twoEars.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const wavDir = join(root, "test-audio", "wav");
const resultsDir = join(root, "test-audio", "results");

// Meta's Standard-mode prices (dev.meta.ai/docs/pricing-rate-limits, 27 Oct),
// for a rough cost line only.
const USD_PER_MILLION = { input: 1.25, output: 4.25 };
const AUDIO_MODELS = { "1.2": ["muse-spark-1.2"], "1.3": ["muse-spark-1.3"], both: ["muse-spark-1.2", "muse-spark-1.3"] };
const EFFORTS = ["minimal", "low", "medium", "high"];

const { values } = parseArgs({
  options: {
    stage: { type: "string" },
    effort: { type: "string", default: "low" },
    repeat: { type: "string", default: "1" },
    "audio-model": { type: "string", default: "1.2" },
    concurrency: { type: "string", default: "5" },
    notes: { type: "string", default: "" },
    rescore: { type: "string", default: "" },
  },
});

function fail(message) {
  console.error(message);
  process.exit(1);
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
// --rescore scores a saved results file against the current fixtures, with
// no API calls: after an expected answer is corrected, it shows how much of
// a score change came from the fixtures rather than from the prompt.
const saved = values.rescore ? readJson(values.rescore) : null;

const stage = saved ? saved.settings.stage : values.stage;
if (stage !== "text" && stage !== "audio") fail('Choose --stage text or --stage audio.');
const effort = saved ? saved.settings.effort : values.effort;
if (!EFFORTS.includes(effort)) fail(`--effort must be one of: ${EFFORTS.join(", ")}.`);
const repeat = saved ? saved.settings.repeat : Number(values.repeat);
if (!Number.isInteger(repeat) || repeat < 1 || repeat > 20) fail("--repeat must be a whole number from 1 to 20.");
const audioModels = saved ? (saved.settings.audioModels ?? []) : (AUDIO_MODELS[values["audio-model"]] ?? fail("--audio-model must be 1.2, 1.3 or both."));
// Stage 2 runs one note at a time so its latencies measure single requests.
const concurrency = stage === "audio" ? 1 : Number(values.concurrency);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) fail("--concurrency must be a whole number from 1 to 10.");

const apiKey = process.env.META_API_KEY;
if (!saved) {
  if (!apiKey) fail("META_API_KEY isn't set for this terminal session.");
  // A key never contains whitespace. If this one does, whatever loaded it
  // printed something extra, so stop rather than send a broken header.
  if (/\s/.test(apiKey)) fail("META_API_KEY looks wrong (it contains spaces or line breaks), so it won't be used.");
}

const ideal = readJson(join(root, "test-fixtures", "ideal-transcripts.json"));
const expected = readJson(join(root, "test-fixtures", "expected-cards.json"));

const list = (text) => text.split(",").map((item) => item.trim()).filter(Boolean);
let notes;
if (saved) notes = saved.settings.notes.filter((note) => expected[note]);
else notes = stage === "text" ? Object.keys(ideal).filter((note) => expected[note]) : listWavNotes();
const wanted = list(values.notes);
if (wanted.length > 0) notes = notes.filter((note) => wanted.includes(note));
if (notes.length === 0) fail(stage === "text" ? "No ideal transcripts match." : "No 24 kHz WAV in test-audio/wav/ has an expected card.");

function listWavNotes() {
  let files = [];
  try {
    files = readdirSync(wavDir);
  } catch {
    // A missing folder means there is nothing to score.
  }
  return files.filter((name) => name.endsWith("-24k.wav")).map((name) => name.slice(0, -"-24k.wav".length)).filter((note) => expected[note]).sort();
}

function describe(err) {
  if (!err) return null;
  return `${err.kind ?? "error"}${err.status ? ` ${err.status}` : ""}: ${err.message}`;
}

function earSummary(result) {
  if (!result) return null;
  const detail = (result.ok ? result.value : result.error) ?? {};
  return { ok: result.ok, ms: result.ms, attempts: detail.attempts ?? null, failure: result.ok ? null : describe(result.error) };
}

async function textJob(note, run) {
  const transcript = ideal[note];
  const started = performance.now();
  try {
    const result = await extractCard({ transcriptA: transcript, transcriptB: transcript }, { apiKey, effort });
    return { note, run, output: { ...result.reply, singleSource: false }, timings: { extractionMs: result.latencyMs, extractionAttempts: result.attempts }, usage: [result.usage] };
  } catch (err) {
    return { note, run, error: describe(err), timings: { extractionMs: Math.round(performance.now() - started) } };
  }
}

async function audioJob(note, model, run) {
  const wav = readFileSync(join(wavDir, `${note}-24k.wav`));
  const started = performance.now();
  const row = { note, model, run, timings: {} };
  try {
    const heard = await listenWithTwoEars({
      voice: (signal) => transcribeWav(wav, { apiKey, keywords: PLACE_KEYWORDS, signal }),
      spark: (signal) => transcribeWithSpark(wav, { apiKey, model, signal }),
    });
    const { voice, spark } = heard.ears;
    Object.assign(row.timings, { voiceMs: voice.ms, sparkMs: spark.ms, earsMs: heard.totalMs });
    row.ears = { voice: earSummary(voice), spark: earSummary(spark) };
    row.transcripts = { a: voice.ok ? voice.value.transcript : null, b: spark.ok ? spark.value.transcript : null };
    const result = await extractCard({ transcriptA: row.transcripts.a, transcriptB: row.transcripts.b }, { apiKey, effort });
    row.timings.extractionMs = result.latencyMs;
    row.output = { ...result.reply, singleSource: heard.singleSource };
    row.usage = [spark.ok ? spark.value.usage : null, result.usage];
  } catch (err) {
    row.error = describe(err);
    if (err.ears) row.ears = { voice: earSummary(err.ears.voice), spark: earSummary(err.ears.spark) };
  }
  row.timings.totalMs = Math.round(performance.now() - started);
  return row;
}

// A small worker pool, so Stage 1 finishes in minutes rather than a quarter
// of an hour, without flooding the API.
async function runPool(jobs, limit) {
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      results[index] = await jobs[index]();
      process.stdout.write(".");
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  process.stdout.write("\n");
  return results;
}

const FIELDS = { g: "symptomGroup", n: "caseCount", u: "comparedWithUsual", age: "ageGroup", area: "area", onset: "onset" };
const show = (value) => value === undefined ? "missing" : JSON.stringify(value);

function wholeWord(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu").test(text);
}

// Pairs each expected card with an output card: the same symptom group
// first, otherwise whatever is left, in order.
function pairCards(wantCards, gotCards) {
  const unused = gotCards.map((card, index) => index);
  return wantCards.map((want) => {
    let index = unused.find((i) => gotCards[i].symptomGroup === want.g);
    if (index === undefined) index = unused[0];
    if (index === undefined) return null;
    unused.splice(unused.indexOf(index), 1);
    return gotCards[index];
  });
}

function scoreNote(want, got) {
  const checks = [];
  // A failed top-level check is always confident wrong: a card can't mark
  // isReport, the card count, the notifiable condition, the advice flag or
  // a leaked name as unsure, so nobody would be asked about it.
  const check = (field, pass, wantValue, gotValue, confidentWrong = !pass) => checks.push({ field, pass, confidentWrong, want: show(wantValue), got: show(gotValue) });
  const cards = Array.isArray(got.cards) ? got.cards : [];
  const condition = got.notifiableConditionMentioned ?? null;

  check("isReport", got.isReport === want.isReport, want.isReport, got.isReport);
  check("cardCount", cards.length === want.cards.length, want.cards.length, cards.length);
  check("notifiable", want.notifiable ? (condition ?? "").toLowerCase().includes(want.notifiable.toLowerCase()) : condition === null, want.notifiable ?? null, condition);
  check("adviceRequested", got.adviceRequested === Boolean(want.adviceRequested), Boolean(want.adviceRequested), got.adviceRequested);
  if (want.namesAbsent) {
    const leaked = want.namesAbsent.filter((name) => wholeWord(JSON.stringify(got), name));
    check("namesAbsent", leaked.length === 0, [], leaked);
  }

  const extraQuestions = [];
  const paired = pairCards(want.cards, cards);
  want.cards.forEach((wantCard, i) => {
    const prefix = want.cards.length > 1 ? `card${i + 1}.` : "";
    const card = paired[i];
    const unsure = card?.unsureFields ?? [];
    // Confident wrong on a card: a wrong value the card doesn't flag as
    // unsure. A missing card counts once, through the card count.
    const flagged = (field) => !card || unsure.includes(field);
    for (const [key, field] of Object.entries(FIELDS)) {
      if (!(key in wantCard)) continue;
      const pass = card ? card[field] === wantCard[key] : false;
      check(prefix + field, pass, wantCard[key], card ? card[field] : "no card", !pass && !flagged(field));
    }
    if ("exp" in wantCard) {
      const types = card ? [...(card.exposure?.types ?? [])].sort() : null;
      const pass = card !== null && JSON.stringify(types) === JSON.stringify([...wantCard.exp].sort());
      check(prefix + "exposure", pass, wantCard.exp, types ?? "no card", !pass && !flagged("exposure"));
    }
    for (const flag of wantCard.obs ?? []) {
      const pass = card?.observations?.[flag] === true;
      check(`${prefix}obs.${flag}`, pass, true, card ? card.observations?.[flag] : "no card", !pass && !flagged("observations"));
    }
    // A field that must be asked but was filled in without a question is
    // confident wrong too.
    for (const field of wantCard.ask ?? []) {
      const pass = unsure.includes(field);
      check(`${prefix}ask.${field}`, pass, "unsure", card ? (pass ? "unsure" : card[field]) : "no card", !pass && Boolean(card) && card[field] !== null && card[field] !== undefined);
    }
    // Over-asking: fields marked unsure that the expected card is confident
    // about. Only fields the expected card states count as confident.
    if (card) {
      const confident = new Set(Object.entries(FIELDS).filter(([key]) => key in wantCard).map(([, field]) => field));
      if ("exp" in wantCard) confident.add("exposure");
      if ((wantCard.obs ?? []).length > 0) confident.add("observations");
      for (const field of wantCard.ask ?? []) confident.delete(field);
      extraQuestions.push(...unsure.filter((field) => confident.has(field)).map((field) => prefix + field));
    }
  });
  const questions = cards.reduce((sum, card) => sum + (card.questions?.length ?? 0), 0);
  const confidentWrong = checks.filter((item) => item.confidentWrong).map((item) => item.field);
  return { checks, extraQuestions, questions, cards: cards.length, confidentWrong };
}

// --- Run ---------------------------------------------------------------------

const jobs = [];
for (let run = 1; run <= repeat && !saved; run += 1) {
  for (const note of notes) {
    if (stage === "text") jobs.push(() => textJob(note, run));
    else for (const model of audioModels) jobs.push(() => audioJob(note, model, run));
  }
}
const stageLabel = `Stage ${stage === "text" ? "1 (text)" : `2 (audio, ${audioModels.join(" and ")})`}`;
if (saved) console.log(`Re-scoring ${values.rescore} (${stageLabel}, effort ${effort}, run at ${saved.ranAt}) against the current fixtures. No API calls.`);
else console.log(`${stageLabel}: ${notes.length} notes x ${repeat} repeat(s), effort ${effort}, ${jobs.length} jobs, concurrency ${concurrency}.`);
const started = performance.now();
const rows = saved ?
  saved.rows.filter((row) => notes.includes(row.note)).map((row) => ({ ...row, score: undefined })) :
  await runPool(jobs, concurrency);
const wallMs = Math.round(performance.now() - started);

// --- Score -------------------------------------------------------------------

const groupOf = (row) => row.model ? `${row.model} | ${row.note}` : row.note;
const fieldStats = new Map();
const noteStats = new Map();
let passed = 0;
let total = 0;
let questionTotal = 0;
let cardTotal = 0;
let confidentWrongTotal = 0;

for (const row of rows) {
  const want = expected[row.note];
  const scored = row.output ? scoreNote(want, row.output) : null;
  row.score = scored;
  const group = groupOf(row);
  const stats = noteStats.get(group) ?? { group, passed: 0, total: 0, questions: 0, cards: 0, extra: [], confidentWrong: [], errors: 0, singleSource: 0, disagreements: 0 };
  noteStats.set(group, stats);
  if (!scored) {
    stats.errors += 1;
    continue;
  }
  for (const item of scored.checks) {
    const key = `${group} | ${item.field}`;
    const field = fieldStats.get(key) ?? { group, field: item.field, want: item.want, passed: 0, total: 0, confidentWrong: 0, gotWhenFailed: new Set() };
    fieldStats.set(key, field);
    field.total += 1;
    if (item.confidentWrong) field.confidentWrong += 1;
    total += 1;
    stats.total += 1;
    if (item.pass) {
      field.passed += 1;
      passed += 1;
      stats.passed += 1;
    } else {
      field.gotWhenFailed.add(item.got);
    }
  }
  stats.questions += scored.questions;
  stats.cards += scored.cards;
  stats.extra.push(...scored.extraQuestions);
  stats.confidentWrong.push(...scored.confidentWrong);
  confidentWrongTotal += scored.confidentWrong.length;
  if (row.output.singleSource) stats.singleSource += 1;
  stats.disagreements += row.output.disagreements?.length ?? 0;
  questionTotal += scored.questions;
  cardTotal += scored.cards;
}
// Errored rows count every check they would have had as a failure.
for (const row of rows.filter((item) => !item.output)) {
  const want = expected[row.note];
  const missing = scoreNote(want, { isReport: null, cards: [], adviceRequested: null, notifiableConditionMentioned: undefined }).checks.length;
  total += missing;
  noteStats.get(groupOf(row)).total += missing;
}

const percent = (a, b) => b === 0 ? "n/a" : `${(100 * a / b).toFixed(1)}%`;
const expectedAsks = notes.flatMap((note) => expected[note].cards).reduce((sum, card) => sum + (card.ask?.length ?? 0), 0);
const expectedCards = notes.flatMap((note) => expected[note].cards).length;
const countList = (items) => Object.entries(items.reduce((counts, item) => ({ ...counts, [item]: (counts[item] ?? 0) + 1 }), {})).map(([item, count]) => `${item} x${count}`).join(", ");

const fieldRows = [...fieldStats.values()].map((field) => ({
  note: field.group,
  field: field.field,
  want: field.want,
  passed: `${field.passed}/${field.total}`,
  "confident wrong": field.confidentWrong || "",
  "got (when failed)": [...field.gotWhenFailed].join(" ; "),
}));
const noteRows = [...noteStats.values()].map((stats) => ({
  note: stats.group,
  score: percent(stats.passed, stats.total),
  cards: stats.cards,
  "questions/card": stats.cards ? (stats.questions / stats.cards).toFixed(2) : "",
  "extra questions": countList(stats.extra),
  "confident wrong": countList(stats.confidentWrong),
  ...(stage === "audio" ? { "single source": stats.singleSource, disagreements: stats.disagreements } : {}),
  errors: stats.errors || "",
}));

const usage = rows.flatMap((row) => row.usage ?? []).filter(Boolean);
const tokens = usage.reduce((sum, item) => ({ input: sum.input + (item.prompt_tokens ?? 0), output: sum.output + (item.completion_tokens ?? 0), reasoning: sum.reasoning + (item.completion_tokens_details?.reasoning_tokens ?? 0) }), { input: 0, output: 0, reasoning: 0 });
const costUsd = (tokens.input * USD_PER_MILLION.input + tokens.output * USD_PER_MILLION.output) / 1e6;
const timing = (name) => {
  const samples = rows.map((row) => row.timings?.[name]).filter((value) => typeof value === "number");
  if (samples.length === 0) return null;
  return { average: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length), min: Math.min(...samples), max: Math.max(...samples) };
};
const timings = Object.fromEntries(["voiceMs", "sparkMs", "earsMs", "extractionMs", "totalMs"].map((name) => [name, timing(name)]).filter(([, value]) => value));

console.table(fieldRows);
console.table(noteRows);
console.log(`Overall: ${passed}/${total} checks passed (${percent(passed, total)}).`);
console.log(`Confident wrong: ${confidentWrongTotal} across ${rows.length} results (wrong values the card doesn't flag as unsure, so nobody is asked).`);
console.log(`Questions per card: ${cardTotal ? (questionTotal / cardTotal).toFixed(2) : "n/a"} (the expected cards ask ${(expectedAsks / expectedCards).toFixed(2)}). Extra questions: ${rows.reduce((sum, row) => sum + (row.score?.extraQuestions.length ?? 0), 0)} across ${rows.length} results.`);
console.log(`Errors: ${rows.filter((row) => row.error).length}. ${rows.filter((row) => row.error).map((row) => `${groupOf(row)}: ${row.error}`).join(" | ")}`);
console.log(`Latency (ms, average / min / max): ${Object.entries(timings).map(([name, t]) => `${name} ${t.average} / ${t.min} / ${t.max}`).join("; ")}. Wall time ${(wallMs / 1000).toFixed(0)} s.`);
console.log(`Tokens: ${tokens.input} in, ${tokens.output} out (${tokens.reasoning} reasoning). Estimated Muse Spark cost: $${costUsd.toFixed(3)}.`);

// --- Save (gitignored) ---------------------------------------------------------

mkdirSync(resultsDir, { recursive: true });
const used = readdirSync(resultsDir).map((name) => name.match(/^score-(\d+)-/)).filter(Boolean).map((match) => Number(match[1]));
const number = String(Math.max(0, ...used) + 1).padStart(3, "0");
const ranAt = new Date().toISOString();
const settings = { stage, effort, repeat, audioModels: stage === "audio" ? audioModels : undefined, concurrency, notes, rescoreOf: values.rescore || undefined };
writeFileSync(join(resultsDir, `score-${number}-results.json`), JSON.stringify({ ranAt, settings, passed, total, confidentWrongTotal, timings, tokens, costUsd, rows }, null, 2));

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const table = (items) => {
  if (items.length === 0) return "(none)";
  const keys = Object.keys(items[0]);
  return [`| ${keys.join(" | ")} |`, `|${keys.map(() => "---").join("|")}|`, ...items.map((item) => `| ${keys.map((key) => cell(item[key])).join(" | ")} |`)].join("\n");
};
const summary = [
  `# Extraction scores, run ${number}`,
  "",
  ...(saved ? [`Re-score of ${values.rescore} against the current fixtures (no API calls).`, ""] : []),
  `Run at ${ranAt}. Stage ${stage}, effort ${effort}, ${repeat} repeat(s)${stage === "audio" ? `, audio models ${audioModels.join(", ")}` : ""}.`,
  "",
  `Overall: ${passed}/${total} checks passed (${percent(passed, total)}). Questions per card: ${cardTotal ? (questionTotal / cardTotal).toFixed(2) : "n/a"}. Confident wrong: ${confidentWrongTotal}.`,
  "",
  "## Per note",
  "",
  table(noteRows),
  "",
  "## Failed fields",
  "",
  table(fieldRows.filter((row) => {
    const [ok, of] = row.passed.split("/");
    return ok !== of;
  })),
  "",
  "## Cards",
  "",
  ...rows.flatMap((row) => [
    `### ${groupOf(row)}, run ${row.run}`,
    "",
    row.error ? `Error: ${row.error}` : `singleSource: ${row.output.singleSource}. Disagreements: ${cell((row.output.disagreements ?? []).join(" / ")) || "none"}.`,
    "",
    ...(row.transcripts ? [`Transcript A: ${cell(row.transcripts.a)}`, "", `Transcript B: ${cell(row.transcripts.b)}`, ""] : []),
    row.output ? `Clean transcript: ${cell(row.output.transcriptClean)}` : "",
    "",
    row.output ? `Cards: \`${JSON.stringify(row.output.cards)}\`` : "",
    "",
  ]),
].join("\n");
writeFileSync(join(resultsDir, `score-${number}-summary.md`), summary);
console.log(`Full results (with transcripts): test-audio/results/score-${number}-summary.md and score-${number}-results.json`);
