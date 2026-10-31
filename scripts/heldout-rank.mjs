import {join} from "node:path";
import {existsSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {ROOT, SEEDS, assertHeldOutSeeds, digest, parseHeldOut, preflight, verifyAnchor, git} from "./lib/heldoutGuards.mjs";
import {confirmRun, readHiddenKey} from "./lib/hiddenInput.mjs";
import {readHeldOut, appendJournal, identity, journalState} from "./lib/heldoutArtifacts.mjs";
import {heldOutProvider, PRICES, SPENDING_LIMIT, estimatedInput, cappedCost, chargedCost} from "./lib/heldoutProvider.mjs";
import {validateRanking} from "../functions/shared/rank/validate.mjs";

export const KEY_REMINDER = "Now delete the temporary key (Meta: ai.developer.meta.com, API keys) and clear clipboard history with Win+V.";
export function validatePlan(bundle) {
  if (bundle.version !== 1 || bundle.seeds.length !== 10 || bundle.seeds.some((row,index) => row.seed !== SEEDS[index])) throw new Error("Incomplete held-out plan.");
  const plans = bundle.seeds.flatMap((row) => row.plans);
  if (plans.length > 20 || new Set(plans.map(identity)).size !== plans.length) throw new Error("Invalid held-out event count.");
  for (const row of bundle.seeds) {
    assertHeldOutSeeds([row.seed]);
    for (const role of ["firstAlert", "day19"]) {
      if (row.plans.filter((plan) => plan.roles.includes(role)).length !== Number(row[role])) throw new Error("Invalid held-out event roles.");
    }
    for (const plan of row.plans) {
      if (plan.seed !== row.seed || plan.day < 0 || plan.day > 28 || plan.inputHash !== digest(plan.input) ||
          !["signal", "alert"].includes(plan.input.signal.level) || !plan.roles.length ||
          plan.roles.some((role) => !["firstAlert", "day19"].includes(role)) ||
          (plan.roles.includes("day19") && plan.day > 19) || (plan.roles.includes("firstAlert") && plan.input.signal.level !== "alert")) throw new Error("Invalid held-out input snapshot.");
    }
  }
  return plans;
}
export function printPlan(bundle, state, print = console.log) {
  for (const row of bundle.seeds) {
    print(`Seed ${row.seed}: ${row.firstAlert ? "first Alert selected" : "no Alert"}; ${row.day19 ? "day-19 event selected" : "none on day 19"}`);
    for (const plan of row.plans) print(`  ${plan.roles.join(" + ")}: evidence day ${plan.day}; ${state.pending.some((item) => identity(item) === identity(plan)) ? "pending" : "finished; skipped"}`);
  }
  const input = state.pending.reduce((sum,plan) => sum+estimatedInput(plan.input),0);
  const dollars = state.pending.reduce((sum,plan) => sum+cappedCost(plan.input),0);
  print(`Planned ${bundle.seeds.flatMap((row) => row.plans).length}; finished ${state.finished.length}; pending ${state.pending.length}.`);
  print(`Prices: ${PRICES.source}; checked ${PRICES.checked}; USD ${PRICES.inputPerMillion}/million input and ${PRICES.outputPerMillion}/million output.`);
  print(`Estimate: (${input} input * 1.25 + ${state.pending.length} * 8000 output * 4.25) / 1000000 = USD ${dollars.toFixed(6)}; with every transport retry USD ${(dollars*2).toFixed(6)}.`);
  print(`Estimated time ${(state.pending.length*9.7/60).toFixed(1)} minutes; at most ${state.pending.length*2} attempts of 60 seconds plus retry waits.`);
  print(`Pause at USD ${SPENDING_LIMIT}; every attempt with unknown usage is charged at its estimated input plus 8000 output cap. Invalid JSON is not retried.`);
}
export async function executeHeldOut(plans, {root = ROOT, apiKey, provider = heldOutProvider, print = console.log, now = () => new Date().toISOString()} = {}) {
  const state = journalState(root,plans);
  let spent = state.finished.reduce((sum,row) => sum+chargedCost(plans.find((plan) => identity(plan) === row.recordId).input,row.usage),0);
  for (const plan of state.pending) {
    if (spent >= SPENDING_LIMIT) { print(`Spending pause: accounted USD ${spent.toFixed(6)} reached USD ${SPENDING_LIMIT}. No further call made.`); break; }
    const recordId = identity(plan);
    appendJournal(root,{state:"started", seed:plan.seed, recordId, date:now()},apiKey);
    // A failed local persistence leaves the started marker, preventing automatic duplication.
    const reply = await provider(plan.input,{apiKey});
    const validated = validateRanking(plan.input,reply.unavailable ? {sources:[]} : reply.raw,plan.references);
    if (reply.outcome === "invalid_json") validated.dropCounts.invalidJson = 1;
    const {raw:_raw, ...safeReply} = reply;
    const row = {state:"finished", seed:plan.seed, recordId, day:plan.day, signalKey:plan.signalKey, roles:plan.roles,
      inputHash:plan.inputHash, input:plan.input, ...safeReply, cleanedRanking:reply.unavailable ? {unavailable:true} : validated.ranking,
      dropCounts:validated.dropCounts, date:now()};
    row.accountedCost = chargedCost(plan.input,row.usage);
    if (!reply.unavailable && !validated.ranking.sources?.length) {
      row.outcome = "guard_rejected"; row.cleanedRanking = {unavailable:true};
    }
    appendJournal(root,row,apiKey); spent += row.accountedCost;
    print(`Finished ${journalState(root,plans).finished.length}/${plans.length}; accounted USD ${spent.toFixed(6)}.`);
  }
  const final = journalState(root,plans);
  if (spent >= SPENDING_LIMIT) print(`Spending pause at USD ${spent.toFixed(6)}; no further calls are authorised.`);
  return {...final, spent};
}
export async function main(args = process.argv.slice(2), {root = ROOT, check = preflight, verify = verifyAnchor,
  runGit = git, print = console.log, confirm = confirmRun, readKey = readHiddenKey, execute = executeHeldOut} = {}) {
  const options = parseHeldOut(args,{dryRun:true});
  check(root);
  if (!existsSync(join(root,"docs/provenance/held-out/ranking-plan.json"))) throw new Error("No unlocked ranking plan; dry run is deferred until Part D.");
  const bundle = readHeldOut(root,"docs/provenance/held-out/ranking-plan.json");
  const proof = readHeldOut(root,"docs/provenance/held-out/pre-unlock-proof.json");
  verify(root,proof);
  if (bundle.proofCommit !== proof.commit) throw new Error("Ranking plan proof mismatch.");
  // Clean status plus Git tracking proves statistics and input snapshots were committed before calls.
  for (const file of ["statistics.json", "ranking-plan.json", "pre-unlock-proof.json"]) runGit(root,["ls-files", "--error-unmatch", `docs/provenance/held-out/${file}`]);
  const plans = validatePlan(bundle);
  const state = journalState(root,plans); printPlan(bundle,state,print);
  if (options.dryRun) return;
  if (!state.pending.length) {console.log("All planned records are finished; zero calls made."); console.log(KEY_REMINDER); return;}
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Use an interactive VS Code PowerShell terminal.");
  if (!await confirm(state.pending.length)) {print("No calls made."); return;}
  let apiKey = await readKey();
  try {
    const result = await execute(plans,{root,apiKey,print});
    console.log("Paste after Run done:");
    console.log(`finished ${result.finished.length}; pending ${result.pending.length}; unavailable ${result.finished.filter((row) => row.cleanedRanking.unavailable || !row.cleanedRanking.sources?.length).length}; accounted USD ${result.spent.toFixed(6)}`);
    const sum = (pick) => result.finished.reduce((total,row) => total+pick(row),0);
    const tokenSum = (side) => result.finished.some((row) => row.tokens[side] === null) ? "unknown; charged at cap" : sum((row) => row.tokens[side]);
    console.log(`attempts ${sum((row) => row.attempts)}; drops/repairs ${sum((row) => Object.values(row.dropCounts).reduce((a,b) => a+b,0))}; ms ${sum((row) => row.ms)}; input tokens ${tokenSum("input")}; output tokens ${tokenSum("output")}`);
  } finally {apiKey = ""; console.log(KEY_REMINDER);}
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  console.error("Held-out runner refused or stopped safely. Review clean status, committed plan, and interrupted records; no saved call will be repeated automatically.");
  console.error(KEY_REMINDER); process.exitCode = 1;
});
