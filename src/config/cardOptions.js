// The choices on a case card: stored value and on-screen label. The stored
// values mirror functions/lib/cardSchema.js, and firestore.rules keeps its
// own copy (rules can't import files); test/unit and test/rules check that
// all three match.

export const SYMPTOM_GROUPS = [
  { value: "diarrhoea_vomiting", label: "Diarrhoea or vomiting" },
  { value: "bloody_diarrhoea", label: "Bloody diarrhoea" },
  { value: "fever_rash", label: "Fever with rash" },
  { value: "cough_flu", label: "Cough or flu-like illness" },
  { value: "fever_stiff_neck_confusion", label: "Fever with a stiff neck or confusion" },
  { value: "sudden_after_eating_drinking", label: "Sudden illness after eating or drinking" },
  { value: "red_eyes_itchy_rash", label: "Red eyes or itchy skin rash" },
  { value: "something_unusual", label: "Something unusual" },
];

export const COMPARED_WITH_USUAL = [
  { value: "more", label: "More than usual" },
  { value: "same", label: "About the same" },
  { value: "not_sure", label: "Not sure" },
];

export const AGE_GROUPS = [
  { value: "under_5", label: "Under 5" },
  { value: "5_12", label: "5–12" },
  { value: "13_17", label: "13–17" },
  { value: "adult", label: "Adult" },
  { value: "60_plus", label: "60 and older" },
];

export const ONSETS = [
  { value: "today", label: "Today" },
  { value: "last_3_days", label: "Last 3 days" },
  { value: "longer", label: "Longer" },
];

export const EXPOSURE_TYPES = [
  { value: "water", label: "Water" },
  { value: "food", label: "Food" },
  { value: "school", label: "School" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

// Every stored observation flag, in cardSchema.js's order (firestore.rules
// and the tests sweep this list). All are optional. The card shows the two
// patient flags, then the supplies flag on its own line. unusualSymptoms is
// never shown and always saved as false: the "Something unusual" symptom
// group covers it.
export const OBSERVATIONS = [
  { value: "moreSevere", label: "Sicker than usual" },
  { value: "notResponding", label: "Not getting better with usual treatment" },
  { value: "unusualSymptoms", label: "Unusual symptoms" },
  { value: "shortOfSupplies", label: "Running short of anything?" },
];
export const PATIENT_FLAGS = OBSERVATIONS.filter((option) => ["moreSevere", "notResponding"].includes(option.value));
export const SUPPLIES_FLAG = OBSERVATIONS.find((option) => option.value === "shortOfSupplies");

// Firestore rules enforce the same limits.
export const TEXT_LIMITS = {
  symptomsInWords: 300,
  unusualDescription: 300,
  exposureWords: 300,
  suppliesNote: 300,
};
export const CASE_COUNT_MAX = 500;
