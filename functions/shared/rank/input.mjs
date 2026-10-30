import {exposureLayers} from "../layers.mjs";
import {dateOf, dayOf} from "../sastDay.mjs";
import {RANK_SETTINGS} from "./settings.mjs";

const byText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const count = (value) => Number.isFinite(value) ? value : 0;
const numbers = (value) => ({cards: count(value?.cards), cases: count(value?.cases)});
const tally = (value, keys) => Object.fromEntries(keys.filter((key) => Object.hasOwn(value || {}, key)).map((key) => [key, count(value[key])]));
const side = (value) => ({areas: [...value.areas], observed: numbers(value.observed), expected: numbers(value.expected), casesPer1000: value.casesPer1000});
const forbidden = /reporter|ground.?truth|chance/i;
const truthKeys = new Set(["seed", "scenario", "cause", "failureDay", "clusterStartDay", "symptomGroups", "affectedAreas", "comparisonAreas", "redHerring"]);

export function assertRankInput(input) {
  function visit(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.test(key) || truthKeys.has(key)) throw new Error("A forbidden field reached ranking input.");
      visit(child);
    }
  }
  visit(input);
}

// References stay in code. Neither real card IDs nor whole card objects are sent.
export function buildRankInput(signal, cards, town) {
  if (!["signal", "alert"].includes(signal.level)) throw new Error("Only a Signal or Alert can be ranked.");
  const layers = exposureLayers(town);
  const sourceById = new Map(signal.sources.map((source) => [source.layer, source]));
  const ordered = [...layers].sort((a, b) => Number(sourceById.get(b.id)?.candidate === true) - Number(sourceById.get(a.id)?.candidate === true) || byText(a.id, b.id));
  const sources = ordered.slice(0, RANK_SETTINGS.maxSources);
  const wanted = new Set(signal.cardIds);
  const own = cards.filter(({id}) => wanted.has(id)).sort((a, b) => b.card.createdAt - a.card.createdAt || byText(a.id, b.id));
  const selected = own.slice(0, RANK_SETTINGS.maxCards);
  const short = new Map(selected.map(({id}, index) => [id, `c${index + 1}`]));
  const references = {cards: {}, facts: {}};
  let factNumber = 0;
  const makeFact = (fact, sourceId) => {
    const id = `f${++factNumber}`;
    const linked = Array.isArray(fact.cardIds) ? [...fact.cardIds] : cards.filter(({card}) =>
      Number.isFinite(card.createdAt) && card.symptomGroup === signal.symptomGroup &&
      dateOf(dayOf(card.createdAt)) >= signal.timeWindow.from &&
      dateOf(dayOf(card.createdAt)) <= signal.timeWindow.to &&
      (fact.area ? card.area === fact.area : !sourceById.get(sourceId)?.inside.areas.includes(card.area))).map((record) => record.id);
    linked.sort(byText);
    references.facts[id] = {sourceId, kind: fact.kind, ...(fact.area ? {area: fact.area} : {}), cardIds: linked};
    return {
      id, kind: fact.kind,
      ...(typeof fact.area === "string" ? {area: fact.area} : {}),
      ...(typeof fact.type === "string" ? {type: fact.type} : {}),
      ...(Number.isInteger(fact.cards) ? {cards: fact.cards} : {}),
      cardIds: linked.filter((realId) => short.has(realId)).map((realId) => short.get(realId)),
    };
  };
  const input = {
    signal: {
      symptomGroup: signal.symptomGroup, areas: [...signal.areas], level: signal.level,
      timeWindow: {days: signal.timeWindow.days, from: signal.timeWindow.from, to: signal.timeWindow.to},
      observed: numbers(signal.observed), expected: numbers(signal.expected),
      checks: {
        unusual: signal.checks.unusual, enoughCards: signal.checks.enoughCards,
        independentPlacesOfCare: signal.checks.independentReporters,
        twiceUsual: signal.checks.twiceUsual, candidateSource: signal.checks.candidateSource,
        severityFlags: signal.checks.severityFlags,
      },
      placesOfCare: signal.independentReporters,
      byDay: signal.byDay.map((day) => ({date: day.date, ...numbers(day)})),
      casesByAge: tally(signal.casesByAge, ["under_5", "5_12", "13_17", "adult", "60_plus", "unknown"]),
      cardsByOnset: tally(signal.cardsByOnset, ["today", "last_3_days", "longer", "unknown"]),
      cardsByExposure: tally(signal.cardsByExposure, ["water", "food", "school", "event", "other", "none"]),
      flags: tally(signal.flags, ["moreSevere", "notResponding", "severityCards", "shortOfSupplies"]),
    },
    sources: sources.map((source) => ({id: source.id, type: source.kind, name: source.name, catchmentAreas: [...source.areas]})),
    sourceEvidence: sources.filter((source) => sourceById.has(source.id)).map((layer) => {
      const source = sourceById.get(layer.id);
      return {sourceId: layer.id, statisticalCandidate: source.candidate, statisticalOrder: source.order,
        relativeRate: source.relativeRate, inside: side(source.inside), outside: side(source.outside),
        supporting: source.supporting.map((fact) => makeFact(fact, layer.id)),
        contradicting: source.contradicting.map((fact) => makeFact(fact, layer.id))};
    }),
    cards: selected.map(({id, card}) => {
      const alias = short.get(id);
      references.cards[alias] = id;
      return {id: alias, date: dateOf(dayOf(card.createdAt)), area: card.area, caseCount: card.caseCount,
        exposure: {types: [...(card.exposure?.types || [])], words: card.exposure?.words ?? null},
        onset: card.onset, ageGroup: card.ageGroup,
        observations: Object.fromEntries(["moreSevere", "notResponding", "unusualSymptoms", "shortOfSupplies"].map((flag) => [flag, card.observations?.[flag] === true]))};
    }),
    cardsOmitted: own.length - selected.length,
    sourcesOmitted: layers.length - sources.length,
  };
  assertRankInput(input);
  return {input, references};
}
