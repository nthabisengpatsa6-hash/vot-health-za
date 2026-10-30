// Draws shared by the background and the seeded cluster: who reports a
// card, when, and what it says the patients shared.
import { EXPOSURE_WORDS } from "./phrases.mjs";
import { reportersFor } from "./reporters.mjs";
import { BACKGROUND } from "./scenarios.mjs";

// A reporter who serves the patients' area. Each facility type's weight is
// shared among its reporters there, so a clinic with three staff doesn't
// report three times as much as one with a single nurse.
export function chooseReporter(random, area, { severe = false } = {}) {
  const candidates = reportersFor(area);
  const sharing = (type) => candidates.filter((reporter) => reporter.facilityType === type).length;
  return random.weighted(candidates.map((reporter) => {
    const type = reporter.facilityType;
    const weight = severe && type === "hospital" ? BACKGROUND.severeHospitalWeight : BACKGROUND.reporterWeights[type];
    return [reporter, weight / sharing(type)];
  }));
}

// A time within the reporter's working hours on that SAST day, to the second.
export function reportingTime(random, calendar, day, reporter) {
  const { hours } = BACKGROUND;
  const [from, to] = reporter.facilityType === "hospital" ? hours.hospital : calendar.isWeekend(day) ? hours.weekend : hours.weekday;
  return calendar.dayStart(day) + random.int(from * 60, to * 60 - 1) * 1000;
}

// The background's mix of what patients shared, for this kind of card.
export function backgroundExposure(random, symptomGroup, ageGroup) {
  const { exposure, gutGroups } = BACKGROUND;
  const mix = gutGroups.includes(symptomGroup) ? exposure.gut : ["5_12", "13_17"].includes(ageGroup) ? exposure.schoolAge : exposure.rest;
  const kind = random.weighted(mix);
  return kind === "none" ? { types: [], words: null } : { types: [kind], words: random.pick(EXPOSURE_WORDS[kind]) };
}
