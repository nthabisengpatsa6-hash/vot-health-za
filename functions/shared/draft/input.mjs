import {exposureLayers} from "../layers.mjs";
import {CHECKS, FACTS, SYMPTOM_LABELS} from "./copy.mjs";
import {usualCasesText} from "./counts.mjs";

const object = (value) => value && typeof value === "object" && !Array.isArray(value);
export function validateDraftRequest(data, town) {
  const keys = object(data) ? Object.keys(data) : [];
  if (![3,4].includes(keys.length) || !keys.every((key) => ["day","symptomGroup","area","ranking"].includes(key)) || !["day","symptomGroup","area"].every((key) => Object.hasOwn(data, key)) || !Number.isInteger(data.day) || data.day < 0 || data.day > 28 || !Object.hasOwn(SYMPTOM_LABELS, data.symptomGroup) || !town.areas.some((area) => area.name === data.area)) throw new Error("bad-request");
  if (Object.hasOwn(data, "ranking")) {
    const ids = exposureLayers(town).map((source) => source.id);
    if (!Array.isArray(data.ranking) || data.ranking.length > 4 || data.ranking.some((item) => !object(item) || Object.keys(item).length !== 2 || !Object.hasOwn(item,"sourceId") || !Object.hasOwn(item,"confidence") || !ids.includes(item.sourceId) || !["low","medium","high"].includes(item.confidence)) || new Set(data.ranking.map((item) => item.sourceId)).size !== data.ranking.length) throw new Error("bad-ranking");
  }
  return data;
}

// A fresh object, never a spread of a card, signal, ranking or client payload.
export function buildDraftInput(signal, {town, ranking} = {}) {
  const candidates = signal.sources.filter((source) => source.candidate);
  const knownSources = new Set(exposureLayers(town).map((source) => source.id));
  if (candidates.some((source) => !knownSources.has(source.layer))) throw new Error("unknown-source");
  if (ranking?.some((item) => !candidates.some((source) => source.layer === item.sourceId))) throw new Error("not-candidate");
  const ordered = ranking?.length ? ranking.map((item) => ({source:candidates.find((source) => source.layer === item.sourceId), confidence:item.confidence})) : candidates.slice(0,4).map((source) => ({source}));
  const sources = ordered.map(({source, confidence}) => {
    const facts = (entries) => entries.map((fact) => {
      const template = FACTS[fact.kind];
      return template ? template({area:fact.area, name:source.name, count:fact.cards ?? fact.cardIds?.length ?? 0, type:fact.type || "shared exposure clues"}) : null;
    }).filter(Boolean);
    return {name:source.name, ...(confidence ? {confidence} : {}), supports:facts(source.supporting.slice(0,3)), against:facts(source.contradicting.slice(0,2)), checks:CHECKS[source.kind](source.name)};
  });
  return {level:signal.level, symptomGroup:SYMPTOM_LABELS[signal.symptomGroup].toLowerCase(), areas:[...signal.areas], window:`in the last ${signal.timeWindow.days} days`,
    cases:signal.observed.cases, usualCases:usualCasesText(signal.expected.cases), cards:signal.observed.cards,
    placesOfCare:signal.independentReporters, observations:Object.fromEntries(["moreSevere","notResponding"].filter((flag) => signal.flags[flag] > 0).map((flag) => [flag,signal.flags[flag]])), sources};
}

// Historical rankings keep their evidence day; only current eligible names
// and confidence words are offered to the server for a new draft.
export function draftRankingFor(signal, entry, day) {
  if (!entry || (entry.day !== undefined && entry.day !== day)) return undefined;
  const candidates = new Set(signal.sources.filter((source) => source.candidate).map((source) => source.layer));
  const selected = entry.ranking?.sources?.filter((source) => candidates.has(source.sourceId)).slice(0,4).map(({sourceId, confidence}) => ({sourceId, confidence}));
  return selected?.length ? selected : undefined;
}
