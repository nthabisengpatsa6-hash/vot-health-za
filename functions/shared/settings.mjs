// Every threshold the statistics use, in one place, so Day 5 can tune them
// and HANDOVER's tuning log can name exactly what changed. A "chance" is
// how often a count at least this high (or, for belowLayerChance, this
// low) would happen with nothing going on.
export const SIGNAL_SETTINGS = Object.freeze({
  // The windows, in SAST days ending at asOf: 3 days (72 hours), and 7 for
  // slower rises.
  windowDays: Object.freeze([3, 7]),
  // The baseline: the 56 days that end 14 days before asOf. With less than
  // 28 days of history, nothing is tested.
  baselineDays: 56,
  gapDays: 14,
  minBaselineDays: 28,
  // An area is raised at less than 1 in 100, on at least 2 cards. Raised
  // areas shape a signal (neighbours join up); they never fire one.
  raisedChance: 0.01,
  raisedMinCards: 2,
  // Watch: less than 1 in 10,000, on at least 3 cards. About 112 tests a
  // day (8 groups, 7 areas, 2 windows), so about one false Watch in 90
  // days for the whole town.
  watchChance: 0.0001,
  watchMinCards: 3,
  // Signal: a Watch AND at least 2 independent reporters AND clearly more
  // than twice the usual count (less than 1 in 100,000 against twice the
  // usual rate).
  signalReporters: 2,
  signalMultiplier: 2,
  signalChance: 0.00001,
  // Alert: a Signal with a candidate source, or with at least 2 cards
  // flagged "sicker than usual" or "not getting better with usual
  // treatment" (the brief's severity flags). Running short of supplies
  // never changes a level.
  alertSeverityCards: 2,
  // A layer is a candidate source when its inside is clearly raised (the
  // Watch chance, and at least twice the outside's rise), more than half
  // its areas are raised, none is clearly normal, and the outside is not
  // raised.
  layerInsideChance: 0.0001,
  layerMinRelativeRate: 2,
  layerOutsideChance: 0.01,
  // An inside area is clearly normal when it usually sees at least 2 cases
  // in the window, yet a count this low would happen less than 1 in 100
  // times had it risen as much as the layer's inside as a whole.
  belowLayerChance: 0.01,
  normalMinExpectedCases: 2,
});
