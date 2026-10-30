// Replay days on the SAST calendar. Day 0 is the run's start date; history
// days are negative. South Africa has no daylight saving, so a SAST day
// starts at 22:00 UTC the day before: the same boundary as processNote's
// sastDay (functions/lib/noteLimit.js). Only UTC methods are used, never the
// computer's own time zone.

const DAY_MS = 24 * 60 * 60 * 1000;
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "2027-02-01" as milliseconds at 00:00 UTC that date (a date label here,
// not an instant). Refuses impossible dates such as "2027-02-30".
function parseDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const ms = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : Number.NaN;
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== text) {
    throw new Error(`The start date must be a real date written as YYYY-MM-DD, not "${text}".`);
  }
  return ms;
}

export function makeCalendar(startDate) {
  const start = parseDate(startDate);
  const label = (day) => new Date(start + day * DAY_MS);
  return {
    // The instant a replay day begins: 00:00 SAST.
    dayStart: (day) => start + day * DAY_MS - SAST_OFFSET_MS,
    // The replay day an instant falls in.
    dayOf: (ms) => Math.floor((ms + SAST_OFFSET_MS - start) / DAY_MS),
    dateOf: (day) => label(day).toISOString().slice(0, 10),
    weekdayOf: (day) => WEEKDAYS[label(day).getUTCDay()],
    isWeekend: (day) => [0, 6].includes(label(day).getUTCDay()),
  };
}
