// SAST days for the statistics. South Africa has no daylight saving, so a
// SAST day starts at 22:00 UTC the day before: the same boundary as
// processNote's sastDay (lib/noteLimit.js) and the simulation's calendar
// (src/sim/calendar.js). A day is a whole number counted from 1 Jan 1970,
// worked out with integer maths, never with the computer's own time zone.
export const DAY_MS = 24 * 60 * 60 * 1000;
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// The SAST day an instant (in milliseconds) falls in.
export const dayOf = (ms) => Math.floor((ms + SAST_OFFSET_MS) / DAY_MS);

// The instant a SAST day ends: 00:00 SAST the next day. This is the asOf
// that computeSignals takes.
export const dayEnd = (day) => (day + 1) * DAY_MS - SAST_OFFSET_MS;

export const isDayEnd = (ms) =>
  Number.isInteger(ms) && (ms + SAST_OFFSET_MS) % DAY_MS === 0;

// 1 Jan 1970 was a Thursday (weekday 4, counting Sunday as 0).
export function isWeekend(day) {
  const weekday = (((day + 4) % 7) + 7) % 7;
  return weekday === 0 || weekday === 6;
}

export const dateOf = (day) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);

// The SAST day a date such as "2027-02-01" names. Refuses impossible dates
// such as "2027-02-30".
export function dayOfDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const ms = match ?
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) :
    Number.NaN;
  if (Number.isNaN(ms) || dateOf(ms / DAY_MS) !== text) {
    throw new Error(
        `A date must be a real date written as YYYY-MM-DD, not "${text}".`,
    );
  }
  return ms / DAY_MS;
}
