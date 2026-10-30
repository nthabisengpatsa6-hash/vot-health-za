// The seeded cluster (the planted event of scenario "water") and the red
// herring. Each has its own random stream per day, apart from the
// background's, so the "none" run is exactly the "water" run without these
// cards. Their cards use the same phrases and reporters as the background.
import { simCard } from "./card.mjs";
import { backgroundExposure, chooseReporter, reportingTime } from "./draws.mjs";
import { EVENT_WORDS, EXPOSURE_WORDS, SYMPTOM_WORDS } from "./phrases.mjs";
import { createRandom } from "./random.mjs";

// How strong the cluster is in an area, from 0 to 1, `t` days after its
// extra cards start there: up to the peak, then slowly away.
export function clusterCurve(config, t) {
  const { riseDays, fallDays } = config;
  if (t < 0 || t > riseDays + fallDays) return 0;
  if (t <= riseDays) return 0.15 + (0.85 * t) / riseDays;
  return 1 - (0.9 * (t - riseDays)) / fallDays;
}

export function seededClusterCards({ seed, day, calendar, config }) {
  if (!config) return [];
  const random = createRandom(seed, "seeded-cluster", day);
  const dayFactor = calendar.isWeekend(day) ? config.weekendFactor : 1;
  const cards = [];
  for (const [area, { share, lagDays }] of Object.entries(config.areas)) {
    const strength = clusterCurve(config, day - config.startDay - lagDays);
    const count = random.poisson(config.peakCardsPerDay * share * strength * dayFactor);
    for (let index = 0; index < count; index += 1) cards.push(clusterCard(random, { config, area, day, calendar }));
  }
  return cards;
}

function clusterCard(random, { config, area, day, calendar }) {
  const symptomGroup = random.weighted(config.symptomGroups);
  const ageGroup = random.weighted(config.ageMix);
  const child = ["under_5", "5_12"].includes(ageGroup);
  const exposure = random.chance(config.waterMentionShare) ? { types: ["water"], words: random.pick(EXPOSURE_WORDS.water) } : backgroundExposure(random, symptomGroup, ageGroup);
  const moreSevere = day >= config.severe.fromDay && random.chance(config.severe.share);
  const reporter = chooseReporter(random, area, { severe: moreSevere });
  const shortOfSupplies = day >= config.supplies.fromDay && random.chance(config.supplies.share);
  return simCard({
    reporter,
    createdAt: reportingTime(random, calendar, day, reporter),
    symptomGroup,
    symptomsInWords: random.pick(SYMPTOM_WORDS[symptomGroup]),
    caseCount: Number(random.weighted(config.caseCounts[child ? "child" : "adult"])),
    comparedWithUsual: random.weighted(config.comparedWithUsual),
    ageGroup,
    area,
    onset: random.weighted(config.onset),
    exposure,
    moreSevere,
    suppliesNote: shortOfSupplies ? config.supplies.note : null,
  });
}

// One card on each of the red herring's days, mentioning the school event.
export function redHerringCards({ seed, day, calendar, config }) {
  if (!config || !config.cardDays.includes(day)) return [];
  const random = createRandom(seed, "red-herring", day);
  const area = random.pick(config.areas);
  const reporter = chooseReporter(random, area);
  return [simCard({
    reporter,
    createdAt: reportingTime(random, calendar, day, reporter),
    symptomGroup: config.symptomGroup,
    symptomsInWords: random.pick(SYMPTOM_WORDS[config.symptomGroup]),
    caseCount: Number(random.weighted(config.caseCounts)),
    comparedWithUsual: random.weighted(config.comparedWithUsual),
    ageGroup: config.ageGroup,
    area,
    onset: random.weighted(config.onset),
    exposure: { types: ["school", "event"], words: random.pick(EVENT_WORDS).replace("{school}", config.school) },
  })];
}
