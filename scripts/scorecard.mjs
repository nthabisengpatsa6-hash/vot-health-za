// Prints the scorecard for the tuning seeds (1 to 10) under both scenarios
// (made-up data): when works A's seeded cluster reached Watch, Signal and
// Alert, whether works A was a candidate source then, whether the red
// herring's school catchment ever was, how each Alert was reached, and
// every false alarm. Then the time one computeSignals call takes at day 28.
// Writes nothing. Seeds 11 to 20 are held out for Day 8 and not run here.
//
// Usage: node scripts/scorecard.mjs

import {existsSync, mkdirSync, readdirSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {readRecords} from "./lib/rankArtifacts.mjs";
import {createRequire} from "node:module";
import { performance } from "node:perf_hooks";
import places from "../functions/data/places.json" with { type: "json" };
import { dayEnd, dayOfDate } from "../functions/shared/sastDay.mjs";
import { computeSignals } from "../functions/shared/signals.mjs";
import { createRun } from "../functions/shared/sim/engine.mjs";
import { scoreRun, rankingScorecard, TUNING_SEEDS } from "../src/sim/scorecard.js";

if (process.argv.includes("--rankings")) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const base = join(root, "docs/provenance/rankings");
  const files = [base, join(base, "experiments")].flatMap((dir) => existsSync(dir) ? readdirSync(dir).filter((name) => /^seed-\d{2}\.json$/.test(name)).map((name) => join(dir, name)) : []);
  const records = files.flatMap(readRecords);
  const effort = process.argv.includes("--effort") ? process.argv[process.argv.indexOf("--effort") + 1] : "low";
  if (!["low", "medium"].includes(effort)) throw new Error("Effort must be low or medium.");
  const {PROMPT_HASH} = createRequire(import.meta.url)("../functions/lib/callRanker.js");
  const markdown = rankingScorecard(records, {effort, promptHash: PROMPT_HASH});
  mkdirSync(base, {recursive: true});
  writeFileSync(join(base, "scorecard-tuning-seeds-1-10.md"), markdown);
  console.log(markdown);
} else {
const short = (areas) => areas.map((name) => name.split(" ")[0]).join("+");
const pad = (value, width) => String(value).padEnd(width);
const reached = (entry) => (entry ? `${entry.day} (+${entry.daysAfterStart})` : "never");
// Days as runs: [18, 19, 20, 24] reads "18–20, 24".
function dayRuns(days) {
  const runs = [];
  for (const day of [...new Set(days)].sort((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last && day === last[1] + 1) last[1] = day;
    else runs.push([day, day]);
  }
  return runs.map(([from, to]) => (from === to ? String(from) : `${from}–${to}`)).join(", ");
}
// Entries that share everything but the day, as one line each.
function grouped(entries, keyOf) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    groups.set(key, [...(groups.get(key) || []), entry.day]);
  }
  return [...groups].map(([key, days]) => `${key} on day${days.length > 1 ? "s" : ""} ${dayRuns(days)}`);
}
const alarm = (entry) => `day ${entry.day} ${entry.level} ${entry.symptomGroup} ${short(entry.areas)} (${entry.windowDays} days: ${entry.observed.cases} cases on ${entry.observed.cards} cards, usually ${entry.expected.cases})`;

console.log("Simulation: made-up data");
console.log("");
console.log(`${places.town} scorecard: seeds ${TUNING_SEEDS[0]} to ${TUNING_SEEDS.at(-1)}, the tuning set (seeds 11 to 20 are held out for Day 8). Replay days 0 to 28; "+N" is days after the seeded cluster starts.`);

const totals = {};
for (const scenario of ["water", "none"]) {
  const scores = TUNING_SEEDS.map((seed) => scoreRun({ seed, scenario }));
  const falseByLevel = { watch: 0, signal: 0, alert: 0 };
  const paths = { source: 0, severity: 0, both: 0 };
  for (const score of scores) {
    for (const entry of score.falseAlarms) falseByLevel[entry.level] += 1;
    for (const path of Object.keys(paths)) paths[path] += score.alertPaths[path];
  }
  totals[scenario] = { falseByLevel, paths };

  console.log("");
  if (scores[0].cluster) {
    console.log(`Scenario "${scenario}": works A's ${scores[0].cluster.symptomGroup} (the seeded cluster, from day ${scores[0].cluster.startDay})`);
    console.log(`${pad("seed", 5)}${pad("Watch", 9)}${pad("Signal", 9)}${pad("Alert", 9)}${pad("candidates at first Alert", 52)}${pad("works A: candidate, #1", 24)}${pad("school candidate", 30)}${pad("Alerts: source/severity/both", 30)}false alarms`);
    for (const score of scores) {
      const { first } = score.cluster;
      const atAlert = first.alert ? first.alert.candidates.join(", ") || "none" : "-";
      const works = `day ${score.cluster.worksFirstCandidate ?? "-"}, day ${score.cluster.worksFirstRanked ?? "-"}`;
      const ownSchool = score.school.filter((entry) => entry.symptomGroup === score.cluster.symptomGroup);
      const school = ownSchool.length === 0 ? "never" : ownSchool.map((entry) => `day ${entry.day} #${entry.order} of ${entry.of}`).join("; ");
      const alertPaths = `${score.alertPaths.source}/${score.alertPaths.severity}/${score.alertPaths.both}`;
      console.log(`${pad(score.seed, 5)}${pad(reached(first.watch), 9)}${pad(reached(first.signal), 9)}${pad(reached(first.alert), 9)}${pad(atAlert, 52)}${pad(works, 24)}${pad(school, 30)}${pad(alertPaths, 30)}${score.falseAlarms.length}`);
    }
    const others = scores.flatMap((score) => score.cluster.otherGroups.map((entry) => ({ seed: score.seed, ...entry })));
    console.log(`The seeded cluster in other symptom groups (not false alarms):${others.length === 0 ? " none" : ""}`);
    for (const line of grouped(others, (entry) => `seed ${entry.seed}: ${entry.level} ${entry.symptomGroup} ${short(entry.areas)}`)) console.log(`  ${line}`);
    const otherSchool = scores.flatMap((score) => score.school.filter((entry) => entry.symptomGroup !== score.cluster.symptomGroup).map((entry) => ({ seed: score.seed, ...entry })));
    console.log(`The school catchment as a candidate in other symptom groups:${otherSchool.length === 0 ? " never" : ""}`);
    for (const line of grouped(otherSchool, (entry) => `seed ${entry.seed}: ${entry.symptomGroup}, #${entry.order} of ${entry.of}`)) console.log(`  ${line}`);
  } else {
    console.log(`Scenario "${scenario}": no seeded cluster, so every signal is a false alarm`);
  }
  console.log(`False alarms (signal-days): ${falseByLevel.watch} Watch, ${falseByLevel.signal} Signal, ${falseByLevel.alert} Alert`);
  for (const score of scores) for (const entry of score.falseAlarms) console.log(`  seed ${score.seed}: ${alarm(entry)}`);
  console.log(`Alert signal-days by path: ${paths.source} candidate source only, ${paths.severity} severity only, ${paths.both} both`);
}

// One computeSignals call at day 28, as the replay makes once per day shown.
const run = createRun({ seed: 1, scenario: "water" });
const cards = run.cardsUpTo(28);
const asOf = dayEnd(dayOfDate(run.startDate) + 28);
const times = [];
for (let call = 0; call < 55; call += 1) {
  const started = performance.now();
  computeSignals({ cards, asOf, town: places });
  if (call >= 5) times.push(performance.now() - started);
}
times.sort((a, b) => a - b);
console.log("");
console.log(`computeSignals at day 28 (seed 1, "water", ${cards.length} cards): median ${times[25].toFixed(2)} ms, slowest ${times.at(-1).toFixed(2)} ms over 50 calls after 5 warm-up calls.`);

}
