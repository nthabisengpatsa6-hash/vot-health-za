import { SYMPTOM_GROUPS } from "../config/cardOptions.js";

export function nearbySignals(result, town, area) {
  const nearby = new Set([area, ...(town.areas.find((item) => item.name === area)?.neighbours || [])]);
  return result.signals.filter((signal) => signal.areas.some((name) => nearby.has(name)));
}

export function weeklyCounts(replay, runId, day, area) {
  return SYMPTOM_GROUPS.map(({ value, label }) => {
    const chart = replay.chartFor(runId, day, { symptomGroup: value, areas: [area] });
    const days = chart.days.slice(-7);
    const counts = replay.chartWindow(chart, { from: days[0].date, to: days.at(-1).date });
    return { value, label, ...counts };
  }).filter((entry) => entry.observed.cards > 0);
}
