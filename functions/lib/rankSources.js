const {HttpsError} = require("firebase-functions/https");
const {SYMPTOM_GROUPS, AREA_NAMES} = require("./cardSchema");
const TOWN = require("../data/places.json");
const rankLimit = require("./rankLimit");
const provider = require("./callRanker");
const rankTiming = require("./rankTiming");

const OPTIONS = Object.freeze({
  region: "africa-south1", memory: "512MiB", cpu: 1,
  timeoutSeconds: 150, maxInstances: 3, minInstances: 0, concurrency: 4,
});
const FAILED_MESSAGE = "Live ranking didn't finish. The saved ranking is still shown.";

function validateRequest(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      Object.keys(data).length !== 3 ||
      !Object.keys(data).every((key) => ["day", "symptomGroup", "area"].includes(key)) ||
      !Number.isInteger(data.day) || data.day < 0 || data.day > 28 ||
      typeof data.symptomGroup !== "string" || !Object.hasOwn(SYMPTOM_GROUPS, data.symptomGroup) ||
      typeof data.area !== "string" || !AREA_NAMES.includes(data.area)) {
    throw new HttpsError("invalid-argument", "Choose a replay day from 0 to 28, a symptom group and an area in the town.");
  }
  return data;
}

async function rebuild({day, symptomGroup, area}) {
  const {createRun} = await import("../shared/sim/engine.mjs");
  const {computeSignals} = await import("../shared/signals.mjs");
  const {dayEnd, dayOfDate} = await import("../shared/sastDay.mjs");
  const run = createRun({seed: 1, scenario: "water"});
  const cards = run.cardsUpTo(day);
  const result = computeSignals({cards, asOf: dayEnd(dayOfDate(run.startDate) + day), town: TOWN});
  const signal = result.signals.find((entry) => ["signal", "alert"].includes(entry.level) &&
    entry.symptomGroup === symptomGroup && entry.areas.includes(area));
  return {signal, cards};
}

// Dependencies are replaced only by offline tests. The deployed handler
// rebuilds its own fixed replay and never accepts model settings or cards.
function createRankHandler({apiKey, reserve = (...args) => rankLimit.reserveRanking(...args),
  rank = (...args) => provider.callRanker(...args),
  write = (entry) => rankTiming.writeRankTiming(entry), now = () => new Date()} = {}) {
  return async (request) => {
    const started = performance.now();
    const {RANK_SETTINGS} = await import("../shared/rank/settings.mjs");
    const timing = {model: RANK_SETTINGS.model, effort: RANK_SETTINGS.effort,
      promptHash: provider.PROMPT_HASH, attempts: 0, outcome: "error"};
    try {
      if (!request.auth) {
        timing.outcome = "signed_out";
        throw new HttpsError("unauthenticated", "Please sign in to rank possible sources.");
      }
      timing.outcome = "bad_request";
      const data = validateRequest(request.data);
      timing.outcome = "rebuild_failed";
      const {signal, cards} = await rebuild(data);
      if (!signal) {
        timing.outcome = "no_signal";
        throw new HttpsError("failed-precondition", "There is no Signal or Alert to rank for this area and symptom group on this day.");
      }
      timing.outcome = "counter_failed";
      const usage = await reserve(request.auth.uid, {now: now()});
      if (!usage.allowed) {
        timing.outcome = "limit";
        throw new HttpsError("resource-exhausted", rankLimit.LIMIT_MESSAGE);
      }
      const {buildRankInput} = await import("../shared/rank/input.mjs");
      const {validateRanking} = await import("../shared/rank/validate.mjs");
      const {input, references} = buildRankInput(signal, cards, TOWN);
      timing.outcome = "provider_failed";
      const reply = await rank(input, {apiKey: apiKey(), log: (entry) => Object.assign(timing, rankTiming.rankTimingEntry(entry))});
      if (reply.unavailable) throw new HttpsError("unavailable", FAILED_MESSAGE);
      timing.outcome = "invalid_ranking";
      const {ranking} = validateRanking(input, reply.raw, references);
      if (ranking.unavailable || !ranking.sources.length) {
        throw new HttpsError("unavailable", FAILED_MESSAGE);
      }
      timing.outcome = "ok";
      return {ranking, model: RANK_SETTINGS.model, effort: RANK_SETTINGS.effort,
        promptHash: provider.PROMPT_HASH, ms: reply.ms, rankedAt: now().toISOString()};
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      // Errors from Firestore or the provider can contain request data.
      // Neither their messages nor their objects enter logs or responses.
      throw new HttpsError("unavailable", FAILED_MESSAGE);
    } finally {
      timing.ms ??= Math.round(performance.now() - started);
      write(rankTiming.rankTimingEntry(timing));
    }
  };
}

module.exports = {createRankHandler, OPTIONS, validateRequest};
