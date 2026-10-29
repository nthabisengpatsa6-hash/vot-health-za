// A case card while the clinician checks it, and the document it becomes.
// Plain functions with no Firebase, so they can be unit-tested.
import { CASE_COUNT_MAX, EXPOSURE_TYPES, OBSERVATIONS } from "../config/cardOptions.js";

const FLAGS = OBSERVATIONS.map((option) => option.value);

const clean = (text) => (typeof text === "string" ? text.trim() : "");
const textOrNull = (text) => clean(text) || null;

// The draft for one card from processNote. Unsure fields start empty: the
// AI's guess isn't filled in, so it can't be confirmed without a look (hard
// rule 5, "unsure means ask"). Words the clinician said (exposure and
// supplies notes) are kept. Observations are optional and never asked: a box
// is ticked only when the note said so, so if the AI wasn't sure (an older
// processNote could still say that), every box starts unticked.
export function draftFromCard(card) {
  const observationsUnsure = (card.unsureFields || []).includes("observations");
  const unsure = new Set((card.unsureFields || []).filter((field) => field !== "observations"));
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
      ...Object.fromEntries(FLAGS.map((flag) => [flag, !observationsUnsure && observations[flag] === true])),
      // Never shown, so never ticked.
      unusualSymptoms: false,
      suppliesNote: observations.suppliesNote || "",
    },
  };
}

export const isValidCount = (value) => Number.isInteger(value) && value >= 1 && value <= CASE_COUNT_MAX;

const needsDescription = (draft) => draft.symptomGroup === "something_unusual";

// The supplies note shows, and is saved, only while "Running short of
// anything?" is ticked.
export const showsSuppliesNote = (draft) => draft.observations.shortOfSupplies === true;

// The id of a field's block on card review, so the save button can find it.
export const cardFieldId = (number, field) => `card-${number}-${field}`;

// Whether a field holds a usable answer. Exposure can honestly be "nothing",
// so it counts once anything is chosen, "None" included.
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
    default:
      return draft[field] !== null && draft[field] !== "";
  }
}

const ALWAYS_NEEDED = ["symptomGroup", "unusualDescription", "symptomsInWords", "caseCount", "comparedWithUsual", "ageGroup", "area", "onset"];
// The order the card shows its fields, so the first one to fix is the first
// on screen. Observations aren't here: they never stop a save.
const FIELD_ORDER = [...ALWAYS_NEEDED, "exposure"];

// The fields that stop this card being saved, in the order the card shows
// them: unsure fields not yet answered, and any needed field the clinician
// has emptied.
export function fieldsToFix(draft) {
  const unsure = new Set(draft.unsureFields);
  return FIELD_ORDER.filter((field) => (unsure.has(field) || ALWAYS_NEEDED.includes(field)) && !isFilled(draft, field));
}

// How many answers the kept cards still need: the N in "Answer N more to
// save".
export function answersNeeded(drafts) {
  return drafts.filter((draft) => !draft.removed).reduce((sum, draft) => sum + fieldsToFix(draft).length, 0);
}

// The first unanswered question across a note's kept cards, as the card's
// index and the field.
export function firstToFix(drafts) {
  for (const [index, draft] of drafts.entries()) {
    if (draft.removed) continue;
    const [field] = fieldsToFix(draft);
    if (field) return { index, field };
  }
  return null;
}

// What the save button does. It isn't HTML-disabled while answers are
// missing (a disabled button can't be tapped to go to them), so this is the
// gate: "save" only when every kept card is complete, "jump" while anything
// is unanswered, "none" when every card is removed.
export function saveButtonAction(drafts) {
  if (drafts.every((draft) => draft.removed)) return "none";
  return firstToFix(drafts) ? "jump" : "save";
}

// The save button's click handler. A tap, the Enter or Space key and each
// tap of a double tap all arrive as clicks, so all of them come through here.
export function handleSaveTap(drafts, { save, jump }) {
  const action = saveButtonAction(drafts);
  if (action === "save") save();
  else if (action === "jump") jump();
  return action;
}

// Exactly the fields firestore.rules allows for cards/{cardId}: nothing
// about what the AI was unsure of, no transcripts (the cleaned one is shown
// during review, never stored), no disagreements, no audio. `note` is
// processNote's reply.
export function toCardDoc({ draft, note, profile, uid, createdAt }) {
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
      // Never shown on the card, so a tick here could never have been seen:
      // always false.
      unusualSymptoms: false,
      // Unticked, the note is null: firestore.rules refuses an empty string.
      suppliesNote: showsSuppliesNote(draft) ? textOrNull(draft.observations.suppliesNote) : null,
    },
    notifiableConditionMentioned: textOrNull(note.notifiableConditionMentioned),
    source: "voice",
    createdAt,
  };
}
