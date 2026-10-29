// What the replay and Near me say, in Lemoha's own words: counts against
// usual, never chances, and nothing that names or hints at what was planted
// (test/unit/replay.test.js checks every sentence for every day of both
// runs). The clinicians' own words on the cards are theirs, not ours.
import { SYMPTOM_GROUPS } from "../config/cardOptions.js";
import { LEVELS, LEVEL_ORDER } from "../config/levels.js";

export const BANNER = "Simulation: a made-up town and made-up data";
export const RUN_NOTE = "Seeded run: one cause of illness was planted somewhere in the town. Quiet run: the same town and the same everyday illness, with nothing planted.";
export const FOOTER = "Nothing you do here is saved: the town, its cards and the checks all run in your browser.";
export const DEMO_LINK = "See the demo town, no sign-up needed";

export const intro = ({ product, town, days }) => `${town} is a made-up town. Each day, its clinics and hospital send short case cards. Each night, ${product} compares every area with its own usual numbers. Press Play to watch ${days} days.`;

// Near me, until real reports are checked (Day 6): it never says a check ran.
export const nearMeNote = (product) => [`${product} doesn't check real reports for signals yet, so no area on this map has a level.`, "To see how the checks work, watch the replay of a made-up town."];
export const nearMeMap = ({ town, area }) => `Map of ${town}, with your area, ${area}, marked.`;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// "2027-02-18" as "Thu 18 Feb 2027", from the date itself, never the
// computer's time zone.
export function dateLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// A card's time of day in SAST, "16:27".
export const timeLabel = (ms) => new Date(ms + SAST_OFFSET_MS).toISOString().slice(11, 16);

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function listOf(names) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export const groupLabel = (value) => SYMPTOM_GROUPS.find((group) => group.value === value)?.label ?? value;

// A usual count is a long-run average, so it's rounded and said as "about".
export function usualText(expectedCases) {
  return expectedCases < 0.5 ? "usually fewer than 1" : `usually about ${Math.round(expectedCases)}`;
}

// "52 cases in 3 days; usually about 7"
export const countText = ({ observed, expected }, days) => `${plural(observed.cases, "case")} in ${days} days; ${usualText(expected.cases)}`;

// The whole place, then (when it has more than one area) the area itself.
export function placeLine(signal) {
  const where = signal.areas.length > 1 ? `${listOf(signal.areas)} together` : signal.areas[0];
  return `${where}: ${countText(signal, signal.timeWindow.days)}.`;
}

export function areaLine(signal, area) {
  const own = signal.byArea.find((entry) => entry.area === area);
  return `${area}: ${countText(own, signal.timeWindow.days)}.`;
}

export const cardsLine = (signal) => `Reported on ${plural(signal.observed.cards, "card")} from ${plural(signal.independentReporters, "place")} of care.`;

// Why the signal has its level, from its checks. It never names a source.
export function whyLine({ level, independentReporters, checks }) {
  if (level === "watch") return `${LEVELS.watch.label}: clearly more than usual.`;
  const parts = [`reported from ${plural(independentReporters, "place")} of care`, "clearly more than twice the usual number"];
  if (level === "alert" && checks.candidateSource) parts.push("a possible common source");
  if (level === "alert" && checks.severityFlags) parts.push("2 or more cards say patients are sicker than usual or not getting better");
  return `${LEVELS[level].label}: ${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}.`;
}

export const nothingFoundLine = (area, isoDate) => `Nothing unusual was found in ${area} on ${dateLabel(isoDate)}.`;
export const sinceLine = (day, isoDate) => `Since day ${day}, ${dateLabel(isoDate)}`;

export function dayHeading(day, records) {
  const cases = records.reduce((total, { card }) => total + card.caseCount, 0);
  return `Day ${day}: ${plural(records.length, "card")}, ${plural(cases, "case")}`;
}

const AGE_WORDS = { under_5: "under 5", "5_12": "aged 5–12", "13_17": "aged 13–17", adult: "adult", "60_plus": "60 and older" };

// "5 cases, under 5, 16:27"
export function cardMeta(card) {
  const age = card.ageGroup === "adult" && card.caseCount > 1 ? "adults" : AGE_WORDS[card.ageGroup];
  return [plural(card.caseCount, "case"), age, timeLabel(card.createdAt)].filter(Boolean).join(", ");
}

// For screen readers, said only when the map's levels change.
export function levelsAnnouncement(day, areaLevels) {
  const groups = [...LEVEL_ORDER].reverse()
    .map((level) => [level, Object.keys(areaLevels).filter((area) => areaLevels[area] === level)])
    .filter(([, areas]) => areas.length > 0)
    .map(([level, areas]) => `${listOf(areas)} at ${LEVELS[level].label}`);
  return `Day ${day}: ${groups.length > 0 ? groups.join("; ") : "no area has a level"}.`;
}
