import {BANNED_PREFIXES, BANNED_WORDS, RANK_SETTINGS} from "./settings.mjs";

const banned = new RegExp(`\\b(?:${BANNED_WORDS.join("|")}|(?:${BANNED_PREFIXES.join("|")})[a-z]*)\\b`, "i");
const idToken = /\b[cf]\d+\b/i;
const emptyDrops = () => Object.fromEntries([
  "invalidJson", "invalidShape", "unknownSource", "unknownCitation", "noSupporting",
  "invalidConfidence", "extraSources", "duplicateSource", "ranksRepaired",
  "bannedReason", "idInReason", "invalidReason",
].map((key) => [key, 0]));

// The third argument is deliberately separate from the model input.
export function validateRanking(input, raw, references) {
  const dropCounts = emptyDrops();
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch {
      dropCounts.invalidJson++;
      return {ranking: {unavailable: true}, dropCounts};
    }
  }
  if (!value || !Array.isArray(value.sources)) {
    dropCounts.invalidShape++;
    return {ranking: {unavailable: true}, dropCounts};
  }
  const sourceIds = new Set(input.sources.map((source) => source.id));
  const factIds = new Set(input.sourceEvidence.flatMap((source) => [...source.supporting, ...source.contradicting].map((fact) => fact.id)));
  const cardIds = new Set(input.cards.map((card) => card.id));
  const candidates = new Set(input.sourceEvidence.filter((source) => source.statisticalCandidate).map((source) => source.sourceId));
  const evidence = (ids) => {
    if (!Array.isArray(ids)) { dropCounts.invalidShape++; return []; }
    const kept = [];
    for (const id of ids) {
      if (typeof id !== "string" || !(factIds.has(id) || cardIds.has(id)) ||
          !(factIds.has(id) ? Object.hasOwn(references.facts, id) : Object.hasOwn(references.cards, id))) {
        dropCounts.unknownCitation++;
      } else if (!kept.some((entry) => entry.id === id)) {
        kept.push({id, value: factIds.has(id) ? structuredFact(references.facts[id]) : references.cards[id]});
      }
    }
    return kept.map((entry) => entry.value);
  };
  const kept = [];
  const seen = new Set();
  for (const [position, item] of value.sources.entries()) {
    if (!item || typeof item !== "object") { dropCounts.invalidShape++; continue; }
    if (!sourceIds.has(item.sourceId)) { dropCounts.unknownSource++; continue; }
    if (!["low", "medium", "high"].includes(item.confidence)) { dropCounts.invalidConfidence++; continue; }
    const supporting = evidence(item.supporting);
    const contradicting = evidence(item.contradicting);
    if (!supporting.length) { dropCounts.noSupporting++; continue; }
    if (seen.has(item.sourceId)) { dropCounts.duplicateSource++; continue; }
    seen.add(item.sourceId);
    let reason = item.reason;
    if (typeof reason !== "string" || [...reason].length > RANK_SETTINGS.reasonMaxLength) {
      dropCounts.invalidReason++; reason = "";
    } else {
      const hasBanned = banned.test(reason);
      const hasId = idToken.test(reason);
      if (hasBanned) dropCounts.bannedReason++;
      if (hasId) dropCounts.idInReason++;
      if (hasBanned || hasId) reason = "";
    }
    kept.push({sourceId: item.sourceId, rank: item.rank, confidence: item.confidence,
      supporting, contradicting, reason, fromClinicianCluesOnly: !candidates.has(item.sourceId), position});
  }
  kept.sort((a, b) => (Number.isInteger(a.rank) && a.rank > 0 ? a.rank : Number.MAX_SAFE_INTEGER) -
    (Number.isInteger(b.rank) && b.rank > 0 ? b.rank : Number.MAX_SAFE_INTEGER) || a.position - b.position);
  dropCounts.extraSources = Math.max(0, kept.length - RANK_SETTINGS.maxRankedSources);
  const sources = kept.slice(0, RANK_SETTINGS.maxRankedSources).map(({position: _position, ...source}, index) => {
    if (source.rank !== index + 1) dropCounts.ranksRepaired++;
    return {...source, rank: index + 1};
  });
  return {ranking: {sources}, dropCounts};
}

function structuredFact(fact) {
  return {sourceId: fact.sourceId, kind: fact.kind, ...(fact.area ? {area: fact.area} : {}), cardIds: [...fact.cardIds]};
}
