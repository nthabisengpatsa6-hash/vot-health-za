// The statistics layer: cards in, signals out. Pure code with no Firebase,
// no network and no clock, so the public replay runs it in the browser on
// simulated cards, and a Cloud Function can run it on real ones. It never
// knows which kind it was given. The output is plain JSON: counts, chances
// and structured facts, never sentences (Muse Spark explains them on
// Day 5). Reporters appear only as counts: in a small town, a role plus a
// facility plus an area can name a person.
import {makeBaseline} from "./baseline.mjs";
import {exposureLayers} from "./layers.mjs";
import {dateOf, dayOf, isDayEnd} from "./sastDay.mjs";
import {SIGNAL_SETTINGS} from "./settings.mjs";
import {chanceOfAtLeast, chanceOfAtMost} from "./tail.mjs";

export const LEVELS = ["watch", "signal", "alert"];

const rankOf = (level) => LEVELS.indexOf(level);
const round2 = (value) => Math.round(value * 100) / 100;
const rounded = ({cards, cases}) => ({cards: round2(cards), cases: round2(cases)});
const casesIn = (records) =>
  records.reduce((total, {card}) => total + card.caseCount, 0);
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const areaNamesOf = (town) => town.areas.map((area) => area.name);

// The cards that can be counted, each with its SAST day, oldest first. A
// card counts in its own area (where the patients live), never in the
// reporter's. A card that can't be counted is skipped and tallied, never
// guessed: real cards may one day arrive without an area or a count.
function usableCards(cards, asOf, areaNames) {
  const skipped = {
    afterAsOf: 0,
    noTime: 0,
    unknownArea: 0,
    noCaseCount: 0,
    noSymptomGroup: 0,
  };
  const records = [];
  for (const record of cards) {
    const card = record.card || {};
    if (!Number.isFinite(card.createdAt)) {
      skipped.noTime += 1;
    } else if (card.createdAt >= asOf) {
      skipped.afterAsOf += 1;
    } else if (!areaNames.includes(card.area)) {
      skipped.unknownArea += 1;
    } else if (!Number.isInteger(card.caseCount) || card.caseCount < 1) {
      skipped.noCaseCount += 1;
    } else if (typeof card.symptomGroup !== "string" || !card.symptomGroup) {
      skipped.noSymptomGroup += 1;
    } else {
      records.push({id: record.id, card, day: dayOf(card.createdAt)});
    }
  }
  records.sort((a, b) =>
    a.card.createdAt - b.card.createdAt || byText(a.id, b.id));
  return {records, skipped};
}

// Raised areas that are neighbours join into one place. Each place lists
// its areas in the town file's order.
function joinNeighbours(raised, town) {
  const neighbours = new Map(
      town.areas.map((area) => [area.name, area.neighbours]),
  );
  const left = new Set(raised);
  const places = [];
  for (const start of raised) {
    if (!left.has(start)) continue;
    left.delete(start);
    const place = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      for (const next of neighbours.get(queue.shift())) {
        if (!left.has(next)) continue;
        left.delete(next);
        place.add(next);
        queue.push(next);
      }
    }
    places.push(areaNamesOf(town).filter((name) => place.has(name)));
  }
  return places;
}

// `cards` are { id, card } with createdAt in milliseconds, as cardsUpTo
// returns them (live cards: Firestore's Timestamp turned into toMillis()).
// `asOf` is the instant a SAST day ends; cards created then or later are
// ignored. `town` is the town file.
export function computeSignals({
  cards,
  asOf,
  town,
  settings = SIGNAL_SETTINGS,
}) {
  if (!isDayEnd(asOf)) {
    throw new Error(
        "asOf must be the instant a SAST day ends " +
        "(00:00 SAST the next day), in milliseconds.",
    );
  }
  const areaNames = areaNamesOf(town);
  const lastDay = dayOf(asOf) - 1;
  const {records, skipped} = usableCards(cards, asOf, areaNames);
  const baseline = makeBaseline(records, lastDay, settings);
  const result = {
    asOf,
    date: dateOf(lastDay),
    status: baseline.enough ? "ok" : "notEnoughHistory",
    baseline: baseline.summary,
    cardsCounted: records.length,
    skipped,
    signals: [],
    areaLevels: Object.fromEntries(areaNames.map((name) => [name, null])),
  };
  if (!baseline.enough) return result;

  const found = settings.windowDays.flatMap((days) =>
    signalsInWindow({days, lastDay, records, baseline, town, settings}));
  // One signal per symptom group and place: where the two windows found
  // overlapping areas, keep the higher level, then the shorter window.
  found.sort((a, b) => rankOf(b.level) - rankOf(a.level) ||
    a.timeWindow.days - b.timeWindow.days ||
    a.chance.usual - b.chance.usual || byText(a.id, b.id));
  for (const signal of found) {
    const kept = result.signals.find((other) =>
      other.symptomGroup === signal.symptomGroup &&
      other.areas.some((area) => signal.areas.includes(area)));
    if (kept) {
      kept.otherWindows.push({
        days: signal.timeWindow.days,
        level: signal.level,
        areas: signal.areas,
      });
    } else {
      result.signals.push(signal);
    }
  }
  for (const signal of result.signals) {
    for (const area of signal.areas) {
      const current = result.areaLevels[area];
      if (current === null || rankOf(signal.level) > rankOf(current)) {
        result.areaLevels[area] = signal.level;
      }
    }
  }
  return result;
}

// Every Watch or higher in the `days` SAST days that end on lastDay.
function signalsInWindow({days, lastDay, records, baseline, town, settings}) {
  const from = lastDay - days + 1;
  const windowShare = baseline.lengthOf(from, lastDay) / baseline.length;
  const recent = records.filter((record) => record.day >= from);
  // One symptom group's cases in some areas, against their usual count.
  const count = (group, areas) => {
    const own = recent.filter(({card}) =>
      card.symptomGroup === group && areas.includes(card.area));
    const usual = baseline.countFor(group, areas);
    const observed = {cards: own.length, cases: casesIn(own)};
    const usualRate = {
      baselineCards: usual.cards,
      windowShare,
      sizes: baseline.sizes,
    };
    return {
      records: own,
      observed,
      expected: {
        cards: usual.cards * windowShare,
        cases: usual.cases * windowShare,
      },
      chance: chanceOfAtLeast(observed.cases, usualRate),
      chanceAtLeast: (multiplier) =>
        chanceOfAtLeast(observed.cases, {...usualRate, multiplier}),
      chanceAtMost: (multiplier) =>
        chanceOfAtMost(observed.cases, {...usualRate, multiplier}),
    };
  };

  const signals = [];
  const groups = [...new Set(recent.map(({card}) => card.symptomGroup))];
  for (const group of groups.sort(byText)) {
    const byArea = new Map(
        areaNamesOf(town).map((area) => [area, count(group, [area])]),
    );
    const isRaised = (area) =>
      byArea.get(area).chance < settings.raisedChance &&
      byArea.get(area).observed.cards >= settings.raisedMinCards;
    const raised = areaNamesOf(town).filter(isRaised);
    for (const areas of joinNeighbours(raised, town)) {
      const place = count(group, areas);
      if (place.chance >= settings.watchChance) continue;
      if (place.observed.cards < settings.watchMinCards) continue;
      signals.push(describeSignal({
        group, areas, days, from, lastDay, place, byArea, isRaised, count,
        town, settings,
      }));
    }
  }
  return signals;
}

const tally = (records, valuesOf) => {
  const counts = {};
  for (const record of records) {
    for (const value of valuesOf(record)) {
      counts[value] = (counts[value] || 0) + 1;
    }
  }
  return counts;
};

function describeSignal({
  group, areas, days, from, lastDay, place, byArea, isRaised, count,
  town, settings,
}) {
  const {records} = place;
  // Independent reporters are different places of care: colleagues at one
  // clinic share a waiting room and may note the same patients.
  const independentReporters = new Set(records.map(({card}) =>
    `${card.reporterFacilityType}|${card.reporterArea}`)).size;
  const flags = {
    moreSevere: 0,
    notResponding: 0,
    severityCards: 0,
    shortOfSupplies: 0,
  };
  for (const {card} of records) {
    const seen = card.observations || {};
    if (seen.moreSevere === true) flags.moreSevere += 1;
    if (seen.notResponding === true) flags.notResponding += 1;
    if (seen.moreSevere === true || seen.notResponding === true) {
      flags.severityCards += 1;
    }
    if (seen.shortOfSupplies === true) flags.shortOfSupplies += 1;
  }

  const sources = exposureLayers(town).map((layer) =>
    compareLayer({layer, group, count, byArea, isRaised, town, settings}));
  sources.sort((a, b) => Number(b.candidate) - Number(a.candidate) ||
    (b.relativeRate ?? -1) - (a.relativeRate ?? -1) ||
    byText(a.layer, b.layer));
  let order = 0;
  for (const source of sources) {
    source.order = source.candidate ? (order += 1) : null;
  }

  const twiceUsual = place.chanceAtLeast(settings.signalMultiplier);
  // Why the level is what it is. The first two always hold: they make the
  // Watch.
  const checks = {
    unusual: true,
    enoughCards: true,
    independentReporters: independentReporters >= settings.signalReporters,
    twiceUsual: twiceUsual < settings.signalChance,
    candidateSource: order > 0,
    severityFlags: flags.severityCards >= settings.alertSeverityCards,
  };
  let level = "watch";
  if (checks.independentReporters && checks.twiceUsual) {
    level = checks.candidateSource || checks.severityFlags ? "alert" : "signal";
  }

  const byDay = [];
  for (let day = from; day <= lastDay; day += 1) {
    const own = records.filter((record) => record.day === day);
    byDay.push({date: dateOf(day), cards: own.length, cases: casesIn(own)});
  }
  return {
    id: `${group}|${areas.join("+")}|${days}`,
    level,
    symptomGroup: group,
    areas,
    timeWindow: {days, from: dateOf(from), to: dateOf(lastDay)},
    observed: place.observed,
    expected: rounded(place.expected),
    chance: {usual: place.chance, twiceUsual},
    checks,
    independentReporters,
    reporters: new Set(records.map(({card}) => card.reporterUid)).size,
    flags,
    casesByAge: tallyCases(records, ({card}) => card.ageGroup ?? "unknown"),
    cardsByOnset: tally(records, ({card}) => [card.onset ?? "unknown"]),
    cardsByExposure: tally(records, ({card}) => {
      const types = card.exposure && card.exposure.types;
      return types && types.length > 0 ? types : ["none"];
    }),
    byArea: areas.map((area) => ({
      area,
      observed: byArea.get(area).observed,
      expected: rounded(byArea.get(area).expected),
      chance: byArea.get(area).chance,
    })),
    byDay,
    sources,
    sourcesOrderedBy: "relativeRate",
    otherWindows: [],
    cardIds: records.map(({id}) => id),
  };
}

function tallyCases(records, valueOf) {
  const counts = {};
  for (const record of records) {
    const value = valueOf(record);
    counts[value] = (counts[value] || 0) + record.card.caseCount;
  }
  return counts;
}

// What the affected areas share: one exposure layer, inside against
// outside, for the signal's symptom group and window, across the town.
function compareLayer({layer, group, count, byArea, isRaised, town, settings}) {
  const population = new Map(
      town.areas.map((area) => [area.name, area.population]),
  );
  const people = (areas) =>
    areas.reduce((total, area) => total + population.get(area), 0);
  const insideAreas = layer.areas;
  const outsideAreas = areaNamesOf(town)
      .filter((name) => !insideAreas.includes(name));
  const inside = count(group, insideAreas);
  const outside = count(group, outsideAreas);
  const rise = (side) => (side.expected.cases > 0 ?
    side.observed.cases / side.expected.cases :
    null);
  const insideRise = rise(inside);
  const outsideRise = rise(outside);
  // How many times its usual the inside is, against the outside's rise. A
  // quiet outside counts as usual, never as lower, so a quiet day outside
  // can't inflate it.
  const relativeRate = insideRise === null ? null :
    insideRise / (outsideRise !== null && outsideRise > 1 ? outsideRise : 1);

  const stateOf = (area) => {
    const own = byArea.get(area);
    if (isRaised(area)) return "raised";
    // Far below the inside's own rise: if the layer were the source, this
    // area would be ill too. Areas that usually see few cases are too
    // quiet to tell either way.
    if (own.expected.cases >= settings.normalMinExpectedCases &&
        insideRise !== null && insideRise > 1 &&
        own.chanceAtMost(insideRise) < settings.belowLayerChance) {
      return "normal";
    }
    return "notRaised";
  };
  const states = insideAreas.map((area) => ({area, state: stateOf(area)}));
  const raised = states.filter(({state}) => state === "raised").length;
  const outsideNearUsual = outside.chance >= settings.layerOutsideChance;

  const supporting = [];
  const contradicting = [];
  for (const {area, state} of states) {
    if (state === "raised") {
      supporting.push({kind: "insideAreaRaised", area});
    } else {
      const kind = state === "normal" ? "insideAreaNormal" : "insideAreaNotRaised";
      contradicting.push({kind, area});
    }
  }
  for (const area of outsideAreas.filter(isRaised)) {
    contradicting.push({kind: "outsideAreaRaised", area});
  }
  if (outsideNearUsual) supporting.push({kind: "outsideNearUsual"});
  // Clues from the clinicians' own words: evidence, never proof.
  for (const type of layer.clues) {
    const mentioning = inside.records.filter(({card}) =>
      card.exposure && card.exposure.types.includes(type));
    if (mentioning.length > 0) {
      supporting.push({
        kind: "exposureMentioned",
        type,
        cards: mentioning.length,
        cardIds: mentioning.map(({id}) => id),
      });
    }
  }
  const name = layer.name.toLowerCase();
  const naming = inside.records.filter(({card}) =>
    card.exposure && typeof card.exposure.words === "string" &&
    card.exposure.words.toLowerCase().includes(name));
  if (naming.length > 0) {
    supporting.push({
      kind: "nameMentioned",
      cards: naming.length,
      cardIds: naming.map(({id}) => id),
    });
  }

  const candidate = inside.chance < settings.layerInsideChance &&
    relativeRate !== null && relativeRate >= settings.layerMinRelativeRate &&
    raised * 2 > insideAreas.length &&
    !states.some(({state}) => state === "normal") &&
    outsideNearUsual;
  const side = (areas, numbers) => ({
    areas,
    observed: numbers.observed,
    expected: rounded(numbers.expected),
    chance: numbers.chance,
    casesPer1000: people(areas) > 0 ?
      round2((numbers.observed.cases * 1000) / people(areas)) :
      null,
  });
  return {
    layer: layer.id,
    kind: layer.kind,
    name: layer.name,
    candidate,
    order: null,
    relativeRate: relativeRate === null ? null : round2(relativeRate),
    inside: side(insideAreas, inside),
    outside: side(outsideAreas, outside),
    supporting,
    contradicting,
  };
}
