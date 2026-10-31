import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {test} from "node:test";
import {executePlans, parseArgs} from "../../scripts/rank-saved.mjs";
import {planRankings} from "../../scripts/lib/rankPlans.mjs";
import {assertSafeArtifact, fileFor, missingPlans, readRecords, syncSeedOne} from "../../scripts/lib/rankArtifacts.mjs";
import {readHiddenKey} from "../../scripts/lib/hiddenInput.mjs";
import {EventEmitter} from "node:events";
import {createRequire} from "node:module";
import {rankingScorecard} from "../../src/sim/scorecard.js";
import {scanProvenance} from "../../scripts/scan-provenance.mjs";

const {PROMPT_HASH} = createRequire(import.meta.url)("../../functions/lib/callRanker.js");
const plans = planRankings({seeds: [1]}).slice(0, 1);
const fresh = () => {mkdirSync(".scratch", {recursive: true}); return mkdtempSync(".scratch/rank-test-");};
const reply = (unavailable = false) => {
  const raw = {sources: [{sourceId: "water:A", rank: 1, confidence: "low", supporting: ["c1"], contradicting: [], reason: "The clues fit this catchment."}]};
  return {model: "muse-spark-1.3", effort: "low", promptHash: PROMPT_HASH, raw,
    rawOutput: unavailable ? "invalid" : JSON.stringify(raw), rawAttempts: unavailable ? ["invalid", "invalid"] : [JSON.stringify(raw)],
    unavailable, ms: 1, tokens: {input: 10, output: 20}, attempts: unavailable ? 2 : 1, outcome: unavailable ? "invalid_json" : "ok"};
};

test("seed 11 is refused before key entry, writes or a provider call", () => {
  assert.throws(() => parseArgs(["--seeds", "11"]), /remain locked/);
  const result = spawnSync(process.execPath, ["scripts/rank-saved.mjs", "--seeds", "11"], {encoding: "utf8"});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Only tuning seeds 1 to 10/);
  assert.doesNotMatch(result.stdout, /Meta key|Run \d+ calls/);
});

test("completed records are never called again or overwritten on rerun", async () => {
  const root = fresh();
  let calls = 0;
  const provider = async () => {calls++; return reply();};
  const options = {root, apiKey: "offline-placeholder", provider, print: () => {}, now: () => "2026-10-30T10:00:00Z"};
  await executePlans(plans, options);
  const path = fileFor(root, plans[0]);
  const before = readFileSync(path, "utf8");
  const seedOne = join(root, "src/sim/saved-rankings/seed-1.json");
  const output = readFileSync(seedOne, "utf8");
  assert.equal(missingPlans(root, plans, PROMPT_HASH).length, 0);
  await executePlans(plans, options);
  assert.equal(calls, 1);
  assert.equal(readFileSync(path, "utf8"), before);
  assert.equal(readFileSync(seedOne, "utf8"), output);
  assertSafeArtifact(JSON.parse(before));
  assert.ok(!output.includes('"input"'));
});

test("unavailable records can be filled without erasing their previous attempts", async () => {
  const root = fresh();
  let calls = 0;
  const provider = async () => reply(calls++ === 0);
  const options = {root, apiKey: "offline-placeholder", provider, print: () => {}};
  await executePlans(plans, options);
  assert.equal(missingPlans(root, plans, PROMPT_HASH).length, 1);
  await executePlans(plans, options);
  const records = readRecords(fileFor(root, plans[0]));
  assert.equal(records.length, 2);
  assert.equal(records[0].cleanedRanking.unavailable, true);
  assert.equal(records[0].dropCounts.invalidJson, 2);
  assert.equal(records[1].cleanedRanking.sources.length, 1);
  assert.equal(missingPlans(root, plans, PROMPT_HASH).length, 0);
});

test("an interrupted seed-1 projection is repaired from provenance without a provider call", async () => {
  const original = fresh();
  await executePlans(plans, {root: original, apiKey: "offline-placeholder", provider: async () => reply(), print: () => {}});
  const repaired = fresh();
  const file = fileFor(repaired, plans[0]);
  mkdirSync(join(repaired, "docs/provenance/rankings"), {recursive: true});
  writeFileSync(file, readFileSync(fileFor(original, plans[0])));
  syncSeedOne(repaired);
  assert.equal(missingPlans(repaired, plans, PROMPT_HASH).length, 0);
  assert.ok(existsSync(join(repaired, "src/sim/saved-rankings/seed-1.json")));
});

test("all 79 planned records flow through a fake provider, persistence and the scorecard offline", async () => {
  const root = fresh();
  const all = planRankings({sets: ["all"]});
  let calls = 0;
  const provider = async (input, options) => {
    calls++;
    const value = reply();
    value.effort = options.effort;
    value.raw.sources[0].sourceId = input.sources[0].id;
    value.rawOutput = JSON.stringify(value.raw);
    value.rawAttempts = [value.rawOutput];
    return value;
  };
  const records = await executePlans(all, {root, apiKey: "offline-placeholder", provider, print: () => {}});
  assert.equal(calls, 79);
  assert.equal(records.length, 79);
  assert.equal(missingPlans(root, all, PROMPT_HASH).length, 0);
  for (const record of records) {
    assertSafeArtifact(record);
    assert.equal(record.cleanedRanking.sources.length, 1);
    assert.match(record.cleanedRanking.sources[0].supporting[0], /^sim-\d{4}-\d{2}-\d{2}-\d+/);
    assert.equal(record.cleanedRanking.sources[0].rank, 1);
  }
  const projection = JSON.parse(readFileSync(join(root, "src/sim/saved-rankings/seed-1.json"), "utf8"));
  assert.equal(projection.length, 6);
  assert.ok(projection.every((entry) => !Object.hasOwn(entry, "input")));
  const markdown = rankingScorecard(records, {promptHash: PROMPT_HASH});
  assert.ok(!markdown.split("\n").filter((line) => line.startsWith("|")).some((line) => line.includes("missing") || line.includes("unavailable")));
  assert.match(markdown, /## Low versus medium/);
  assert.match(markdown, /## Swapped clues/);
});

test("malformed saved files are refused and left unchanged", () => {
  const root = fresh();
  const file = join(root, "broken.json");
  writeFileSync(file, "not JSON");
  assert.throws(() => readRecords(file), /left unchanged/);
  assert.equal(readFileSync(file, "utf8"), "not JSON");
});

test("artifact checks reject credentials, reporter fields and held-out seed records", () => {
  const fakeToken = "sk-" + "x".repeat(24);
  for (const value of [{rawOutput: fakeToken}, {seed: 11}, {nested: {reporterArea: "private"}}, {input: {scenario: "water"}}, {rawOutput: '{"reporterUid":"private"}'}, {rawOutput: '{"seed":11}'}]) {
    assert.throws(() => assertSafeArtifact(value));
  }
  assert.throws(() => assertSafeArtifact({rawOutput: "offline-echo"}, "offline-echo"));
});

test("hidden input refuses non-interactive input and never echoes typing", async () => {
  assert.throws(() => readHiddenKey({isTTY: false}, {isTTY: false}), /interactive/);
  const input = new EventEmitter();
  Object.assign(input, {isTTY: true, isRaw: false, setRawMode(value) {this.isRaw = value;}, resume() {}, pause() {}});
  const output = {isTTY: true, text: "", write(value) {this.text += value;}};
  const promise = readHiddenKey(input, output);
  input.emit("keypress", "offline-value", {});
  input.emit("keypress", "", {name: "return"});
  assert.equal(await promise, "offline-value");
  assert.ok(!output.text.includes("offline-value"));
  assert.equal(input.isRaw, false);
});

test("all saved provenance and the seed-1 output are scanned for key-like strings and private fields", () => {
  assert.ok(scanProvenance(process.cwd()) > 0);
});

test("scratch is ignored and has no tracked files", () => {
  const ignored = spawnSync("git", ["check-ignore", ".scratch/msg-15a-1.txt"], {encoding: "utf8"});
  assert.equal(ignored.status, 0);
  const tracked = spawnSync("git", ["ls-files", ".scratch"], {encoding: "utf8"});
  assert.equal(tracked.stdout.trim(), "");
});
