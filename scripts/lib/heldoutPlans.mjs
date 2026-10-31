import town from "../../functions/data/places.json" with {type:"json"};
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {dayEnd, dayOfDate} from "../../functions/shared/sastDay.mjs";
import {matchSignal, rankingChange} from "../../functions/shared/rank/match.mjs";
import {buildRankInput} from "../../functions/shared/rank/input.mjs";
import {digest} from "./heldoutGuards.mjs";

// No answer key is accepted or imported. Metadata outside signals/cards is ignored.
// Dependencies can be replaced by offline tests; the CLI never exposes overrides.
export function selectEvents(seed, {run = createRun({seed, scenario:"water"}), compute = computeSignals} = {}) {
  let previous = [];
  let firstAlert = null;
  let day19 = null;
  const events = [];
  for (let day = 0; day <= run.lastDay; day++) {
    const cards = run.cardsUpTo(day);
    const signals = compute({cards, asOf:dayEnd(dayOfDate(run.startDate) + day), town}).signals;
    for (const signal of signals) {
      const prev = matchSignal(previous, signal);
      signal.signalKey = prev?.signalKey || `${signal.symptomGroup}|${signal.areas.join("+")}|day-${day}`;
      const changes = rankingChange(prev, signal);
      if (changes.length) events.push({seed, day, signalKey:signal.signalKey, signal, cards, changes});
      if (!firstAlert && signal.level === "alert") firstAlert = {seed, day, signalKey:signal.signalKey, signal, cards};
    }
    if (day === 19) {
      const eligible = signals.filter((signal) => ["signal", "alert"].includes(signal.level));
      const active = (firstAlert && matchSignal(eligible, firstAlert.signal)) || eligible[0];
      if (active) {
        // Same latest-day / frozen matching convention as the saved replay loader.
        for (const savedDay of [...new Set(events.map((event) => event.day))].sort((a,b) => b-a)) {
          const own = events.filter((event) => event.day === savedDay);
          const match = matchSignal(own.map((event) => event.signal), active);
          if (match) { day19 = own.find((event) => event.signal === match); break; }
        }
      }
    }
    previous = signals;
  }
  return {firstAlert, day19, events};
}
export const eventKey = (event) => `${event.seed}|${event.day}|${event.signalKey}`;
export function planSeed(seed, dependencies) {
  const selected = selectEvents(seed, dependencies);
  const plans = [];
  for (const [role, event] of [["firstAlert", selected.firstAlert], ["day19", selected.day19]]) {
    if (!event) continue;
    const existing = plans.find((plan) => plan.eventKey === eventKey(event));
    if (existing) { existing.roles.push(role); continue; }
    const built = buildRankInput(event.signal, event.cards, town);
    plans.push({seed, day:event.day, signalKey:event.signalKey, eventKey:eventKey(event), roles:[role],
      ...built, inputHash:digest(built.input)});
  }
  return {seed, firstAlert:!!selected.firstAlert, day19:!!selected.day19, plans};
}
