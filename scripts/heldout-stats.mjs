import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {ROOT, SEEDS, parseHeldOut, preflight, verifyAnchor} from "./lib/heldoutGuards.mjs";
import {writeHeldOut} from "./lib/heldoutArtifacts.mjs";
import {planSeed} from "./lib/heldoutPlans.mjs";
import {collectStatistics, reconcileTuning, statisticsMarkdown} from "./lib/heldoutScorecard.mjs";

export function main(args = process.argv.slice(2)) {
  parseHeldOut(args); preflight();
  const proof = JSON.parse(readFileSync(join(ROOT,".scratch/heldout-proof.json"),"utf8"));
  verifyAnchor(ROOT,proof);
  for (const file of ["pre-unlock-proof.json","statistics.json","ranking-plan.json"]) if (existsSync(join(ROOT,"docs/provenance/held-out",file))) throw new Error("Held-out results already exist; no second run is authorised.");
  const tuning = collectStatistics(Array.from({length:10},(_,index) => index+1));
  const heldOut = collectStatistics(SEEDS,{allowHeldOut:true});
  const statistics = {version:1, proof, tuning, heldOut, tuningReconciliation:reconcileTuning(tuning)};
  const bundle = {version:1, proofCommit:proof.commit, seeds:SEEDS.map((seed) => planSeed(seed))};
  writeHeldOut(ROOT,"docs/provenance/held-out/pre-unlock-proof.json",proof);
  writeHeldOut(ROOT,"docs/provenance/held-out/statistics.json",statistics);
  writeHeldOut(ROOT,"docs/provenance/held-out/ranking-plan.json",bundle);
  console.log(statisticsMarkdown(statistics));
  console.log("Statistics and selected inputs saved. Commit these results before any paid call.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {main();} catch {console.error("Held-out statistics refused or stopped; existing results were not overwritten. Review before any further run."); process.exitCode = 1;}
}
