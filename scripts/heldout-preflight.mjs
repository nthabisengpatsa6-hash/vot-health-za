import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {ROOT, SCOPE, parseHeldOut, preflight} from "./lib/heldoutGuards.mjs";

export function printProof(proof, print = console.log) {
  print(`Pre-unlock commit: ${proof.commit}`);
  print(`Signal hash: ${proof.signalHash}; ranking prompt hash: ${proof.rankingPromptHash}; clean: ${proof.clean}`);
  for (const row of proof.dependencies) print(`${row.file}: ${row.status}`);
  for (const row of proof.fingerprints) print(`Seed ${row.seed}: water ${row.water}; quiet ${row.none}`);
  print(proof.preUnlockStatement);
}
export function main(args = process.argv.slice(2)) {
  parseHeldOut(args);
  const proof = {...preflight(), heldOutOutcomesComputed:false, preUnlockStatement:SCOPE};
  mkdirSync(join(ROOT, ".scratch"), {recursive:true});
  writeFileSync(join(ROOT, ".scratch/heldout-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  printProof(proof);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch { console.error("Pre-unlock checks refused; no held-out outcomes computed."); process.exitCode = 1; }
}
