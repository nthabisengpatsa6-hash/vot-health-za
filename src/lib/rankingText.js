import { CHECKS, FACTS, MODEL_NAMES } from "../config/rankingCopy.js";
import { ONSETS } from "../config/cardOptions.js";

export const safeSummary = (reason) => typeof reason === "string" && !/chance|probab|\bodds\b|percent|%|\b1 in\b|reporter/i.test(reason) ? reason : "";
const countLine = (count) => `Based on ${count} ${count === 1 ? "card" : "cards"}.`;
const sameIds = (a, b) => {
  const sorted = [...b].sort();
  return a.length === b.length && [...a].sort().every((id, index) => id === sorted[index]);
};
const sourceById = (signal, sourceId) => signal.sources.find((source) => source.layer === sourceId);

export function rankingLabel(entry, live = false) {
  const model = MODEL_NAMES[entry.model] || entry.model;
  if (live) return `Ranked live by ${model} just now, in ${(entry.ms / 1000).toFixed(1)} s.`;
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" }).format(new Date(entry.date));
  return `Saved ranking by ${model}. Ranked on ${date}, from replay day ${entry.day}.`;
}

// Only the two evidence fields enter the view model. Neither whole cards
// nor account fields are spread into a component's rendered output.
function evidenceCard(id, records) {
  const card = records.find((record) => record.id === id)?.card;
  if (!card) return { words: null, onset: "Card unavailable in this replay." };
  return { words: card.exposure.words, onset: ONSETS.find(({ value }) => value === card.onset)?.label || "Onset not recorded" };
}

export function evidenceText(citation, signal, records) {
  if (typeof citation === "string") return { text: "A clinician's exposure clue. Based on 1 card.", cards: [evidenceCard(citation, records)] };
  const source = sourceById(signal, citation.sourceId);
  const ids = [...new Set(citation.cardIds)];
  const count = ids.length;
  const matching = [...(source?.supporting || []), ...(source?.contradicting || [])].filter((fact) =>
    fact.kind === citation.kind && Array.isArray(fact.cardIds) && sameIds(fact.cardIds, ids));
  const types = [...new Set(matching.map((fact) => fact.type).filter(Boolean))];
  const args = { name: source?.name || "this possible source", area: citation.area, count, type: types.join(" or ") || "shared exposure clues" };
  const template = FACTS[citation.kind];
  const base = template ? template(args) : "Evidence from the linked cards.";
  const text = ["exposureMentioned", "nameMentioned"].includes(citation.kind) ? base : `${base} ${countLine(count)}`;
  return { text, cards: ids.map((id) => evidenceCard(id, records)) };
}

export function sourcePresentation(source, signal) {
  const comparison = sourceById(signal, source.sourceId);
  return { name: comparison?.name || "Possible source", checks: comparison ? CHECKS[comparison.kind]?.(comparison.name) : null };
}
