// The scorecard: the only place the statistics meet the ground truth
// (test/unit/sim-imports.test.js). It replays a run day by day through
// computeSignals, as the public replay will, then marks each signal against
// what the scenario really planted. Signal code never sees any of this.
//
// Seeds 1 to 10 are the tuning set: thresholds were changed after seeing
// them. Seeds 11 to 20 are held out for the Day 8 published scorecard and
// aren't scored before the thresholds are frozen at the end of Day 5.
import places from "../../functions/data/places.json" with { type: "json" };
import { computeSignals, LEVELS } from "../../functions/shared/signals.mjs";
import { dayEnd, dayOfDate } from "../../functions/shared/sastDay.mjs";
import { createRun } from "../../functions/shared/sim/engine.mjs";
import { groundTruth } from "./groundTruth.js";
import { clueCounts } from "../../functions/shared/rank/clues.mjs";

export const TUNING_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const HELD_OUT_SEEDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const atLeast = (level, wanted) => LEVELS.indexOf(level) >= LEVELS.indexOf(wanted);
const candidateNames = (signal) => signal.sources.filter((source) => source.candidate).map((source) => source.name);

// Every replay day of one run, scored. `cluster` is null for a scenario
// with no seeded cluster.
export function scoreRun({ seed, scenario, settings, allowHeldOut = false }) {
  if (HELD_OUT_SEEDS.includes(seed) && !allowHeldOut) throw new Error(`Seed ${seed} is held out for the Day 8 scorecard and isn't scored before the thresholds are frozen.`);
  const run = createRun({ seed, scenario });
  const truth = groundTruth(scenario);
  const dayZero = dayOfDate(run.startDate);
  const worksLayer = truth.cause ? `water:${truth.cause.works}` : null;
  const schoolLayer = truth.redHerring ? `school:${truth.redHerring.school}` : null;
  const score = {
    seed,
    scenario,
    days: run.lastDay + 1,
    cluster: truth.cause ? { symptomGroup: truth.symptomGroups[0], startDay: truth.clusterStartDay, first: Object.fromEntries(LEVELS.map((level) => [level, null])), worksFirstCandidate: null, worksFirstRanked: null, otherGroups: [] } : null,
    // Alert signal-days by the path that made them Alerts.
    alertPaths: { source: 0, severity: 0, both: 0 },
    school: [],
    falseAlarms: [],
  };

  for (let day = 0; day <= run.lastDay; day += 1) {
    const result = computeSignals({ cards: run.cardsUpTo(day), asOf: dayEnd(dayZero + day), town: places, settings });
    for (const signal of result.signals) {
      if (signal.level === "alert") {
        const { candidateSource, severityFlags } = signal.checks;
        score.alertPaths[candidateSource && severityFlags ? "both" : candidateSource ? "source" : "severity"] += 1;
      }
      const school = signal.sources.find((source) => source.layer === schoolLayer);
      if (school && school.candidate) score.school.push({ day, symptomGroup: signal.symptomGroup, level: signal.level, order: school.order, of: candidateNames(signal).length });

      const isCluster = truth.cause !== null && day >= truth.clusterStartDay && truth.symptomGroups.includes(signal.symptomGroup) && signal.areas.some((area) => truth.affectedAreas.includes(area));
      if (!isCluster) {
        score.falseAlarms.push({ day, level: signal.level, symptomGroup: signal.symptomGroup, areas: signal.areas, windowDays: signal.timeWindow.days, observed: signal.observed, expected: signal.expected });
      } else if (signal.symptomGroup !== score.cluster.symptomGroup) {
        score.cluster.otherGroups.push({ day, level: signal.level, symptomGroup: signal.symptomGroup, areas: signal.areas });
      } else {
        markCluster(score.cluster, signal, day, worksLayer);
      }
    }
  }
  return score;
}

function markCluster(cluster, signal, day, worksLayer) {
  const works = signal.sources.find((source) => source.layer === worksLayer);
  if (works.candidate && cluster.worksFirstCandidate === null) cluster.worksFirstCandidate = day;
  if (works.order === 1 && cluster.worksFirstRanked === null) cluster.worksFirstRanked = day;
  for (const level of LEVELS) {
    if (cluster.first[level] !== null || !atLeast(signal.level, level)) continue;
    cluster.first[level] = { day, daysAfterStart: day - cluster.startDay, areas: signal.areas, observed: signal.observed, expected: signal.expected, worksCandidate: works.candidate, worksOrder: works.order, candidates: candidateNames(signal) };
  }
}

// Evaluation alone knows the hidden answer. The runner never imports this file.
export function rankingScorecard(records, {effort = "low", promptHash} = {}) {
  const truth = groundTruth("water");
  const works = `water:${truth.cause.works}`;
  const school = `school:${truth.redHerring.school}`;
  const shop = `shop:${places.shops[0].name}`;
  const chosen = records.filter((record) => !promptHash || record.promptHash === promptHash);
  const complete = (record) => Array.isArray(record?.cleanedRanking?.sources);
  const last = (entries) => entries.filter(complete).at(-1) || entries.at(-1);
  const rank = (record, source) => !record ? "missing" : !complete(record) ? "unavailable" : record.cleanedRanking.sources.find((entry) => entry.sourceId === source)?.rank ?? "not ranked";
  const mainFor = (seed, selectedEffort = effort) => chosen.filter((record) => record.seed === seed && record.runSet === "main" && record.effort === selectedEffort);
  const rows = [];
  const firstDays = new Map();
  for (const seed of TUNING_SEEDS) {
    const score = scoreRun({seed, scenario: "water"});
    const day = score.cluster.first.alert?.day;
    firstDays.set(seed, day);
    const run = createRun({seed, scenario: "water"});
    const cards = run.cardsUpTo(day);
    const signal = computeSignals({cards, asOf: dayEnd(dayOfDate(run.startDate) + day), town: places}).signals.find((entry) => entry.level === "alert" && entry.symptomGroup === truth.symptomGroups[0]);
    const statisticsLead = signal.sources.find((source) => source.candidate && source.order === 1)?.name || "none";
    const clues = clueCounts(cards.filter(({id}) => signal.cardIds.includes(id)), places);
    const own = mainFor(seed);
    const first = last(own.filter((record) => record.day === day));
    const firstRanked = own.filter((record) => rank(record, works) === 1).map((record) => record.day).sort((a, b) => a - b)[0] ?? "not ranked in saved calls";
    const drops = {};
    for (const record of own) for (const [name, value] of Object.entries(record.dropCounts)) drops[name] = (drops[name] || 0) + value;
    const dropText = Object.entries(drops).filter(([, value]) => value).map(([name, value]) => `${name}: ${value}`).join(", ") || (own.length ? "0" : "missing");
    rows.push({seed, day, text: `| ${seed} | ${day} | ${statisticsLead} | ${rank(first, works)} | ${clues.water} / ${clues.food} / ${clues.schoolEvent} / ${clues.namedPlace} | ${firstRanked} | ${rank(first, school)} | ${dropText} |`});
  }
  const lines = ["# Tuning seeds 1 to 10", "", "Simulation: made-up data. These are tuning results, not held-out results.", "",
    `Main effort: ${effort}. Prompt hash: ${promptHash || "all saved versions"}. Missing and unavailable results are shown explicitly.`, "",
    "First ranked day means first saved ranking day; unchanged days have no new model call.", "",
    "| Seed | First Alert | Statistics lead | Works A rank | Clues: water / food / school event / named place | First saved day Works A ranks 1 | School rank at first Alert | Drops and repairs, all attempts |",
    "|---|---|---|---|---|---|---|---|", ...rows.map((row) => row.text), "",
    "At the first Alert in seeds 2, 8 and 9, the school event (the red herring) ranked above works A, while school-event mentions outnumbered water mentions on those cards; works A ranked first by day 18 or 19.", "",
    "## Shop leads statistically at first Alert", "", "Seeds 2, 4, 5, 8 and 9:", "",
    "| Seed | First Alert | Statistics lead | Works A rank | Clues: water / food / school event / named place | First saved day Works A ranks 1 | School rank at first Alert | Drops and repairs, all attempts |",
    "|---|---|---|---|---|---|---|---|", ...rows.filter((row) => [2, 4, 5, 8, 9].includes(row.seed)).map((row) => row.text), "",
    "## Quiet runs", "", "| Seed | Planned ranking calls |", "|---|---|"];
  for (const seed of TUNING_SEEDS) {
    const quiet = scoreRun({seed, scenario: "none"});
    lines.push(`| ${seed} | ${quiet.falseAlarms.filter((entry) => entry.level !== "watch").length} |`);
  }
  lines.push("", "## Repeats", "", "| Call | Top source |", "|---|---|");
  const top = (record) => !record ? "missing" : !complete(record) ? "unavailable" : record.cleanedRanking.sources[0]?.sourceId || "none ranked";
  lines.push(`| Main | ${top(last(mainFor(1).filter((record) => record.day === firstDays.get(1))))} |`);
  for (let repeat = 1; repeat <= 2; repeat++) lines.push(`| Extra ${repeat} | ${top(last(chosen.filter((record) => record.runSet === "repeat" && record.repeat === repeat && record.effort === effort)))} |`);
  lines.push("", "## Low versus medium", "", "| Seed | Low: top source / Works A rank | Medium: top source / Works A rank |", "|---|---|---|");
  for (const seed of [2, 4, 5, 8, 9]) {
    const low = last(mainFor(seed, "low").filter((record) => record.day === firstDays.get(seed)));
    const medium = last(chosen.filter((record) => record.seed === seed && record.runSet === "effort" && record.effort === "medium"));
    lines.push(`| ${seed} | ${top(low)} / ${rank(low, works)} | ${top(medium)} / ${rank(medium, works)} |`);
  }
  lines.push("", "## Swapped clues", "", "Clue-derived summaries change with the swapped cards; levels and numerical comparisons stay identical.", "",
    "| Seed | Works A before | Works A after | Leeba View shop before | Leeba View shop after |", "|---|---|---|---|---|");
  for (const seed of [1, 3, 5, 7, 10]) {
    const before = last(mainFor(seed).filter((record) => record.day === firstDays.get(seed)));
    const after = last(chosen.filter((record) => record.seed === seed && record.runSet === "swap" && record.effort === effort));
    lines.push(`| ${seed} | ${rank(before, works)} | ${rank(after, works)} | ${rank(before, shop)} | ${rank(after, shop)} |`);
  }
  lines.push("", "With identical statistics, the clinicians' words decided the top source when the statistics were close (seed 5). They moved the shop up but did not overturn a clear statistical lead (seeds 1, 3, 7 and 10).");
  return lines.join("\n") + "\n";
}
