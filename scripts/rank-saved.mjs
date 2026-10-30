// Paid calls happen only when a person runs this script, confirms, and enters a key.
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {planRankings, assertTuningSeeds, TUNING_SEEDS} from "./lib/rankPlans.mjs";
import {confirmRun, readHiddenKey} from "./lib/hiddenInput.mjs";
import {hashOf, missingPlans, recordIdentity, saveRecord, syncSeedOne} from "./lib/rankArtifacts.mjs";
import {validateRanking} from "../functions/shared/rank/validate.mjs";
import {META_PRICES, RANK_SETTINGS} from "../functions/shared/rank/settings.mjs";

const require = createRequire(import.meta.url);
const {callRanker, SYSTEM_PROMPT, PROMPT_HASH} = require("../functions/lib/callRanker.js");
const ROOT = fileURLToPath(new URL("../", import.meta.url));

export function parseArgs(args) {
  const options = {sets: ["main"], seeds: TUNING_SEEDS, effort: RANK_SETTINGS.effort, planOnly: false};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--set") options.sets = (args[++index] || "").split(",");
    else if (flag === "--seeds") options.seeds = (args[++index] || "").split(",").map(Number);
    else if (flag === "--effort") options.effort = args[++index];
    else if (flag === "--plan") options.planOnly = true;
    else if (flag === "--help") options.help = true;
    else throw new Error("Unknown flag. Use --set, --seeds, --effort, --plan or --help.");
  }
  assertTuningSeeds(options.seeds);
  options.seeds = [...new Set(options.seeds)].sort((a, b) => a - b);
  return options;
}

export function costEstimate(plans) {
  if (!META_PRICES) return "price unknown";
  const input = plans.reduce((total, plan) => total + Math.ceil(Buffer.byteLength(SYSTEM_PROMPT + JSON.stringify(plan.input), "utf8") / 4) + 64, 0);
  const output = plans.length * RANK_SETTINGS.maxCompletionTokens;
  const dollars = (input * META_PRICES.inputPerMillion + output * META_PRICES.outputPerMillion) / 1000000;
  return `about USD ${dollars.toFixed(2)} using approximate input tokens and the full output cap; about USD ${(2 * dollars).toFixed(2)} if every call uses its JSON retry. Actual usage can differ.`;
}

export async function executePlans(plans, {root = ROOT, apiKey, provider = callRanker, now = () => new Date().toISOString(), print = console.log} = {}) {
  syncSeedOne(root, apiKey);
  const results = [];
  for (const plan of missingPlans(root, plans, PROMPT_HASH)) {
    const call = await provider(plan.input, {apiKey, effort: plan.effort});
    const validated = validateRanking(plan.input, call.unavailable ? {sources: []} : call.raw, plan.references);
    if (call.unavailable) validated.ranking = {unavailable: true};
    validated.dropCounts.invalidJson = (call.rawAttempts || []).filter((text) => {try { JSON.parse(text); return false; } catch { return true; }}).length;
    const record = {
      recordId: recordIdentity(plan, PROMPT_HASH), runSet: plan.runSet, seed: plan.seed, day: plan.day,
      signalKey: plan.signalKey, repeat: plan.repeat, inputHash: hashOf(plan.input), input: plan.input,
      rawOutput: call.rawOutput, rawAttempts: call.rawAttempts, cleanedRanking: validated.ranking,
      dropCounts: validated.dropCounts, clueCounts: plan.clueCounts, model: call.model, effort: call.effort,
      promptHash: call.promptHash, date: now(), ms: call.ms, tokens: call.tokens, attempts: call.attempts,
      outcome: call.outcome,
    };
    saveRecord(root, plan, record, apiKey);
    const top = record.cleanedRanking.sources?.[0]?.sourceId || (record.cleanedRanking.unavailable ? "unavailable" : "none ranked");
    print(`${plan.runSet.padEnd(6)} seed ${String(plan.seed).padStart(2)} day ${plan.day}: ${top}`);
    results.push(record);
  }
  return results;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log("npm run rank:saved -- --set main|effort|repeat|swap|all [--seeds 1,2] [--effort low|medium] [--plan]");
    return;
  }
  const plans = planRankings(options);
  const pending = missingPlans(ROOT, plans, PROMPT_HASH);
  console.log(`Simulation: made-up data. Quiet runs checked: zero calls for every selected seed.`);
  console.log(`Planned records: ${plans.length}; completed and skipped: ${plans.length - pending.length}; missing or unavailable: ${pending.length}.`);
  for (const plan of pending) console.log(`${plan.runSet.padEnd(6)} seed ${String(plan.seed).padStart(2)} day ${plan.day} ${plan.effort}${plan.repeat ? ` repeat ${plan.repeat}` : ""}`);
  console.log(`Price checked ${META_PRICES.checked}: USD ${META_PRICES.inputPerMillion}/million input, USD ${META_PRICES.outputPerMillion}/million output.`);
  console.log(`Estimate: ${costEstimate(pending)}`);
  console.log(`At most ${pending.length * 2} HTTP attempts: one retry only for invalid JSON. No completed record is called again.`);
  if (options.planOnly) return;
  if (!pending.length) { syncSeedOne(ROOT); return; }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Use an interactive VS Code terminal for hidden key entry.");
  if (!await confirmRun(pending.length)) { console.log("No calls made."); return; }
  let apiKey = await readHiddenKey();
  try {
    const records = await executePlans(pending, {apiKey});
    console.log("\nPaste the following summary after Run done:");
    console.log("set | calls | unavailable | drops/repairs | ms | input tokens | output tokens");
    for (const set of [...new Set(records.map((record) => record.runSet))]) {
      const own = records.filter((record) => record.runSet === set);
      const sum = (of) => own.reduce((total, record) => total + of(record), 0);
      const tokens = (side) => own.some((record) => record.tokens[side] === null) ? "unknown" : sum((record) => record.tokens[side]);
      console.log(`${set} | ${own.length} | ${own.filter((record) => record.cleanedRanking.unavailable).length} | ${sum((record) => Object.values(record.dropCounts).reduce((a, b) => a + b, 0))} | ${sum((record) => record.ms)} | ${tokens("input")} | ${tokens("output")}`);
    }
    console.log(`Model ${RANK_SETTINGS.model}; prompt hash ${PROMPT_HASH}. Completed records are saved; reruns fill only missing or unavailable records.`);
  } finally { apiKey = ""; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    // Only fixed local messages can reach the terminal; never provider error text.
    const safe = ["Only tuning seeds", "Unknown flag", "Use main", "Effort must", "Use an interactive", "Key entry cancelled", "No key entered", "A quiet run"];
    console.error(safe.some((prefix) => error.message?.startsWith(prefix)) ? error.message : "Ranking runner stopped safely. Completed records remain saved; no request details were printed.");
    process.exitCode = 1;
  });
}
