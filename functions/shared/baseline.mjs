// Where expected counts come from: the cards' own history, never anything
// else (the honesty rule). The baseline is the 56 days that end 14 days
// before asOf, so a cluster that is still growing can't raise its own
// expected count. It moves forward one day with each day replayed.
import {dateOf, isWeekend} from "./sastDay.mjs";

const keyOf = (group, area) => `${group}|${area}`;

// `records` are { id, card, day } and `lastDay` is the last SAST day
// counted (the day asOf ends).
export function makeBaseline(records, lastDay, settings) {
  const to = lastDay - settings.gapDays;
  const firstCardDay = records.reduce(
      (first, record) => (record.day < first ? record.day : first),
      to + 1,
  );
  const from = Math.max(to - settings.baselineDays + 1, firstCardDay);
  const inBaseline = records.filter(
      (record) => record.day >= from && record.day <= to,
  );

  // Clinics see fewer patients at weekends. One weekend day counts as this
  // share of a weekday, learnt from the whole town's cards, which is
  // steadier than any one area's. With no weekend cards at all, one is
  // counted, so a weekend day never weighs nothing.
  let weekdays = 0;
  let weekendDays = 0;
  for (let day = from; day <= to; day += 1) {
    if (isWeekend(day)) weekendDays += 1;
    else weekdays += 1;
  }
  const weekendCards = inBaseline.filter((record) => isWeekend(record.day))
      .length;
  const weekdayCards = inBaseline.length - weekendCards;
  const weekendWeight = weekdayCards > 0 && weekendDays > 0 ?
    ((weekendCards > 0 ? weekendCards : 1) / weekendDays) /
      (weekdayCards / weekdays) :
    1;
  const lengthOf = (start, end) => {
    let length = 0;
    for (let day = start; day <= end; day += 1) {
      length += isWeekend(day) ? weekendWeight : 1;
    }
    return length;
  };

  // How many cases a card carries, from every card in the history.
  const sizes = [0];
  for (const {card} of inBaseline) {
    sizes[card.caseCount] = (sizes[card.caseCount] || 0) + 1;
  }
  for (let size = 0; size < sizes.length; size += 1) {
    sizes[size] = (sizes[size] || 0) / inBaseline.length;
  }

  const counts = new Map();
  for (const {card} of inBaseline) {
    const key = keyOf(card.symptomGroup, card.area);
    const entry = counts.get(key) || {cards: 0, cases: 0};
    entry.cards += 1;
    entry.cases += card.caseCount;
    counts.set(key, entry);
  }

  const days = to - from + 1;
  return {
    from,
    to,
    weekendWeight,
    length: lengthOf(from, to),
    lengthOf,
    sizes,
    enough: days >= settings.minBaselineDays && inBaseline.length > 0,
    // The usual cards and cases of one symptom group in some areas, over
    // the whole baseline.
    countFor(group, areas) {
      const total = {cards: 0, cases: 0};
      for (const area of areas) {
        const entry = counts.get(keyOf(group, area));
        if (entry) {
          total.cards += entry.cards;
          total.cases += entry.cases;
        }
      }
      return total;
    },
    summary: {
      from: dateOf(from),
      to: dateOf(to),
      days,
      gapDays: settings.gapDays,
      cards: inBaseline.length,
      weekendWeight: Math.round(weekendWeight * 1000) / 1000,
    },
  };
}
