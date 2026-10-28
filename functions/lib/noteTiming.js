const logger = require("firebase-functions/logger");

// One "note_timing" log line per processNote call shows where the time went:
// numbers, model IDs and a short outcome code only. Never a transcript, card
// field, user ID, email, profile value, file name or audio.
const NOTE_TIMING_KEYS = [
  "noteMs", "audioBytes", "audioSeconds",
  "asrMs", "audioEarMs", "extractMs",
  "asrRetries", "audioEarRetries", "extractRetries",
  "coldStart", "cardCount", "outcome",
  "asrModel", "audioEarModel", "extractModel",
];

let callsHandled = 0;

// Starts the clock for one call. The first call an instance handles also
// waited for the instance to start (a cold start).
function startNoteTiming() {
  callsHandled += 1;
  return {started: performance.now(), coldStart: callsHandled === 1};
}

const msSince = (started) => Math.round(performance.now() - started);

// Null when the step never reached Meta, or was cut off before it could say.
function retriesFrom(attempts) {
  return Number.isInteger(attempts) && attempts > 0 ? attempts - 1 : null;
}

// Each ear's time is until it finished, or until we stopped waiting for it.
function recordEars(timing, ears) {
  const pairs = [["voice", "asr"], ["spark", "audioEar"]];
  for (const [ear, prefix] of pairs) {
    const result = ears[ear];
    if (!result) continue;
    const detail = (result.ok ? result.value : result.error) || {};
    timing[`${prefix}Ms`] = result.ms;
    timing[`${prefix}Retries`] = retriesFrom(detail.attempts);
  }
}

// Built by copying only the allowed keys, so nothing else on the timing
// object can reach the log.
function noteTimingEntry(timing) {
  return Object.fromEntries(
      NOTE_TIMING_KEYS.map((key) => [key, timing[key] ?? null]),
  );
}

function write(entry) {
  logger.info("note_timing", entry);
}

exports.NOTE_TIMING_KEYS = NOTE_TIMING_KEYS;
exports.msSince = msSince;
exports.noteTimingEntry = noteTimingEntry;
exports.recordEars = recordEars;
exports.retriesFrom = retriesFrom;
exports.startNoteTiming = startNoteTiming;
exports.write = write;
