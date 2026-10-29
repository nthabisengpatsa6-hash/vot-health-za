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
import { createRun } from "./engine.js";
import { groundTruth } from "./groundTruth.js";

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
