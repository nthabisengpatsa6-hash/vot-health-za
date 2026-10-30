// Every setting of the simulation in one place: the town's everyday
// background of illness and the two scenarios. Hidden from signal code:
// only the generator reads this file (test/unit/sim-imports.test.js), so
// Day 4's expected counts have to come from the generated history, never
// from these rates. Weights are relative, not percentages that must add up.

export const BACKGROUND = {
  // Cards per 10,000 people per weekday. A card is a clinician noting a
  // group of similar patients, not one patient.
  ratePer10k: {
    cough_flu: 0.56,
    diarrhoea_vomiting: 0.44,
    red_eyes_itchy_rash: 0.18,
    fever_rash: 0.09,
    sudden_after_eating_drinking: 0.08,
    bloody_diarrhoea: 0.05,
    fever_stiff_neck_confusion: 0.03,
    something_unusual: 0.03,
  },
  // Fewer cards on Saturdays and Sundays: clinics are closed or short-staffed.
  weekendFactor: 0.45,
  // Each area's rates move up or down by up to this share for a week at a
  // time, so the history isn't unrealistically flat.
  weeklyWobble: 0.2,
  ageMix: {
    cough_flu: { under_5: 25, "5_12": 20, "13_17": 10, adult: 30, "60_plus": 15 },
    diarrhoea_vomiting: { under_5: 45, "5_12": 15, "13_17": 5, adult: 25, "60_plus": 10 },
    red_eyes_itchy_rash: { under_5: 20, "5_12": 35, "13_17": 15, adult: 25, "60_plus": 5 },
    fever_rash: { under_5: 40, "5_12": 35, "13_17": 10, adult: 12, "60_plus": 3 },
    sudden_after_eating_drinking: { under_5: 10, "5_12": 15, "13_17": 10, adult: 50, "60_plus": 15 },
    bloody_diarrhoea: { under_5: 25, "5_12": 15, "13_17": 5, adult: 40, "60_plus": 15 },
    fever_stiff_neck_confusion: { under_5: 20, "5_12": 20, "13_17": 15, adult: 30, "60_plus": 15 },
    something_unusual: { under_5: 10, "5_12": 10, "13_17": 10, adult: 50, "60_plus": 20 },
  },
  caseCounts: { 1: 50, 2: 30, 3: 14, 4: 4, 5: 2 },
  comparedWithUsual: { same: 60, not_sure: 30, more: 10 },
  onset: { today: 35, last_3_days: 50, longer: 15 },
  // What a card says the patients shared, by kind of illness.
  exposure: {
    gut: { none: 75, food: 15, water: 3, other: 7 },
    schoolAge: { none: 70, school: 25, other: 5 },
    rest: { none: 90, other: 10 },
  },
  gutGroups: ["diarrhoea_vomiting", "bloody_diarrhoea", "sudden_after_eating_drinking"],
  observations: { moreSevere: 0.02, notResponding: 0.02, shortOfSupplies: 0.01 },
  // Who reports a card about an area: shared among the reporters of each
  // facility type who serve it. Sicker patients lean towards the hospital.
  reporterWeights: { clinic: 6, hospital: 2, pharmacy: 1, private_practice: 1 },
  severeHospitalWeight: 14,
  // Reporting hours, in minutes after 00:00 SAST.
  hours: { weekday: [450, 1020], weekend: [480, 840], hospital: [420, 1260] },
};

export const SCENARIOS = {
  // The no-cluster run: the same background, nothing added.
  none: { seededCluster: null, redHerring: null },

  water: {
    seededCluster: {
      // Day 0: chlorination stops at works A. Nothing about it is in any card.
      works: "A",
      failureDay: 0,
      // Each area's extra cards start on startDay plus its lag, rise for
      // riseDays to the peak, then fall away over fallDays.
      startDay: 13,
      riseDays: 5,
      fallDays: 8,
      peakCardsPerDay: 12,
      // Sick small children still come in at weekends, mostly to the hospital.
      weekendFactor: 0.6,
      areas: {
        "Leeba View": { share: 0.3, lagDays: 0 },
        "Thaga Park": { share: 0.25, lagDays: 1 },
        "Nonyana Flats": { share: 0.2, lagDays: 1 },
        "Sefate Extension": { share: 0.15, lagDays: 2 },
        "Mmutla Ridge": { share: 0.1, lagDays: 3 },
      },
      ageMix: { under_5: 70, "5_12": 8, adult: 17, "60_plus": 5 },
      symptomGroups: { diarrhoea_vomiting: 92, bloody_diarrhoea: 8 },
      caseCounts: {
        child: { 1: 10, 2: 20, 3: 25, 4: 20, 5: 12, 6: 8, 8: 5 },
        adult: { 1: 40, 2: 35, 3: 20, 4: 5 },
      },
      // Not every clinician mentions the water.
      waterMentionShare: 0.4,
      severe: { fromDay: 16, share: 0.15 },
      supplies: { fromDay: 17, share: 0.06, note: "oral rehydration sachets" },
      comparedWithUsual: { more: 70, not_sure: 20, same: 10 },
      onset: { today: 45, last_3_days: 50, longer: 5 },
    },
    // A competing explanation: a sports day at a school whose catchment
    // crosses both water zones. Its cards come only from the school's
    // works A areas; its works B area (Kgwedi Heights) stays normal.
    redHerring: {
      event: "sports day",
      school: "Leeba View Primary School",
      day: 11,
      cardDays: [13, 14, 15],
      areas: ["Leeba View", "Thaga Park"],
      symptomGroup: "diarrhoea_vomiting",
      ageGroup: "5_12",
      caseCounts: { 2: 40, 3: 40, 4: 20 },
      comparedWithUsual: { more: 60, not_sure: 30, same: 10 },
      onset: { today: 30, last_3_days: 70 },
    },
  },
};
