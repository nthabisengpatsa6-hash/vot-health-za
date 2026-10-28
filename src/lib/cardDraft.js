// A case card while the clinician checks it, and the document it becomes.
// Plain functions with no Firebase, so they can be unit-tested.
import { CASE_COUNT_MAX, EXPOSURE_TYPES, OBSERVATIONS } from "../config/cardOptions.js";

const FLAGS = OBSERVATIONS.map((option) => option.value);

const clean = (text) => (typeof text === "string" ? text.trim() : "");
const textOrNull = (text) => clean(text) || null;

// The draft for one card from processNote. Unsure fields start empty: the
// AI's guess isn't filled in, so it can't be confirmed without a look (hard
// rule 5, "unsure means ask"). Words the clinician said (exposure and
// supplies notes) are kept.
export function draftFromCard(card) {
  const unsure = new Set(card.unsureFields || []);
  const pick = (field, empty) => (unsure.has(field) ? empty : (card[field] ?? empty));
  const exposure = card.exposure || {};
  const observations = card.observations || {};
  return {
    removed: false,
    unsureFields: [...unsure],
    questions: Object.fromEntries((card.questions || []).map((item) => [item.field, item.question])),
    areaHeard: card.areaHeard || null,
    symptomGroup: pick("symptomGroup", ""),
    unusualDescription: pick("unusualDescription", ""),
    symptomsInWords: pick("symptomsInWords", ""),
    caseCount: pick("caseCount", null),
    comparedWithUsual: pick("comparedWithUsual", null),
    ageGroup: pick("ageGroup", null),
    area: pick("area", null),
    onset: pick("onset", null),
    exposure: {
      types: unsure.has("exposure") ? [] : [...(exposure.types || [])],
      none: false,
      words: exposure.words || "",
    },
    observations: {
      ...Object.fromEntries(FLAGS.map((flag) => [flag, !unsure.has("observations") && observations[flag] === true])),
      none: false,
      suppliesNote: observations.suppliesNote || "",
    },
  };
}

export const isValidCount = (value) => Number.isInteger(value) && value >= 1 && value <= CASE_COUNT_MAX;

const needsDescription = (draft) => draft.symptomGroup === "something_unusual";

// Whether a field holds a usable answer. Exposure and observations can
// honestly be "nothing", so they count once anything is chosen, "None"
// included.
export function isFilled(draft, field) {
  switch (field) {
    case "symptomGroup":
    case "symptomsInWords":
      return clean(draft[field]) !== "";
    case "unusualDescription":
      return !needsDescription(draft) || clean(draft.unusualDescription) !== "";
    case "caseCount":
      return isValidCount(draft.caseCount);
    case "exposure":
      return draft.exposure.none || draft.exposure.types.length > 0;
    case "observations":
      return draft.observations.none || FLAGS.some((flag) => draft.observations[flag]);
    default:
      return draft[field] !== null && draft[field] !== "";
  }
}

const ALWAYS_NEEDED = ["symptomGroup", "unusualDescription", "symptomsInWords", "caseCount", "comparedWithUsual", "ageGroup", "area", "onset"];

// The fields that stop this card being saved: unsure fields not yet
// answered, and any needed field the clinician has emptied.
export function fieldsToFix(draft) {
  const fields = new Set(draft.unsureFields.filter((field) => !isFilled(draft, field)));
  for (const field of ALWAYS_NEEDED) {
    if (!isFilled(draft, field)) fields.add(field);
  }
  return [...fields];
}

// Exactly the fields firestore.rules allows for cards/{cardId}: nothing
// about what the AI was unsure of, no transcripts (the cleaned one is shown
// during review, never stored), no disagreements, no audio. `note` is
// processNote's reply.
export function toCardDoc({ draft, note, profile, uid, createdAt }) {
  const shortOfSupplies = draft.observations.shortOfSupplies === true;
  return {
    reporterUid: uid,
    reporterRole: profile.role,
    reporterFacilityType: profile.facilityType,
    reporterArea: profile.area,
    symptomGroup: draft.symptomGroup,
    unusualDescription: needsDescription(draft) ? clean(draft.unusualDescription) : null,
    symptomsInWords: clean(draft.symptomsInWords),
    caseCount: draft.caseCount,
    comparedWithUsual: draft.comparedWithUsual,
    ageGroup: draft.ageGroup,
    area: draft.area,
    onset: draft.onset,
    exposure: {
      types: EXPOSURE_TYPES.map((option) => option.value).filter((type) => draft.exposure.types.includes(type)),
      words: textOrNull(draft.exposure.words),
    },
    observations: {
      ...Object.fromEntries(FLAGS.map((flag) => [flag, draft.observations[flag] === true])),
      suppliesNote: shortOfSupplies ? textOrNull(draft.observations.suppliesNote) : null,
    },
    notifiableConditionMentioned: textOrNull(note.notifiableConditionMentioned),
    source: "voice",
    createdAt,
  };
}
