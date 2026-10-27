// Measures Muse Voice Transcribe on our own test voice notes. Each WAV in
// test-audio/wav/ is sent three ways (no hints; keywords; keywords plus a
// language hint) so we can see what the hints change.
// Full results, transcripts included, go to test-audio/results/, which is
// gitignored. The console shows timings and keyword checks only, never
// transcript text.
//
// Usage: node scripts/transcribe-test.mjs --keywords "Amanzimtoti" [--language English]
// Needs META_API_KEY set for this terminal session. It is never printed.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkWav, transcribeWav } from "../functions/lib/transcribe.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const wavDir = join(root, "test-audio", "wav");
const resultsDir = join(root, "test-audio", "results");

const { values } = parseArgs({
  options: {
    keywords: { type: "string", default: "" },
    // Meta's docs show capitalised names ("English") and the cookbook shows
    // lowercase. The server ignores values it doesn't know, so this flag lets
    // us retry the other spelling if the hint seems to do nothing.
    language: { type: "string", default: "English" },
  },
});
const keywords = values.keywords.split(",").map((word) => word.trim()).filter(Boolean);
const languageBias = [values.language];

const apiKey = process.env.META_API_KEY;
if (!apiKey) {
  console.error("META_API_KEY isn't set for this terminal session.");
  process.exit(1);
}
// A key never contains whitespace. If this one does, whatever loaded it
// printed something extra, so stop rather than send a broken header.
if (/\s/.test(apiKey)) {
  console.error("META_API_KEY looks wrong (it contains spaces or line breaks), so it won't be used.");
  process.exit(1);
}

const runs = [{ type: "no hints", options: {} }];
if (keywords.length > 0) {
  runs.push({ type: "keywords", options: { keywords } });
  runs.push({ type: "keywords+language", options: { keywords, languageBias } });
} else {
  console.warn("No --keywords given, so only the no-hints run will happen.");
}

let files = [];
try {
  files = readdirSync(wavDir).filter((name) => name.toLowerCase().endsWith(".wav")).sort();
} catch {
  // A missing folder is reported just below, the same as an empty one.
}
if (files.length === 0) {
  console.error("No WAV files in test-audio/wav/. Run node scripts/convert-audio.mjs first.");
  process.exit(1);
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
    const row = {
      file,
      sampleRate: header.sampleRate,
      run: run.type,
      keywords: run.options.keywords ?? [],
      languageBias: run.options.languageBias ?? [],
      durationMs: header.durationMs,
    };
    try {
      const result = await transcribeWav(wav, { apiKey, ...run.options });
      row.durationMs = result.durationMs;
      row.latencyMs = result.latencyMs;
      row.turns = result.turns.length;
      row.keywordsFound = Object.fromEntries(keywords.map((word) => [word, spelledRight(result.transcript, word)]));
      row.transcript = result.transcript;
    } catch (err) {
      row.error = err.message;
    }
    results.push(row);
  }
}

function foundText(row) {
  if (!row.keywordsFound) return "";
  return Object.entries(row.keywordsFound).map(([word, found]) => `${word}: ${found ? "yes" : "no"}`).join(", ");
}

function seconds(ms) {
  return ms === undefined ? "" : (ms / 1000).toFixed(1);
}

mkdirSync(resultsDir, { recursive: true });
const ranAt = new Date().toISOString();
writeFileSync(join(resultsDir, "transcripts.json"), JSON.stringify({ ranAt, keywords, languageBias, results }, null, 2));

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const summary = [
  "# Transcription test results",
  "",
  `Run at ${ranAt}. Keywords: ${keywords.join(", ") || "none"}. Language hint: ${languageBias.join(", ")}.`,
  "",
  "| File | Hz | Audio (s) | Run | Latency (ms) | Keyword spelled right | Transcript or error |",
  "|---|---|---|---|---|---|---|",
  ...results.map((row) => `| ${cell(row.file)} | ${row.sampleRate ?? ""} | ${seconds(row.durationMs)} | ${row.run} | ${row.latencyMs ?? ""} | ${cell(foundText(row))} | ${cell(row.error ? `ERROR: ${row.error}` : row.transcript)} |`),
  "",
].join("\n");
writeFileSync(join(resultsDir, "summary.md"), summary);

console.table(results.map((row) => ({
  file: row.file,
  Hz: row.sampleRate,
  "audio s": seconds(row.durationMs),
  run: row.run,
  "latency ms": row.latencyMs,
  "keyword spelled right": foundText(row),
  error: row.error ?? "",
})));
console.log("Full results (with transcripts): test-audio/results/summary.md and transcripts.json");
process.exitCode = results.some((row) => row.error) ? 1 : 0;
