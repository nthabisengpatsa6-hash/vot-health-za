// The made-up reporters behind simulated cards. Each has what a real profile
// holds (a role, facility type and area from the app's own lists) and a fake
// ID that can't be mistaken for a real account. Clinic and hospital staff
// serve the areas their facility serves in the town file; pharmacies and
// private practices aren't in the town file, so they list their own.
import { FACILITIES } from "./town.js";

export const REPORTERS = [
  { uid: "sim-reporter-01", role: "nurse", facilityType: "clinic", area: "Thaga Park", facility: "Thaga Park Clinic" },
  { uid: "sim-reporter-02", role: "nurse", facilityType: "clinic", area: "Thaga Park", facility: "Thaga Park Clinic" },
  { uid: "sim-reporter-03", role: "doctor", facilityType: "clinic", area: "Thaga Park", facility: "Thaga Park Clinic" },
  { uid: "sim-reporter-04", role: "nurse", facilityType: "clinic", area: "Nonyana Flats", facility: "Nonyana Flats Clinic" },
  { uid: "sim-reporter-05", role: "nurse", facilityType: "clinic", area: "Nonyana Flats", facility: "Nonyana Flats Clinic" },
  { uid: "sim-reporter-06", role: "nurse", facilityType: "clinic", area: "Mmutla Ridge", facility: "Mmutla Ridge Clinic" },
  { uid: "sim-reporter-07", role: "nurse", facilityType: "clinic", area: "Lebone Gardens", facility: "Lebone Gardens Clinic" },
  { uid: "sim-reporter-08", role: "nurse", facilityType: "clinic", area: "Lebone Gardens", facility: "Lebone Gardens Clinic" },
  { uid: "sim-reporter-09", role: "doctor", facilityType: "clinic", area: "Lebone Gardens", facility: "Lebone Gardens Clinic" },
  { uid: "sim-reporter-10", role: "doctor", facilityType: "hospital", area: "Kgwedi Heights", facility: "Kgwedi Heights Hospital" },
  { uid: "sim-reporter-11", role: "nurse", facilityType: "hospital", area: "Kgwedi Heights", facility: "Kgwedi Heights Hospital" },
  { uid: "sim-reporter-12", role: "doctor", facilityType: "hospital", area: "Kgwedi Heights", facility: "Kgwedi Heights Hospital" },
  { uid: "sim-reporter-13", role: "pharmacist", facilityType: "pharmacy", area: "Leeba View", serves: ["Leeba View", "Thaga Park"] },
  { uid: "sim-reporter-14", role: "pharmacist", facilityType: "pharmacy", area: "Lebone Gardens", serves: ["Lebone Gardens", "Kgwedi Heights"] },
  { uid: "sim-reporter-15", role: "doctor", facilityType: "private_practice", area: "Sefate Extension", serves: ["Sefate Extension", "Nonyana Flats", "Mmutla Ridge"] },
  { uid: "sim-reporter-16", role: "doctor", facilityType: "private_practice", area: "Kgwedi Heights", serves: ["Kgwedi Heights"] },
];

export function areasServedBy(reporter) {
  if (reporter.serves) return reporter.serves;
  return FACILITIES.find((facility) => facility.name === reporter.facility).serves;
}

// The reporters who could see patients from an area, in the list's order.
export const reportersFor = (areaName) => REPORTERS.filter((reporter) => areasServedBy(reporter).includes(areaName));
