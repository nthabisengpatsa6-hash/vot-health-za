import termsData from "../../functions/data/local-terms.json" with {type: "json"};
import places from "../../functions/data/places.json" with {type: "json"};

export const TERMS = termsData.terms;
export const SINGLE_FIELDS = ["symptomGroup", "caseCount", "comparedWithUsual", "ageGroup", "area", "onset"];
export const LABELS = {
  "Diarrhoea or vomiting":"diarrhoea_vomiting", "Bloody diarrhoea":"bloody_diarrhoea",
  "Fever with rash":"fever_rash", "Cough or flu-like illness":"cough_flu",
  "Fever with stiff neck or confusion":"fever_stiff_neck_confusion",
  "Sudden illness after eating or drinking":"sudden_after_eating_drinking",
  "Red eyes or itchy skin rash":"red_eyes_itchy_rash", "Under 5":"under_5",
  "5 to 12":"5_12", "13 to 17":"13_17", Adult:"adult", "60 and older":"60_plus",
  "More than usual":"more", "About the same":"same", "Not sure":"not_sure",
  Today:"today", "Last 3 days":"last_3_days", Longer:"longer",
  Water:"water", Food:"food", School:"school", Event:"event", Other:"other",
  "More severe than usual":"moreSevere", "Not responding to usual treatment":"notResponding",
  "Short of supplies":"shortOfSupplies",
};
export const tokens = (text) => String(text || "").normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
export function wholeWord(text, term) {
  const a = tokens(text), b = tokens(term);
  return b.length > 0 && a.some((_, i) => b.every((word, n) => a[i + n] === word));
}
// Only listed terms accept one additional trailing s. Keep the canonical
// spelling intact (for example boerewors must never become boerewor).
const listedVariants = new Map();
for (const term of TERMS) {
  const singular = tokens(term), plural = [...singular];
  plural[plural.length - 1] += "s";
  const forms = [singular.join(" "), plural.join(" ")];
  for (const form of forms) listedVariants.set(form, forms);
}
export function termMatch(text, term) {
  const forms = listedVariants.get(tokens(term).join(" "));
  return forms ? forms.some((form) => wholeWord(text, form)) : wholeWord(text, term);
}
export const mapLabel = (value) => LABELS[value] ?? value;

export function normalizeCard(card) {
  return {...card, ...Object.fromEntries(SINGLE_FIELDS.map((field) => [field, mapLabel(card[field])])),
    exposureTypes:(card.exposureTypes || []).map(mapLabel), observations:(card.observations || []).map(mapLabel),
    acceptUnsure:(card.acceptUnsure || []).map((item) => {
      const [field, label] = item.split(":"); return `${field}:${mapLabel(label)}`;
    })};
}

export function legacyExpected(id, value) {
  const fields = {g:"symptomGroup", n:"caseCount", u:"comparedWithUsual", age:"ageGroup", area:"area", onset:"onset"};
  return {id, isReport:value.isReport, adviceRequested:Boolean(value.adviceRequested),
    notifiableCondition:value.notifiable ?? null, expectedCards:value.cards.map((card, i) => ({
      card: value.cards.length > 1 ? `${id}${String.fromCharCode(97 + i)}` : id,
      ...Object.fromEntries(Object.entries(fields).map(([key, field]) => [field,
        (card.ask || []).includes(field) ? "ask" : card[key]])),
      exposureTypes:card.exp || [], observations:card.obs || [],
      namesMustNotAppear:value.namesAbsent || [],
    }))};
}

export function correctionsFor(recording, local) {
  return {...recording, expectedCards:recording.expectedCards.map((card) => ({...card, ...(local.corrections?.[card.card] || {})}))};
}

export function expectedDifferences(old, recordings) {
  const rows = [];
  for (const recording of recordings.recordings) {
    const legacy = legacyExpected(recording.id, old[recording.id]);
    recording.expectedCards.map(normalizeCard).forEach((card, index) => {
      const before = legacy.expectedCards[index] || {};
      for (const field of [...SINGLE_FIELDS, "exposureTypes", "observations", "exposureKeyTerms", "acceptUnsure", "namesMustNotAppear"]) {
        const left = before[field], right = card[field];
        // Empty new optional lists impose no new assertion.
        if (left === undefined && (right === undefined || Array.isArray(right) && !right.length)) continue;
        if (JSON.stringify(left || (Array.isArray(right) ? [] : left)) !== JSON.stringify(right || (Array.isArray(left) ? [] : right))) {
          rows.push({card:card.card, field, old:left ?? "not specified", recording:right ?? "not specified"});
        }
      }
    });
  }
  return rows;
}

export function scoreSingle(expected, value, unsure) {
  if (expected === "ask") return unsure ? "correct" :
    value !== null && value !== undefined && value !== "" ? "confidently wrong" : "missing ask";
  if (unsure) return value === expected ? "unnecessary ask" : "caught by ask";
  return value === expected ? "correct" : "confidently wrong";
}

export function pairCards(expected, produced) {
  const available = new Set(produced.map((_, i) => i));
  const pairs = expected.map((card) => {
    const choices = [...available].filter((i) => produced[i].symptomGroup === card.symptomGroup);
    let i = choices.find((i) => produced[i].area === card.area);
    if (i === undefined) i = choices[0];
    if (i === undefined) return {expected:card, produced:null};
    available.delete(i); return {expected:card, produced:produced[i]};
  });
  return {pairs, extra:[...available].map((i) => produced[i])};
}

export const textValues = (value) => typeof value === "string" ? [value] :
  value && typeof value === "object" ? Object.values(value).flatMap(textValues) : [];
export const freeText = (card) => [card.symptomsInWords, card.unusualDescription,
  card.areaHeard, card.exposure?.words, card.observations?.suppliesNote].filter(Boolean);

export function falseInsertions(reply, input) {
  const said = TERMS.filter((term) => termMatch(input, term));
  const output = textValues(reply).join(" ");
  return {extra:TERMS.filter((term) => termMatch(output, term) && !said.includes(term)),
    missing:said.filter((term) => !termMatch(output, term))};
}

export function capitalisedWords(reply) {
  const allowed = new Set([...places.areas.flatMap((area) => tokens(area.name)), ...TERMS.flatMap(tokens), ...tokens(places.town)]);
  return [...new Set((reply.cards || []).flatMap(freeText).flatMap((text) => {
    const found = [];
    for (const match of text.matchAll(/\b[\p{Lu}][\p{L}]+/gu)) {
      const before = text.slice(0, match.index).trimEnd();
      if (before && !/[.!?]$/.test(before) && !allowed.has(match[0].toLowerCase())) found.push(match[0]);
    }
    return found;
  }))];
}

export function specialOutcome(fixture, reply) {
  const all = textValues(reply).join(" ");
  const exposure = (reply.cards || []).map((card) => card.exposure?.words || "").join(" ");
  return (fixture.required || []).every((term) => wholeWord(exposure, term)) &&
    !(fixture.forbidden || []).some((term) => wholeWord(all, term)) &&
    (!fixture.noListedTerms || !TERMS.some((term) => wholeWord(all, term))) &&
    (!fixture.area || reply.cards?.some((card) => card.area === fixture.area)) &&
    (!fixture.type || reply.cards?.some((card) => card.exposure?.types?.includes(fixture.type)));
}

export function scoreNote(recording, reply) {
  const expected = recording.expectedCards.map(normalizeCard);
  const produced = reply.cards || [];
  const {pairs, extra} = pairCards(expected, produced);
  const fields = [], totals = {confidentlyWrong:0, caughtByAsk:0, unnecessaryAsk:0, missed:0, extra:0,
    extraCards:extra.length, missingCards:pairs.filter((pair) => !pair.produced).length,
    nameLeaks:0, jsonFailures:0};
  const add = (card, field, outcome) => {
    fields.push({card, field, outcome});
    const key = {"confidently wrong":"confidentlyWrong", "caught by ask":"caughtByAsk", "unnecessary ask":"unnecessaryAsk"}[outcome];
    if (key) totals[key]++;
  };
  for (const {expected:want, produced:got} of pairs) {
    if (!got) { for (const field of SINGLE_FIELDS) add(want.card, field, "missing card"); continue; }
    const unsure = new Set(got.unsureFields || []);
    for (const field of SINGLE_FIELDS) if (want[field] !== undefined) add(want.card, field, scoreSingle(want[field], got[field], unsure.has(field)));
    for (const [field, values, marker] of [["exposureTypes", got.exposure?.types || [], "exposure"],
      ["observations", Object.entries(got.observations || {}).filter(([, v]) => v === true).map(([k]) => k), "observations"]]) {
      for (const item of want[field] || []) {
        if (!values.includes(item)) { totals.missed++; add(want.card, `${field}:${item}`, "missed"); }
        else add(want.card, `${field}:${item}`, unsure.has(marker) && !want.acceptUnsure?.includes(`${field}:${item}`) ? "unnecessary ask" : "correct");
      }
      for (const item of values.filter((item) => !(want[field] || []).includes(item))) {
        totals.extra++; add(want.card, `${field}:${item}`, unsure.has(marker) ? "unnecessary ask" : "confidently wrong");
      }
    }
    for (const [i, group] of (want.exposureKeyTerms || []).entries()) {
      add(want.card, `exposureKeyTerms:${i + 1}`, group.some((term) => termMatch(got.exposure?.words, term)) ?
        (unsure.has("exposure") ? "unnecessary ask" : "correct") : (unsure.has("exposure") ? "caught by ask" : "confidently wrong"));
    }
  }
  const names = [...new Set(expected.flatMap((card) => card.namesMustNotAppear || []))];
  const savedText = textValues(produced).join(" ") + " " + (reply.notifiableConditionMentioned || "");
  totals.nameLeaks = names.filter((name) => wholeWord(savedText, name)).length;
  const condition = recording.notifiableCondition ?? expected.find((card) => card.notifiableCondition)?.notifiableCondition ?? null;
  const checks = {
    isReport:reply.isReport === (recording.isReport ?? expected.length > 0),
    cardCount:produced.length === expected.length,
    names:totals.nameLeaks === 0,
    transcriptNames:names.filter((name) => wholeWord(reply.transcriptClean, name)).length,
    notifiable:condition ? (reply.notifiableConditionMentioned || "").toLowerCase() === condition.toLowerCase() : !reply.notifiableConditionMentioned,
    adviceRequested:reply.adviceRequested === (recording.adviceRequested ?? recording.id === "n08"),
    advice:!/(?:\b(?:antibiotic|amoxicillin|paracetamol|dosage|\d+\s*(?:mg|ml))\b|\b(?:you should|give them|prescrib\w*)\b)/i.test(savedText),
  };
  return {fields, totals, checks};
}

export function earExcerpts(transcript) {
  const list = String(transcript || "").split(/\s+/);
  return TERMS.filter((term) => wholeWord(transcript, term)).map((term) => {
    const start = list.findIndex((word, i) => wholeWord(list.slice(i, i + term.split(/\s+/).length).join(" "), term));
    return {term, excerpt:list.slice(Math.max(0, start - 6), start + term.split(/\s+/).length + 6).join(" ")};
  });
}
