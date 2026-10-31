import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {SIGNAL_SETTINGS} from "../../functions/shared/settings.mjs";
import {RANK_SETTINGS, PROVIDERS, BANNED_WORDS, BANNED_PREFIXES} from "../../functions/shared/rank/settings.mjs";
import {RANK_SCHEMA} from "../../functions/shared/rank/schema.mjs";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const FREEZE = "ab40db5";
export const SIGNAL_HASH = "abc36af17d67a689";
export const RANK_HASH = "01622c7f95af2326";
export const SEEDS = Object.freeze(Array.from({length:10}, (_, index) => index + 11));
export const SCOPE = "The existing fingerprint test generates seed 11 to 20 cards only to hash them. It computes no statistics, signals, rankings or outcomes from them. No held-out statistics, signals, rankings or outcomes were computed during Part C.";
export const CODE_PATHS = ["package.json", "scripts/heldout-*.mjs", "scripts/lib/heldout*.mjs", "scripts/scan-provenance.mjs"];
const require = createRequire(import.meta.url);
export const {SYSTEM_PROMPT, PROMPT_HASH} = require("../../functions/lib/callRanker.js");
export const digest = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
export const git = (root, args) => execFileSync("git", args, {cwd:root, encoding:"utf8", stdio:["ignore", "pipe", "pipe"]}).trim();

export function assertHeldOutSeeds(seeds) {
  if (!Array.isArray(seeds) || !seeds.length || seeds.some((seed) => !SEEDS.includes(seed))) throw new Error("Only held-out seeds 11 to 20 are allowed.");
}
export function parseHeldOut(args, {dryRun = false} = {}) {
  if (!args.includes("--held-out")) throw new Error("The explicit --held-out flag is required.");
  if (args.some((arg) => arg !== "--held-out" && !(dryRun && arg === "--dry-run"))) throw new Error("Unknown held-out option.");
  return {dryRun:args.includes("--dry-run")};
}
export function frozenHashes() {
  const signalHash = createHash("sha256").update(JSON.stringify(SIGNAL_SETTINGS)).update(SYSTEM_PROMPT)
    .update(JSON.stringify(RANK_SCHEMA)).update(JSON.stringify(RANK_SETTINGS)).update(JSON.stringify(PROVIDERS))
    .update(JSON.stringify(BANNED_WORDS)).update(JSON.stringify(BANNED_PREFIXES)).digest("hex").slice(0,16);
  return {signalHash, rankingPromptHash:PROMPT_HASH};
}
export function dependencyManifest(root = ROOT, runGit = git) {
  // Enumerate the original tree, never a hand-maintained subset of today's files.
  const paths = ["functions/shared", "src/sim", "functions/data/places.json", "functions/prompts/rank-sources.md",
    "functions/lib/callRanker.js", "functions/lib/rankTiming.js", "scripts/lib/rankPlans.mjs", "scripts/lib/rankArtifacts.mjs",
    "scripts/scorecard.mjs", "scripts/rank-saved.mjs", "test-fixtures/sim-move-fingerprints.json"];
  return runGit(root, ["ls-tree", "-r", "--name-only", FREEZE, "--", ...paths]).split(/\r?\n/).filter(Boolean).sort().map((file) => {
    const baselineBlob = runGit(root, ["rev-parse", `${FREEZE}:${file}`]);
    let headBlob = null;
    try { headBlob = runGit(root, ["rev-parse", `HEAD:${file}`]); } catch {}
    return {file, baselineBlob, headBlob, status:baselineBlob === headBlob ? "same" : "different"};
  });
}
export function fingerprintMatches(root = ROOT) {
  const fixture = JSON.parse(readFileSync(join(root, "test-fixtures/sim-move-fingerprints.json"), "utf8"));
  return SEEDS.map((seed) => ({seed, ...Object.fromEntries(["water", "none"].map((scenario) => {
    const run = createRun({seed, scenario});
    return [scenario, digest(run.cardsUpTo(run.lastDay)) === fixture.runs[`${seed}:${scenario}`] ? "match" : "no match"];
  }))}));
}
export function assertPreflight(proof) {
  if (!/^[a-f0-9]{40}$/.test(proof.commit || "") || proof.clean !== true) throw new Error("A clean working tree is required.");
  if (proof.signalHash !== SIGNAL_HASH || proof.rankingPromptHash !== RANK_HASH) throw new Error("Frozen hash mismatch; unlock refused.");
  if (!proof.dependencies.length || proof.dependencies.some((row) => row.status !== "same" || row.baselineBlob !== row.headBlob)) throw new Error("Frozen dependency differs; unlock refused.");
  if (proof.fingerprints.length !== 10 || SEEDS.some((seed) => !proof.fingerprints.some((row) => row.seed === seed && row.water === "match" && row.none === "match"))) throw new Error("Fingerprint mismatch; unlock refused.");
}
export function preflight(root = ROOT) {
  // Refuse dirt before generating even hash-only cards.
  if (git(root, ["--no-optional-locks", "status", "--porcelain"])) throw new Error("A clean working tree is required.");
  const proof = {version:1, commit:git(root, ["rev-parse", "HEAD"]), freezeCommit:git(root, ["rev-parse", FREEZE]), clean:true,
    ...frozenHashes(), dependencies:dependencyManifest(root), fingerprints:fingerprintMatches(root)};
  assertPreflight(proof);
  return proof;
}
export function verifyAnchor(root, proof) {
  assertPreflight(proof);
  if (proof.preUnlockStatement !== SCOPE || proof.heldOutOutcomesComputed !== false) throw new Error("Pre-unlock declaration missing.");
  git(root, ["merge-base", "--is-ancestor", proof.commit, "HEAD"]);
  git(root, ["diff", "--exit-code", proof.commit, "HEAD", "--", ...CODE_PATHS]);
}
