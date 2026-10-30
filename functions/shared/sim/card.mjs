// One simulated card, built by the same function that builds a real saved
// card (toCardDoc), so the two can't drift apart: exactly the 17 fields, in
// the same order, cleaned the same way. Two values differ on purpose:
// source is "simulation", which firestore.rules refuses, so a simulated card
// can never be saved; and createdAt is a time in milliseconds, where a saved
// card holds the server's timestamp.
import { toCardDoc } from "../cardDoc.mjs";

export function simCard({ reporter, createdAt, symptomGroup, symptomsInWords, unusualDescription = null, caseCount, comparedWithUsual, ageGroup, area, onset, exposure, moreSevere = false, notResponding = false, suppliesNote = null }) {
  const draft = {
    symptomGroup,
    unusualDescription: unusualDescription || "",
    symptomsInWords,
    caseCount,
    comparedWithUsual,
    ageGroup,
    area,
    onset,
    exposure: { types: exposure.types, none: exposure.types.length === 0, words: exposure.words || "" },
    observations: { moreSevere, notResponding, unusualSymptoms: false, shortOfSupplies: suppliesNote !== null, suppliesNote: suppliesNote || "" },
  };
  const profile = { role: reporter.role, facilityType: reporter.facilityType, area: reporter.area };
  const card = toCardDoc({ draft, note: { notifiableConditionMentioned: null }, profile, uid: reporter.uid, createdAt });
  return { ...card, source: "simulation" };
}
