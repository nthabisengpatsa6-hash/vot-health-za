import {makeBaseline} from "./baseline.mjs";
import {SIGNAL_SETTINGS} from "./settings.mjs";
import {dateOf, dayOf} from "./sastDay.mjs";

const round2 = (n) => Math.round(n * 100) / 100;

// Chart data only. Headlines always use the frozen signal's own values.
export function dailySignalChart({cards, asOf, signal, town}) {
  const lastDay = dayOf(asOf) - 1;
  const areas = town.areas.map((area) => area.name);
  const records = cards.filter(({card}) => Number.isFinite(card?.createdAt) && card.createdAt < asOf && areas.includes(card.area) && Number.isInteger(card.caseCount) && card.caseCount > 0 && typeof card.symptomGroup === "string" && card.symptomGroup)
    .map((record) => ({...record, day: dayOf(record.card.createdAt)}));
  const baseline = makeBaseline(records, lastDay, SIGNAL_SETTINGS);
  const history = baseline.countFor(signal.symptomGroup, signal.areas);
  const own = records.filter(({card}) => card.symptomGroup === signal.symptomGroup && signal.areas.includes(card.area));
  const days = Array.from({length:14}, (_, index) => {
    const day = lastDay - 13 + index;
    const matching = own.filter((record) => record.day === day);
    const weight = baseline.lengthOf(day, day);
    return {date:dateOf(day), cards:matching.length, cases:matching.reduce((n, {card}) => n + card.caseCount, 0), cardIds:matching.map(({id}) => id), weight,
      usual: {cards:history.cards * (weight / baseline.length), cases:history.cases * (weight / baseline.length)}};
  });
  return {days, history, baselineLength:baseline.length, scale:days.some((day) => day.cases > 10) ? 5 : 1};
}

// Sum baseline weights BEFORE multiplying and rounding, exactly as the engine
// does. Adding rounded daily expectations changes half-cent boundaries.
export function chartWindow(chart, timeWindow) {
  const days = chart.days.filter((day) => day.date >= timeWindow.from && day.date <= timeWindow.to);
  const share = days.reduce((n, day) => n + day.weight, 0) / chart.baselineLength;
  return {observed:{cards:days.reduce((n, day) => n + day.cards, 0), cases:days.reduce((n, day) => n + day.cases, 0)},
    expected:{cards:round2(chart.history.cards * share), cases:round2(chart.history.cases * share)}};
}
