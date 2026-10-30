import { matchSignal } from "../../functions/shared/rank/match.mjs";

let loading = null;
export function loadSavedRankings() {
  loading ??= import("../sim/saved-rankings/seed-1.json").then((module) => module.default).catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}

const snapshots = new WeakMap();
function candidatesFor(entries, replay, dayShown) {
  let byEntries = snapshots.get(replay);
  if (!byEntries) { byEntries = new WeakMap(); snapshots.set(replay, byEntries); }
  let byLastDay = byEntries.get(entries);
  if (!byLastDay) { byLastDay = new Map(); byEntries.set(entries, byLastDay); }
  const eligible = entries.filter((entry) => entry.day <= dayShown);
  const last = Math.max(0, ...eligible.map((entry) => entry.day));
  if (byLastDay.has(last)) return byLastDay.get(last);
  const byDay = new Map();
  let previous = [];
  for (let day = 0; day <= last; day++) {
    const signals = replay.resultFor("seeded", day).signals.map((signal) => ({ ...signal,
      signalKey: matchSignal(previous, signal)?.signalKey || `${signal.symptomGroup}|${signal.areas.join("+")}|day-${day}`,
    }));
    byDay.set(day, signals);
    previous = signals;
  }
  const candidates = eligible.filter((entry) => !entry.ranking.unavailable).map((entry) => ({
    entry, signal: byDay.get(entry.day)?.find((signal) => signal.signalKey === entry.signalKey),
  })).filter(({ signal }) => signal);
  byLastDay.set(last, candidates);
  return candidates;
}

// Latest eligible saved day first; group plus overlapping areas, with the
// frozen matchSignal tie-break. Evidence stays at that saved day's snapshot.
export function findSavedRanking(entries, replay, day, signal, runId = "seeded") {
  if (runId !== "seeded" || !["signal", "alert"].includes(signal.level)) return null;
  const candidates = candidatesFor(entries, replay, day);
  for (const savedDay of [...new Set(candidates.map(({ entry }) => entry.day))].sort((a, b) => b - a)) {
    const own = candidates.filter(({ entry }) => entry.day === savedDay);
    const match = matchSignal(own.map(({ signal: snapshot }) => snapshot), signal);
    if (match) {
      const { entry } = own.find(({ signal: snapshot }) => snapshot === match);
      return { entry, signal: match, cards: replay.cardsUpTo("seeded", savedDay) };
    }
  }
  return null;
}
