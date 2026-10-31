import {pathToFileURL} from "node:url";
import {ROOT, parseHeldOut, preflight, verifyAnchor} from "./lib/heldoutGuards.mjs";
import {readHeldOut, journalState, replaceReport, REPORT_JSON, assertHeldOutArtifact} from "./lib/heldoutArtifacts.mjs";
import {validatePlan} from "./heldout-rank.mjs";
import {buildScorecard, scorecardMarkdown} from "./lib/heldoutScorecard.mjs";

export function main(args = process.argv.slice(2)) {
  parseHeldOut(args); preflight();
  const statistics = readHeldOut(ROOT,"docs/provenance/held-out/statistics.json");
  const bundle = readHeldOut(ROOT,"docs/provenance/held-out/ranking-plan.json");
  verifyAnchor(ROOT,statistics.proof);
  if (bundle.proofCommit !== statistics.proof.commit) throw new Error("Scorecard proof mismatch.");
  const state = journalState(ROOT,validatePlan(bundle));
  const report = buildScorecard(statistics,bundle,state.finished);
  assertHeldOutArtifact(report);
  replaceReport(ROOT,REPORT_JSON,JSON.stringify(report,null,2)+"\n");
  const markdown = scorecardMarkdown(report);
  replaceReport(ROOT,"docs/provenance/held-out/scorecard-held-out-seeds-11-20.md",markdown);
  console.log(markdown);
  console.log(`Planned records still missing: ${state.pending.length}.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {main();} catch {console.error("Held-out scorecard refused; review proof and saved records."); process.exitCode = 1;}
}
