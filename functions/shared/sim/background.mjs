// The town's everyday illness: cards from every area on every day, at the
// background rates in scenarios.js. Each day has its own random stream, so a
// day's cards never depend on another day's, and the weekly wobble has its
// own stream per area and week.
import { simCard } from "./card.mjs";
import { backgroundExposure, chooseReporter, reportingTime } from "./draws.mjs";
import { SOMETHING_UNUSUAL, SUPPLIES_NOTES, SYMPTOM_WORDS } from "./phrases.mjs";
import { createRandom } from "./random.mjs";
import { BACKGROUND } from "./scenarios.mjs";
import { AREAS } from "./town.mjs";

// Weeks run Monday to Sunday when day 0 is a Monday.
function wobble(seed, areaName, day) {
  const random = createRandom(seed, "wobble", areaName, Math.floor(day / 7));
  return 1 + BACKGROUND.weeklyWobble * (2 * random.next() - 1);
}

export function backgroundCards({ seed, day, calendar }) {
  const random = createRandom(seed, "background", day);
  const dayFactor = calendar.isWeekend(day) ? BACKGROUND.weekendFactor : 1;
  const cards = [];
  for (const area of AREAS) {
    const areaFactor = (area.population / 10000) * dayFactor * wobble(seed, area.name, day);
    for (const [symptomGroup, rate] of Object.entries(BACKGROUND.ratePer10k)) {
      const count = random.poisson(rate * areaFactor);
      for (let index = 0; index < count; index += 1) {
        cards.push(backgroundCard(random, { symptomGroup, area: area.name, day, calendar }));
      }
    }
  }
  return cards;
}

function backgroundCard(random, { symptomGroup, area, day, calendar }) {
  const { observations } = BACKGROUND;
  const ageGroup = random.weighted(BACKGROUND.ageMix[symptomGroup]);
  const unusual = symptomGroup === "something_unusual" ? random.pick(SOMETHING_UNUSUAL) : null;
  const exposure = backgroundExposure(random, symptomGroup, ageGroup);
  const moreSevere = random.chance(observations.moreSevere);
  const reporter = chooseReporter(random, area, { severe: moreSevere });
  return simCard({
    reporter,
    createdAt: reportingTime(random, calendar, day, reporter),
    symptomGroup,
    symptomsInWords: unusual ? unusual.words : random.pick(SYMPTOM_WORDS[symptomGroup]),
    unusualDescription: unusual ? unusual.description : null,
    caseCount: Number(random.weighted(BACKGROUND.caseCounts)),
    comparedWithUsual: random.weighted(BACKGROUND.comparedWithUsual),
    ageGroup,
    area,
    onset: random.weighted(BACKGROUND.onset),
    exposure,
    moreSevere,
    notResponding: random.chance(observations.notResponding),
    suppliesNote: random.chance(observations.shortOfSupplies) ? random.pick(SUPPLIES_NOTES) : null,
  });
}
