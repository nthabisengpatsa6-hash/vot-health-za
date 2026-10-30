// Prints a compact daily summary of one simulated run of the demo town
// (made-up data): each replay day's date, the town's cards and cases, and
// the under-5 diarrhoea or vomiting cases in each area, with the totals for
// works A and works B. Writes nothing: no generated data is kept, and the
// tests pin hashes instead.
//
// Usage: node scripts/simulate.mjs --seed 1 --scenario water [--days 29]
//   --days  how many replay days to print, from day 0 (default 29: days 0 to 28)

import { parseArgs } from "node:util";
import places from "../functions/data/places.json" with { type: "json" };
import { createRun, SCENARIO_NAMES } from "../functions/shared/sim/engine.mjs";

const { values } = parseArgs({
  options: {
    seed: { type: "string", default: "1" },
    scenario: { type: "string", default: "water" },
    days: { type: "string", default: "29" },
  },
});

function fail(message) {
  console.error(message);
  process.exit(1);
}

const seed = Number(values.seed);
if (!Number.isInteger(seed) || seed < 0) fail("--seed must be a whole number, 0 or more.");
if (!SCENARIO_NAMES.includes(values.scenario)) fail(`--scenario must be one of: ${SCENARIO_NAMES.join(", ")}.`);
const days = Number(values.days);
if (!Number.isInteger(days) || days < 1 || days > 365) fail("--days must be a whole number from 1 to 365.");

const run = createRun({ seed, scenario: values.scenario, replayDays: Math.max(days, 29) });
const zones = ["A", "B"].map((works) => ({ works, areas: places.areas.filter((area) => area.works === works).map((area) => area.name) }));
// Each area's first word is short enough for a column heading.
const short = (name) => name.split(" ")[0];
const isUnder5Gut = (card) => card.symptomGroup === "diarrhoea_vomiting" && card.ageGroup === "under_5";

const cardsByDay = new Map();
for (const record of run.cardsUpTo(days - 1)) {
  const day = run.dayOf(record.card.createdAt);
  if (day >= 0) cardsByDay.set(day, [...(cardsByDay.get(day) || []), record.card]);
}

const pad = (value, width) => String(value).padStart(width);
const zoneHeading = ({ works, areas }) => `${areas.map((name) => pad(short(name), short(name).length)).join(" ")} | ${pad(works, 3)}`;
console.log(`${places.town} simulation (made-up data): seed ${seed}, scenario ${values.scenario}, day 0 = ${run.days.find((entry) => entry.day === 0).weekday} ${run.startDate}`);
console.log(`Under-5 diarrhoea or vomiting cases by area. ${zones.map(({ works, areas }) => `Works ${works}: ${areas.map(short).join(", ")}`).join(". ")}.`);
console.log("");
console.log(`day  date        wd   cards  cases | ${zones.map(zoneHeading).join(" | ")}`);
for (const { day, date, weekday } of run.days.filter((entry) => entry.day >= 0 && entry.day < days)) {
  const cards = cardsByDay.get(day) || [];
  const cases = (list) => list.reduce((sum, card) => sum + card.caseCount, 0);
  const columns = zones.map(({ areas }) => {
    const perArea = areas.map((name) => pad(cases(cards.filter((card) => card.area === name && isUnder5Gut(card))), short(name).length));
    const zone = cases(cards.filter((card) => areas.includes(card.area) && isUnder5Gut(card)));
    return `${perArea.join(" ")} | ${pad(zone, 3)}`;
  });
  console.log(`${pad(day, 3)}  ${date}  ${weekday}  ${pad(cards.length, 5)}  ${pad(cases(cards), 5)} | ${columns.join(" | ")}`);
}
