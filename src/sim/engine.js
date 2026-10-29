// The replay engine: one simulated run of Kganya, made up from a seed and a
// scenario and never stored anywhere (not in Firestore, not in the repo).
// Signal code gets only what cardsUpTo returns, so it has to find the seeded
// cluster itself. No Firebase, no network, no sign-in: it runs the same in
// the browser and in Node. Outside src/sim/, this is the only simulation
// file anything may import (test/unit/sim-imports.test.js).
import { backgroundCards } from "./background.js";
import { makeCalendar } from "./calendar.js";
import { SCENARIOS } from "./scenarios.js";
import { redHerringCards, seededClusterCards } from "./seededCluster.js";

export const SCENARIO_NAMES = Object.keys(SCENARIOS);
// A Monday, in the future, with no South African public holiday in the
// 29-day replay window, and nowhere near the real event's dates.
export const DEFAULT_START_DATE = "2027-02-01";

function freezeRecord(record) {
  Object.freeze(record.card.exposure.types);
  Object.freeze(record.card.exposure);
  Object.freeze(record.card.observations);
  Object.freeze(record.card);
  return Object.freeze(record);
}

const isWholeNumber = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

// Day 0 is startDate; history days are negative, from -historyDays.
export function createRun({ seed = 1, scenario = "water", startDate = DEFAULT_START_DATE, historyDays = 84, replayDays = 29 } = {}) {
  if (!isWholeNumber(seed, 0, 4294967295)) throw new Error(`The seed must be a whole number from 0 to 4294967295, not ${seed}.`);
  if (!SCENARIO_NAMES.includes(scenario)) throw new Error(`Unknown scenario "${scenario}". Use one of: ${SCENARIO_NAMES.join(", ")}.`);
  if (!isWholeNumber(historyDays, 0, 3650) || !isWholeNumber(replayDays, 1, 3650)) throw new Error("historyDays and replayDays must be whole numbers of days.");
  const { seededCluster, redHerring } = SCENARIOS[scenario];
  const calendar = makeCalendar(startDate);
  const firstDay = -historyDays;
  const lastDay = replayDays - 1;

  const days = [];
  const records = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    const date = calendar.dateOf(day);
    days.push(Object.freeze({ day, date, weekday: calendar.weekdayOf(day) }));
    const cards = [
      ...backgroundCards({ seed, day, calendar }),
      ...seededClusterCards({ seed, day, calendar, config: seededCluster }),
      ...redHerringCards({ seed, day, calendar, config: redHerring }),
    ].sort((a, b) => a.createdAt - b.createdAt);
    // Numbered by time within the day, so an ID never says which cards were seeded.
    cards.forEach((card, index) => records.push(freezeRecord({ id: `sim-${date}-${String(index + 1).padStart(2, "0")}`, card })));
  }

  return Object.freeze({
    seed,
    scenario,
    startDate,
    firstDay,
    lastDay,
    days: Object.freeze(days),
    dayOf: calendar.dayOf,
    // Every card created up to the end of that SAST day, as { id, card }
    // (like a Firestore document's ID and data), oldest first.
    cardsUpTo(day) {
      if (!isWholeNumber(day, firstDay, lastDay)) throw new Error(`Day ${day} isn't in this run (${firstDay} to ${lastDay}).`);
      const end = calendar.dayStart(day + 1);
      return records.filter((record) => record.card.createdAt < end);
    },
  });
}
