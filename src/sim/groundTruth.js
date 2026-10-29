// The hidden facts behind each scenario, for the Day 8 scorecard only. The
// replay and signal code must never see them: test/unit/sim-imports.test.js
// fails if anything but the scorecard (src/sim/scorecard.js) or a test
// imports this file. Read from the scenario settings, not copied.
import { SCENARIOS } from "./scenarios.js";
import { AREA_NAMES } from "./town.js";

export function groundTruth(scenario) {
  const config = SCENARIOS[scenario];
  if (!config) throw new Error(`Unknown scenario "${scenario}".`);
  const { seededCluster: cluster, redHerring: herring } = config;
  const affectedAreas = cluster ? Object.keys(cluster.areas) : [];
  return {
    scenario,
    cause: cluster ? { kind: "water works", works: cluster.works, failureDay: cluster.failureDay } : null,
    clusterStartDay: cluster ? cluster.startDay : null,
    affectedAreas,
    comparisonAreas: cluster ? AREA_NAMES.filter((name) => !affectedAreas.includes(name)) : [],
    redHerring: herring ? { kind: "school event", event: herring.event, school: herring.school, day: herring.day } : null,
  };
}
