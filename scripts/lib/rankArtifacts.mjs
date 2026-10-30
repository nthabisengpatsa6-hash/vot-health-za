import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {assertRankInput} from "../../functions/shared/rank/input.mjs";
import {RANK_SCHEMA} from "../../functions/shared/rank/schema.mjs";
import {RANK_SETTINGS} from "../../functions/shared/rank/settings.mjs";

export const hashOf = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
export const KEY_LIKE = /\b(?:sk-[a-z0-9_-]{16,}|AIza[a-z0-9_-]{20,}|Bearer\s+\S+)|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/i;

export function assertSafeArtifact(value, key = "") {
  const serialized = JSON.stringify(value);
  if (KEY_LIKE.test(serialized) || (key && serialized.includes(key))) throw new Error("Unsafe content was refused before saving.");
  function visit(child) {
    if (typeof child === "string" && (child.trimStart().startsWith("{") || child.trimStart().startsWith("["))) {
      let parsed;
      try { parsed = JSON.parse(child); } catch { return; }
      visit(parsed);
      return;
    }
    if (!child || typeof child !== "object") return;
    for (const [name, nested] of Object.entries(child)) {
      if (/reporter|ground.?truth/i.test(name)) throw new Error("A private field was refused before saving.");
      if (name === "seed" && (!Number.isInteger(nested) || nested < 1 || nested > 10)) throw new Error("Held-out seed data cannot be saved here.");
      if (name === "input") assertRankInput(nested);
      visit(nested);
    }
  }
  visit(value);
}

export function recordIdentity(plan, promptHash) {
  return hashOf({runSet: plan.runSet, seed: plan.seed, day: plan.day, signalKey: plan.signalKey,
    repeat: plan.repeat, inputHash: hashOf(plan.input), promptHash, schemaHash: hashOf(RANK_SCHEMA),
    provider: RANK_SETTINGS.provider, model: RANK_SETTINGS.model, effort: plan.effort,
    temperature: RANK_SETTINGS.temperature, outputCap: RANK_SETTINGS.maxCompletionTokens});
}

export const fileFor = (root, plan) => join(root, "docs", "provenance", "rankings",
    ...(plan.runSet === "main" ? [] : ["experiments"]), `seed-${String(plan.seed).padStart(2, "0")}.json`);

export function readRecords(path) {
  if (!existsSync(path)) return [];
  let value;
  try { value = JSON.parse(readFileSync(path, "utf8")); } catch { throw new Error("A saved ranking file is unreadable; it was left unchanged."); }
  if (!Array.isArray(value.records)) throw new Error("A saved ranking file has an invalid shape; it was left unchanged.");
  assertSafeArtifact(value);
  return value.records;
}

export const completed = (record) => record.cleanedRanking && record.cleanedRanking.unavailable !== true && Array.isArray(record.cleanedRanking.sources);

export function missingPlans(root, plans, promptHash) {
  return plans.filter((plan) => !readRecords(fileFor(root, plan)).some((record) => record.recordId === recordIdentity(plan, promptHash) && completed(record)));
}

export function saveRecord(root, plan, record, key = "") {
  const path = fileFor(root, plan);
  const records = readRecords(path);
  if (records.some((entry) => entry.recordId === record.recordId && completed(entry))) return false;
  // Append retries of unavailable records, preserving their original raw outputs too.
  const value = {records: [...records, record]};
  assertSafeArtifact(value, key);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
  if (plan.runSet === "main" && plan.seed === 1) syncSeedOne(root, key);
  return true;
}

// Repair an interrupted projection write from saved provenance without another call.
export function syncSeedOne(root, key = "") {
  const path = fileFor(root, {runSet: "main", seed: 1});
  if (!existsSync(path)) return;
  const records = readRecords(path);
  const target = join(root, "src", "sim", "saved-rankings", "seed-1.json");
  const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : [];
  const entries = [...existing];
  for (const record of records) {
    const output = {day: record.day, signalKey: record.signalKey, ranking: record.cleanedRanking,
      model: record.model, effort: record.effort, promptHash: record.promptHash, date: record.date};
    const index = entries.findIndex((entry) => entry.day === output.day && entry.signalKey === output.signalKey && entry.model === output.model && entry.effort === output.effort && entry.promptHash === output.promptHash);
    if (index < 0) entries.push(output);
    else if (entries[index].ranking.unavailable === true && output.ranking.unavailable !== true) entries[index] = output;
  }
  if (JSON.stringify(existing) === JSON.stringify(entries)) return;
  assertSafeArtifact(entries, key);
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, JSON.stringify(entries, null, 2) + "\n");
}
