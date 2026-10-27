// Measures transcription of our own test voice notes (24 kHz WAVs only).
// Runs, chosen with --runs (default a,b):
//   a  Muse Voice Transcribe, no hints
//   b  Muse Voice Transcribe, keywords
//   c  Muse Voice Transcribe, keywords plus the language hint
//   d  Muse Spark 1.3 given the audio directly (experiment only)
//   e  Muse Spark 1.2 given the audio directly (experiment only)
// Each run of this script writes new numbered files to test-audio/results/
// (gitignored) and never overwrites earlier ones. The console shows timings,
// word counts and keyword checks only, never transcript text.
//
// Usage: node scripts/transcribe-test.mjs --runs a,b,d --keywords "Amanzimtoti" [--files all-sesotho,mixed-amanzimtoti] [--language English]
// Needs META_API_KEY set for this terminal session. It is never printed.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { META_API_BASE_URL } from "../functions/constants.js";
import { checkWav, transcribeWav } from "../functions/lib/transcribe.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const wavDir = join(root, "test-audio", "wav");
const resultsDir = join(root, "test-audio", "results");

const { values } = parseArgs({
  options: {
    runs: { type: "string", default: "a,b" },
    files: { type: "string", default: "" },
    keywords: { type: "string", default: "" },
    // Meta's docs show capitalised names ("English") and the cookbook shows
    // lowercase. The server ignores values it doesn't know, so this flag lets
    // us retry the other spelling if the hint seems to do nothing.
    language: { type: "string", default: "English" },
  },
});
const list = (text) => text.split(",").map((item) => item.trim()).filter(Boolean);
const keywords = list(values.keywords);
const languageBias = [values.language];

// Spark runs are an experiment in this script only, never product code.
// Standard-mode model IDs only: "-contributor" models let Meta train on
// what we send.
const RUNS = {
  a: { label: "a: no hints", transcribe: {} },
  b: { label: "b: keywords", transcribe: { keywords }, needsKeywords: true },
  c: { label: "c: keywords+language", transcribe: { keywords, languageBias }, needsKeywords: true },
  d: { label: "d: muse-spark-1.3", spark: "muse-spark-1.3" },
  e: { label: "e: muse-spark-1.2", spark: "muse-spark-1.2" },
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

const runs = list(values.runs).map((letter) => RUNS[letter] ?? fail(`Unknown run "${letter}". Choose from: ${Object.keys(RUNS).join(", ")}.`));
if (runs.length === 0) fail("No runs chosen. Use --runs, for example --runs a,b.");
if (runs.some((run) => run.needsKeywords) && keywords.length === 0) fail("Runs b and c need --keywords.");
if (runs.some((run) => run.spark?.includes("contributor"))) fail("Contributor models are never used.");

const apiKey = process.env.META_API_KEY;
if (!apiKey) fail("META_API_KEY isn't set for this terminal session.");
// A key never contains whitespace. If this one does, whatever loaded it
// printed something extra, so stop rather than send a broken header.
if (/\s/.test(apiKey)) fail("META_API_KEY looks wrong (it contains spaces or line breaks), so it won't be used.");

let files = [];
try {
  files = readdirSync(wavDir).filter((name) => name.endsWith("-24k.wav")).sort();
} catch {
  // A missing folder is reported just below, the same as an empty one.
}
const wanted = list(values.files);
if (wanted.length > 0) {
  const missing = wanted.filter((stem) => !files.includes(`${stem}-24k.wav`));
  if (missing.length > 0) fail(`No 24 kHz WAV for: ${missing.join(", ")}. Run node scripts/convert-audio.mjs first.`);
  files = wanted.map((stem) => `${stem}-24k.wav`);
}
if (files.length === 0) fail("No 24 kHz WAV files in test-audio/wav/. Run node scripts/convert-audio.mjs first.");

const SPARK_PROMPT = [
  "Transcribe this voice note word for word.",
  "The speaker is a health worker and may switch between Sesotho and English, even in the middle of a sentence.",
  "Write every word in the language it was spoken in, using standard South African Sesotho spelling for Sesotho words. Do not translate anything.",
  "Mark any word you cannot make out as [?].",
  "Reply with the transcript only: no notes, headings or translation.",
].join(" ");

// Reasoning can't be switched off for Muse Spark ("none" returns 400);
// "low" is Meta's advice for direct tasks. Reasoning tokens count toward
// max_completion_tokens, so 4000 leaves room for a full transcript.
async function transcribeWithSpark(wav, model) {
  const started = performance.now();
  const response = await fetch(`${META_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning_effort: "low",
      max_completion_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: SPARK_PROMPT },
          { type: "input_audio", input_audio: { data: wav.toString("base64"), format: "wav" } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${model} returned status ${response.status}: ${text.slice(0, 300)}`);
  const body = JSON.parse(text);
  const choice = body.choices?.[0] ?? {};
  const content = choice.message?.content;
  const transcript = Array.isArray(content) ? content.map((part) => part.text ?? "").join("") : (content ?? "");
  return {
    transcript: transcript.trim(),
    latencyMs: Math.round(performance.now() - started),
    finishReason: choice.finish_reason ?? null,
    usage: body.usage ?? null,
  };
}

// Whole word, any capitalisation: "Amazimtoti" doesn't count, "amanzimtoti" does,
// because the case card matches places case-insensitively anyway.
function spelledRight(transcript, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu").test(transcript);
}

const results = [];
for (const file of files) {
  const wav = readFileSync(join(wavDir, file));
  let header;
  try {
    header = checkWav(wav);
  } catch (err) {
    results.push({ file, run: "skipped", error: err.message });
    continue;
  }
  // One call at a time, so each latency measures a single request.
  for (const run of runs) {
    const row = { file, sampleRate: header.sampleRate, run: run.label, durationMs: header.durationMs };
    try {
      if (run.spark) {
        const result = await transcribeWithSpark(wav, run.spark);
        Object.assign(row, { latencyMs: result.latencyMs, finishReason: result.finishReason, usage: result.usage, transcript: result.transcript });
      } else {
        const result = await transcribeWav(wav, { apiKey, ...run.transcribe });
        Object.assign(row, { durationMs: result.durationMs, latencyMs: result.latencyMs, attempts: result.attempts, attemptMs: result.attemptMs, transcript: result.transcript });
        row.retryReasons = result.failures; // kind and HTTP status of each failed attempt before the one that worked
      }
      row.words = row.transcript.split(/\s+/).filter(Boolean).length;
      row.keywordsFound = Object.fromEntries(keywords.map((word) => [word, spelledRight(row.transcript, word)]));
    } catch (err) {
      row.error = err.message;
    }
    results.push(row);
  }
}

function foundText(row) {
  if (!row.keywordsFound || keywords.length === 0) return "";
  return Object.entries(row.keywordsFound).map(([word, found]) => `${word}: ${found ? "yes" : "no"}`).join(", ");
}

function tokensText(row) {
  if (!row.usage) return "";
  const reasoning = row.usage.completion_tokens_details?.reasoning_tokens;
  return `${row.usage.prompt_tokens} in, ${row.usage.completion_tokens} out` + (reasoning === undefined ? "" : ` (${reasoning} reasoning)`);
}

function seconds(ms) {
  return ms === undefined ? "" : (ms / 1000).toFixed(1);
}

// The next free run number, so earlier results are never overwritten.
mkdirSync(resultsDir, { recursive: true });
const used = readdirSync(resultsDir).map((name) => name.match(/^run-(\d+)-/)).filter(Boolean).map((match) => Number(match[1]));
const runNumber = String(Math.max(0, ...used) + 1).padStart(3, "0");
const ranAt = new Date().toISOString();
const summaryName = `run-${runNumber}-summary.md`;
const transcriptsName = `run-${runNumber}-transcripts.json`;

writeFileSync(join(resultsDir, transcriptsName), JSON.stringify({ ranAt, runs: runs.map((run) => run.label), keywords, languageBias, results }, null, 2));

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const summary = [
  `# Transcription test results, run ${runNumber}`,
  "",
  `Run at ${ranAt}. Runs: ${runs.map((run) => run.label).join("; ")}. Keywords: ${keywords.join(", ") || "none"}.`,
  "",
  "| File | Audio (s) | Run | Latency (ms) | Attempts | Words | Keyword spelled right | Finish | Tokens | Transcript or error |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...results.map((row) => `| ${cell(row.file)} | ${seconds(row.durationMs)} | ${row.run} | ${row.latencyMs ?? ""} | ${row.attempts ?? ""} | ${row.words ?? ""} | ${cell(foundText(row))} | ${row.finishReason ?? ""} | ${cell(tokensText(row))} | ${cell(row.error ? `ERROR: ${row.error}` : row.transcript)} |`),
  "",
].join("\n");
writeFileSync(join(resultsDir, summaryName), summary);

console.table(results.map((row) => ({
  file: row.file,
  run: row.run,
  "audio s": seconds(row.durationMs),
  "latency ms": row.latencyMs,
  attempts: row.attempts ?? "",
  words: row.words ?? "",
  keyword: foundText(row),
  finish: row.finishReason ?? "",
  tokens: tokensText(row),
  error: row.error ?? "",
})));
console.log(`Full results (with transcripts): test-audio/results/${summaryName} and ${transcriptsName}`);
process.exitCode = results.some((row) => row.error) ? 1 : 0;
