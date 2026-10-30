// The public replay's data: two runs of the demo town, the signals on each
// replay day, and the cards that arrived that day. Made on the fly in the
// browser and never stored. The engine and the statistics are passed in:
// only the /demo route loads them, with import() (test/unit/
// sim-imports.test.js), and the tests pass them in Node.

// Seed 1 has been the engine's default since Task 12, before any statistics
// existed, so it wasn't picked for its results. There's no seed picker:
// seeds 11 to 20 are held out for the Day 8 scorecard.
export const REPLAY_SEED = 1;
// Replay days 0 to 28, the engine's own default.
export const REPLAY_DAYS = 29;
export const LAST_DAY = REPLAY_DAYS - 1;

// The labels never say what was planted.
export const RUNS = [
  { id: "seeded", label: "Seeded run", scenario: "water" },
  { id: "quiet", label: "Quiet run", scenario: "none" },
];

export function createReplay({ createRun, computeSignals, dayEnd, dayOfDate, town }) {
  const runs = new Map();
  const results = new Map();
  const runFor = (runId) => {
    if (!runs.has(runId)) {
      const { scenario } = RUNS.find((run) => run.id === runId);
      runs.set(runId, createRun({ seed: REPLAY_SEED, scenario, replayDays: REPLAY_DAYS }));
    }
    return runs.get(runId);
  };
  // The instant a replay day ends, as computeSignals takes it.
  const endOf = (run, day) => dayEnd(dayOfDate(run.startDate) + day);

  const first = runFor(RUNS[0].id);
  const resultFor = (runId, day) => {
    const key = `${runId}|${day}`;
    if (!results.has(key)) {
      const run = runFor(runId);
      results.set(key, computeSignals({ cards: run.cardsUpTo(day), asOf: endOf(run, day), town }));
    }
    return results.get(key);
  };

  return {
    dateOf: (day) => first.days.find((entry) => entry.day === day).date,
    resultFor,
    cardsUpTo: (runId, day) => runFor(runId).cardsUpTo(day),
    // The cards created on that replay day, newest first.
    cardsOn(runId, day) {
      const run = runFor(runId);
      const start = endOf(run, day - 1);
      return run.cardsUpTo(day).filter(({ card }) => card.createdAt >= start).reverse();
    },
    // The first day of the unbroken stretch at the area's level that day.
    levelSince(runId, day, area) {
      const level = resultFor(runId, day).areaLevels[area];
      let since = day;
      while (since > 0 && resultFor(runId, since - 1).areaLevels[area] === level) since -= 1;
      return since;
    },
  };
}
