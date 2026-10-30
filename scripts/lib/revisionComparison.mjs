import expected from "../../test-fixtures/expected-cards.json" with {type:"json"};
import {special} from "./notePlans.mjs";
import {legacyExpected, scoreNote, wholeWord, textValues, TERMS} from "./noteScoring.mjs";

// These rows contain outcome labels only. Special fixtures retain their
// existing authored assertions; no new expected clinical fields are inferred.
export function authoredOutcomes(id, reply) {
  if (!reply) return [];
  if (expected[id]) {
    const score = scoreNote(legacyExpected(id, expected[id]), reply);
    return [...score.fields,
      ...Array.from({length:score.totals.extraCards}, (_, index) => ({card:`${id}:extra:${index + 1}`, field:"card", outcome:"extra card"})),
      ...Object.entries(score.checks).map(([field, value]) => ({card:id, field:`check:${field}`,
      outcome:(field === "transcriptNames" ? value === 0 : value) ? "correct" : "fail"}))];
  }
  const fixture = special.find((item) => item.id === id);
  if (!fixture) return [];
  const exposure = (reply.cards || []).map((card) => card.exposure?.words || "").join(" "), all = textValues(reply).join(" ");
  const fields = [], add = (field, pass) => fields.push({card:id, field, outcome:pass ? "correct" : "fail"});
  (fixture.required || []).forEach((term, i) => add(`exposureKeyTerms:${i + 1}`, wholeWord(exposure, term)));
  (fixture.forbidden || []).forEach((term, i) => add(`forbiddenTerms:${i + 1}`, !wholeWord(all, term)));
  if (fixture.noListedTerms) add("noListedTerms", !TERMS.some((term) => wholeWord(all, term)));
  if (fixture.area) add("area", reply.cards?.some((card) => card.area === fixture.area));
  if (fixture.type) add("exposureTypes", reply.cards?.some((card) => card.exposure?.types?.includes(fixture.type)));
  return fields;
}
export function authoredComparison(id, meta, baseten) {
  const a = authoredOutcomes(id, meta), b = authoredOutcomes(id, baseten);
  const keys = [...new Set([...a, ...b].map((field) => `${field.card}|${field.field}`))];
  return keys.map((key) => {
    const [card, field] = key.split("|"), find = (rows) => rows.find((row) => row.card === card && row.field === field)?.outcome || "unavailable";
    return {id, card, field, meta:find(a), baseten:find(b)};
  });
}
export function outcomeVariation(evaluated, configuration) {
  const fields = new Map();
  for (const item of evaluated.filter((item) => item.row.configuration === configuration && item.score)) for (const field of item.score.fields) {
    const key = `${item.row.id}|${field.card}|${field.field}`, outcomes = fields.get(key) || new Set();
    outcomes.add(field.outcome); fields.set(key, outcomes);
  }
  return [...fields.values()].filter((outcomes) => outcomes.size > 1).length;
}
export function cardTimings(evaluated, configuration, run) {
  return evaluated.filter((item) => item.row.configuration === configuration && (run === undefined || item.row.run === run) &&
    (configuration === "A2" ? item.row.cardTimingComparable : item.row.comparable)).map((item) => item.row.timings.cardMs).filter(Number.isFinite);
}
