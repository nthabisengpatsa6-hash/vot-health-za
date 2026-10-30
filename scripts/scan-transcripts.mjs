import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync, lstatSync, readFileSync, readdirSync} from "node:fs";
import {basename, join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {tokens} from "./lib/noteScoring.mjs";
import {authoredInputCatalog, verifiedAuthoredRecord} from "./lib/authoredInputs.mjs";

export const ALLOWANCE = Object.freeze({
  commit:"0e77db35cb4207929e1e2d39212bb54fa8ff24e4",
  file:"test-fixtures/ideal-transcripts.json",
  sha256:"f69c798e30997df8b13eabd249f35a0d3e4d265367bb4bf95a3c3c9b5d6b11a2",
});
export const PRE_RUN_COMMIT = "44a37d3e315c42721ca92b734ddbbb24c34c618c";
// User-approved own-voice inputs only. Additions require a planning-chat
// decision. Numbered reader inputs can never be exempted, even by metadata.
export const OWN_AUDIO_INPUTS = Object.freeze([
  "clear-english-16k.wav", "clear-english-24k.wav",
  "mixed-sesotho-16k.wav", "mixed-sesotho-24k.wav",
  "all-sesotho-24k.wav", "mixed-amanzimtoti-24k.wav",
]);
const fileName = (value) => typeof value === "string" ? basename(value.replace(/\\/g, "/")).toLowerCase() : "";
const readerInput = (value) => /^n(?:0[1-9]|10)(?:[ab])?(?:[._-]|$)/i.test(fileName(value));
export function inputKind(row, {stage, transcription = false} = {}) {
  const inputs = [row.inputFile, row.audioFile, row.file, row.sourceFile, row.note, row.id].filter((value) => typeof value === "string");
  const audio = transcription || stage === "audio" || row.inputType === "audio" || row.kind === "recording" ||
    ["voice", "audio", "pipeline"].includes(row.stage) || inputs.some((value) => /\.(?:wav|opus|ogg|m4a|mp3)$/i.test(value));
  if (audio) {
    if (inputs.some(readerInput)) return "privateAudio";
    const input = fileName(row.inputFile || row.audioFile || row.file || row.sourceFile || (stage === "audio" && row.note ? `${row.note}-24k.wav` : ""));
    return OWN_AUDIO_INPUTS.includes(input) ? "ownAudio" : "privateAudio";
  }
  if (stage === "text" || row.inputType === "text" || row.kind === "fixture" || row.kind === "ranking") return "authoredText";
  return "unknownPrivate";
}
export function sixWords(text) {
  const list = tokens(text), grams = [];
  for (let i = 0; i + 6 <= list.length; i++) grams.push(list.slice(i, i + 6).join(" "));
  return grams;
}
export function historicalAllowance(root, git = (args) => execFileSync("git", args, {cwd:root, encoding:"utf8"})) {
  const text = git(["show", `${ALLOWANCE.commit}:${ALLOWANCE.file}`]);
  if (createHash("sha256").update(text).digest("hex") !== ALLOWANCE.sha256) throw new Error("Historical allowance hash mismatch.");
  return new Set(Object.values(JSON.parse(text)).flatMap(sixWords));
}
export function preRunAllowance(root, git = (args) => execFileSync("git", args, {cwd:root, encoding:"utf8"})) {
  const grams = new Map();
  const files = git(["ls-tree", "-r", "--name-only", PRE_RUN_COMMIT]).split(/\r?\n/).filter(Boolean);
  for (const file of files) {
    if (/(?:^|\/)(?:\.env(?:\..*)?|\.secret\.local|credentials\.json)$/.test(file)) throw new Error("A historical credential filename was refused without reading it.");
    if (/\.(?:png|ico|woff2?|jpe?g|gif|webp|pdf)$/i.test(file)) continue;
    const text = git(["show", `${PRE_RUN_COMMIT}:${file}`]);
    if (text.includes("\0")) continue;
    for (const gram of sixWords(text)) if (!grams.has(gram)) grams.set(gram, file);
  }
  return grams;
}
export function provenanceChunks(text, file, catalog) {
  if (!file.startsWith("docs/provenance/") || !/\.jsonl?$/.test(file)) return {texts:[text], records:0};
  let records = 0;
  const inspect = (row, original) => {
    if (verifiedAuthoredRecord(row, catalog)) {records++; return [];}
    if (Array.isArray(row?.records)) {
      const {records:items, ...header} = row;
      return [JSON.stringify(header), ...items.flatMap((item) => inspect(item, JSON.stringify(item)))];
    }
    return [original];
  };
  const texts = file.endsWith(".jsonl") ? text.split(/\r?\n/).filter(Boolean).flatMap((line) => inspect(JSON.parse(line), line)) : inspect(JSON.parse(text), text);
  return {texts, records};
}
export function collectTranscripts(value, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && ["transcript", "transcriptClean", "transcriptA", "transcriptB"].includes(key)) out.push(item);
    else if (key === "transcripts" && item && typeof item === "object") out.push(...Object.values(item).filter((v) => typeof v === "string"));
    else collectTranscripts(item, out);
  }
  return out;
}
const strings = (value) => typeof value === "string" ? [value] :
  value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
export function collectPrivateTexts(value, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    if (["transcript", "transcriptClean", "transcriptA", "transcriptB", "excerpt"].includes(key) && typeof item === "string") out.push(item);
    else if (["cards", "card", "transcripts"].includes(key) && item && typeof item === "object") out.push(...strings(item));
    else if (["raw", "rawOutput"].includes(key)) {
      if (typeof item === "string") {
        let decoded; try {decoded = JSON.parse(item);} catch {}
        out.push(...strings(decoded ?? item));
      } else out.push(...strings(item));
    } else collectPrivateTexts(item, out);
  }
  return out;
}
export function resultRows(value) {
  if (Array.isArray(value.rows)) return value.rows.map((row) => ({row, context:{stage:value.settings?.stage}}));
  if (Array.isArray(value.results)) return value.results.map((row) => ({row, context:{transcription:true}}));
  return [{row:value, context:{}}];
}
export function compareText(text, corpus, allowed) {
  let allowedCount = 0, failedCount = 0;
  for (const gram of sixWords(text)) if (corpus.has(gram)) {
    if (allowed.has(gram)) allowedCount++; else failedCount++;
  }
  return {allowedCount, failedCount};
}
const walk = (dir) => !existsSync(dir) ? [] : readdirSync(dir, {withFileTypes:true}).flatMap((entry) => {
  const path = join(dir, entry.name);
  if (entry.isSymbolicLink()) throw new Error("Symbolic links are refused in local transcript inputs.");
  return entry.isDirectory() ? walk(path) : [path];
});

export function scanTranscripts(root, {includeUntracked = false,
  git = (args) => execFileSync("git", args, {cwd:root, encoding:"utf8"}), catalog = authoredInputCatalog()} = {}) {
  if (git(["ls-files", "--", "test-audio", ".scratch"]).trim()) throw new Error("Private or scratch files are tracked.");
  const ignored = ["test-audio/raw/new.opus", "test-audio/results/new.jsonl", "test-audio/expected-corrections.json", ".scratch/new.txt"];
  for (const path of ignored) {
    if (!git(["check-ignore", "--no-index", path]).trim()) throw new Error("Private ignore coverage is missing.");
  }
  const localFiles = walk(join(root, "test-audio"));
  for (const path of localFiles) {
    if (!git(["check-ignore", "--no-index", path]).trim()) throw new Error("A local audio file is not ignored.");
  }
  const corpus = new Set(), inputs = {privateAudio:0, ownAudio:0, authoredText:0, unknownPrivate:0};
  for (const path of walk(join(root, "test-audio", "results"))) {
    let texts = [];
    if (/\.jsonl?$/i.test(path)) {
      const content = readFileSync(path, "utf8");
      const values = path.endsWith(".jsonl") ? content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [JSON.parse(content)];
      for (const {row, context} of values.flatMap(resultRows)) {
        const kind = inputKind(row, context);
        // Classify from provenance before selecting any content for matching.
        if (["ownAudio", "authoredText"].includes(kind)) {inputs[kind]++; continue;}
        const selected = collectPrivateTexts(row);
        if (selected.length) inputs[kind]++;
        texts.push(...selected);
      }
    } else if (/\.(?:txt|md)$/i.test(path)) {
      const companion = path.replace(/-summary\.md$/i, /^run-/.test(basename(path)) ? "-transcripts.json" : "-results.json");
      if (companion !== path && existsSync(companion)) {
        const rows = resultRows(JSON.parse(readFileSync(companion, "utf8")));
        if (rows.every(({row, context}) => ["ownAudio", "authoredText"].includes(inputKind(row, context)))) continue;
      }
      // Unclassified text and private-audio summaries fail closed. Include
      // cards and excerpts too; do not rely on transcript heading conventions.
      inputs.unknownPrivate++;
      texts = [readFileSync(path, "utf8")];
    }
    for (const text of texts) for (const gram of sixWords(text)) corpus.add(gram);
  }
  const historical = historicalAllowance(root, git), beforeRun = preRunAllowance(root, git);
  const allowed = new Set([...historical, ...beforeRun.keys()]);
  const args = ["ls-files", "-z", "--cached", ...(includeUntracked ? ["--others", "--exclude-standard"] : [])];
  const files = [...new Set(git(args).split("\0").filter(Boolean))];
  const failures = [], verifiedProvenance = [], historicalFiles = new Map(); let allowedCount = 0;
  for (const file of files) {
    if (/(?:^|\/)(?:\.env(?:\..*)?|\.secret\.local|credentials\.json)$/.test(file)) throw new Error("A credential filename is tracked; its contents were not read.");
    const path = join(root, file);
    if (!existsSync(path) || lstatSync(path).isSymbolicLink()) continue;
    const chunks = provenanceChunks(readFileSync(path, "utf8"), file, catalog);
    if (chunks.records) verifiedProvenance.push({file, records:chunks.records});
    let failedCount = 0;
    for (const text of chunks.texts) for (const gram of sixWords(text)) if (corpus.has(gram)) {
      if (!allowed.has(gram)) {failedCount++; continue;}
      if (historical.has(gram)) allowedCount++;
      else {const source = beforeRun.get(gram); historicalFiles.set(source, (historicalFiles.get(source) || 0) + 1);}
    }
    if (failedCount) failures.push({file, count:failedCount});
  }
  return {files:files.length, inputs, allowed:[{file:ALLOWANCE.file, count:allowedCount},
    ...[...historicalFiles].map(([file, count]) => ({file:`${PRE_RUN_COMMIT}:${file}`, count}))], verifiedProvenance, failures};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = scanTranscripts(fileURLToPath(new URL("../", import.meta.url)), {includeUntracked:process.argv.includes("--include-untracked")});
    console.log(JSON.stringify(result, null, 2));
    if (result.failures.length) process.exitCode = 1;
  } catch { console.error("Transcript scan failed safely; check ignore coverage, historical source and local record format."); process.exitCode = 1; }
}
