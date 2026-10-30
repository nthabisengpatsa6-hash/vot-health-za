import town from "../../functions/data/places.json" with {type: "json"};
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {dayEnd, dayOfDate, dateOf, dayOf} from "../../functions/shared/sastDay.mjs";
import {exposureLayers} from "../../functions/shared/layers.mjs";
import {buildRankInput} from "../../functions/shared/rank/input.mjs";
import {matchSignal, rankingChange} from "../../functions/shared/rank/match.mjs";
import {clueCounts} from "../../functions/shared/rank/clues.mjs";

export const EFFORT_SEEDS = [2, 4, 5, 8, 9];
export const SWAP_SEEDS = [1, 3, 5, 7, 10];
export const TUNING_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const WATER = ["the tap water had a bad smell", "the water came out cloudy", "the tap water tastes strange", "mothers say the tap water looks dirty", "metsi a pompo a nkga", "ba re metsi a pompo a ditshila"];
const FOOD = ["ate leftover food", "food from a street vendor", "bought food at the spaza shop", "ate at a family function"];
export const SWAP_WORDS = Object.fromEntries([...WATER.map((words, index) => [words, FOOD[index % FOOD.length]]), ...FOOD.map((words, index) => [words, WATER[index]])]);

export function assertTuningSeeds(seeds) {
  if (!seeds.length || seeds.some((seed) => !Number.isInteger(seed) || seed < 1 || seed > 10)) {
    throw new Error("Only tuning seeds 1 to 10 are allowed. Seed 11 and higher remain locked.");
  }
}

export function replayRankingDays(seed, scenario = "water") {
  assertTuningSeeds([seed]);
  const run = createRun({seed, scenario});
  const events = [];
  let previous = [];
  let firstAlert = null;
  for (let day = 0; day <= run.lastDay; day++) {
    const cards = run.cardsUpTo(day);
    const signals = computeSignals({cards, asOf: dayEnd(dayOfDate(run.startDate) + day), town}).signals;
    for (const signal of signals) {
      const prev = matchSignal(previous, signal);
      signal.signalKey = prev?.signalKey || `${signal.symptomGroup}|${signal.areas.join("+")}|day-${day}`;
      const changes = rankingChange(prev, signal);
      if (changes.length) events.push({seed, day, signalKey: signal.signalKey, signal, cards, changes});
      if (!firstAlert && signal.level === "alert") firstAlert = {seed, day, signalKey: signal.signalKey, signal, cards};
    }
    previous = signals;
  }
  return {events, firstAlert};
}

// Test fixture only: change clue data, never recompute a level or numerical comparison.
export function swapClues(signal, cards) {
  const ids = new Set(signal.cardIds);
  const swapped = cards.map((record) => {
    if (!ids.has(record.id) || !record.card.exposure.types.some((type) => type === "water" || type === "food")) return record;
    const exposure = record.card.exposure;
    if (!Object.hasOwn(SWAP_WORDS, exposure.words)) throw new Error("The swap fixture has an unmapped exposure phrase.");
    return {...record, card: {...record.card, exposure: {
      types: exposure.types.map((type) => type === "water" ? "food" : type === "food" ? "water" : type), words: SWAP_WORDS[exposure.words],
    }}};
  });
  const sourceLayers = exposureLayers(town);
  const changed = {...signal, cardsByExposure: {}, sources: signal.sources.map((source) => {
    const own = swapped.filter(({card}) => card.symptomGroup === signal.symptomGroup && source.inside.areas.includes(card.area) &&
      dateOf(dayOf(card.createdAt)) >= signal.timeWindow.from && dateOf(dayOf(card.createdAt)) <= signal.timeWindow.to);
    const supporting = source.supporting.filter((fact) => !["exposureMentioned", "nameMentioned"].includes(fact.kind));
    for (const type of sourceLayers.find((layer) => layer.id === source.layer).clues) {
      const mentioning = own.filter(({card}) => card.exposure.types.includes(type));
      if (mentioning.length) supporting.push({kind: "exposureMentioned", type, cards: mentioning.length, cardIds: mentioning.map(({id}) => id)});
    }
    const naming = own.filter(({card}) => (card.exposure.words || "").toLowerCase().includes(source.name.toLowerCase()));
    if (naming.length) supporting.push({kind: "nameMentioned", cards: naming.length, cardIds: naming.map(({id}) => id)});
    return {...source, supporting};
  })};
  for (const {id, card} of swapped) if (ids.has(id)) for (const type of card.exposure.types.length ? card.exposure.types : ["none"]) {
    changed.cardsByExposure[type] = (changed.cardsByExposure[type] || 0) + 1;
  }
  return {signal: changed, cards: swapped};
}

export function planRankings({sets = ["main"], seeds = TUNING_SEEDS, effort = "low"} = {}) {
  assertTuningSeeds(seeds);
  if (!["low", "medium"].includes(effort)) throw new Error("Effort must be low or medium.");
  const selected = sets.includes("all") ? ["main", "effort", "repeat", "swap"] : sets;
  if (!selected.length || selected.some((set) => !["main", "effort", "repeat", "swap"].includes(set))) throw new Error("Use main, effort, repeat, swap, or all.");
  const plans = [];
  const main = new Map();
  for (const seed of seeds) {
    if (replayRankingDays(seed, "none").events.length) throw new Error("A quiet run planned ranking calls; the run is aborted.");
    main.set(seed, replayRankingDays(seed));
  }
  function add(event, runSet, chosenEffort, repeat = 0) {
    const {signal, cards} = runSet === "swap" ? swapClues(event.signal, event.cards) : event;
    const built = buildRankInput(signal, cards, town);
    const own = cards.filter(({id}) => signal.cardIds.includes(id));
    plans.push({runSet, seed: event.seed, day: event.day, signalKey: event.signalKey, effort: chosenEffort, repeat,
      ...built, clueCounts: clueCounts(own, town), changes: event.changes || []});
  }
  for (const set of [...new Set(selected)]) {
    for (const seed of seeds) {
      const replay = main.get(seed);
      if (set === "main") for (const event of replay.events) add(event, set, effort);
      if (set === "effort" && EFFORT_SEEDS.includes(seed) && replay.firstAlert) add(replay.firstAlert, set, "medium");
      if (set === "swap" && SWAP_SEEDS.includes(seed) && replay.firstAlert) add(replay.firstAlert, set, effort);
      if (set === "repeat" && seed === 1 && replay.firstAlert) for (let repeat = 1; repeat <= 2; repeat++) add(replay.firstAlert, set, effort, repeat);
    }
  }
  return plans;
}
