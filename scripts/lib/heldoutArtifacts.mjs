import {existsSync, mkdirSync, readFileSync, openSync, writeSync, closeSync, fsyncSync} from "node:fs";
import {dirname, join, posix} from "node:path";
import {assertNoSecrets} from "./noteArtifacts.mjs";
import {assertRankInput} from "../../functions/shared/rank/input.mjs";
import {RANK_SETTINGS} from "../../functions/shared/rank/settings.mjs";
import {RANK_SCHEMA} from "../../functions/shared/rank/schema.mjs";
import {assertHeldOutSeeds, digest, RANK_HASH} from "./heldoutGuards.mjs";

export const REPORT_JSON = "src/sim/held-out/scorecard-held-out-seeds-11-20.json";
export function heldOutPath(file) {
  const value = file.replace(/\\/g, "/");
  if (value !== posix.normalize(value) || value.startsWith("/") || value.includes(":")) return false;
  return value === REPORT_JSON || value.startsWith("docs/provenance/held-out/") || value.startsWith("docs/provenance/rankings/held-out/");
}
export function assertHeldOutArtifact(value, keys = []) {
  assertNoSecrets(value, keys);
  const visit = (item) => {
    if (typeof item === "string" && /^\s*[[{]/.test(item)) { let parsed; try { parsed = JSON.parse(item); } catch {} if (parsed) visit(parsed); }
    if (!item || typeof item !== "object") return;
    assertNoSecrets(item,keys);
    for (const [key, child] of Object.entries(item)) {
      if (/reporter|ground.?truth|transcript/i.test(key)) throw new Error("Private field refused.");
      // Report comparisons may contain tuning rows; call writers separately require 11..20.
      if (key === "seed" && (!Number.isInteger(child) || child < 1 || child > 20)) throw new Error("Invalid scorecard seed.");
      if (key === "input") assertRankInput(child);
      visit(child);
    }
  };
  visit(value);
}
export function writeHeldOut(root, file, value) {
  if (!heldOutPath(file)) throw new Error("Held-out output path refused.");
  assertHeldOutArtifact(value);
  const path = join(root, file);
  mkdirSync(dirname(path), {recursive:true});
  // Exclusive creation prevents a second statistics run replacing the first results.
  const handle = openSync(path, "wx");
  try { writeSync(handle, JSON.stringify(value, null, 2) + "\n"); fsyncSync(handle); } finally { closeSync(handle); }
}
export function identity(plan) {
  return digest({eventKey:plan.eventKey, inputHash:plan.inputHash, promptHash:RANK_HASH,
    schemaHash:digest(RANK_SCHEMA), settings:RANK_SETTINGS, retryPolicy:"transport-only-once"});
}
export const recordFile = (seed) => { assertHeldOutSeeds([seed]); return `docs/provenance/rankings/held-out/seed-${seed}.jsonl`; };
export function readJournal(root, seed) {
  const file = join(root, recordFile(seed));
  if (!existsSync(file)) return [];
  const rows = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  for (const row of rows) { assertHeldOutArtifact(row); if (row.seed !== seed || !["started", "finished"].includes(row.state)) throw new Error("Invalid held-out journal."); }
  return rows;
}
export function appendJournal(root, row, key = "") {
  assertHeldOutSeeds([row.seed]); assertHeldOutArtifact(row, [key]);
  const file = join(root, recordFile(row.seed)); mkdirSync(dirname(file), {recursive:true});
  // Append + fsync the started marker before allowing a network request.
  const handle = openSync(file, "a");
  try { writeSync(handle, JSON.stringify(row) + "\n"); fsyncSync(handle); } finally { closeSync(handle); }
}
export function journalState(root, plans) {
  const rows = [...new Set(plans.map((plan) => plan.seed))].flatMap((seed) => readJournal(root, seed));
  const expected = new Map(plans.map((plan) => [identity(plan), plan]));
  const states = new Map();
  for (const row of rows) {
    const plan = expected.get(row.recordId);
    if (!plan || row.seed !== plan.seed) throw new Error("Journal does not match the committed plan.");
    const before = states.get(row.recordId);
    if ((row.state === "started" && before) || (row.state === "finished" && before !== "started")) throw new Error("Duplicate or invalid journal state.");
    states.set(row.recordId, row.state);
  }
  if ([...states.values()].includes("started")) throw new Error("Interrupted call needs review; it will not be repeated automatically.");
  return {finished:rows.filter((row) => row.state === "finished"), pending:plans.filter((plan) => !states.has(identity(plan)))};
}
export function readHeldOut(root, file) {
  if (!heldOutPath(file)) throw new Error("Held-out input path refused.");
  const value = JSON.parse(readFileSync(join(root,file), "utf8")); assertHeldOutArtifact(value); return value;
}
// Report files are projections and can be regenerated; original observations are exclusive/append-only.
export function replaceReport(root, file, text) {
  if (![REPORT_JSON, "docs/provenance/held-out/scorecard-held-out-seeds-11-20.md"].includes(file)) throw new Error("Report path refused.");
  assertNoSecrets(text); mkdirSync(dirname(join(root,file)), {recursive:true});
  // Kept separate from the call journal and statistics writer.
  const handle = openSync(join(root,file), "w");
  try { writeSync(handle, text); fsyncSync(handle); } finally { closeSync(handle); }
}
