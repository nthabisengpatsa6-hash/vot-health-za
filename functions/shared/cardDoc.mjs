import { EXPOSURE_TYPES, OBSERVATIONS } from "./cardFields.mjs";

const FLAGS = OBSERVATIONS.map((option) => option.value);
const clean = (text) => (typeof text === "string" ? text.trim() : "");
const textOrNull = (text) => clean(text) || null;
const needsDescription = (draft) => draft.symptomGroup === "something_unusual";
const showsSuppliesNote = (draft) => draft.observations.shortOfSupplies === true;

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
