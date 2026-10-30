import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync, lstatSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {tokens} from "./lib/noteScoring.mjs";

export const ALLOWANCE = Object.freeze({
  commit:"0e77db35cb4207929e1e2d39212bb54fa8ff24e4",
  file:"test-fixtures/ideal-transcripts.json",
  sha256:"f69c798e30997df8b13eabd249f35a0d3e4d265367bb4bf95a3c3c9b5d6b11a2",
});
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
export function collectTranscripts(value, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && ["transcript", "transcriptClean", "transcriptA", "transcriptB"].includes(key)) out.push(item);
    else if (key === "transcripts" && item && typeof item === "object") out.push(...Object.values(item).filter((v) => typeof v === "string"));
    else collectTranscripts(item, out);
  }
  return out;
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

export function scanTranscripts(root, {includeUntracked = false} = {}) {
  const git = (args) => execFileSync("git", args, {cwd:root, encoding:"utf8"});
  if (git(["ls-files", "--", "test-audio", ".scratch"]).trim()) throw new Error("Private or scratch files are tracked.");
  const ignored = ["test-audio/raw/new.opus", "test-audio/results/new.jsonl", "test-audio/expected-corrections.json", ".scratch/new.txt"];
  for (const path of ignored) {
    if (!git(["check-ignore", "--no-index", path]).trim()) throw new Error("Private ignore coverage is missing.");
  }
  const localFiles = walk(join(root, "test-audio"));
  for (const path of localFiles) {
    if (!git(["check-ignore", "--no-index", path]).trim()) throw new Error("A local audio file is not ignored.");
  }
  const corpus = new Set();
  for (const path of walk(join(root, "test-audio", "results"))) {
    let texts = [];
    if (/\.jsonl?$/i.test(path)) {
      const content = readFileSync(path, "utf8");
      const values = path.endsWith(".jsonl") ? content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [JSON.parse(content)];
      texts = values.flatMap((value) => collectTranscripts(value));
    } else if (/\.(?:txt|md)$/i.test(path)) {
      texts = readFileSync(path, "utf8").split(/\r?\n/).filter((line) => /^(?:Transcript [AB]:|Clean transcript:)/.test(line));
    }
    for (const text of texts) for (const gram of sixWords(text)) corpus.add(gram);
  }
  const allowed = historicalAllowance(root);
  const args = ["ls-files", "-z", "--cached", ...(includeUntracked ? ["--others", "--exclude-standard"] : [])];
  const files = [...new Set(git(args).split("\0").filter(Boolean))];
  const failures = []; let allowedCount = 0;
  for (const file of files) {
    if (/(?:^|\/)(?:\.env(?:\..*)?|\.secret\.local|credentials\.json)$/.test(file)) throw new Error("A credential filename is tracked; its contents were not read.");
    const path = join(root, file);
    if (!existsSync(path) || lstatSync(path).isSymbolicLink()) continue;
    const result = compareText(readFileSync(path, "utf8"), corpus, allowed);
    allowedCount += result.allowedCount;
    if (result.failedCount) failures.push({file, count:result.failedCount});
  }
  return {files:files.length, allowed:[{file:ALLOWANCE.file, count:allowedCount}], failures};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = scanTranscripts(fileURLToPath(new URL("../", import.meta.url)), {includeUntracked:process.argv.includes("--include-untracked")});
    console.log(JSON.stringify(result, null, 2));
    if (result.failures.length) process.exitCode = 1;
  } catch { console.error("Transcript scan failed safely; check ignore coverage, historical source and local record format."); process.exitCode = 1; }
}
